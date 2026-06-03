/**
 * AI Auction Strategy
 *
 * Handles AI decision-making during auctions: bidding amounts,
 * when to pass, and valuation of properties.
 *
 * @module ai/auction
 */

import type { GameState, Property, AIDifficulty } from "../../types/game";
import { calculateNetWorth } from "../../logic/rules/economics";
import { SeededRNG } from "../../utils/rng";

// ============================================================================
// Auction Decision Types
// ============================================================================

export interface AuctionDecision {
  action: "bid" | "pass";
  bidAmount: number;
  reason: string;
}

// ============================================================================
// Bidding Logic
// ============================================================================

/**
 * Decide whether to bid or pass in an auction
 */
export function decideAuctionAction(
  state: GameState,
  playerIndex: number,
  property: Property,
  currentBid: number,
  minimumBid: number,
  difficulty: AIDifficulty,
  rng: SeededRNG,
): AuctionDecision {
  const player = state.players[playerIndex];
  if (!player) {
    return { action: "pass", bidAmount: 0, reason: "Invalid player" };
  }

  const netWorth = calculateNetWorth(state, playerIndex);
  const propertyValue = property.price || property.baseRent * 10;

  // Calculate maximum affordable bid
  let maxAffordable = Math.floor(player.cash * 0.6); // Never bid more than 60% of cash

  // Calculate value-based maximum
  let maxValueBid = Math.floor(propertyValue * 2.5); // Never bid more than 2.5x value

  // Adjust based on monopoly completion potential
  const completesMonopoly = wouldCompleteMonopoly(state, playerIndex, property);
  if (completesMonopoly) {
    maxAffordable = Math.floor(maxAffordable * 2);
    maxValueBid = Math.floor(maxValueBid * 2);
  }

  // Apply difficulty modifiers
  const aggressiveness = getAuctionAggressiveness(difficulty);
  const maxBid = Math.min(maxAffordable, maxValueBid) * aggressiveness;

  // Check if minimum bid is affordable
  if (minimumBid > maxBid || minimumBid > player.cash) {
    return {
      action: "pass",
      bidAmount: 0,
      reason: completesMonopoly
        ? "Minimum bid too high despite monopoly potential"
        : "Bid exceeds calculated maximum",
    };
  }

  // Add some randomness based on difficulty
  let bidAmount = minimumBid;

  if (difficulty === "hard") {
    // Hard AI calculates optimal bid
    const bidRange = Math.min(maxBid - minimumBid, 100);
    bidAmount = minimumBid + Math.floor(rng.next() * bidRange * 0.7);
  } else if (difficulty === "medium") {
    const bidRange = Math.min(maxBid - minimumBid, 50);
    bidAmount = minimumBid + Math.floor(rng.next() * bidRange * 0.5);
  } else {
    // Easy AI bids minimally or randomly
    if (rng.next() < 0.3) {
      bidAmount = minimumBid + Math.floor(rng.next() * 20);
    }
  }

  // Cap at maximum
  bidAmount = Math.min(bidAmount, Math.floor(maxBid));

  // Don't overbid
  if (bidAmount > player.cash) {
    bidAmount = Math.min(minimumBid, player.cash);
    if (bidAmount <= 0) {
      return { action: "pass", bidAmount: 0, reason: "Insufficient cash" };
    }
  }

  return {
    action: "bid",
    bidAmount,
    reason: completesMonopoly
      ? "Bidding to complete monopoly"
      : `Bid $${bidAmount} (max: $${Math.floor(maxBid)})`,
  };
}

/**
 * Calculate the maximum reasonable bid for a property
 */
export function calculateMaxReasonableBid(
  state: GameState,
  playerIndex: number,
  property: Property,
  difficulty: AIDifficulty,
): number {
  const player = state.players[playerIndex];
  if (!player) return 0;

  const propertyValue = property.price || property.baseRent * 10;
  const netWorth = calculateNetWorth(state, playerIndex);

  // Base maximum on cash reserves
  const cashBasedMax = Math.floor(player.cash * 0.5);

  // Base maximum on property value
  let valueBasedMax = Math.floor(propertyValue * 2);

  // Bonus for monopoly completion
  if (wouldCompleteMonopoly(state, playerIndex, property)) {
    valueBasedMax *= 2;
  }

  // Apply difficulty modifier
  const aggressiveness = getAuctionAggressiveness(difficulty);

  return Math.min(cashBasedMax, valueBasedMax) * aggressiveness;
}

// ============================================================================
// Auction Valuation
// ============================================================================

/**
 * Calculate the strategic value of a property to a player
 */
export function calculateAuctionValue(
  state: GameState,
  playerIndex: number,
  property: Property,
): number {
  const baseValue = property.price || property.baseRent * 10;
  let strategicMultiplier = 1;

  // Check if completing a monopoly
  if (wouldCompleteMonopoly(state, playerIndex, property)) {
    strategicMultiplier = 3; // Monopolies are very valuable
  }

  // Check if blocking an opponent's monopoly
  if (wouldBlockOpponentMonopoly(state, playerIndex, property)) {
    strategicMultiplier = Math.max(strategicMultiplier, 2);
  }

  // Railroads and utilities have consistent value
  if (property.type === "railroad") {
    strategicMultiplier = Math.max(strategicMultiplier, 1.5);
  }

  return baseValue * strategicMultiplier;
}

// ============================================================================
// Helper Functions
// ============================================================================

function wouldCompleteMonopoly(
  state: GameState,
  playerIndex: number,
  property: Property,
): boolean {
  if (!property.colorGroup) return false;

  const groupProps = state.spaces.filter(
    (s): s is Property =>
      s.type === "property" && s.colorGroup === property.colorGroup,
  );

  const ownedByPlayer = groupProps.filter((s) => s.owner === playerIndex);
  return ownedByPlayer.length === groupProps.length - 1;
}

function wouldBlockOpponentMonopoly(
  state: GameState,
  playerIndex: number,
  property: Property,
): boolean {
  if (!property.colorGroup) return false;

  const groupProps = state.spaces.filter(
    (s): s is Property =>
      s.type === "property" && s.colorGroup === property.colorGroup,
  );

  const otherProps = groupProps.filter((s) => s.id !== property.id);
  if (otherProps.length === 0) return false;

  const firstOwner = otherProps[0]?.owner;
  if (firstOwner === undefined || firstOwner === playerIndex) return false;

  return otherProps.every((s) => s.owner === firstOwner);
}

function getAuctionAggressiveness(difficulty: AIDifficulty): number {
  switch (difficulty) {
    case "easy":
      return 0.7;
    case "hard":
      return 1.1;
    case "medium":
    default:
      return 1.0;
  }
}
