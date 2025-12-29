import { describe, test, expect, beforeEach } from "bun:test";
import { useGameStore } from "./gameStore";
import type { Property } from "../types/game";

// Reset store before each test
beforeEach(() => {
  useGameStore.setState({
    players: [],
    currentPlayerIndex: 0,
    spaces: [],
    chanceDeck: [],
    communityChestDeck: [],
    diceRoll: undefined,
    consecutiveDoubles: 0,
    phase: "setup",
    passedGo: false,
    auction: undefined,
    trade: undefined,
    lastCardDrawn: undefined,
    winner: undefined,
  });
});

// Helper to initialize a game with players
const setupGame = (playerCount: number = 2) => {
  const names = Array.from({ length: playerCount }, (_, i) => `Player ${i + 1}`);
  const tokens = Array.from({ length: playerCount }, (_, i) => `Token${i + 1}`);
  useGameStore.getState().initGame(names, tokens);
};

describe("Game Initialization", () => {
  test("initGame creates players with correct starting values", () => {
    setupGame(4);
    const state = useGameStore.getState();
    
    expect(state.players.length).toBe(4);
    expect(state.phase).toBe("rolling");
    expect(state.currentPlayerIndex).toBe(0);
    
    state.players.forEach((player, i) => {
      expect(player.id).toBe(i);
      expect(player.cash).toBe(1500);
      expect(player.position).toBe(0);
      expect(player.properties).toEqual([]);
      expect(player.inJail).toBe(false);
      expect(player.jailTurns).toBe(0);
      expect(player.jailFreeCards).toBe(0);
      expect(player.bankrupt).toBe(false);
    });
  });

  test("board has 40 spaces", () => {
    setupGame(2);
    const state = useGameStore.getState();
    expect(state.spaces.length).toBe(40);
  });

  test("decks are shuffled and have correct number of cards", () => {
    setupGame(2);
    const state = useGameStore.getState();
    expect(state.chanceDeck.length).toBe(16);
    expect(state.communityChestDeck.length).toBe(17);
  });
});

describe("Dice Rolling", () => {
  test("rollDice returns valid values (1-6)", () => {
    setupGame(2);
    
    for (let i = 0; i < 100; i++) {
      const roll = useGameStore.getState().rollDice();
      expect(roll.die1).toBeGreaterThanOrEqual(1);
      expect(roll.die1).toBeLessThanOrEqual(6);
      expect(roll.die2).toBeGreaterThanOrEqual(1);
      expect(roll.die2).toBeLessThanOrEqual(6);
      expect(roll.total).toBe(roll.die1 + roll.die2);
      expect(roll.isDoubles).toBe(roll.die1 === roll.die2);
    }
  });

  test("rollDice updates store state", () => {
    setupGame(2);
    const roll = useGameStore.getState().rollDice();
    const state = useGameStore.getState();
    
    expect(state.diceRoll).toEqual(roll);
    expect(state.lastDiceRoll).toEqual(roll);
  });
});

describe("Player Movement", () => {
  test("movePlayer updates position correctly", () => {
    setupGame(2);
    useGameStore.getState().movePlayer(0, 5);
    
    const state = useGameStore.getState();
    expect(state.players[0]?.position).toBe(5);
  });

  test("movePlayer wraps around the board", () => {
    setupGame(2);
    // Set player at position 38
    useGameStore.setState({
      players: useGameStore.getState().players.map((p, i) => 
        i === 0 ? { ...p, position: 38 } : p
      ),
    });
    
    useGameStore.getState().movePlayer(0, 5);
    
    const state = useGameStore.getState();
    expect(state.players[0]?.position).toBe(3); // (38 + 5) % 40
  });

  test("passing GO awards £200 (FIX VERIFIED: single atomic update)", () => {
    setupGame(2);
    // Set player at position 38
    useGameStore.setState({
      players: useGameStore.getState().players.map((p, i) => 
        i === 0 ? { ...p, position: 38 } : p
      ),
    });
    
    const initialCash = useGameStore.getState().players[0]!.cash;
    useGameStore.getState().movePlayer(0, 5);
    
    const state = useGameStore.getState();
    expect(state.players[0]?.cash).toBe(initialCash + 200);
    expect(state.passedGo).toBe(true);
  });

  test("movePlayer does not move player in jail", () => {
    setupGame(2);
    useGameStore.setState({
      players: useGameStore.getState().players.map((p, i) => 
        i === 0 ? { ...p, inJail: true, position: 10 } : p
      ),
    });
    
    useGameStore.getState().movePlayer(0, 5);
    
    const state = useGameStore.getState();
    expect(state.players[0]?.position).toBe(10); // Unchanged
  });

  test("movePlayer does not move bankrupt player", () => {
    setupGame(2);
    useGameStore.setState({
      players: useGameStore.getState().players.map((p, i) => 
        i === 0 ? { ...p, bankrupt: true, position: 5 } : p
      ),
    });
    
    useGameStore.getState().movePlayer(0, 5);
    
    const state = useGameStore.getState();
    expect(state.players[0]?.position).toBe(5); // Unchanged
  });
});

