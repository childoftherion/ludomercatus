/**
 * AI Trade Strategy
 *
 * Handles AI decision-making for trade negotiations: evaluating offers,
 * proposing trades, and deciding when to accept/reject.
 *
 * @module ai/trade
 */

import type {
  GameState,
  Property,
  TradeOffer,
  AIDifficulty,
} from "../../types/game";
import {
  calculateNetWorth,
  getCurrentPropertyPrice,
} from "../../logic/rules/economics";
import { calculateRent } from "../../logic/rules/rent";
import { SeededRNG } from "../../utils/rng";

// ============================================================================
// Trade Evaluation
// ============================================================================

export interface TradeEvaluation {
  valueToAI: number;
  valueToOpponent: number;
  fairnessRatio: number; // 1.0 = fair, <1.0 = favors AI, >1.0 = favors opponent
  shouldAccept: boolean;
  reason: string;
}

/**
 * Evaluate a trade offer from the AI's perspective
 */
export function evaluateTradeOffer(
  state: GameState,
  aiIndex: number,
  offer: TradeOffer,
  difficulty: AIDifficulty,
): TradeEvaluation {
  const aiPlayer = state.players[aiIndex];
  if (!aiPlayer) {
    return {
      valueToAI: 0,
      valueToOpponent: 0,
      fairnessRatio: 1,
      shouldAccept: false,
      reason: "Invalid AI player",
    };
  }

  // Calculate value of what AI receives
  const valueReceived = calculateTradeValue(state, aiIndex, offer);

  // Calculate value of what AI gives
  const valueGiven = calculateTradeValueGiven(state, aiIndex, offer);

  // Calculate fairness ratio
  const fairnessRatio = valueGiven > 0 ? valueReceived / valueGiven : 999;

  // Get difficulty-based acceptance threshold
  const acceptanceThreshold = getAcceptanceThreshold(difficulty);

  // Decision logic
  let shouldAccept = false;
  let reason = "";

  if (valueGiven === 0 && valueReceived > 0) {
    // Free stuff!
    shouldAccept = true;
    reason = "Free value - accept immediately";
  } else if (valueReceived >= valueGiven * acceptanceThreshold) {
    shouldAccept = true;
    reason = `Fair trade (ratio: ${fairnessRatio.toFixed(2)})`;
  } else if (fairnessRatio < 0.8) {
    shouldAccept = true;
    reason = `Slightly unfavorable but acceptable (ratio: ${fairnessRatio.toFixed(2)})`;
  } else {
    shouldAccept = false;
    reason = `Unfavorable trade (ratio: ${fairnessRatio.toFixed(2)}, threshold: ${acceptanceThreshold})`;
  }

  // Easy AI is more likely to accept bad deals
  if (difficulty === "easy" && fairnessRatio < 1.5) {
    shouldAccept = true;
    reason = "Easy AI accepts mediocre deal";
  }

  return {
    valueToAI: valueReceived,
    valueToOpponent: valueGiven,
    fairnessRatio,
    shouldAccept,
    reason,
  };
}

/**
 * Calculate the value of properties in a trade to the AI
 */
function calculateTradeValue(
  state: GameState,
  aiIndex: number,
  offer: TradeOffer,
): number {
  let totalValue = offer.cashRequested; // Cash the AI receives

  // Add value of properties received
  for (const propId of offer.propertiesRequested) {
    const prop = state.spaces.find((s) => s.id === propId) as
      | Property
      | undefined;
    if (prop) {
      totalValue += getCurrentPropertyPrice(state, prop);
      // Add rental income value
      totalValue += calculateRent(state, prop, 7) * 5; // 5 turns estimated
    }
  }

  // Add value of jail cards
  totalValue += offer.jailCardsRequested * 50; // Jail cards worth ~$50

  return totalValue;
}

/**
 * Calculate the value of what the AI would give in a trade
 */
function calculateTradeValueGiven(
  state: GameState,
  aiIndex: number,
  offer: TradeOffer,
): number {
  const aiPlayer = state.players[aiIndex];
  if (!aiPlayer) return 0;

  let totalValue = offer.cashOffered; // Cash the AI gives

  // Add value of properties given
  for (const propId of offer.propertiesOffered) {
    const prop = state.spaces.find((s) => s.id === propId) as
      | Property
      | undefined;
    if (prop && prop.owner === aiIndex) {
      totalValue += getCurrentPropertyPrice(state, prop);
      totalValue += calculateRent(state, prop, 7) * 5;
    }
  }

  // Add value of jail cards given
  totalValue += offer.jailCardsOffered * 50;

  return totalValue;
}

/**
 * Get the acceptance threshold based on difficulty
 */
function getAcceptanceThreshold(difficulty: AIDifficulty): number {
  switch (difficulty) {
    case "easy":
      return 0.8; // Easy AI accepts almost anything
    case "hard":
      return 1.15; // Hard AI wants at least 15% better deal
    case "medium":
    default:
      return 1.05; // Medium AI wants at least 5% better deal
  }
}

// ============================================================================
// Trade Proposals
// ============================================================================

export interface TradeProposal {
  offer: TradeOffer;
  confidence: number; // 0-1 how confident this is a good deal
}

/**
 * Generate a trade proposal from the AI
 */
