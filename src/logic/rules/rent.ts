import type { GameState, Property } from "../../types/game";
import { hasMonopoly, getPlayerProperties } from "./monopoly";

// Check if an economic event is active
const isEconomicEventActive = (state: GameState, type: string): boolean => {
  return state.activeEconomicEvents?.some(e => e.type === type) ?? false;
};

export const calculateRent = (state: GameState, property: Property, diceTotal: number): number => {
  if (property.owner === undefined || property.mortgaged) return 0;

  let rent = 0;

  if (property.type === "property") {
    if (property.hotel) rent = property.rents[5] ?? 0;
    else if (property.houses > 0) rent = property.rents[property.houses] ?? 0;
    else {
      rent = property.baseRent;
      if (property.colorGroup && hasMonopoly(state, property.owner, property.colorGroup)) {
        rent *= 2;
      }
    }
  } else if (property.type === "railroad") {
    const ownerProps = getPlayerProperties(state, property.owner);
    const railroadsOwned = ownerProps.filter(p => p.type === "railroad").length;
    rent = property.baseRent * Math.pow(2, Math.max(0, railroadsOwned - 1));
  } else if (property.type === "utility") {
    // Check for card-triggered multiplier override (e.g., "Advance to nearest Utility" card)
    // Per official rules: when sent to utility by card, pay 10x dice roll regardless of ownership
    if (state.utilityMultiplierOverride !== null) {
      rent = diceTotal * state.utilityMultiplierOverride;
    } else {
      // Normal utility rent: 4x if owner has 1 utility, 10x if owner has both
      const ownerProps = getPlayerProperties(state, property.owner);
      const utilitiesOwned = ownerProps.filter(p => p.type === "utility").length;
      const multiplier = utilitiesOwned === 2 ? 10 : 4;
      rent = diceTotal * multiplier;
    }
  }

  // Apply economic event modifiers
  if (isEconomicEventActive(state, "recession")) {
    // Recession: 25% rent reduction
    rent = Math.floor(rent * 0.75);
  } else if (isEconomicEventActive(state, "bull_market")) {
    // Bull Market: 20% rent increase
    rent = Math.floor(rent * 1.20);
  }
  
  // Phase 3: Apply property value multiplier (appreciation/depreciation)
  if (state.settings?.enablePropertyValueFluctuation && property.valueMultiplier !== 1.0) {
    rent = Math.floor(rent * property.valueMultiplier);
  }

  // Phase 3: Chapter 11 Rent Reduction
  // Players in Chapter 11 restructuring collect reduced rent (typically 50%)
  const owner = state.players[property.owner];
  if (owner?.inChapter11) {
    rent = Math.floor(rent * 0.5);
  }

  return rent;
};
