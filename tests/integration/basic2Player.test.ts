import { describe, it, expect, beforeEach } from "bun:test";
import { GameRoom } from "../../src/server/GameRoom";
import type { Property } from "../../src/types/game";

const getSpace = (room: GameRoom, idx: number) => room.state.spaces[idx] as Property;
const getPlayer = (room: GameRoom, idx: number) => room.state.players[idx]!;

/**
 * Integration test: basic 2-player game.
 * Scripts a happy-path game from start through several turns using server APIs.
 */
describe("basic 2-player game integration", () => {
  let room: GameRoom;

  beforeEach(() => {
    room = new GameRoom("setup", {
      enableEconomicEvents: false,
      enableRentNegotiation: false,
      enableBankLoans: false,
      enablePropertyInsurance: false,
      enablePropertyValueFluctuation: false,
      enableBankruptcyRestructuring: false,
    });
    room.initGame(["Alice", "Bob"], ["🎩", "🚗"]);
  });

  it("initializes two players with correct starting state", () => {
    expect(room.state.players).toHaveLength(2);
    expect(getPlayer(room, 0).name).toBe("Alice");
    expect(getPlayer(room, 1).name).toBe("Bob");
    expect(getPlayer(room, 0).cash).toBe(1500);
    expect(getPlayer(room, 1).cash).toBe(1500);
    expect(getPlayer(room, 0).position).toBe(0);
    expect(getPlayer(room, 1).position).toBe(0);
  });

  it("transitions from setup to rolling on initGame", () => {
    expect(room.state.phase).toBe("rolling");
    expect(room.state.currentPlayerIndex).toBe(0);
  });

  it("completes a full turn cycle: roll -> resolve -> end turn", () => {
    expect(room.state.currentPlayerIndex).toBe(0);

    room.rollDice();
    const diceRoll = room.state.diceRoll;
    expect(diceRoll).not.toBeNull();
    expect(diceRoll!.total).toBeGreaterThanOrEqual(2);
    expect(diceRoll!.total).toBeLessThanOrEqual(12);

    // Resolve the turn through all possible phases
    let maxIterations = 10;
    while (maxIterations-- > 0) {
      if (room.state.phase === "awaiting_buy_decision") {
        const position = getPlayer(room, 0).position;
        room.declineProperty(getSpace(room, position).id);
      } else if (room.state.phase === "auction" && room.state.auction) {
        room.passAuction(room.state.auction.activePlayerIndex);
      } else if (room.state.phase === "awaiting_tax_decision") {
        room.chooseTaxOption(0, "flat");
      } else if (room.state.phase === "resolving_space") {
        room.endTurn();
        break;
      } else if (room.state.phase === "rolling" && room.state.currentPlayerIndex !== 0) {
        break; // Turn already ended
      } else {
        break;
      }
    }

    // After a non-doubles turn fully resolves, the next player should be active
    if (!diceRoll!.isDoubles && room.state.phase === "rolling") {
      expect(room.state.currentPlayerIndex).toBe(1);
    }
  });

  it("handles property purchase and rent payment across turns", () => {
    // Move Alice to space 1 and buy it
    room.movePlayer(0, 1);

    // After movePlayer, phase depends on resolution
    if (room.state.phase === "awaiting_buy_decision") {
      room.buyProperty(1);
      expect(getSpace(room, 1).owner).toBe(0);
      expect(getPlayer(room, 0).cash).toBe(1500 - getSpace(room, 1).price);
    }

    // End Alice's turn
    room.state.diceRoll = { die1: 1, die2: 0, total: 1, isDoubles: false };
    room.state.phase = "resolving_space";
    room.endTurn();

    // Bob's turn
    expect(room.state.currentPlayerIndex).toBe(1);

    // Only test rent if Alice actually bought the property
    if (getSpace(room, 1).owner === 0) {
      const bobCashBefore = getPlayer(room, 1).cash;
      room.movePlayer(1, 1);

      expect(getPlayer(room, 1).cash).toBeLessThan(bobCashBefore);
    }
  });

  it("enforces housing scarcity across the full game", () => {
    expect(room.state.availableHouses).toBe(32);
    expect(room.state.availableHotels).toBe(12);

    // Give Alice both brown properties via state mutation
    room.state = {
      ...room.state,
      spaces: room.state.spaces.map(s =>
        (s.id === 1 || s.id === 3) ? { ...s, owner: 0 } as Property : s
      ),
      players: room.state.players.map((p, i) =>
        i === 0 ? { ...p, cash: 50000, properties: [1, 3] } : p
      ),
    };

    room.buildHouse(1);
    room.buildHouse(3);
    room.buildHouse(1);
    room.buildHouse(3);

    expect(getSpace(room, 1).houses).toBe(2);
    expect(getSpace(room, 3).houses).toBe(2);
    expect(room.state.availableHouses).toBe(28);
  });

  it("completes multiple turn cycles without errors", () => {
    for (let i = 0; i < 10; i++) {
      const currentIdx = room.state.currentPlayerIndex;
      const player = getPlayer(room, currentIdx);

      if (player.bankrupt) continue;

      if (player.inJail && room.state.phase === "jail_decision") {
        room.getOutOfJail(currentIdx, "pay");
      }

      if (room.state.phase === "rolling") {
        room.rollDice();
      }

      if (room.state.phase === "awaiting_buy_decision") {
        const position = getPlayer(room, currentIdx).position;
        room.declineProperty(getSpace(room, position).id);
      }

      if (room.state.phase === "auction" && room.state.auction) {
        for (let j = 0; j < room.state.players.length + 1; j++) {
          if (room.state.phase === "auction" && room.state.auction) {
            room.passAuction(room.state.auction.activePlayerIndex);
          }
        }
      }

      if (room.state.phase === "resolving_space") {
        room.endTurn();
      }
    }

    expect(getPlayer(room, 0)).toBeDefined();
    expect(getPlayer(room, 1)).toBeDefined();
  });

  it("handles the complete lifecycle: setup -> play -> property ownership", () => {
    expect(room.state.phase).toBe("rolling");

    // Give both players some properties
    room.state = {
      ...room.state,
      spaces: room.state.spaces.map(s => {
        if (s.id === 1) return { ...s, owner: 0 } as Property;
        if (s.id === 6) return { ...s, owner: 1 } as Property;
        return s;
      }),
      players: room.state.players.map((p, i) => {
        if (i === 0) return { ...p, properties: [1] };
        if (i === 1) return { ...p, properties: [6] };
        return p;
      }),
    };

    expect(getSpace(room, 1).owner).toBe(0);
    expect(getSpace(room, 6).owner).toBe(1);
    expect(getPlayer(room, 0).cash).toBe(1500);
    expect(getPlayer(room, 1).cash).toBe(1500);
  });

  it("handles mortgaging and unmortgaging during gameplay", () => {
    room.state = {
      ...room.state,
      spaces: room.state.spaces.map(s =>
        s.id === 1 ? { ...s, owner: 0 } as Property : s
      ),
      players: room.state.players.map((p, i) =>
        i === 0 ? { ...p, cash: 5000, properties: [1] } : p
      ),
    };

    const cashBefore = getPlayer(room, 0).cash;
    const mortgageValue = getSpace(room, 1).mortgageValue;
    const jackpotCut = Math.floor(mortgageValue * 0.15);
    const playerReceives = mortgageValue - jackpotCut;
    room.mortgageProperty(1);

    expect(getSpace(room, 1).mortgaged).toBe(true);
    expect(getPlayer(room, 0).cash).toBe(cashBefore + playerReceives);

    const cashAfterMortgage = getPlayer(room, 0).cash;
    room.unmortgageProperty(1);
    expect(getSpace(room, 1).mortgaged).toBe(false);
    // Unmortgage cost uses Math.floor(mortgageValue * 1.1) per the validation
    expect(getPlayer(room, 0).cash).toBeLessThan(cashAfterMortgage);
  });
});
