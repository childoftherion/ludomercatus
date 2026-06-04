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
  // Map positions to tiers based on board1906.ts definitions (1906 Oregon Edition)
  // New layout: Position 40 = Mother Earth (START), Position 10 = Shelter/Jail
  // Tier 0 (pale_green, tier 1): positions 0, 2
  // Tier 1 (pale_green, tier 2): positions 5, 6
  // Tier 2 (pale_green, tier 3): position 8
  // Tier 3 (pale_green, tier 4): positions 12, 13
  // Tier 4 (pale_green, tier 5): positions 16, 17, 19, 20, 22, 23
  // Tier 5 (light_blue, tier 6): position 25
  // Tier 6 (light_blue, tier 7): positions 28, 29
  // Tier 7 (light_blue, tier 8): positions 32, 34, 35, 36
  // Tier 8 (light_blue, tier 9): position 37
  // Tier 9 (pink, tier 9): position 38
  // Tier 10 (pink, tier 10): positions 40, 41
  // Tier 11 (pink, tier 11): positions 43, 45
  const positionToTier: Record<number, number> = {
    0: 0, // Tillamook - Tier 1
    2: 0, // Newport - Tier 1
    5: 1, // Seaside - Tier 2
    6: 1, // Cannon Beach - Tier 2
    8: 2, // Manzanita - Tier 3
    9: 1, // Astoria - Tier 2
    12: 2, // Hood River - Tier 3
    13: 3, // White Salmon - Tier 4
    16: 3, // The Dalles - Tier 4
    17: 4, // Milton - Tier 5
    19: 4, // Wishram - Tier 5
    20: 4, // Parkdale - Tier 5
    22: 4, // Wishram Valley - Tier 5
    23: 4, // Rainier - Tier 5
    25: 5, // Baker City - Tier 6
    28: 6, // Pendleton - Tier 7
    29: 6, // Umatilla - Tier 7
    32: 7, // John Day - Tier 8
    34: 7, // Ontario - Tier 8
    35: 7, // Lakeview - Tier 8
    36: 7, // Klamath Falls - Tier 8
    37: 8, // Crater Lake - Tier 9
    38: 9, // Portland - Tier 9
    40: 10, // Salem - Tier 10
    41: 10, // Milwaukie - Tier 10
    43: 11, // Eugene - Tier 11
    45: 11, // Albany - Tier 11
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
    [0, 2, 5, 6, 8, 9], // Section 1: Tillamook → Astoria & Columbia River RR (pos 4)
    [12, 13, 16, 17, 19, 20, 22, 23], // Section 2: Shelter → Oregon Trunk Railway (pos 15)
    [25, 28, 29, 32, 34, 35, 36, 37], // Section 3: Pendleton → Gee Whiz R.R. (pos 31)
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