export function generateTradeProposal(
  state: GameState,
  aiIndex: number,
  targetIndex: number,
  rng: SeededRNG,
): TradeProposal | null {
  const aiPlayer = state.players[aiIndex];
  const targetPlayer = state.players[targetIndex];

  if (!aiPlayer || !targetPlayer) return null;

  const aiProperties = getPlayerOwnedProperties(state, aiIndex);
  const targetProperties = getPlayerOwnedProperties(state, targetIndex);

  // Don't propose trades if AI has few properties
  if (aiProperties.length < 2) return null;

  // Don't target players with more net worth (AI is conservative)
  const aiNetWorth = calculateNetWorth(state, aiIndex);
  const targetNetWorth = calculateNetWorth(state, targetIndex);

  if (targetNetWorth > aiNetWorth * 1.5) return null;

  // Find properties AI might want to trade
  const tradeableProperties = aiProperties.filter(
    (p) => !p.mortgaged && p.houses === 0 && !p.hotel,
  );

  if (tradeableProperties.length === 0) return null;

  // Pick a property to offer (prefer incomplete color groups)
  const propertyToOffer = pickTradeableProperty(
    tradeableProperties,
    state,
    aiIndex,
    rng,
  );

  if (!propertyToOffer) return null;

  // Find what AI wants from target
  const desiredProperty = findDesiredProperty(state, aiIndex, targetIndex, rng);

  // Build the offer
  const offer: TradeOffer = {
    fromPlayer: aiIndex,
    toPlayer: targetIndex,
    cashOffered: 0,
    propertiesOffered: [propertyToOffer.id],
    jailCardsOffered: 0,
    cashRequested: rng.next() < 0.3 ? Math.floor(aiNetWorth * 0.1) : 0,
    propertiesRequested: desiredProperty ? [desiredProperty.id] : [],
    jailCardsRequested: 0,
  };

  // Calculate confidence
  const confidence = calculateTradeConfidence(offer, state, aiIndex);

  return { offer, confidence };
}

/**
 * Pick a property the AI is willing to trade
 */
function pickTradeableProperty(
  properties: Property[],
  state: GameState,
  aiIndex: number,
  rng: SeededRNG,
): Property | null {
  // Prefer properties from incomplete color groups
  const incompleteGroupProps = properties.filter((p) => {
    if (!p.colorGroup) return false;
    return !hasCompleteMonopoly(state, aiIndex, p.colorGroup);
  });

  if (incompleteGroupProps.length > 0 && rng.next() < 0.7) {
    return rng.pick(incompleteGroupProps) ?? null;
  }

  // Otherwise pick randomly
  return rng.pick(properties) ?? null;
}

/**
 * Find a property the AI wants from the target player
 */
function findDesiredProperty(
  state: GameState,
  aiIndex: number,
  targetIndex: number,
  rng: SeededRNG,
): Property | null {
  const targetProperties = getPlayerOwnedProperties(state, targetIndex);

  // Find properties that would complete a monopoly for AI
  for (const prop of targetProperties) {
    if (!prop.colorGroup) continue;

    const groupProps = state.spaces.filter(
      (s): s is Property =>
        s.type === "property" && s.colorGroup === prop.colorGroup,
    );

    const aiOwns = groupProps.filter((s) => s.owner === aiIndex);
    if (aiOwns.length === groupProps.length - 1) {
      return prop;
    }
  }

  // If no monopoly completion, pick a valuable property
  const valuableProps = targetProperties
    .filter((p) => p.type === "property" || p.type === "railroad")
    .sort((a, b) => b.price - a.price);

  if (valuableProps.length > 0) {
    return rng.pick(valuableProps) ?? null;
  }

  return null;
}

/**
 * Calculate how confident we are that a trade is good
 */
function calculateTradeConfidence(
  offer: TradeOffer,
  state: GameState,
  aiIndex: number,
): number {
  const valueReceived = calculateTradeValue(state, aiIndex, offer);
  const valueGiven = calculateTradeValueGiven(state, aiIndex, offer);

  if (valueGiven === 0) return 1.0;

  const ratio = valueReceived / valueGiven;

  // Higher ratio = more confident
  return Math.min(1, ratio);
}

// ============================================================================
// Counter-Offers
// ============================================================================

/**
 * Generate a counter-offer when the AI rejects a trade
 */
export function generateCounterOffer(
  state: GameState,
  aiIndex: number,
  originalOffer: TradeOffer,
  rng: SeededRNG,
): TradeOffer | null {
  // Modify the original offer to be more favorable to AI
  const counter: TradeOffer = {
    ...originalOffer,
    cashOffered: Math.floor(originalOffer.cashOffered * 0.8), // Offer less cash
    propertiesOffered: [...originalOffer.propertiesOffered],
    jailCardsOffered: originalOffer.jailCardsOffered,
  };

  // Remove one property if possible
  if (counter.propertiesOffered.length > 0 && rng.next() < 0.5) {
    counter.propertiesOffered.pop();
  }

  // Add something the AI wants
  const desired = findDesiredProperty(
    state,
    aiIndex,
    originalOffer.fromPlayer,
    rng,
  );
  if (desired && !counter.propertiesRequested.includes(desired.id)) {
    counter.propertiesRequested.push(desired.id);
  }

  return counter;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getPlayerOwnedProperties(
  state: GameState,
  playerIndex: number,
): Property[] {
  return state.spaces
    .filter(
      (s): s is Property =>
        s.type === "property" || s.type === "railroad" || s.type === "utility",
    )
    .filter((p) => p.owner === playerIndex) as Property[];
}
function hasCompleteMonopoly(
  state: GameState,
  playerIndex: number,
  colorGroup: string,
): boolean {
  const groupProps = state.spaces.filter(
    (s): s is Property => s.type === "property" && s.colorGroup === colorGroup,
  );
  return groupProps.every((p) => (p as Property).owner === playerIndex);
}
