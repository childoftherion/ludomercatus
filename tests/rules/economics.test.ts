import { describe, it, expect } from "bun:test";
import type { GameState, Player, Property } from "../../src/types/game";
import {
  calculateGoSalary,
  calculateTenPercentTax,
  calculateNetWorth,
  getOptimalTaxChoice,
  getCurrentPropertyPrice,
} from "../../src/logic/rules/economics";

const makePlayer = (overrides: Partial<Player>): Player =>
  ({
    id: 0,
    name: "P0",
    token: "car",
    cash: 1500,
    position: 0,
    properties: [],
    inJail: false,
    jailTurns: 0,
    jailFreeCards: 0,
    bankrupt: false,
    color: "#fff",
    isAI: false,
    aiDifficulty: null,
    clientId: null,
    lastTradeTurn: -10,
    tradeHistory: null,
    bankLoans: [],
    totalDebt: 0,
    iousReceivable: [],
    iousPayable: [],
    inChapter11: false,
    chapter11TurnsRemaining: 0,
    chapter11DebtTarget: 0,
    isConnected: true,
    ...overrides,
  }) as Player;

const makeProperty = (overrides: Partial<Property>): Property =>
  ({
    id: 1,
    name: "Example Ave",
    type: "property",
    position: 1,
    price: 200,
    baseRent: 16,
    rents: [0, 0, 0, 0, 0, 0],
    buildingCost: 100,
    mortgageValue: 100,
    owner: 0,
    houses: 0,
    hotel: false,
    mortgaged: false,
    colorGroup: "brown",
    isInsured: false,
    insurancePaidUntilRound: 0,
    valueMultiplier: 1.0,
    ...overrides,
  }) as Property;

const makeState = (overrides: Partial<GameState>): GameState =>
  ({
    players: [makePlayer({})],
    currentPlayerIndex: 0,
    spaces: [],
    chanceDeck: [],
    communityChestDeck: [],
    diceRoll: null,
    consecutiveDoubles: 0,
    phase: "rolling",
    turn: 1,
    winner: null,
    lastDiceRoll: null,
    passedGo: false,
    auction: null,
    trade: null,
    previousPhase: null,
    lastCardDrawn: null,
    gameLog: [],
    roomId: null,
    settings: {
      hideOpponentWealth: false,
      hideOpponentProperties: false,
      enableHousingScarcity: true,
      enableBankLoans: true,
      loanInterestRate: 0.1,
      maxLoanPercent: 0.5,
      enableEconomicEvents: true,
      enableRentNegotiation: true,
      iouInterestRate: 0.05,
      iouDurationRounds: 5,
      enablePropertyInsurance: true,
      insuranceCostPercent: 0.05,
      enablePropertyValueFluctuation: false,
      appreciationRate: 0.05,
      enableBankruptcyRestructuring: true,
      chapter11Turns: 5,
      enableInflation: true,
      enableProgressiveTax: true,
      jailPenaltyRate: 0.01,
      reducedMotion: false,
    },
    roundsCompleted: 0,
    currentGoSalary: 200,
    awaitingTaxDecision: null,
    availableHouses: 32,
    availableHotels: 12,
    utilityMultiplierOverride: null,
    activeEconomicEvents: [],
    pendingRentNegotiation: null,
    pendingBankruptcy: null,
    pendingDebtService: null,
    pendingForeclosure: null,
    jackpot: 0,
    marketHistory: [],
    turnStartTime: Date.now(),
    ...overrides,
  }) as GameState;

describe("economics rules", () => {
  it("calculates progressive GO salary with inflation and caps growth", () => {
    expect(calculateGoSalary(0)).toBe(200);
    expect(calculateGoSalary(1)).toBe(200);
    expect(calculateGoSalary(2)).toBe(225);
    expect(calculateGoSalary(6)).toBe(275);
    expect(calculateGoSalary(100)).toBe(350);
  });

  it("computes progressive tax choice based on net worth", () => {
    const lowWealthProperty = makeProperty({ id: 2, price: 100, mortgageValue: 50 });
    const lowNetWorthState = makeState({
      players: [makePlayer({ cash: 1500, properties: [lowWealthProperty.id] })],
      spaces: [lowWealthProperty],
    });

    expect(calculateTenPercentTax(lowNetWorthState, 0)).toBe(160);
    expect(getOptimalTaxChoice(lowNetWorthState, 0)).toEqual({
      choice: "percentage",
      amount: 160,
    });

    const highWealthProperty = makeProperty({ id: 3, price: 4000, mortgageValue: 2000 });
    const highNetWorthState = makeState({
      players: [makePlayer({ cash: 3000, properties: [highWealthProperty.id] })],
      spaces: [highWealthProperty],
    });

    expect(calculateTenPercentTax(highNetWorthState, 0)).toBe(700);
    expect(getOptimalTaxChoice(highNetWorthState, 0)).toEqual({
      choice: "flat",
      amount: 200,
    });
  });

  it("applies economic events to property pricing", () => {
    const baseProperty = makeProperty({ id: 5, price: 200, valueMultiplier: 1.2 });
    const recessionProperty = { ...baseProperty, id: 6, valueMultiplier: 1.0 };
    const baseState = makeState({
      spaces: [baseProperty],
      players: [makePlayer({ properties: [baseProperty.id] })],
    });
    expect(getCurrentPropertyPrice(baseState, baseProperty)).toBe(240);

    const crashState = makeState({
      spaces: [recessionProperty],
      players: [makePlayer({ properties: [recessionProperty.id] })],
      activeEconomicEvents: [{ type: "market_crash", turnsRemaining: 3, description: "Crash" }],
    });
    expect(getCurrentPropertyPrice(crashState, recessionProperty)).toBe(160);

    const bullState = makeState({
      spaces: [baseProperty],
      players: [makePlayer({ properties: [baseProperty.id] })],
      activeEconomicEvents: [{ type: "bull_market", turnsRemaining: 3, description: "Bull" }],
    });
    expect(getCurrentPropertyPrice(bullState, baseProperty)).toBe(288);
  });

  it("calculates net worth with ownership and liquidation values", () => {
    const property = makeProperty({
      id: 7,
      price: 220,
      mortgageValue: 110,
      houses: 2,
      buildingCost: 100,
      mortgaged: true,
    });
    const state = makeState({
      players: [
        makePlayer({
          cash: 250,
          properties: [property.id],
        }),
      ],
      spaces: [property],
    });

    expect(calculateNetWorth(state, 0)).toBe(460);
  });
});