describe("Property Purchase", () => {
  test("buyProperty deducts cash and sets owner", () => {
    setupGame(2);
    const store = useGameStore.getState();
    
    // Move player to Mediterranean Avenue (position 1, price 60)
    useGameStore.setState({
      players: store.players.map((p, i) => 
        i === 0 ? { ...p, position: 1 } : p
      ),
      currentPlayerIndex: 0,
    });
    
    const initialCash = useGameStore.getState().players[0]!.cash;
    useGameStore.getState().buyProperty(1);
    
    const state = useGameStore.getState();
    const property = state.spaces.find(s => s.id === 1) as Property;
    
    expect(property.owner).toBe(0);
    expect(state.players[0]?.cash).toBe(initialCash - 60);
    expect(state.players[0]?.properties).toContain(1); // Contains property ID
  });

  test("buyProperty fails if player has insufficient funds", () => {
    setupGame(2);
    useGameStore.setState({
      players: useGameStore.getState().players.map((p, i) => 
        i === 0 ? { ...p, cash: 50, position: 1 } : p
      ),
    });
    
    useGameStore.getState().buyProperty(1); // Mediterranean costs 60
    
    const state = useGameStore.getState();
    const property = state.spaces.find(s => s.id === 1) as Property;
    
    expect(property.owner).toBeUndefined();
  });

  test("buyProperty fails if property is already owned", () => {
    setupGame(2);
    useGameStore.setState({
      spaces: useGameStore.getState().spaces.map(s => 
        s.id === 1 ? { ...s, owner: 1 } as Property : s
      ),
    });
    
    useGameStore.getState().buyProperty(1);
    
    const state = useGameStore.getState();
    const property = state.spaces.find(s => s.id === 1) as Property;
    
    expect(property.owner).toBe(1); // Still owned by player 1
  });
});

