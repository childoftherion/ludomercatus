import type { GameState, Property, Player } from "../types/game";

/**
 * Validation utilities for game actions
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Check if a player can perform an action (turn order enforcement)
 */
export function validatePlayerTurn(
  state: GameState,
  playerIndex: number,
  allowedPhases?: string[]
): ValidationResult {
  const player = state.players[playerIndex];
  
  if (!player) {
    return { valid: false, error: "Player does not exist" };
  }
  
  if (player.bankrupt) {
    return { valid: false, error: "Bankrupt players cannot perform actions" };
  }
  
  // Special handling for auctions
  if (state.phase === "auction" && state.auction) {
    if (playerIndex !== state.auction.activePlayerIndex) {
      return { valid: false, error: "It's not your turn to bid" };
    }
    return { valid: true };
  }
  
  // Special handling for trades
  if (state.phase === "trading" && state.trade) {
    const { offer } = state.trade;
    // Allow both players involved in trade
    if (playerIndex !== offer.fromPlayer && playerIndex !== offer.toPlayer) {
      return { valid: false, error: "You are not involved in this trade" };
    }
    return { valid: true };
  }
  
  // Special handling for rent negotiation
  if (state.phase === "awaiting_rent_negotiation" && state.pendingRentNegotiation) {
    const { debtorIndex, creditorIndex } = state.pendingRentNegotiation;
    if (playerIndex !== debtorIndex && playerIndex !== creditorIndex) {
      return { valid: false, error: "You are not involved in this negotiation" };
    }
    return { valid: true };
  }
  
  // Special handling for bankruptcy decision
  if (state.phase === "awaiting_bankruptcy_decision" && state.pendingBankruptcy) {
    if (playerIndex !== state.pendingBankruptcy.playerIndex) {
      return { valid: false, error: "This bankruptcy decision is not yours" };
    }
    return { valid: true };
  }
  
  // Special handling for tax decision
  if (state.phase === "awaiting_tax_decision" && state.awaitingTaxDecision) {
    if (playerIndex !== state.awaitingTaxDecision.playerIndex) {
      return { valid: false, error: "This tax decision is not yours" };
    }
    return { valid: true };
  }
  
  // Default: only current player can act (unless in specific phases)
  const phasesThatAllowAnyPlayer = ["setup", "lobby", "game_over"];
  if (!phasesThatAllowAnyPlayer.includes(state.phase)) {
    if (playerIndex !== state.currentPlayerIndex) {
      return { valid: false, error: "It's not your turn" };
    }
  }
  
  // Check phase restrictions
  if (allowedPhases && !allowedPhases.includes(state.phase)) {
    return { 
      valid: false, 
      error: `This action is not allowed in the current phase (${state.phase})` 
    };
  }
  
  return { valid: true };
}

/**
 * Validate that a player has enough cash
 */
export function validateCash(
  player: Player | undefined,
  amount: number,
  action: string
): ValidationResult {
  if (!player) {
    return { valid: false, error: "Player does not exist" };
  }
  
  if (player.cash < amount) {
    return { 
      valid: false, 
      error: `Insufficient funds. You need £${amount} but only have £${player.cash}` 
    };
  }
  
  return { valid: true };
}

/**
 * Validate that a property exists and is owned by the player
 */
export function validatePropertyOwnership(
  state: GameState,
  propertyId: number,
  playerIndex: number,
  action: string
): ValidationResult {
  const property = state.spaces.find(s => s.id === propertyId) as Property | undefined;
  
  if (!property || (property.type !== "property" && property.type !== "railroad" && property.type !== "utility")) {
    return { valid: false, error: "Property does not exist" };
  }
  
  if (property.owner === undefined || property.owner !== playerIndex) {
    return { valid: false, error: "You do not own this property" };
  }
  
  return { valid: true };
}

/**
 * Validate building rules (monopoly, even building, etc.)
 */
