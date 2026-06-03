/**
 * AI Turn Strategy
 *
 * Handles AI decision-making during their turn: rolling dice, buying properties,
 * building houses, mortgage/unmortgage decisions, and end-of-turn actions.
 *
 * @module ai/turn
 */

import type { GameState, Property, AIDifficulty } from "../../types/game";
import {
  calculateNetWorth,
  getCurrentPropertyPrice,
} from "../../logic/rules/economics";
import { hasMonopoly, getPlayerProperties } from "../../logic/rules/monopoly";
import { calculateRent } from "../../logic/rules/rent";
import { SeededRNG, random, randomInt } from "../../utils/rng";

// ============================================================================
// AI Context - Shared state across all AI strategies
// ============================================================================

export interface AIContext {
  playerIndex: number;
  difficulty: AIDifficulty;
  netWorth: number;
  cash: number;
  cashReserve: number;
  rankings: { playerId: number; netWorth: number }[];
  giniCoefficient: number;
  rng: SeededRNG;
  state: GameState;
}

/**
 * Create AI context for the current player
 */
export function createAIContext(
  state: GameState,
  playerIndex: number,
  difficulty: AIDifficulty,
  rng: SeededRNG | undefined,
): AIContext {
  const netWorth = calculateNetWorth(state, playerIndex);
  const cash = state.players[playerIndex]?.cash ?? 0;

  // Calculate rankings for all players
  const rankings = state.players
    .map((p, i) => ({ playerId: i, netWorth: calculateNetWorth(state, i) }))
    .sort((a, b) => b.netWorth - a.netWorth);

  // Calculate Gini coefficient
  const giniCoefficient = calculateGiniForAI(state);

  // Get difficulty modifiers
  const modifiers = getDifficultyModifiers(difficulty);
  const cashReserve = Math.max(200, netWorth * modifiers.cashReserveMultiplier);

  return {
    playerIndex,
    difficulty,
    netWorth,
    cash,
    cashReserve,
    rankings,
    giniCoefficient,
    rng: rng ?? new SeededRNG(Date.now()),
    state,
  };
}

// ============================================================================
// Difficulty Modifiers
// ============================================================================

export interface DifficultyModifiers {
  cashReserveMultiplier: number;
  roiThreshold: number;
  auctionAggressiveness: number;
  buildingThreshold: number;
  loanThreshold: number;
  tradeAcceptanceThreshold: number;
  endgameAggression: number;
  leverageTendency: number;
}

export function getDifficultyModifiers(
  difficulty: AIDifficulty,
): DifficultyModifiers {
  switch (difficulty) {
    case "easy":
      return {
        cashReserveMultiplier: 0.25,
        roiThreshold: 0.15,
        auctionAggressiveness: 0.7,
        buildingThreshold: 0.4,
        loanThreshold: 0.2,
        tradeAcceptanceThreshold: 1.2,
        endgameAggression: 0.5,
        leverageTendency: 0.3,
      };
    case "hard":
      return {
        cashReserveMultiplier: 0.08,
        roiThreshold: 0.08,
        auctionAggressiveness: 1.1,
        buildingThreshold: 0.15,
        loanThreshold: 0.5,
        tradeAcceptanceThreshold: 0.95,
        endgameAggression: 1.3,
        leverageTendency: 0.7,
      };
    case "medium":
    default:
      return {
        cashReserveMultiplier: 0.15,
        roiThreshold: 0.1,
        auctionAggressiveness: 1.0,
        buildingThreshold: 0.25,
        loanThreshold: 0.3,
        tradeAcceptanceThreshold: 1.05,
        endgameAggression: 1.0,
        leverageTendency: 0.5,
      };
  }
}

// ============================================================================
// Property Buying Decisions
// ============================================================================

export interface BuyDecision {
  shouldBuy: boolean;
  maxBid: number;
  reason: string;
}

/**
 * Decide whether to buy a property at current price
 */
