import type { Space, Property, ColorGroup } from "../types/game";

const createProperty = (
  id: number,
  name: string,
  position: number,
  colorGroup: ColorGroup,
  price: number,
  baseRent: number,
  rents: number[],
  buildingCost: number,
  mortgageValue: number
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
});

const createRailroad = (
  id: number,
  name: string,
  position: number
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
});

const createUtility = (
  id: number,
  name: string,
  position: number
): Property => ({
  id,
  name,
  position,
  type: "utility",
  colorGroup: null,
  price: 150,
  baseRent: 0,
  rents: [],
  buildingCost: 0,
  mortgageValue: 75,
  houses: 0,
  hotel: false,
  mortgaged: false,
});

const createSpace = (
  id: number,
  name: string,
  type: Space["type"],
  position: number
): Space => ({ id, name, type, position });

export const boardSpaces: Space[] = [
  // Bottom row (left to right)
  createSpace(0, "GO", "go", 0),
  createProperty(1, "Mediterranean Avenue", 1, "brown", 60, 2, [2, 10, 30, 90, 160, 250], 50, 30),
  createSpace(2, "Community Chest", "community_chest", 2),
  createProperty(3, "Baltic Avenue", 3, "brown", 60, 4, [4, 20, 60, 180, 320, 450], 50, 30),
  createSpace(4, "Income Tax", "tax", 4),
  createRailroad(5, "Reading Railroad", 5),
  createProperty(6, "Oriental Avenue", 6, "light_blue", 100, 6, [6, 30, 90, 270, 400, 550], 50, 50),
  createSpace(7, "Chance", "chance", 7),
  createProperty(8, "Vermont Avenue", 8, "light_blue", 100, 6, [6, 30, 90, 270, 400, 550], 50, 50),
  createProperty(9, "Connecticut Avenue", 9, "light_blue", 120, 8, [8, 40, 100, 300, 450, 600], 50, 60),

  // Left column (bottom to top)
  createSpace(10, "Jail / Just Visiting", "jail", 10),
  createProperty(11, "St. Charles Place", 11, "pink", 140, 10, [10, 50, 150, 450, 625, 750], 100, 70),
  createUtility(12, "Electric Company", 12),
  createProperty(13, "States Avenue", 13, "pink", 140, 10, [10, 50, 150, 450, 625, 750], 100, 70),
  createProperty(14, "Virginia Avenue", 14, "pink", 160, 12, [12, 60, 180, 500, 700, 900], 100, 80),
  createRailroad(15, "Pennsylvania Railroad", 15),
  createProperty(16, "St. James Place", 16, "orange", 180, 14, [14, 70, 200, 550, 750, 950], 100, 90),
  createSpace(17, "Community Chest", "community_chest", 17),
  createProperty(18, "Tennessee Avenue", 18, "orange", 180, 14, [14, 70, 200, 550, 750, 950], 100, 90),
  createProperty(19, "New York Avenue", 19, "orange", 200, 16, [16, 80, 220, 600, 800, 1000], 100, 100),

  // Top row (right to left)
  createSpace(20, "Free Parking", "free_parking", 20),
  createProperty(21, "Kentucky Avenue", 21, "red", 220, 18, [18, 90, 250, 700, 875, 1050], 150, 110),
  createSpace(22, "Chance", "chance", 22),
  createProperty(23, "Indiana Avenue", 23, "red", 220, 18, [18, 90, 250, 700, 875, 1050], 150, 110),
  createProperty(24, "Illinois Avenue", 24, "red", 240, 20, [20, 100, 300, 750, 925, 1100], 150, 120),
  createRailroad(25, "B. & O. Railroad", 25),
  createProperty(26, "Atlantic Avenue", 26, "yellow", 260, 22, [22, 110, 330, 800, 975, 1150], 150, 130),
  createProperty(27, "Ventnor Avenue", 27, "yellow", 260, 22, [22, 110, 330, 800, 975, 1150], 150, 130),
  createUtility(28, "Water Works", 28),
  createProperty(29, "Marvin Gardens", 29, "yellow", 280, 24, [24, 120, 360, 850, 1025, 1200], 150, 140),

  // Right column (top to bottom)
  createSpace(30, "Go To Jail", "go_to_jail", 30),
  createProperty(31, "Pacific Avenue", 31, "green", 300, 26, [26, 130, 390, 900, 1100, 1275], 200, 150),
  createProperty(32, "North Carolina Avenue", 32, "green", 300, 26, [26, 130, 390, 900, 1100, 1275], 200, 150),
  createSpace(33, "Community Chest", "community_chest", 33),
  createProperty(34, "Pennsylvania Avenue", 34, "green", 320, 28, [28, 150, 450, 1000, 1200, 1400], 200, 160),
  createRailroad(35, "Short Line", 35),
  createSpace(36, "Chance", "chance", 36),
  createProperty(37, "Park Place", 37, "dark_blue", 350, 35, [35, 175, 500, 1100, 1300, 1500], 200, 175),
  createSpace(38, "Luxury Tax", "tax", 38),
  createProperty(39, "Boardwalk", 39, "dark_blue", 400, 50, [50, 200, 600, 1400, 1700, 2000], 200, 200),
];

export const colorGroupSizes: Record<Exclude<ColorGroup, null>, number> = {
  brown: 2,
  light_blue: 3,
  pink: 3,
  orange: 3,
  red: 3,
  yellow: 3,
  green: 3,
  dark_blue: 2,
};

export const getPropertiesByColorGroup = (colorGroup: ColorGroup): Property[] => {
  return boardSpaces.filter(
    (space): space is Property =>
      space.type === "property" && space.colorGroup === colorGroup
  );
};
