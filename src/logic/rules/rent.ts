import type { GameState, Property } from "../../types/game";
import { hasMonopoly, getPlayerProperties } from "./monopoly";
import { applyRentEventModifier } from "./economics";

/** All utility spaces on the current board (used for 4x vs 10x dice multiplier). */
export const countUtilitySpacesOnBoard = (state: GameState): number =>
  state.spaces.filter((s) => s.type === "utility").length;

/**
 * Monopoly-style utility dice multiplier: 4× dice if the owner holds at least one
 * utility but not all on the board; 10× dice if they hold every utility space.
 */
export const getUtilityDiceMultiplier = (
  state: GameState,
  ownerIndex: number,
): number => {
  const totalOnBoard = countUtilitySpacesOnBoard(state);
  if (totalOnBoard <= 0) return 4;

  const utilitiesOwned = getPlayerProperties(state, ownerIndex).filter(
    (p) => p.type === "utility",
  ).length;

  return utilitiesOwned >= totalOnBoard ? 10 : 4;
};

/**
 * When a utility is unowned, the landing fee uses the single-utility rate (4× dice)
 * and is paid to the Jackpot (see GameRoom.resolveSpace). Same economic modifiers
 * as normal utility rent, without a landlord Chapter 11 reduction.
 */
export const calculateUnownedUtilityLandingFee = (
  state: GameState,
  diceTotal: number,
  property: Property,
): number => {
  if (property.type !== "utility") return 0;

  const safeDice = Number.isFinite(diceTotal) ? diceTotal : 0;
  let fee = safeDice * 4;

  fee = applyRentEventModifier(state, fee);

  if (
    state.settings?.enablePropertyValueFluctuation &&
    property.valueMultiplier !== 1.0
  ) {
    fee = Math.round(fee * property.valueMultiplier);
  }

  const rounded = Math.max(0, Math.round(fee));
  return Number.isFinite(rounded) ? rounded : 0;
};

export const calculateRent = (
  state: GameState,
  property: Property,
  diceTotal: number,
): number => {
  if (property.owner === undefined) return 0;
  if (property.mortgaged) return 0;

  const safeDice = Number.isFinite(diceTotal) ? diceTotal : 0;

  let rent = 0;

  // Check if this is a 1906 ruleset (uses rent table instead of classic rent)
  const is1906 = state.spaces.length === 48;

  if (is1906) {
    rent = calculate1906Rent(state, property);
  } else if (property.type === "property") {
    if (property.hotel) rent = property.rents[5] ?? 0;
    else if (property.houses > 0) rent = property.rents[property.houses] ?? 0;
    else {
      rent = property.baseRent;
      if (
        property.colorGroup &&
        hasMonopoly(state, property.owner, property.colorGroup)
      ) {
        rent *= 2;
      }
    }
  } else if (property.type === "railroad") {
    const ownerProps = getPlayerProperties(state, property.owner);
    const railroadsOwned = ownerProps.filter(
      (p) => p.type === "railroad",
    ).length;
    rent = property.baseRent * Math.pow(2, Math.max(0, railroadsOwned - 1));
  } else if (property.type === "utility") {
    // Card override (e.g. "Advance to nearest Utility"): must ignore null AND undefined;
    // `undefined !== null` is true and would produce NaN (dice * undefined).
    const override = state.utilityMultiplierOverride;
    if (override != null && Number.isFinite(override)) {
      rent = safeDice * override;
    } else {
      const multiplier = getUtilityDiceMultiplier(state, property.owner);
      rent = safeDice * multiplier;
    }
  }

  rent = applyRentEventModifier(state, rent);

  if (!Number.isFinite(rent)) rent = 0;

  // Phase 3: Apply property value multiplier (appreciation/depreciation)
  if (
    state.settings?.enablePropertyValueFluctuation &&
    property.valueMultiplier !== 1.0
  ) {
    rent = Math.round(rent * property.valueMultiplier);
  }

  // Phase 3: Chapter 11 Rent Reduction
  // Players in Chapter 11 restructuring collect reduced rent (typically 50%)
  const owner = state.players[property.owner];
  if (owner?.inChapter11) {
    rent = Math.round(rent * 0.5);
  }

  const rounded = Math.max(0, Math.round(rent));
  return Number.isFinite(rounded) ? rounded : 0;
};

/**
 * Calculate 1906-style rent using the rent table system.
 * In 1906, rent is determined by the property's tier and number of houses,
 * with doubling rules for railroad sections.
 */