export function decidePropertyBuy(
  context: AIContext,
  property: Property,
): BuyDecision {
  const modifiers = getDifficultyModifiers(context.difficulty);
  const player = context.rng;

  // Calculate ROI
  const roi = calculatePropertyROI(
    context.state ?? ({} as GameState),
    property,
    context.playerIndex,
  );

  // Check if buying completes a monopoly
  const completesMonopoly = wouldCompleteMonopoly(
    context.state ?? ({} as GameState),
    context.playerIndex,
    property,
  );

  // Check if buying blocks opponent
  const blocksOpponent = wouldBlockOpponent(
    context.state ?? ({} as GameState),
    context.playerIndex,
    property,
  );

  const currentPrice = property.price || property.baseRent * 10;

  // Base decision on ROI
  let shouldBuy = roi >= modifiers.roiThreshold;
  let maxBid = Math.floor(context.cashReserve);
  let reason = `ROI ${roi.toFixed(2)} meets threshold`;

  // Bonus for completing monopoly
  if (completesMonopoly) {
    shouldBuy = true;
    maxBid = Math.min(context.cash, Math.floor(currentPrice * 2));
    reason = "Completes monopoly - high priority";
  }

  // Bonus for blocking opponent
  if (blocksOpponent && roi >= modifiers.roiThreshold * 0.5) {
    shouldBuy = true;
    maxBid = Math.min(context.cash, Math.floor(currentPrice * 1.5));
    reason = "Blocks opponent's monopoly";
  }

  // Adjust max bid based on cash position
  if (context.cash < currentPrice * 1.5) {
    shouldBuy = false;
    reason = "Insufficient cash reserves";
  }

  // Add some randomness for easy difficulty
  if (context.difficulty === "easy" && player.next() < 0.3) {
    shouldBuy = false;
    reason = "Easy AI being conservative";
  }

  return { shouldBuy, maxBid: Math.max(maxBid, currentPrice), reason };
}

/**
 * Calculate maximum bid for an auction
 */
export function calculateMaxAuctionBid(
  context: AIContext,
  property: Property,
): number {
  const modifiers = getDifficultyModifiers(context.difficulty);

  const currentPrice = property.price || property.baseRent * 10;
  const roi = calculatePropertyROI(
    context.state ?? ({} as GameState),
    property,
    context.playerIndex,
  );

  // Base max bid on cash reserve
  let maxBid = context.cashReserve;

  // Increase for monopoly completion
  if (
    wouldCompleteMonopoly(
      context.state ?? ({} as GameState),
      context.playerIndex,
      property,
    )
  ) {
    maxBid *= 2;
  }

  // Apply aggressiveness modifier
  maxBid *= modifiers.auctionAggressiveness;

  // Don't exceed cash or property value by too much
  maxBid = Math.min(context.cash, maxBid);
  maxBid = Math.min(maxBid, currentPrice * 3); // Never bid more than 3x value

  return Math.floor(maxBid);
}

// ============================================================================
// Building Decisions
// ============================================================================

export interface BuildDecision {
  propertyId: number | null;
  action: "build" | "upgrade" | "skip";
  reason: string;
}

/**
 * Decide whether to build on a property
 */