export function validateBuilding(
  state: GameState,
  propertyId: number,
  playerIndex: number
): ValidationResult {
  const property = state.spaces.find(s => s.id === propertyId) as Property | undefined;
  
  if (!property || property.type !== "property") {
    return { valid: false, error: "Only properties can have buildings" };
  }
  
  if (property.owner !== playerIndex) {
    return { valid: false, error: "You do not own this property" };
  }
  
  if (property.mortgaged) {
    return { valid: false, error: "Cannot build on mortgaged properties" };
  }
  
  if (!property.colorGroup) {
    return { valid: false, error: "This property cannot have buildings" };
  }
  
  // Check for monopoly
  const groupProperties = state.spaces.filter(
    (s): s is Property => 
      s.type === "property" && 
      s.colorGroup === property.colorGroup
  );
  
  const ownedByPlayer = groupProperties.filter(p => p.owner === playerIndex);
  if (ownedByPlayer.length !== groupProperties.length) {
    return { valid: false, error: "You must own all properties in this color group to build" };
  }
  
  // Check even building rule
  const housesInGroup = groupProperties.map(p => p.houses);
  const minHouses = Math.min(...housesInGroup);
  const maxHouses = Math.max(...housesInGroup);
  
  if (property.houses < minHouses) {
    return { 
      valid: false, 
      error: "You must build evenly across all properties in this color group" 
    };
  }
  
  // Check if building would violate even building rule
  if (property.houses === maxHouses && maxHouses > minHouses) {
    return { 
      valid: false, 
      error: "You must build evenly across all properties in this color group" 
    };
  }
  
  // Check housing scarcity
  if (property.hotel) {
    return { valid: false, error: "This property already has a hotel" };
  }
  
  if (property.houses === 4) {
    // Building hotel
    if (state.availableHotels <= 0) {
      return { valid: false, error: "No hotels available (housing scarcity)" };
    }
  } else {
    // Building house
    if (state.availableHouses <= 0) {
      return { valid: false, error: "No houses available (housing scarcity)" };
    }
  }
  
  return { valid: true };
}

/**
 * Validate trade offer
 */
export function validateTradeOffer(
  state: GameState,
  offer: { fromPlayer: number; toPlayer: number; cashOffered: number; propertiesOffered: number[] }
): ValidationResult {
  const fromPlayer = state.players[offer.fromPlayer];
  const toPlayer = state.players[offer.toPlayer];
  
  if (!fromPlayer || !toPlayer) {
    return { valid: false, error: "Invalid players in trade" };
  }
  
  if (fromPlayer.bankrupt || toPlayer.bankrupt) {
    return { valid: false, error: "Bankrupt players cannot trade" };
  }
  
  // Validate cash
  if (offer.cashOffered > fromPlayer.cash) {
    return { valid: false, error: "Insufficient cash for trade" };
  }
  
  // Validate properties
  for (const propId of offer.propertiesOffered) {
    const prop = state.spaces.find(s => s.id === propId) as Property | undefined;
    if (!prop || prop.owner !== offer.fromPlayer) {
      return { valid: false, error: `You do not own property ${prop?.name || propId}` };
    }
    if (prop.houses > 0 || prop.hotel) {
      return { valid: false, error: "Cannot trade properties with buildings" };
    }
  }
  
  return { valid: true };
}

/**
 * Validate mortgage/unmortgage
 */
export function validateMortgage(
  state: GameState,
  propertyId: number,
  playerIndex: number,
  isUnmortgaging: boolean
): ValidationResult {
  const result = validatePropertyOwnership(state, propertyId, playerIndex, "mortgage");
  if (!result.valid) return result;
  
  const property = state.spaces.find(s => s.id === propertyId) as Property;
  
  if (isUnmortgaging) {
    if (!property.mortgaged) {
      return { valid: false, error: "This property is not mortgaged" };
    }
    
    const unmortgageCost = Math.floor(property.mortgageValue * 1.1); // 10% interest
    const player = state.players[playerIndex];
    if (player && player.cash < unmortgageCost) {
      return { 
        valid: false, 
        error: `Insufficient funds to unmortgage. Cost: £${unmortgageCost}, you have: £${player.cash}` 
      };
    }
  } else {
    if (property.mortgaged) {
      return { valid: false, error: "This property is already mortgaged" };
    }
    if (property.houses > 0 || property.hotel) {
      return { valid: false, error: "Cannot mortgage properties with buildings" };
    }
  }
  
  return { valid: true };
}

