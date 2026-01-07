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
  // Phase 3: Property Insurance
  isInsured: boolean;
  insurancePaidUntilRound: number; // Round number until which insurance is valid
  // Phase 3: Property Value Fluctuation
  valueMultiplier: number; // 1.0 = base value, 1.2 = 20% appreciation, 0.8 = 20% depreciation
}

// Bank loan structure
export interface BankLoan {
  id: number;
  amount: number;
  interestRate: number; // e.g., 0.10 for 10%
  turnTaken: number; // Turn number when loan was taken
  totalOwed: number; // Current amount owed (principal + accumulated interest)
}

// IOU structure for rent negotiation (Phase 3)
export interface IOU {
  id: number;
  debtorId: number; // Player who owes money
  creditorId: number; // Player who is owed money
  originalAmount: number; // Original debt amount
  currentAmount: number; // Current amount with interest
  interestRate: number; // e.g., 0.05 for 5% per turn
  turnCreated: number;
  reason: string; // e.g., "Rent for Boardwalk"
}

export type AIDifficulty = "easy" | "medium" | "hard";

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
  aiDifficulty: AIDifficulty | null; // Difficulty level for AI players
  clientId: string | null; // Unique ID for multiplayer identity
  lastTradeTurn: number | null; // Turn number when they last proposed a trade
  tradeHistory: Record<string, { attempts: number; lastOffer: number }> | null; // Key: "playerId-propertyId"
  
  // Bank Loans (Phase 2)
  bankLoans: BankLoan[];
  totalDebt: number; // Sum of all loan totalOwed
  
  // IOUs (Phase 3) - debts owed TO this player by others
  iousReceivable: IOU[];
  // IOUs (Phase 3) - debts this player owes TO others
  iousPayable: IOU[];
  
  // Phase 3: Bankruptcy Restructuring (Chapter 11)
  inChapter11: boolean;
  chapter11TurnsRemaining: number; // Turns left to pay off debts
  chapter11DebtTarget: number; // Amount that must be paid off
  isMobile?: boolean; // Whether the player is on a mobile device
}

// Restructuring plan for Chapter 11 bankruptcy
export interface RestructuringPlan {
  totalDebt: number;
  turnsToRepay: number;
  paymentPerTurn: number;
  rentReduction: number; // e.g., 0.5 for 50% of rent collected
}

export type CardType = "chance" | "community_chest" | "economic_event";

// Economic Event types for Phase 2
export type EconomicEventType = 
  | "recession"        // All rents reduced by 25% for X turns
  | "housing_boom"     // Building costs increase 50% for X turns
  | "tax_holiday"      // No income tax for X turns
  | "market_crash"     // Property values drop 20% for X turns
  | "bull_market"      // Property values increase 20% for X turns
  | "banking_crisis"   // Interest rates double for X turns
  | "economic_stimulus"; // All players collect £100

export interface ActiveEconomicEvent {
  type: EconomicEventType;
  turnsRemaining: number;
  description: string;
}

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
  utilityMultiplier?: number;  // Override utility rent multiplier (e.g., 10x for card-triggered moves)
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
  | "lobby"
  | "rolling"
  | "moving"
  | "resolving_space"
  | "awaiting_buy_decision"  // Player deciding to buy or auction
  | "awaiting_tax_decision"  // Player choosing between flat tax or percentage
  | "awaiting_rent_negotiation" // Player negotiating rent payment (Phase 3)
  | "awaiting_bankruptcy_decision" // Player choosing bankruptcy or restructuring (Phase 3)
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
  status: "draft" | "pending" | "accepted" | "rejected" | "cancelled" | "counter_pending";
  counterOffer: TradeOffer | null; // Counter-offer made by receiver
  counterOfferMadeBy: number | null; // Player index who made the counter-offer (to track one per player)
}

// Game event log entry
export interface GameLogEntry {
  id: number;
  timestamp: number;
  playerIndex?: number;
  message: string;
  type: "roll" | "move" | "buy" | "rent" | "card" | "jail" | "tax" | "auction" | "trade" | "bankrupt" | "system";
}

// Game settings that can be configured at game start
export interface GameSettings {
  // Privacy settings (realistic economic simulation)
  hideOpponentWealth: boolean; // Hide cash and net worth from other players
  hideOpponentProperties: boolean; // Hide property details (only show count)
  