export const calculate1906Rent = (
  state: GameState,
  property: Property,
): number => {
  // 1906 has unlimited houses with fixed $10 per house value
  // Rent is looked up from the tier table based on number of houses
  const houses = property.houses ?? 0;

  // Get the property's tier from its index in the board spaces
  const spaceIndex = state.spaces.findIndex((s) => s.id === property.id);
  if (spaceIndex === -1) return property.baseRent;

  // Determine tier based on property position in 1906 board
  // Tiers correspond to the LAND_RENT_TIER constants used in board1906.ts
  const tier = get1906PropertyTier(spaceIndex);

  // Get base rent from tier table for the given number of houses
  // Tier 0 = cheapest, Tier 10 = most expensive
  // Each tier has values for 0, 1, 2, 3 houses
  const tierRentTable = [
    [2, 4, 8, 16], // Tier 1
    [4, 8, 16, 32], // Tier 2
    [6, 12, 24, 48], // Tier 3
    [8, 16, 32, 64], // Tier 4
    [10, 20, 40, 80], // Tier 5
    [12, 24, 48, 96], // Tier 6
    [14, 28, 56, 112], // Tier 7
    [16, 32, 64, 128], // Tier 8
    [18, 36, 72, 144], // Tier 9
    [20, 40, 80, 160], // Tier 10
    [22, 44, 88, 176], // Tier 11
  ];

  // Clamp houses to max 3 for table lookup (1906 max houses per property)
  const houseIndex = Math.min(houses, 3);
  let baseRent = tierRentTable[tier]?.[houseIndex] ?? property.baseRent;

  // Apply section doubling: when all lots in a railroad section have houses,
  // land rent doubles for each completed section
  if (houses > 0) {
    const doublingCount = countCompletedSections(state);
    baseRent *= Math.pow(2, doublingCount);
  }

  return baseRent;
};

/**
 * Get the rent tier for a property based on its position in the 1906 board.
 * This maps position indices to the LAND_RENT_TIER constants.
 */
export const get1906PropertyTier = (position: number): number => {
  // Map positions to tiers based on board1906.ts definitions
  // Tier 1 (index 0): positions 1, 3, 5 (Mother Earth adjacent)
  // Tier 2 (index 1): positions 8, 10
  // etc.
  const positionToTier: Record<number, number> = {
    1: 0,
    3: 0,
    5: 0, // Tier 1: pale_green
    8: 1,
    10: 1, // Tier 2: teal
    13: 2,
    15: 2,
    17: 2, // Tier 3: lavender
    19: 3,
    21: 3, // Tier 4: gold
    24: 4,
    26: 4,
    28: 4, // Tier 5: brown
    31: 5,
    33: 5, // Tier 6: pale_green (reused)
    36: 6,
    38: 6,
    40: 6, // Tier 7: teal (reused)
    42: 7,
    44: 7,
    46: 7, // Tier 8: lavender (reused)
  };

  return positionToTier[position] ?? 0;
};

/**
 * Count completed railroad sections in 1906 ruleset.
 * Each section is the set of properties between two railroads.
 * When all lots in a section have at least N houses, rent doubles.
 */
export const countCompletedSections = (state: GameState): number => {
  const railroadSections = [
    [1, 3, 5], // Section 1: Mother Earth → 1st Railroad
    [8, 10], // Section 2: 1st → 2nd Railroad
    [13, 15, 17], // Section 3: Jail → 2nd Railroad
    [19, 21], // Section 4: 2nd Railroad → Public Treasury
    [24, 26, 28], // Section 5: Public Treasury → 3rd Railroad
    [31, 33], // Section 6: 3rd Railroad → Lord Blueblood's
    [36, 38, 40], // Section 7: Lord Blueblood's → 4th Railroad
    [42, 44, 46], // Section 8: 4th Railroad → Mother Earth
  ];

  let completedSections = 0;

  for (const section of railroadSections) {
    let allHaveHouses = true;
    for (const pos of section) {
      const space = state.spaces[pos];
      if (!space || space.type !== "property") {
        allHaveHouses = false;
        break;
      }
      const prop = space as Property;
      if ((prop.houses ?? 0) === 0) {
        allHaveHouses = false;
        break;
      }
    }
    if (allHaveHouses) {
      completedSections++;
    }
  }

  return completedSections;
};
