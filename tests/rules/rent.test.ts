import { describe, it, expect } from "bun:test";
import { calculateRent } from "../../src/logic/rules/rent";
import type { GameState, Property } from "../../src/types/game";

// Helper to build a minimal GameState for calculateRent tests.
// We only populate the fields that rent logic and monopoly helpers actually touch.
const makeState = (overrides: Partial<GameState>): GameState => {
  return {
    players: [],
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
  } as GameState;
};

describe("rent rules (core Monopoly logic)", () => {
  it("charges base rent and doubles it for a monopoly with no houses", () => {
    const ownerIndex = 0;
    const propertyA: Property = {
      id: 1,
      name: "Brown A",
      type: "property",
      position: 1,
      price: 60,
      baseRent: 2,
      rents: [0, 10, 30, 90, 160, 250],
      buildingCost: 50,
      mortgageValue: 30,
      owner: ownerIndex,
      houses: 0,
      hotel: false,
      mortgaged: false,
      colorGroup: "brown",
      isInsured: false,
      insurancePaidUntilRound: 0,
      valueMultiplier: 1.0,
    };
    const propertyB: Property = {
      ...propertyA,
      id: 3,
      name: "Brown B",
      position: 3,
    };

    const state = makeState({
      players: [
        {
          id: ownerIndex,
          name: "P0",
          token: "car",
          cash: 1500,
          position: 0,
          properties: [1, 3],
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
          previousClientId: null,
        },
      ],
      spaces: [propertyA, propertyB],
    });

    // With a monopoly and no houses, rent should be doubled.
    const rent = calculateRent(state, propertyA, 0);
    expect(rent).toBe(4);
  });

  it("uses house/hotel rent values instead of base/monopoly rent", () => {
    const ownerIndex = 0;
    const property: Property = {
      id: 5,
      name: "Pink A",
      type: "property",
      position: 5,
      price: 140,
      baseRent: 10,
      rents: [0, 50, 150, 450, 625, 750],
      buildingCost: 100,
      mortgageValue: 70,
      owner: ownerIndex,
      houses: 2,
      hotel: false,
      mortgaged: false,
      colorGroup: "pink",
      isInsured: false,
      insurancePaidUntilRound: 0,
      valueMultiplier: 1.0,
    };

    const state = makeState({
      players: [
        {
          id: ownerIndex,
          name: "P0",
          token: "car",
          cash: 1500,
          position: 0,
          properties: [5],
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
          previousClientId: null,
        },
      ],
      spaces: [property],
    });

    const rent = calculateRent(state, property, 0);
    expect(rent).toBe(150); // rents[2]
  });

  it("computes railroad rent as base * 2^(n-1) for n railroads", () => {
    const ownerIndex = 0;
    const makeRailroad = (id: number): Property => ({
      id,
      name: `Railroad ${id}`,
      type: "railroad",
      position: id,
      price: 200,
      baseRent: 25,
      rents: [],
      buildingCost: undefined,
      mortgageValue: 100,
      owner: ownerIndex,
      houses: 0,
      hotel: false,
      mortgaged: false,
      colorGroup: null,
      isInsured: false,
      insurancePaidUntilRound: 0,
      valueMultiplier: 1.0,
    });

    const r1 = makeRailroad(10);
    const r2 = makeRailroad(11);
    const r3 = makeRailroad(12);
    const r4 = makeRailroad(13);

    const state = makeState({
      players: [
        {
          id: ownerIndex,
          name: "P0",
          token: "car",
          cash: 1500,
          position: 0,
          properties: [10, 11, 12, 13],
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
          previousClientId: null,
        },
      ],
      spaces: [r1, r2, r3, r4],
    });

    // Start with only one owned railroad
    r2.owner = undefined as any;
    r3.owner = undefined as any;
    r4.owner = undefined as any;
    expect(calculateRent(state, r1, 0)).toBe(25);  // 1 railroad

    // Now give the player a second railroad
    r2.owner = ownerIndex;
    expect(calculateRent(state, r1, 0)).toBe(50);  // 2 railroads
  });

  it("computes utility rent as 4x or 10x dice roll depending on utilities owned", () => {
    const ownerIndex = 0;
    const makeUtility = (id: number, name: string): Property => ({
      id,
      name,
      type: "utility",
      position: id,
      price: 150,
      baseRent: 0,
      rents: [],
      buildingCost: undefined,
      mortgageValue: 75,
      owner: ownerIndex,
      houses: 0,
      hotel: false,
      mortgaged: false,
      colorGroup: null,
      isInsured: false,
      insurancePaidUntilRound: 0,
      valueMultiplier: 1.0,
    });

    const electric = makeUtility(20, "Electric Company");
    const water = makeUtility(28, "Water Works");

    const state = makeState({
      players: [
        {
          id: ownerIndex,
          name: "P0",
          token: "car",
          cash: 1500,
          position: 0,
          properties: [20, 28],
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
          previousClientId: null,
        },
      ],
      spaces: [electric, water],
    });

    const diceTotal = 7;
    // With two utilities, multiplier should be 10
    expect(calculateRent(state, electric, diceTotal)).toBe(70);

    // With only one utility, multiplier should be 4
    water.owner = undefined as any;
    expect(calculateRent(state, electric, diceTotal)).toBe(28);
  });

  it("applies economic event modifiers to rent", () => {
    const ownerIndex = 0;
    const property: Property = {
      id: 6,
      name: "Boardwalk",
      type: "property",
      position: 6,
      price: 400,
      baseRent: 50,
      rents: [0, 200, 600, 1400, 1700, 2000],
      buildingCost: 200,
      mortgageValue: 200,
      owner: ownerIndex,
      houses: 0,
      hotel: false,
      mortgaged: false,
      colorGroup: null,
      isInsured: false,
      insurancePaidUntilRound: 0,
      valueMultiplier: 1.0,
    };

    const state = makeState({
      players: [
        {
          id: ownerIndex,
          name: "P0",
          token: "car",
          cash: 1500,
          position: 0,
          properties: [6],
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
          previousClientId: null,
        },
      ],
      spaces: [property],
      activeEconomicEvents: [
        { type: "recession", turnsRemaining: 2, description: "Recession" },
      ],
    });

    expect(calculateRent(state, property, 0)).toBe(38);
  });
});