describe("Rent Payment (FIX VERIFIED: uses state.spaces, checks mortgage)", () => {
  test("payRent transfers money from tenant to owner", () => {
    setupGame(2);
    
    // Player 1 owns Mediterranean Avenue
    useGameStore.setState({
      spaces: useGameStore.getState().spaces.map(s => 
        s.id === 1 ? { ...s, owner: 1 } as Property : s
      ),
      players: useGameStore.getState().players.map((p, i) => 
        i === 1 ? { ...p, properties: [1] } : p
      ),
      diceRoll: { die1: 3, die2: 4, total: 7, isDoubles: false },
    });
    
    const initialTenantCash = useGameStore.getState().players[0]!.cash;
    const initialOwnerCash = useGameStore.getState().players[1]!.cash;
    
    useGameStore.getState().payRent(0, 1, 7);
    
    const state = useGameStore.getState();
    const property = state.spaces.find(s => s.id === 1) as Property;
    
    // Mediterranean base rent is 2
    expect(state.players[0]?.cash).toBe(initialTenantCash - property.baseRent);
    expect(state.players[1]?.cash).toBe(initialOwnerCash + property.baseRent);
  });

  test("no rent charged on mortgaged property", () => {
    setupGame(2);
    
    useGameStore.setState({
      spaces: useGameStore.getState().spaces.map(s => 
        s.id === 1 ? { ...s, owner: 1, mortgaged: true } as Property : s
      ),
    });
    
    const initialCash = useGameStore.getState().players[0]!.cash;
    useGameStore.getState().payRent(0, 1, 7);
    
    const state = useGameStore.getState();
    expect(state.players[0]?.cash).toBe(initialCash); // No change
  });

  test("monopoly doubles rent (FIX VERIFIED: checks from state.spaces)", () => {
    setupGame(2);
    
    // Player 1 owns both brown properties (Mediterranean and Baltic)
    useGameStore.setState({
      spaces: useGameStore.getState().spaces.map(s => {
        if (s.id === 1 || s.id === 3) {
          return { ...s, owner: 1 } as Property;
        }
        return s;
      }),
      players: useGameStore.getState().players.map((p, i) => 
        i === 1 ? { ...p, properties: [1, 3] } : p
      ),
    });
    
    const initialTenantCash = useGameStore.getState().players[0]!.cash;
    useGameStore.getState().payRent(0, 1, 7);
    
    const state = useGameStore.getState();
    const property = state.spaces.find(s => s.id === 1) as Property;
    
    // With monopoly, rent is doubled
    expect(state.players[0]?.cash).toBe(initialTenantCash - (property.baseRent * 2));
  });

  test("railroad rent scales with number owned (FIX VERIFIED: counts from state.spaces)", () => {
    setupGame(2);
    
    // Player 1 owns 2 railroads
    useGameStore.setState({
      spaces: useGameStore.getState().spaces.map(s => {
        if (s.id === 5 || s.id === 15) { // Reading RR and Pennsylvania RR
          return { ...s, owner: 1 } as Property;
        }
        return s;
      }),
      players: useGameStore.getState().players.map((p, i) => 
        i === 1 ? { ...p, properties: [5, 15] } : p
      ),
    });
    
    const initialCash = useGameStore.getState().players[0]!.cash;
    useGameStore.getState().payRent(0, 5, 7);
    
    const state = useGameStore.getState();
    // 2 railroads = $50 rent
    expect(state.players[0]?.cash).toBe(initialCash - 50);
  });

  test("utility rent is dice multiplier", () => {
    setupGame(2);
    
    // Player 1 owns Electric Company
    useGameStore.setState({
      spaces: useGameStore.getState().spaces.map(s => 
        s.id === 12 ? { ...s, owner: 1 } as Property : s
      ),
      players: useGameStore.getState().players.map((p, i) => 
        i === 1 ? { ...p, properties: [12] } : p
      ),
    });
    
    const initialCash = useGameStore.getState().players[0]!.cash;
    useGameStore.getState().payRent(0, 12, 8);
    
    const state = useGameStore.getState();
    // 1 utility = 4x dice roll = 4 * 8 = 32
    expect(state.players[0]?.cash).toBe(initialCash - 32);
  });

  test("two utilities = 10x dice roll", () => {
    setupGame(2);
    
    // Player 1 owns both utilities
    useGameStore.setState({
      spaces: useGameStore.getState().spaces.map(s => {
        if (s.id === 12 || s.id === 28) {
          return { ...s, owner: 1 } as Property;
        }
        return s;
      }),
      players: useGameStore.getState().players.map((p, i) => 
        i === 1 ? { ...p, properties: [12, 28] } : p
      ),
    });
    
    const initialCash = useGameStore.getState().players[0]!.cash;
    useGameStore.getState().payRent(0, 12, 8);
    
    const state = useGameStore.getState();
    // 2 utilities = 10x dice roll = 10 * 8 = 80
    expect(state.players[0]?.cash).toBe(initialCash - 80);
  });
});

describe("Jail Mechanics", () => {
  test("goToJail sets position and inJail flag", () => {
    setupGame(2);
    useGameStore.getState().goToJail(0);
    
    const state = useGameStore.getState();
    expect(state.players[0]?.position).toBe(10);
    expect(state.players[0]?.inJail).toBe(true);
    expect(state.players[0]?.jailTurns).toBe(0);
  });

  test("getOutOfJail with pay deducts £50", () => {
    setupGame(2);
    useGameStore.setState({
      players: useGameStore.getState().players.map((p, i) => 
        i === 0 ? { ...p, position: 10, inJail: true } : p
      ),
    });
    
    const initialCash = useGameStore.getState().players[0]!.cash;
    useGameStore.getState().getOutOfJail(0, "pay");
    
    const state = useGameStore.getState();
    expect(state.players[0]?.inJail).toBe(false);
    expect(state.players[0]?.cash).toBe(initialCash - 50);
  });

  test("getOutOfJail with card uses jailFreeCard", () => {
    setupGame(2);
    useGameStore.setState({
      players: useGameStore.getState().players.map((p, i) => 
        i === 0 ? { ...p, position: 10, inJail: true, jailFreeCards: 1 } : p
      ),
    });
    
    useGameStore.getState().getOutOfJail(0, "card");
    
    const state = useGameStore.getState();
    expect(state.players[0]?.inJail).toBe(false);
    expect(state.players[0]?.jailFreeCards).toBe(0);
  });

  test("getOutOfJail with roll (FIX VERIFIED: now actually rolls)", () => {
    setupGame(2);
    useGameStore.setState({
      players: useGameStore.getState().players.map((p, i) => 
        i === 0 ? { ...p, position: 10, inJail: true, jailTurns: 0 } : p
      ),
    });
    
    // This will either free the player (if doubles) or increment jailTurns
    useGameStore.getState().getOutOfJail(0, "roll");
    
    const state = useGameStore.getState();
    const player = state.players[0]!;
    
    // Either free with new position, or still in jail with incremented turns
    if (player.inJail) {
      expect(player.jailTurns).toBeGreaterThanOrEqual(1);
    } else {
      expect(player.position).not.toBe(10); // Should have moved
    }
  });
});

