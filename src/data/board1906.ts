import type { Space, Property, ColorGroup } from "../types/game";

/**
 * 1906 Landlord's Game board – Economic Game Company (EGC) Edition
 *
 * Based on Lizzie J. Magie's 1904 patent / 1906 Economic Game Company printing.
 * This is the ORIGINAL board layout as shown in the EGC reference image.
 *
 * GRID LAYOUT (11×11 = 40 perimeter spaces):
 * - Bottom row (row 10, cols 10→0): 11 positions (0-10)
 * - Left column (col 0, rows 9→1): 9 positions (11-19)
 * - Top row (row 0, cols 0→10): 11 positions (20-30)
 * - Right column (col 10, rows 1→9): 9 positions (31-39)
 * - Total: 11 + 9 + 11 + 9 = 40 ✓
 *
 * CORNERS (per original EGC board):
 * - Bottom-right (10,10): Mother Earth (position 0) - START/GO
 * - Bottom-left (10,0): Shelter (position 10) - Jail
 * - Top-left (0,0): Chance (position 20) - Free Parking area
 * - Top-right (0,10): No Trespassing (position 30) - Go to Jail
 *
 * NUMBERING (counter-clockwise from bottom-right):
 * - Positions 0-9: Bottom row (Mother Earth → Shelter)
 * - Position 10: Shelter (bottom-left corner)
 * - Positions 11-19: Left column (Shelter → Cottage Terrace)
 * - Position 20: Chance (top-left corner)
 * - Positions 21-30: Top row (Chance → No Trespassing)
 * - Position 30: No Trespassing (top-right corner)
 * - Positions 31-39: Right column (No Trespassing → back toward Mother Earth)
 */

const createProperty = (
  id: number,
  name: string,
  position: number,
  colorGroup: ColorGroup,
  price: number,
  baseRent: number,
  rents: number[],
  buildingCost: number,
  mortgageValue: number,
): Property => ({
  id,
  name,
  position,
  type: "property",
  colorGroup,
  price,
  baseRent,
  rents,
  buildingCost,
  mortgageValue,
  houses: 0,
  hotel: false,
  mortgaged: false,
  isInsured: false,
  insurancePaidUntilRound: 0,
  valueMultiplier: 1.0,
});

const createRailroad = (
  id: number,
  name: string,
  position: number,
): Property => ({
  id,
  name,
  position,
  type: "railroad",
  colorGroup: null,
  price: 200,
  baseRent: 25,
  rents: [25, 50, 100, 200],
  buildingCost: 0,
  mortgageValue: 100,
  houses: 0,
  hotel: false,
  mortgaged: false,
  isInsured: false,
  insurancePaidUntilRound: 0,
  valueMultiplier: 1.0,
});

const createSpace = (
  id: number,
  name: string,
  type: Space["type"],
  position: number,
): Space => ({ id, name, type, position });

/**
 * 1906 Land Rent Table - matching the original EGC board tiers
 * Each tier: [0 houses, 1 house, 2 houses, 3 houses]
 */
const LAND_RENT_TIER_1 = [2, 4, 8, 16];
const LAND_RENT_TIER_2 = [4, 8, 16, 32];
const LAND_RENT_TIER_3 = [6, 12, 24, 48];
const LAND_RENT_TIER_4 = [8, 16, 32, 64];
const LAND_RENT_TIER_5 = [10, 20, 40, 80];
const LAND_RENT_TIER_6 = [12, 24, 48, 96];
const LAND_RENT_TIER_7 = [14, 28, 56, 112];
const LAND_RENT_TIER_8 = [16, 32, 64, 128];
const LAND_RENT_TIER_9 = [18, 36, 72, 144];
const LAND_RENT_TIER_10 = [20, 40, 80, 160];