  // Phase 2: Housing scarcity
  enableHousingScarcity: boolean; // Limit houses to 32, hotels to 12
  
  // Phase 2: Bank Loans
  enableBankLoans: boolean; // Allow players to take loans from the bank
  loanInterestRate: number; // Interest rate per turn (e.g., 0.10 for 10%)
  maxLoanPercent: number; // Max loan as percentage of net worth (e.g., 0.5 for 50%)
  
  // Phase 2: Economic Events
  enableEconomicEvents: boolean; // Random economic events on Free Parking
  
  // Phase 3: Rent Negotiation
  enableRentNegotiation: boolean; // Allow rent payment plans and IOUs
  iouInterestRate: number; // Interest rate on IOUs per turn (e.g., 0.05 for 5%)
  
  // Phase 3: Property Insurance
  enablePropertyInsurance: boolean; // Allow players to insure properties
  insuranceCostPercent: number; // Insurance cost as % of property value per round
  
  // Phase 3: Property Value Fluctuation
  enablePropertyValueFluctuation: boolean; // Allow property values to change
  appreciationRate: number; // Rate of appreciation when color group develops (e.g., 0.05 for 5%)
  
  // Phase 3: Bankruptcy Restructuring
  enableBankruptcyRestructuring: boolean; // Allow Chapter 11 style restructuring
  chapter11Turns: number; // Turns to repay debt in restructuring
  
  // Economic features
  enableInflation: boolean; // GO salary increases over time
  enableProgressiveTax: boolean; // Income tax choice (10% vs flat)
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  hideOpponentWealth: false,
  hideOpponentProperties: false,
  enableHousingScarcity: true,
  enableBankLoans: true,
  loanInterestRate: 0.10, // 10% interest per turn
  maxLoanPercent: 0.50, // Can borrow up to 50% of net worth
  enableEconomicEvents: true,
  enableRentNegotiation: true,
  iouInterestRate: 0.05, // 5% interest per turn
  enablePropertyInsurance: true,
  insuranceCostPercent: 0.05, // 5% of property value
  enablePropertyValueFluctuation: true,
  appreciationRate: 0.05, // 5% appreciation per development step
  enableBankruptcyRestructuring: true,
  chapter11Turns: 5,
  enableInflation: true,
  enableProgressiveTax: true,
};

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  spaces: Space[];
  chanceDeck: Card[];
  communityChestDeck: Card[];
  diceRoll: DiceRoll | null;
  consecutiveDoubles: number;
  phase: GamePhase;
  turn: number; // Current turn number
  winner: number | null;
  lastDiceRoll: DiceRoll | null;
  passedGo: boolean;
  auction: AuctionState | null;
  trade: TradeState | null;
  previousPhase: GamePhase | null;
  lastCardDrawn: Card | null;
  gameLog: GameLogEntry[];
  roomId: string | null; // Current room ID

  // Game settings
  settings: GameSettings;

  // Phase 1: Economic Realism Features
  roundsCompleted: number; // Number of full rounds (all players have had a turn)
  currentGoSalary: number; // Current GO salary (increases with inflation)

  // Tax decision state
  awaitingTaxDecision: {
    playerIndex: number;
    flatAmount: number;
    percentageAmount: number;
  } | null;

  // Phase 2: Housing Scarcity
  availableHouses: number; // Max 32
  availableHotels: number; // Max 12
  
  // Card-triggered utility multiplier override
  utilityMultiplierOverride: number | null; // When set, use this instead of normal utility rent calculation
  
  // Phase 2: Economic Events
  activeEconomicEvents: ActiveEconomicEvent[];
  
  // Phase 3: Rent Negotiation
  pendingRentNegotiation: {
    debtorIndex: number;
    creditorIndex: number;
    propertyId: number;
    rentAmount: number;
    debtorCanAfford: number;
  } | null;
  
  // Phase 3: Bankruptcy Restructuring
  pendingBankruptcy: {
    playerIndex: number;
    creditorIndex?: number;
    debtAmount: number;
  } | null;
  
  // Jackpot system
  jackpot: number; // Accumulated jackpot from mortgage contributions
}