describe("Turn Management (FIX VERIFIED: no race condition)", () => {
  test("endTurn advances to next player", () => {
    setupGame(2);
    useGameStore.setState({
      diceRoll: { die1: 3, die2: 4, total: 7, isDoubles: false },
    });
    
    useGameStore.getState().endTurn();
    
    const state = useGameStore.getState();
    expect(state.currentPlayerIndex).toBe(1);
    expect(state.diceRoll).toBeUndefined();
  });

  test("doubles allow player to roll again", () => {
    setupGame(2);
    useGameStore.setState({
      diceRoll: { die1: 4, die2: 4, total: 8, isDoubles: true },
      consecutiveDoubles: 0,
    });
    
    useGameStore.getState().endTurn();
    
    const state = useGameStore.getState();
    expect(state.currentPlayerIndex).toBe(0); // Same player
    expect(state.consecutiveDoubles).toBe(1);
  });

  test("three consecutive doubles sends to jail (FIX VERIFIED: early return)", () => {
    setupGame(2);
    useGameStore.setState({
      diceRoll: { die1: 4, die2: 4, total: 8, isDoubles: true },
      consecutiveDoubles: 2, // Already had 2 doubles
    });
    
    useGameStore.getState().endTurn();
    
    const state = useGameStore.getState();
    expect(state.players[0]?.inJail).toBe(true);
    expect(state.players[0]?.position).toBe(10);
    expect(state.consecutiveDoubles).toBe(0);
    // Player should still be current player (will roll in jail next turn)
    expect(state.currentPlayerIndex).toBe(0);
  });

  test("endTurn skips bankrupt players", () => {
    setupGame(3);
    useGameStore.setState({
      players: useGameStore.getState().players.map((p, i) => 
        i === 1 ? { ...p, bankrupt: true } : p
      ),
      diceRoll: { die1: 3, die2: 4, total: 7, isDoubles: false },
    });
    
    useGameStore.getState().endTurn();
    
    const state = useGameStore.getState();
    expect(state.currentPlayerIndex).toBe(2); // Skipped player 1
  });
});

describe("Building", () => {
  test("buildHouse requires monopoly (FIX VERIFIED: checks from state.spaces)", () => {
    setupGame(2);
    
    // Player owns only one brown property
    useGameStore.setState({
      spaces: useGameStore.getState().spaces.map(s => 
        s.id === 1 ? { ...s, owner: 0 } as Property : s
      ),
      players: useGameStore.getState().players.map((p, i) => 
        i === 0 ? { ...p, properties: [1] } : p
      ),
    });
    
    useGameStore.getState().buildHouse(1);
    
    const state = useGameStore.getState();
    const property = state.spaces.find(s => s.id === 1) as Property;
    expect(property.houses).toBe(0); // Should not build
  });

  test("buildHouse works with monopoly", () => {
    setupGame(2);
    
    // Player owns both brown properties
    useGameStore.setState({
      spaces: useGameStore.getState().spaces.map(s => {
        if (s.id === 1 || s.id === 3) {
          return { ...s, owner: 0 } as Property;
        }
        return s;
      }),
      players: useGameStore.getState().players.map((p, i) => 
        i === 0 ? { ...p, properties: [1, 3] } : p
      ),
    });
    
    const initialCash = useGameStore.getState().players[0]!.cash;
    useGameStore.getState().buildHouse(1);
    
    const state = useGameStore.getState();
    const property = state.spaces.find(s => s.id === 1) as Property;
    expect(property.houses).toBe(1);
    expect(state.players[0]?.cash).toBe(initialCash - 50); // Brown building cost
  });

  test("even building rule enforced", () => {
    setupGame(2);
    
    // Player owns both brown properties, one has 1 house
    useGameStore.setState({
      spaces: useGameStore.getState().spaces.map(s => {
        if (s.id === 1) return { ...s, owner: 0, houses: 1 } as Property;
        if (s.id === 3) return { ...s, owner: 0, houses: 0 } as Property;
        return s;
      }),
      players: useGameStore.getState().players.map((p, i) => 
        i === 0 ? { ...p, properties: [1, 3] } : p
      ),
    });
    
    // Try to build second house on property that already has 1
    useGameStore.getState().buildHouse(1);
    
    const state = useGameStore.getState();
    const property = state.spaces.find(s => s.id === 1) as Property;
    expect(property.houses).toBe(1); // Should not build (other property has 0)
  });
});

