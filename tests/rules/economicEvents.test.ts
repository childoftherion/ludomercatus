import { describe, it, expect } from "bun:test";
import type { GameState, Player, Property } from "../../src/types/game";
import { DEFAULT_GAME_SETTINGS } from "../../src/types/game";
import {
  isEconomicEventActive,
  applyRentEventModifier,
  applyPriceEventModifier,
  getCurrentPropertyPrice,
} from "../../src/logic/rules/economics";
import { calculateRent } from "../../src/logic/rules/rent";

const makePlayer = (overrides: Partial<Player> = {}): Player =>
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
    previousClientId: null,
    lastTradeTurn: -10,
    tradeHistory: null,
    bankLoans: [],
    totalDebt: 0,
    iousReceivable: [],
    iousPayable: [],
    inChapter11: false,
    chapter11TurnsRemaining: 0,
    chapter11DebtTarget: 0,
    chapter11CreditorIndex: undefined,
    isConnected: true,
    ...overrides,
  }) as Player;

const makeProperty = (overrides: Partial<Property> = {}): Property =>
  ({
    id: 1,
    name: "Park Place",
    type: "property",
    position: 37,
    price: 350,
    baseRent: 35,
    rents: [35, 175, 500, 1100, 1300, 1500],
    buildingCost: 200,
    mortgageValue: 175,
    owner: 0,
    houses: 0,
    hotel: false,
    mortgaged: false,
    colorGroup: "dark_blue",
    isInsured: false,
    insurancePaidUntilRound: 0,
    valueMultiplier: 1.0,
    ...overrides,
  }) as Property;