export const boardSpaces1906: Space[] = [
  // ===== BOTTOM ROW (right to left, positions 0-10) =====
  // 11 spaces: Mother Earth (START) → Shelter (Jail)
  // Position 0: Mother Earth - START/GO (collect $100 wages)
  createSpace(0, "Mother Earth", "mother_earth", 0),

  // Position 1: Wayback
  createProperty(
    1,
    "Wayback",
    1,
    "pale_green",
    25,
    2,
    LAND_RENT_TIER_1,
    25,
    12,
  ),

  // Position 2: Fuel - Taxes $10
  createSpace(2, "Fuel", "tax", 2),

  // Position 3: Absolute Necessity
  createProperty(
    3,
    "Absolute Necessity",
    3,
    "pale_green",
    25,
    2,
    LAND_RENT_TIER_1,
    25,
    12,
  ),

  // Position 4: Lonely Lane
  createProperty(
    4,
    "Lonely Lane",
    4,
    "pale_green",
    25,
    2,
    LAND_RENT_TIER_1,
    25,
    12,
  ),

  // Position 5: D.F. Hogg's Game Preserves - Go to Jail
  createSpace(5, "D.F. Hogg's Game Preserves", "go_to_jail", 5),

  // Position 6: Royal Rusher R.R. (Railroad)
  createRailroad(6, "Royal Rusher R.R.", 6),

  // Position 7: The Pike
  createProperty(
    7,
    "The Pike",
    7,
    "pale_green",
    25,
    4,
    LAND_RENT_TIER_2,
    25,
    12,
  ),

  // Position 8: The Farm
  createProperty(
    8,
    "The Farm",
    8,
    "pale_green",
    25,
    4,
    LAND_RENT_TIER_2,
    25,
    12,
  ),

  // Position 9: Speculation
  createSpace(9, "Speculation", "speculation", 9),

  // Position 10: Shelter (bottom-left corner, Jail)
  createSpace(10, "Shelter", "jail", 10),

  // ===== LEFT COLUMN (bottom to top, positions 11-19) =====
  // 9 spaces: above Shelter → Cottage Terrace
  // Position 11: Boomtown
  createProperty(
    11,
    "Boomtown",
    11,
    "pale_green",
    50,
    6,
    LAND_RENT_TIER_3,
    50,
    25,
  ),

  // Position 12: Goat Alley
  createProperty(
    12,
    "Goat Alley",
    12,
    "pale_green",
    50,
    8,
    LAND_RENT_TIER_4,
    50,
    25,
  ),

  // Position 13: Soakum Lighting System
  createProperty(
    13,
    "Soakum Lighting System",
    13,
    "yellow",
    50,
    5,
    LAND_RENT_TIER_4,
    50,
    25,
  ),

  // Position 14: Beggarman's Court / Gas Bill
  createSpace(14, "Beggarman's Court", "tax", 14),

  // Position 15: Shooting Star RR (Railroad)
  createRailroad(15, "Shooting Star RR.", 15),

  // Position 16: Rickey Row
  createProperty(
    16,
    "Rickey Row",
    16,
    "pale_green",
    50,
    8,
    LAND_RENT_TIER_4,
    50,
    25,
  ),

  // Position 17: Food - Absolute Necessity $10
  createSpace(17, "Food", "tax", 17),

  // Position 18: Market Place
  createProperty(
    18,
    "Market Place",
    18,
    "pale_green",
    50,
    10,
    LAND_RENT_TIER_5,
    50,
    25,
  ),

  // Position 19: Cottage Terrace
  createProperty(
    19,
    "Cottage Terrace",
    19,
    "pale_green",
    50,
    10,
    LAND_RENT_TIER_5,
    50,
    25,
  ),

  // ===== TOP ROW (left to right, positions 20-30) =====
  // 11 spaces: Chance (Free Parking) → No Trespassing (Go to Jail)
  // Position 20: Chance (top-left corner - Free Parking area)
  createSpace(20, "Chance", "chance", 20),

  // Position 21: Easy Street
  createProperty(
    21,
    "Easy Street",
    21,
    "light_blue",
    75,
    12,
    LAND_RENT_TIER_6,
    50,
    37,
  ),

  // Position 22: Coal Mines (No Trespassing / Special Agent)
  createSpace(22, "Coal Mines", "go_to_jail", 22),

  // Position 23: Johnson Circle
  createProperty(
    23,
    "Johnson Circle",
    23,
    "yellow",
    75,
    14,
    LAND_RENT_TIER_7,
    50,
    37,
  ),

  // Position 24: The Bowery
  createProperty(
    24,
    "The Bowery",
    24,
    "yellow",
    75,
    14,
    LAND_RENT_TIER_7,
    50,
    37,
  ),

  // Position 25: Broadway
  createProperty(25, "Broadway", 25, "pink", 100, 18, LAND_RENT_TIER_9, 75, 50),

  // Position 26: No Trespassing / Go to Jail (top-right corner)
  createSpace(26, "No Trespassing", "go_to_jail", 26),

  // Position 27: Oil Fields
  createProperty(
    27,
    "Oil Fields",
    27,
    "yellow",
    75,
    5,
    LAND_RENT_TIER_4,
    50,
    25,
  ),

  // Position 28: Madison Square
  createProperty(
    28,
    "Madison Square",
    28,
    "pink",
    100,
    20,
    LAND_RENT_TIER_9,
    75,
    50,
  ),

  // Position 29: Fifth Avenue
  createProperty(
    29,
    "Fifth Avenue",
    29,
    "pink",
    100,
    20,
    LAND_RENT_TIER_9,
    75,
    50,
  ),

  // Position 30: P.D.Q. R.R. (Railroad)
  createRailroad(30, "P.D.Q. R.R.", 30),

  // ===== RIGHT COLUMN (top to bottom, positions 31-39) =====
  // 9 spaces: below P.D.Q. R.R. → back to Mother Earth area
  // Position 31: Wall Street
  createProperty(
    31,
    "Wall Street",
    31,
    "light_blue",
    75,
    22,
    LAND_RENT_TIER_10,
    50,
    37,
  ),

  // Position 32: Grand Boulevard
  createProperty(
    32,
    "Grand Boulevard",
    32,
    "light_blue",
    100,
    22,
    LAND_RENT_TIER_10,
    75,
    50,
  ),

  // Position 33: Chance
  createSpace(33, "Chance", "chance", 33),

  // Position 34: Luxury - $75
  createSpace(34, "Luxury", "tax", 34),

  // Position 35: Timberland / No Man's Land
  createProperty(
    35,
    "Timberland",
    35,
    "yellow",
    75,
    5,
    LAND_RENT_TIER_4,
    50,
    25,
  ),

  // Position 36: Public Treasury
  createSpace(36, "Public Treasury", "public_treasury", 36),

  // Position 37: Margin of Cultivation
  createProperty(
    37,
    "Margin of Cultivation",
    37,
    "yellow",
    75,
    5,
    LAND_RENT_TIER_4,
    50,
    25,
  ),

  // Position 38: Land upon which Labor Produces Wages
  createProperty(
    38,
    "Labor Produces Wages",
    38,
    "pale_green",
    25,
    2,
    LAND_RENT_TIER_1,
    25,
    12,
  ),

  // Position 39: (final space before returning to Mother Earth)
  createProperty(
    39,
    "The Landlord's Game",
    39,
    "pale_green",
    25,
    2,
    LAND_RENT_TIER_1,
    25,
    12,
  ),
];