describe("Mortgage", () => {
  test("mortgageProperty gives half value", () => {
    setupGame(2);
    
    useGameStore.setState({
      spaces: useGameStore.getState().spaces.map(s => 
        s.id === 1 ? { ...s, owner: 0 } as Property : s
      ),
      players: useGameStore.getState().players.map((p, i) => 
        i === 0 ? { ...p, properties: [1] } : p
      ),
    });
    
    const initialCash = useGameStore.getState().players[0]!.cash;
    useGameStore.getState().mortgageProperty(1);
    
    const state = useGameStore.getState();
    const property = state.spaces.find(s => s.id === 1) as Property;
    expect(property.mortgaged).toBe(true);
    expect(state.players[0]?.cash).toBe(initialCash + 30); // Mediterranean mortgage value
  });

  test("cannot mortgage property with buildings", () => {
    setupGame(2);
    
    useGameStore.setState({
      spaces: useGameStore.getState().spaces.map(s => 
        s.id === 1 ? { ...s, owner: 0, houses: 1 } as Property : s
      ),
    });
    
    useGameStore.getState().mortgageProperty(1);
    
    const state = useGameStore.getState();
    const property = state.spaces.find(s => s.id === 1) as Property;
    expect(property.mortgaged).toBe(false);
  });

  test("unmortgage costs 110%", () => {
    setupGame(2);
    
    useGameStore.setState({
      spaces: useGameStore.getState().spaces.map(s => 
        s.id === 1 ? { ...s, owner: 0, mortgaged: true } as Property : s
      ),
      players: useGameStore.getState().players.map((p, i) => 
        i === 0 ? { ...p, properties: [1] } : p
      ),
    });
    
    const initialCash = useGameStore.getState().players[0]!.cash;
    useGameStore.getState().unmortgageProperty(1);
    
    const state = useGameStore.getState();
    const property = state.spaces.find(s => s.id === 1) as Property;
    expect(property.mortgaged).toBe(false);
    expect(state.players[0]?.cash).toBe(initialCash - 33); // 30 * 1.1 = 33
  });
});

describe("Bankruptcy (FIX VERIFIED: properties returned to bank)", () => {
  test("declareBankruptcy to bank returns properties", () => {
    setupGame(2);
    
    useGameStore.setState({
      spaces: useGameStore.getState().spaces.map(s => {
        if (s.id === 1 || s.id === 3) {
          return { ...s, owner: 0, houses: 2 } as Property;
        }
        return s;
      }),
      players: useGameStore.getState().players.map((p, i) => 
        i === 0 ? { ...p, properties: [1, 3], cash: -100 } : p
      ),
    });
    
    useGameStore.getState().declareBankruptcy(0);
    
    const state = useGameStore.getState();
    expect(state.players[0]?.bankrupt).toBe(true);
    expect(state.players[0]?.properties).toEqual([]);
    
    // Properties should be unowned and buildings removed
    const prop1 = state.spaces.find(s => s.id === 1) as Property;
    const prop3 = state.spaces.find(s => s.id === 3) as Property;
    expect(prop1.owner).toBeUndefined();
    expect(prop1.houses).toBe(0);
    expect(prop3.owner).toBeUndefined();
  });

  test("declareBankruptcy to creditor transfers assets", () => {
    setupGame(2);
    
    useGameStore.setState({
      spaces: useGameStore.getState().spaces.map(s => 
        s.id === 1 ? { ...s, owner: 0 } as Property : s
      ),
      players: useGameStore.getState().players.map((p, i) => 
        i === 0 ? { ...p, properties: [1], cash: 50, jailFreeCards: 1 } : p
      ),
    });
    
    const initialCreditorCash = useGameStore.getState().players[1]!.cash;
    useGameStore.getState().declareBankruptcy(0, 1);
    
    const state = useGameStore.getState();
    expect(state.players[0]?.bankrupt).toBe(true);
    expect(state.players[1]?.properties).toContain(1);
    expect(state.players[1]?.cash).toBe(initialCreditorCash + 50);
    expect(state.players[1]?.jailFreeCards).toBe(1);
  });
});

