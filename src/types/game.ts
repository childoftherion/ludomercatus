export type SpaceType =
  | "go"
  | "property"
  | "railroad"
  | "utility"
  | "tax"
  | "chance"
  | "community_chest"
  | "jail"
  | "go_to_jail"
  | "free_parking"
  | "corner";

export type ColorGroup =
  | "brown"
  | "light_blue"
  | "pink"
  | "orange"
  | "red"
  | "yellow"
  | "green"
  | "dark_blue"
  | null;

export interface Space {
  id: number;
  name: string;
  type: SpaceType;
  position: number;
  colorGroup?: ColorGroup;
}

export interface Property extends Space {
  type: "property" | "railroad" | "utility";
  price: number;
  baseRent: number;
  rents: number[];
  buildingCost?: number;
  mortgageValue: number;
  owner?: number;
  houses: number;
  hotel: boolean;
  mortgaged: boolean;
}

export interface Player {
  id: number;
  name: string;
  token: string;
  cash: number;
  position: number;
  properties: number[];  // Array of property IDs (was Property[])
  inJail: boolean;
  jailTurns: number;
  jailFreeCards: number;
  bankrupt: boolean;
  color: string;
  isAI: boolean;
}

export type CardType = "chance" | "community_chest";

// CardEffect describes what a card does (immutable approach)
export interface CardEffect {
  cashChange?: number;
  positionChange?: number | "jail";
  jailFreeCard?: boolean;
  collectFromEach?: number;  // Collect $ from each player
  payToEach?: number;        // Pay $ to each player
  perHouseCost?: number;
  perHotelCost?: number;
  passGoBonus?: boolean;     // Award GO bonus if passing
  triggerSpaceResolution?: boolean;  // Resolve the new space after moving
}

export interface Card {
  id: number;
  type: CardType;
  text: string;
  getEffect: (gameState: GameState, playerIndex: number) => CardEffect;
}

export type DiceRoll = {
  die1: number;
  die2: number;
  total: number;
  isDoubles: boolean;
};

export type GamePhase =
  | "setup"
  | "rolling"
  | "moving"
  | "resolving_space"
  | "awaiting_buy_decision"  // Player deciding to buy or auction
  | "trading"
  | "building"
  | "auction"
  | "jail_decision"          // Player in jail choosing action
  | "game_over";

// Auction state for when a property goes to auction
export interface AuctionState {
  propertyId: number;
  currentBid: number;
  highestBidder: number | null;
  activePlayerIndex: number;  // Whose turn to bid
  passedPlayers: number[];    // Player indices who passed (using array for serialization)
}

// Trade offer structure
export interface TradeOffer {
  fromPlayer: number;
  toPlayer: number;
  cashOffered: number;
  propertiesOffered: number[];  // Property IDs
  jailCardsOffered: number;
  cashRequested: number;
  propertiesRequested: number[];
  jailCardsRequested: number;
}

// Trade state
export interface TradeState {
  offer: TradeOffer;
  status: "draft" | "pending" | "accepted" | "rejected" | "cancelled";
}

// Game event log entry
export interface GameLogEntry {
  id: number;
  timestamp: number;
  playerIndex?: number;
  message: string;
  type: "roll" | "move" | "buy" | "rent" | "card" | "jail" | "tax" | "auction" | "trade" | "bankrupt" | "system";
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  spaces: Space[];
  chanceDeck: Card[];
  communityChestDeck: Card[];
  diceRoll?: DiceRoll;
  consecutiveDoubles: number;
  phase: GamePhase;
  winner?: number;
  lastDiceRoll?: DiceRoll;
  passedGo: boolean;
  auction?: AuctionState;
  trade?: TradeState;
  lastCardDrawn?: Card;
  gameLog: GameLogEntry[];
}