export function decideBuilding(context: AIContext): BuildDecision | null {
  const state = context.state;
  const modifiers = getDifficultyModifiers(context.difficulty);

  // Check if we can afford to build
  if (context.cash < context.cashReserve * modifiers.buildingThreshold) {
    return null;
  }

  // Find properties that could use buildings
  const playerProperties = getPlayerProperties(state, context.playerIndex);

  let bestDecision: BuildDecision | null = null;
  let bestROI = 0;

  for (const prop of playerProperties) {
    if (prop.type !== "property") continue;
    if (!prop.colorGroup) continue;
    if (!hasMonopoly(state, context.playerIndex, prop.colorGroup)) continue;

    // Check if we can build (1906 has max 3 houses, classic has 4 + hotel)
    const maxHouses = 4;
    const canBuildHouses =
      prop.houses < maxHouses && (state.availableHouses ?? 0) > 0;
    const canBuildHotel = prop.houses >= 4 && (state.availableHotels ?? 0) > 0;

    if (!canBuildHouses && !canBuildHotel) continue;

    // Calculate ROI for this property
    const currentRent = calculateRent(state, prop, 4); // Estimate with dice total of 4
    const buildingCost = prop.buildingCost ?? 0;
    const propertyROI = buildingCost > 0 ? currentRent / buildingCost : 0;

    if (propertyROI > bestROI) {
      bestROI = propertyROI;
      bestDecision = {
        propertyId: prop.id,
        action: canBuildHotel ? "upgrade" : "build",
        reason: `ROI ${propertyROI.toFixed(2)} on ${prop.name}`,
      };
    }
  }

  // Even building preference - prefer properties with fewer houses
  if (bestDecision && bestDecision.propertyId !== null) {
    const prop = state.spaces.find((s) => s.id === bestDecision.propertyId) as
      | Property
      | undefined;
    if (prop) {
      const sameTierProps = playerProperties.filter(
        (p) => p.colorGroup === prop.colorGroup && p.type === "property",
      );

      const minHouses = Math.min(...sameTierProps.map((p) => p.houses));
      if (prop.houses > minHouses) {
        // Find a property with fewer houses first
        for (const p of sameTierProps) {
          if (p.houses < prop.houses && p.type === "property") {
            if (p.houses < 4 && (state.availableHouses ?? 0) > 0) {
              return {
                propertyId: p.id,
                action: "build",
                reason: "Even building strategy",
              };
            }
          }
        }
      }
    }
  }

  return bestDecision;
}

// ============================================================================
// Mortgage Decisions
// ============================================================================

export interface MortgageDecision {
  propertyId: number | null;
  action: "mortgage" | "unmortgage" | "none";
  reason: string;
}

/**
 * Decide whether to mortgage a property
 */
export function decideMortgage(
  context: AIContext,
  state: GameState,
): MortgageDecision | null {
  // Only mortgage if cash is critically low
  if (context.cash > 100) {
    return null;
  }

  const playerProperties = getPlayerProperties(state, context.playerIndex);

  // Find least valuable owned property to mortgage
  let worstProperty: Property | null = null;
  let worstValue = 0;

  for (const prop of playerProperties) {
    if (prop.mortgaged) continue;
    if (prop.houses > 0) continue; // Can't mortgage improved properties

    const value = prop.mortgageValue ?? 0;
    if (value > worstValue) {
      worstValue = value;
      worstProperty = prop;
    }
  }

  if (worstProperty) {
    return {
      propertyId: worstProperty.id,
      action: "mortgage",
      reason: `Need cash, mortgaging ${worstProperty.name} for $${worstValue}`,
    };
  }

  return null;
}

// ============================================================================
// Helper Functions
// ============================================================================

function calculatePropertyROI(
  state: GameState,
  property: Property,
  playerIndex: number,
): number {
  if (property.owner !== undefined && property.owner !== playerIndex) return 0;

  let expectedRent = property.baseRent;

  // If we'd complete a monopoly, rent doubles
  if (property.colorGroup) {
    const groupProps = state.spaces.filter(
      (s): s is Property =>
        s.type === "property" && s.colorGroup === property.colorGroup,
    );
    const ownedByPlayer = groupProps.filter((s) => s.owner === playerIndex);
    if (ownedByPlayer.length === groupProps.length - 1) {
      expectedRent *= 2;
    }
  }

  const currentPrice = property.price || property.baseRent * 10;
  return expectedRent / currentPrice;
}

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

function wouldBlockOpponent(
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

/**
 * Calculate a simplified Gini coefficient for AI decision-making
 */
function calculateGiniForAI(state: GameState): number {
  const netWorths = state.players.map((p) => calculateNetWorth(state, p.id));
  if (netWorths.length === 0) return 0;

  const sorted = [...netWorths].sort((a, b) => a - b);
  const n = sorted.length;
  if (n <= 1) return 0;

  let sumDiff = 0;
  const mean = sorted.reduce((a, b) => a + b, 0) / n;

  for (const value of sorted) {
    sumDiff += Math.abs(value - mean);
  }

  return sumDiff / (n * n * mean) || 0;
}