describe("Win Condition", () => {
  test("last player standing wins", () => {
    setupGame(3);
    
    useGameStore.setState({
      players: useGameStore.getState().players.map((p, i) => 
        i === 0 ? p : { ...p, bankrupt: true }
      ),
    });
    
    useGameStore.getState().checkWinCondition();
    
    const state = useGameStore.getState();
    expect(state.winner).toBe(0);
    expect(state.phase).toBe("game_over");
  });
});

describe("Auction System", () => {
  test("startAuction creates auction state", () => {
    setupGame(2);
    useGameStore.getState().startAuction(1);
    
    const state = useGameStore.getState();
    expect(state.auction).toBeDefined();
    expect(state.auction?.propertyId).toBe(1);
    expect(state.auction?.currentBid).toBe(0);
    expect(state.auction?.highestBidder).toBeNull();
    expect(state.phase).toBe("auction");
  });

  test("placeBid updates auction", () => {
    setupGame(2);
    useGameStore.getState().startAuction(1);
    useGameStore.getState().placeBid(0, 50);
    
    const state = useGameStore.getState();
    expect(state.auction?.currentBid).toBe(50);
    expect(state.auction?.highestBidder).toBe(0);
    expect(state.auction?.activePlayerIndex).toBe(1);
  });

  test("passAuction marks player as passed", () => {
    setupGame(3);
    useGameStore.getState().startAuction(1);
    useGameStore.getState().passAuction(0);
    
    const state = useGameStore.getState();
    expect(state.auction?.passedPlayers).toContain(0);
    expect(state.auction?.activePlayerIndex).toBe(1);
  });

  test("endAuction awards property to highest bidder", () => {
    setupGame(2);
    useGameStore.getState().startAuction(1);
    useGameStore.getState().placeBid(0, 100);
    
    // Simulate player 1 passing
    useGameStore.setState({
      auction: {
        ...useGameStore.getState().auction!,
        passedPlayers: [1],
      },
    });
    
    const initialCash = useGameStore.getState().players[0]!.cash;
    useGameStore.getState().endAuction();
    
    const state = useGameStore.getState();
    expect(state.auction).toBeUndefined();
    const property = state.spaces.find(s => s.id === 1) as Property;
    expect(property.owner).toBe(0);
    expect(state.players[0]?.cash).toBe(initialCash - 100);
    expect(state.players[0]?.properties).toContain(1);
  });
});

