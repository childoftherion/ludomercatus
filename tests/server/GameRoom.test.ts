import { describe, it, expect, beforeEach } from "bun:test";
import { GameRoom } from "../../src/server/GameRoom";
import type { Property } from "../../src/types/game";

const setupGame = (room: GameRoom, playerCount: number = 2) => {
  const names = Array.from({ length: playerCount }, (_, i) => `Player ${i + 1}`);
  const tokens = Array.from({ length: playerCount }, (_, i) => `Token${i + 1}`);
  room.initGame(names, tokens);
};

const getSpace = (room: GameRoom, idx: number) => room.state.spaces[idx] as Property;
const getPlayer = (room: GameRoom, idx: number) => room.state.players[idx]!;

describe("GameRoom", () => {
  let room: GameRoom;

  beforeEach(() => {
    room = new GameRoom("setup");
  });

  describe("setup and initialization", () => {
    it("creates a room in setup phase", () => {
      expect(room.state.phase).toBe("setup");
      expect(room.state.players).toHaveLength(0);
    });

    it("initializes players via initGame", () => {
      setupGame(room);
      expect(room.state.players).toHaveLength(2);
      expect(getPlayer(room, 0).name).toBe("Player 1");
      expect(getPlayer(room, 1).name).toBe("Player 2");
      expect(getPlayer(room, 0).cash).toBe(1500);
      expect(getPlayer(room, 1).cash).toBe(1500);
    });

    it("starts game with rolling phase after initGame", () => {
      setupGame(room);
      expect(room.state.phase).toBe("rolling");
    });

    it("can initialize with more than 2 players", () => {
      setupGame(room, 4);
      expect(room.state.players).toHaveLength(4);
      expect(room.state.phase).toBe("rolling");
    });

    it("initializes board with 40 spaces", () => {
      expect(room.state.spaces).toHaveLength(40);
    });

    it("starts with 32 houses and 12 hotels available", () => {
      expect(room.state.availableHouses).toBe(32);
      expect(room.state.availableHotels).toBe(12);
    });
  });

  describe("turn progression", () => {
    beforeEach(() => {
      setupGame(room);
    });

    it("starts with player 0", () => {
      expect(room.state.currentPlayerIndex).toBe(0);
    });

    it("advances to next player after end turn", () => {
      room.state.diceRoll = { die1: 3, die2: 4, total: 7, isDoubles: false };
      room.state.phase = "resolving_space";
      room.endTurn();
      expect(room.state.currentPlayerIndex).toBe(1);
    });

    it("wraps around after last player", () => {
      room.state.diceRoll = { die1: 3, die2: 4, total: 7, isDoubles: false };
      room.state.phase = "resolving_space";
      room.endTurn();

      room.state.diceRoll = { die1: 2, die2: 5, total: 7, isDoubles: false };
      room.state.phase = "resolving_space";
      room.endTurn();

      expect(room.state.currentPlayerIndex).toBe(0);
    });
  });

  describe("3x doubles sends to jail", () => {
    beforeEach(() => {
      setupGame(room);
    });

    it("sends player to jail via goToJail", () => {
      expect(getPlayer(room, 0).inJail).toBe(false);

      room.goToJail(0);

      expect(getPlayer(room, 0).inJail).toBe(true);
      expect(getPlayer(room, 0).position).toBe(10);
      expect(room.state.consecutiveDoubles).toBe(0);
    });
  });

  describe("auction flow", () => {
    beforeEach(() => {
      setupGame(room);
    });

    it("starts an auction when a property is declined", () => {
      expect(getSpace(room, 1).type).toBe("property");

      room.state.players[0]!.position = 1;
      room.state.phase = "awaiting_buy_decision";

      room.declineProperty(1);

      expect(room.state.phase as string).toBe("auction");
      expect(room.state.auction).not.toBeNull();
      expect(room.state.auction!.propertyId).toBe(1);
    });

    it("allows bidding and tracks highest bidder", () => {
      room.state.players[0]!.position = 1;
      room.state.phase = "awaiting_buy_decision";
      room.declineProperty(1);

      expect(room.state.auction).not.toBeNull();
      const firstBidder = room.state.auction!.activePlayerIndex;

      room.placeBid(firstBidder, 70);
      expect(room.state.auction!.currentBid).toBe(70);
      expect(room.state.auction!.highestBidder).toBe(firstBidder);
    });

    it("ends auction when all but one player pass", () => {
      room.state.players[0]!.position = 1;
      room.state.phase = "awaiting_buy_decision";
      room.declineProperty(1);

      const firstBidder = room.state.auction!.activePlayerIndex;
      const otherBidder = (firstBidder + 1) % 2;

      room.placeBid(firstBidder, 70);
      room.passAuction(otherBidder);

      expect(getSpace(room, 1).owner).toBe(firstBidder);
    });
  });

  describe("property buying", () => {
    beforeEach(() => {
      setupGame(room);
    });

    it("allows buying an unowned property", () => {
      expect(getSpace(room, 1).owner).toBeUndefined();

      room.state.players[0]!.position = 1;
      room.state.phase = "awaiting_buy_decision";

      room.buyProperty(1);

      expect(getSpace(room, 1).owner).toBe(0);
      expect(getPlayer(room, 0).cash).toBe(1500 - getSpace(room, 1).price);
    });

    it("deducts correct price from player cash", () => {
      const initialCash = getPlayer(room, 0).cash;

      room.state.players[0]!.position = 3;
      room.state.phase = "awaiting_buy_decision";

      room.buyProperty(3);

      expect(getPlayer(room, 0).cash).toBe(initialCash - getSpace(room, 3).price);
    });
  });

  describe("building houses and hotels", () => {
    beforeEach(() => {
      setupGame(room);
      // Give player 0 both brown properties (monopoly)
      room.state = {
        ...room.state,
        spaces: room.state.spaces.map(s =>
          (s.id === 1 || s.id === 3) ? { ...s, owner: 0 } as Property : s
        ),
        players: room.state.players.map((p, i) =>
          i === 0 ? { ...p, cash: 10000, properties: [1, 3] } : p
        ),
      };
    });

    it("allows building a house on a monopoly", () => {
      room.buildHouse(1);

      expect(getSpace(room, 1).houses).toBe(1);
      expect(room.state.availableHouses).toBe(31);
    });

    it("enforces even building within a color group", () => {
      room.buildHouse(1);
      expect(getSpace(room, 1).houses).toBe(1);

      // Even building: can't build 2nd on space 1 until space 3 also has 1
      room.buildHouse(1);
      expect(getSpace(room, 1).houses).toBe(1);

      room.buildHouse(3);
      expect(getSpace(room, 3).houses).toBe(1);

      room.buildHouse(1);
      expect(getSpace(room, 1).houses).toBe(2);
    });

    it("respects housing scarcity limits", () => {
      room.state.availableHouses = 1;

      room.buildHouse(1);
      expect(getSpace(room, 1).houses).toBe(1);
      expect(room.state.availableHouses).toBe(0);

      room.buildHouse(3);
      expect(getSpace(room, 3).houses).toBe(0);
    });
  });

  describe("mortgage and unmortgage", () => {
    beforeEach(() => {
      setupGame(room);
      // Give player 0 a property
      room.state = {
        ...room.state,
        spaces: room.state.spaces.map(s =>
          s.id === 1 ? { ...s, owner: 0 } as Property : s
        ),
        players: room.state.players.map((p, i) =>
          i === 0 ? { ...p, cash: 5000, properties: [1] } : p
        ),
      };
    });

    it("mortgages a property and credits player (minus jackpot contribution)", () => {
      const cashBefore = getPlayer(room, 0).cash;
      const mortgageValue = getSpace(room, 1).mortgageValue;
      const jackpotCut = Math.floor(mortgageValue * 0.15);
      const playerReceives = mortgageValue - jackpotCut;

      room.mortgageProperty(1);

      expect(getSpace(room, 1).mortgaged).toBe(true);
      expect(getPlayer(room, 0).cash).toBe(cashBefore + playerReceives);
    });

    it("unmortgages with 10% interest", () => {
      room.mortgageProperty(1);
      expect(getSpace(room, 1).mortgaged).toBe(true);

      const cashBefore = getPlayer(room, 0).cash;
      const mortgageValue = getSpace(room, 1).mortgageValue;
      const unmortgageCost = Math.ceil(mortgageValue * 1.1);

      room.unmortgageProperty(1);

      expect(getSpace(room, 1).mortgaged).toBe(false);
      expect(getPlayer(room, 0).cash).toBe(cashBefore - unmortgageCost);
    });
  });

  describe("jail mechanics", () => {
    beforeEach(() => {
      setupGame(room);
    });

    it("puts player in jail correctly", () => {
      room.goToJail(0);

      expect(getPlayer(room, 0).inJail).toBe(true);
      expect(getPlayer(room, 0).position).toBe(10);
      expect(getPlayer(room, 0).jailTurns).toBe(0);
    });

    it("allows paying bail to get out of jail", () => {
      room.goToJail(0);
      const cashBefore = getPlayer(room, 0).cash;

      room.getOutOfJail(0, "pay");

      expect(getPlayer(room, 0).inJail).toBe(false);
      expect(getPlayer(room, 0).cash).toBe(cashBefore - 50);
    });
  });

  describe("settings management", () => {
    it("applies default settings on creation", () => {
      expect(room.state.settings.enableHousingScarcity).toBe(true);
      expect(room.state.settings.enableBankLoans).toBe(true);
      expect(room.state.settings.reducedMotion).toBe(false);
    });

    it("allows updating settings", () => {
      room.updateSettings({ reducedMotion: true });
      expect(room.state.settings.reducedMotion).toBe(true);
    });

    it("merges settings without overwriting other fields", () => {
      room.updateSettings({ reducedMotion: true });
      expect(room.state.settings.enableHousingScarcity).toBe(true);
      expect(room.state.settings.reducedMotion).toBe(true);
    });
  });
});