const makeState = (overrides: Partial<GameState> = {}): GameState =>
  ({
    players: [makePlayer(), makePlayer({ id: 1, name: "P1" })],
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
    settings: { ...DEFAULT_GAME_SETTINGS },
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

describe("isEconomicEventActive", () => {
  it("returns false when no events are active", () => {
    const state = makeState({ activeEconomicEvents: [] });
    expect(isEconomicEventActive(state, "recession")).toBe(false);
  });

  it("returns true when the specified event is active", () => {
    const state = makeState({
      activeEconomicEvents: [
        { type: "recession", turnsRemaining: 3, description: "Recession" },
      ],
    });
    expect(isEconomicEventActive(state, "recession")).toBe(true);
  });

  it("returns false for a different event type", () => {
    const state = makeState({
      activeEconomicEvents: [
        { type: "bull_market", turnsRemaining: 2, description: "Bull" },
      ],
    });
    expect(isEconomicEventActive(state, "recession")).toBe(false);
  });
});

describe("applyRentEventModifier", () => {
  it("returns unmodified rent when no events are active", () => {
    const state = makeState();
    expect(applyRentEventModifier(state, 100)).toBe(100);
  });

  it("applies 25% reduction for recession", () => {
    const state = makeState({
      activeEconomicEvents: [
        { type: "recession", turnsRemaining: 3, description: "Recession" },
      ],
    });
    expect(applyRentEventModifier(state, 100)).toBe(75);
  });

  it("applies 20% reduction for market_crash", () => {
    const state = makeState({
      activeEconomicEvents: [
        { type: "market_crash", turnsRemaining: 3, description: "Crash" },
      ],
    });
    expect(applyRentEventModifier(state, 100)).toBe(80);
  });

  it("applies 15% reduction for market_crash_1 (speculative bubble)", () => {
    const state = makeState({
      activeEconomicEvents: [
        { type: "market_crash_1", turnsRemaining: 2, description: "Bubble" },
      ],
    });
    expect(applyRentEventModifier(state, 100)).toBe(85);
  });

  it("applies 15% increase for market_crash_2 (yield crisis)", () => {
    const state = makeState({
      activeEconomicEvents: [
        { type: "market_crash_2", turnsRemaining: 2, description: "Crisis" },
      ],
    });
    expect(applyRentEventModifier(state, 100)).toBe(115);
  });

  it("applies 20% increase for bull_market", () => {
    const state = makeState({
      activeEconomicEvents: [
        { type: "bull_market", turnsRemaining: 2, description: "Bull" },
      ],
    });
    expect(applyRentEventModifier(state, 100)).toBe(120);
  });
});

describe("applyPriceEventModifier", () => {
  it("returns rounded price when no events are active", () => {
    const state = makeState();
    expect(applyPriceEventModifier(state, 200)).toBe(200);
  });

  it("applies 20% reduction for market_crash", () => {
    const state = makeState({
      activeEconomicEvents: [
        { type: "market_crash", turnsRemaining: 3, description: "Crash" },
      ],
    });
    expect(applyPriceEventModifier(state, 200)).toBe(160);
  });

  it("applies 15% increase for market_crash_1", () => {
    const state = makeState({
      activeEconomicEvents: [
        { type: "market_crash_1", turnsRemaining: 2, description: "Bubble" },
      ],
    });
    expect(applyPriceEventModifier(state, 200)).toBe(230);
  });

  it("applies 15% reduction for market_crash_2", () => {
    const state = makeState({
      activeEconomicEvents: [
        { type: "market_crash_2", turnsRemaining: 2, description: "Crisis" },
      ],
    });
    expect(applyPriceEventModifier(state, 200)).toBe(170);
  });

  it("applies 20% increase for bull_market", () => {
    const state = makeState({
      activeEconomicEvents: [
        { type: "bull_market", turnsRemaining: 2, description: "Bull" },
      ],
    });
    expect(applyPriceEventModifier(state, 200)).toBe(240);
  });
});

describe("centralized modifiers match in rent.ts and economics.ts", () => {
  it("recession affects rent through calculateRent via the shared modifier", () => {
    // Use a railroad to avoid monopoly doubling
    const property = makeProperty({
      id: 1,
      type: "railroad",
      baseRent: 25,
      rents: [25, 50, 100, 200, 0, 0],
      owner: 0,
      houses: 0,
      hotel: false,
      mortgaged: false,
      colorGroup: undefined as any,
    });
    const state = makeState({
      spaces: [property],
      players: [makePlayer({ id: 0 })],
      activeEconomicEvents: [
        { type: "recession", turnsRemaining: 3, description: "Recession" },
      ],
    });

    const rent = calculateRent(state, property, 7);
    expect(rent).toBe(19); // 25 * 0.75 = 18.75, rounded to 19
  });

  it("bull market affects both rent and property price consistently", () => {
    const property = makeProperty({
      id: 1,
      type: "railroad",
      price: 200,
      baseRent: 25,
      rents: [25, 50, 100, 200, 0, 0],
      owner: 0,
      houses: 0,
      hotel: false,
      mortgaged: false,
      valueMultiplier: 1.0,
      colorGroup: undefined as any,
    });
    const state = makeState({
      spaces: [property],
      players: [makePlayer({ id: 0 })],
      activeEconomicEvents: [
        { type: "bull_market", turnsRemaining: 3, description: "Bull" },
      ],
    });

    expect(calculateRent(state, property, 7)).toBe(30); // 25 * 1.2
    expect(getCurrentPropertyPrice(state, property)).toBe(240); // 200 * 1.2
  });

  it("no economic events leave both rent and price unchanged", () => {
    const property = makeProperty({
      id: 1,
      type: "railroad",
      price: 300,
      baseRent: 50,
      rents: [50, 100, 200, 400, 0, 0],
      owner: 0,
      houses: 0,
      hotel: false,
      mortgaged: false,
      valueMultiplier: 1.0,
      colorGroup: undefined as any,
    });
    const state = makeState({
      spaces: [property],
      players: [makePlayer({ id: 0 })],
      activeEconomicEvents: [],
    });

    expect(calculateRent(state, property, 7)).toBe(50);
    expect(getCurrentPropertyPrice(state, property)).toBe(300);
  });
});