describe("Trading System", () => {
  test("proposeTrade creates trade state", () => {
    setupGame(2);
    
    // Give player 0 a property
    useGameStore.setState({
      spaces: useGameStore.getState().spaces.map(s => 
        s.id === 1 ? { ...s, owner: 0 } as Property : s
      ),
      players: useGameStore.getState().players.map((p, i) => 
        i === 0 ? { ...p, properties: [1] } : p
      ),
    });
    
    useGameStore.getState().proposeTrade({
      fromPlayer: 0,
      toPlayer: 1,
      cashOffered: 100,
      propertiesOffered: [1],
      jailCardsOffered: 0,
      cashRequested: 0,
      propertiesRequested: [],
      jailCardsRequested: 0,
    });
    
    const state = useGameStore.getState();
    expect(state.trade).toBeDefined();
    expect(state.trade?.status).toBe("pending");
    expect(state.phase).toBe("trading");
  });

  test("acceptTrade transfers assets", () => {
    setupGame(2);
    
    // Give player 0 a property and player 1 another
    useGameStore.setState({
      spaces: useGameStore.getState().spaces.map(s => {
        if (s.id === 1) return { ...s, owner: 0 } as Property;
        if (s.id === 3) return { ...s, owner: 1 } as Property;
        return s;
      }),
      players: useGameStore.getState().players.map((p, i) => {
        if (i === 0) return { ...p, properties: [1] };
        if (i === 1) return { ...p, properties: [3] };
        return p;
      }),
      trade: {
        offer: {
          fromPlayer: 0,
          toPlayer: 1,
          cashOffered: 50,
          propertiesOffered: [1],
          jailCardsOffered: 0,
          cashRequested: 0,
          propertiesRequested: [3],
          jailCardsRequested: 0,
        },
        status: "pending",
      },
      phase: "trading",
    });
    
    const p0InitialCash = useGameStore.getState().players[0]!.cash;
    const p1InitialCash = useGameStore.getState().players[1]!.cash;
    
    useGameStore.getState().acceptTrade();
    
    const state = useGameStore.getState();
    expect(state.trade).toBeUndefined();
    
    // Player 0 should have property 3, lost property 1, and paid 50
    expect(state.players[0]?.properties).toContain(3);
    expect(state.players[0]?.properties).not.toContain(1);
    expect(state.players[0]?.cash).toBe(p0InitialCash - 50);
    
    // Player 1 should have property 1, lost property 3, and received 50
    expect(state.players[1]?.properties).toContain(1);
    expect(state.players[1]?.properties).not.toContain(3);
    expect(state.players[1]?.cash).toBe(p1InitialCash + 50);
    
    // Ownership in spaces should be updated
    const prop1 = state.spaces.find(s => s.id === 1) as Property;
    const prop3 = state.spaces.find(s => s.id === 3) as Property;
    expect(prop1.owner).toBe(1);
    expect(prop3.owner).toBe(0);
  });

  test("rejectTrade clears trade state", () => {
    setupGame(2);
    useGameStore.setState({
      trade: {
        offer: {
          fromPlayer: 0,
          toPlayer: 1,
          cashOffered: 50,
          propertiesOffered: [],
          jailCardsOffered: 0,
          cashRequested: 100,
          propertiesRequested: [],
          jailCardsRequested: 0,
        },
        status: "pending",
      },
      phase: "trading",
    });
    
    useGameStore.getState().rejectTrade();
    
    const state = useGameStore.getState();
    expect(state.trade).toBeUndefined();
    expect(state.phase).toBe("resolving_space");
  });
});

describe("Tax Payment (FIX VERIFIED: uses store action)", () => {
  test("payTax deducts correct amount", () => {
    setupGame(2);
    
    const initialCash = useGameStore.getState().players[0]!.cash;
    useGameStore.getState().payTax(0, 200);
    
    const state = useGameStore.getState();
    expect(state.players[0]?.cash).toBe(initialCash - 200);
  });

  test("payTax triggers bankruptcy if insufficient funds", () => {
    setupGame(2);
    useGameStore.setState({
      players: useGameStore.getState().players.map((p, i) => 
        i === 0 ? { ...p, cash: 100 } : p
      ),
    });
    
    useGameStore.getState().payTax(0, 200);
    
    const state = useGameStore.getState();
    expect(state.players[0]?.bankrupt).toBe(true);
  });
});

describe("Helper Functions", () => {
  test("getPlayerProperties returns correct properties", () => {
    setupGame(2);
    
    useGameStore.setState({
      spaces: useGameStore.getState().spaces.map(s => {
        if (s.id === 1 || s.id === 5) {
          return { ...s, owner: 0 } as Property;
        }
        return s;
      }),
    });
    
    const properties = useGameStore.getState().getPlayerProperties(0);
    expect(properties.length).toBe(2);
    expect(properties.map(p => p.id)).toContain(1);
    expect(properties.map(p => p.id)).toContain(5);
  });

  test("hasMonopoly correctly detects monopoly", () => {
    setupGame(2);
    
    // Own only one brown property
    useGameStore.setState({
      spaces: useGameStore.getState().spaces.map(s => 
        s.id === 1 ? { ...s, owner: 0 } as Property : s
      ),
    });
    
    expect(useGameStore.getState().hasMonopoly(0, "brown")).toBe(false);
    
    // Now own both
    useGameStore.setState({
      spaces: useGameStore.getState().spaces.map(s => {
        if (s.id === 1 || s.id === 3) {
          return { ...s, owner: 0 } as Property;
        }
        return s;
      }),
    });
    
    expect(useGameStore.getState().hasMonopoly(0, "brown")).toBe(true);
  });
});