export const colorGroupSizes1906: Record<Exclude<ColorGroup, null>, number> = {
  pale_green: 16,
  light_blue: 4,
  pink: 3,
  yellow: 6,
  // Classic groups (unused in 1906 but required by type)
  brown: 0,
  teal: 0,
  lavender: 0,
  gold: 0,
  orange: 0,
  red: 0,
  green: 0,
  dark_blue: 0,
};

/**
 * Railroad positions for 1906 board.
 */
export const railroadPositions1906 = [6, 15, 30];

/**
 * Railroad section definitions for 1906 rent doubling rule.
 */
export const railroadSections1906: number[][] = [
  [1, 3, 4], // Section 1: Wayback → Absolute Necessity
  [11, 12, 16], // Section 2: Boomtown → Rickey Row
  [21, 23, 24, 28, 29], // Section 3: Easy Street → Fifth Avenue
];

/**
 * 1906 Land Rent Table for programmatic access.
 */
export const LAND_RENT_TABLE_1906: number[][] = [
  LAND_RENT_TIER_1,
  LAND_RENT_TIER_2,
  LAND_RENT_TIER_3,
  LAND_RENT_TIER_4,
  LAND_RENT_TIER_5,
  LAND_RENT_TIER_6,
  LAND_RENT_TIER_7,
  LAND_RENT_TIER_8,
  LAND_RENT_TIER_9,
  LAND_RENT_TIER_10,
];

export const getPropertiesByColorGroup1906 = (
  colorGroup: ColorGroup,
): Property[] => {
  return boardSpaces1906.filter(
    (space): space is Property =>
      space.type === "property" && space.colorGroup === colorGroup,
  );
};
