import { describe, test, expect, beforeEach } from "bun:test";
import { useGameStore } from "./store/gameStore";
import type { Property } from "./types/game";

/**
 * Integration tests for Monopoly game flows
 * These tests verify that multiple game actions work together correctly
 */

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

const setupGame = (playerCount: number = 2) => {
  const names = Array.from({ length: playerCount }, (_, i) => `Player ${i + 1}`);
  const tokens = Array.from({ length: playerCount }, (_, i) => `Token${i + 1}`);
  useGameStore.getState().initGame(names, tokens);
};

describe("Integration: Full Turn Cycle", () => {
  test("player completes a full turn: roll -> move -> resolve -> end turn", () => {
    setupGame(2);
    const store = useGameStore.getState();
    
    expect(store.phase).toBe("rolling");
    expect(store.currentPlayerIndex).toBe(0);
    
    // Roll dice
    const roll = useGameStore.getState().rollDice();
    expect(roll.total).toBeGreaterThanOrEqual(2);
    expect(roll.total).toBeLessThanOrEqual(12);
    
    // Move player (simulating non-doubles for predictable test)
    useGameStore.setState({ 
      diceRoll: { die1: 3, die2: 2, total: 5, isDoubles: false } 
    });
    useGameStore.getState().movePlayer(0, 5);
    
    let state = useGameStore.getState();
    expect(state.players[0]?.position).toBe(5); // Reading Railroad
    
    // End turn
    useGameStore.getState().endTurn();
    
    state = useGameStore.getState();
    expect(state.currentPlayerIndex).toBe(1);
    expect(state.phase).toBe("rolling");
  });

  test("doubles allow player to roll again, third consecutive sends to jail", () => {
    setupGame(2);
    
    // First doubles
    useGameStore.setState({
      diceRoll: { die1: 3, die2: 3, total: 6, isDoubles: true },
      consecutiveDoubles: 0,
    });
    useGameStore.getState().endTurn();
    
    let state = useGameStore.getState();
    expect(state.currentPlayerIndex).toBe(0); // Same player
    expect(state.consecutiveDoubles).toBe(1);
    
    // Second doubles
    useGameStore.setState({
      diceRoll: { die1: 4, die2: 4, total: 8, isDoubles: true },
    });
    useGameStore.getState().endTurn();
    
    state = useGameStore.getState();
    expect(state.currentPlayerIndex).toBe(0); // Still same player
    expect(state.consecutiveDoubles).toBe(2);
    
    // Third doubles - should go to jail!
    useGameStore.setState({
      diceRoll: { die1: 5, die2: 5, total: 10, isDoubles: true },
    });
    useGameStore.getState().endTurn();
    
    state = useGameStore.getState();
    expect(state.players[0]?.inJail).toBe(true);
    expect(state.players[0]?.position).toBe(10);
    expect(state.consecutiveDoubles).toBe(0);
  });
});

describe("Integration: Rent Payment Flow", () => {
  test("landing on owned property triggers rent payment", () => {
    setupGame(2);
    
    // Player 1 owns Mediterranean Avenue
    useGameStore.setState({
      spaces: useGameStore.getState().spaces.map(s => 
        s.id === 1 ? { ...s, owner: 1 } as Property : s
      ),
      players: useGameStore.getState().players.map((p, i) => 
        i === 1 ? { ...p, properties: [1] } : p
      ),
      diceRoll: { die1: 1, die2: 0, total: 1, isDoubles: false },
    });
    
    const p0InitialCash = useGameStore.getState().players[0]!.cash;
    const p1InitialCash = useGameStore.getState().players[1]!.cash;
    
    // Player 0 moves to Mediterranean Avenue
    useGameStore.getState().movePlayer(0, 1);
    
    const state = useGameStore.getState();
    const property = state.spaces.find(s => s.id === 1) as Property;
    
    // Rent should have been paid automatically via resolveSpace
    expect(state.players[0]?.cash).toBe(p0InitialCash - property.baseRent);
    expect(state.players[1]?.cash).toBe(p1InitialCash + property.baseRent);
  });

  test("landing on mortgaged property does not charge rent", () => {
    setupGame(2);
    
    useGameStore.setState({
      spaces: useGameStore.getState().spaces.map(s => 
        s.id === 1 ? { ...s, owner: 1, mortgaged: true } as Property : s
      ),
      diceRoll: { die1: 1, die2: 0, total: 1, isDoubles: false },
    });
    
    const p0InitialCash = useGameStore.getState().players[0]!.cash;
    
    useGameStore.getState().movePlayer(0, 1);
    
    const state = useGameStore.getState();
    expect(state.players[0]?.cash).toBe(p0InitialCash); // No change
  });
});

describe("Integration: Jail Complete Flow", () => {
  test("player lands on Go To Jail, goes to jail, pays to leave, continues", () => {
    setupGame(2);
    
    // Position player near Go To Jail (position 30)
    useGameStore.setState({
      players: useGameStore.getState().players.map((p, i) => 
        i === 0 ? { ...p, position: 28 } : p
      ),
      diceRoll: { die1: 1, die2: 1, total: 2, isDoubles: true },
    });
    
    // Move to Go To Jail
    useGameStore.getState().movePlayer(0, 2);
    
    let state = useGameStore.getState();
    expect(state.players[0]?.inJail).toBe(true);
    expect(state.players[0]?.position).toBe(10);
    
    // Pay to get out
    const cashBeforeJail = state.players[0]!.cash;
    useGameStore.getState().getOutOfJail(0, "pay");
    
    state = useGameStore.getState();
    expect(state.players[0]?.inJail).toBe(false);
    expect(state.players[0]?.cash).toBe(cashBeforeJail - 50);
    expect(state.phase).toBe("rolling");
  });

  test("player uses Get Out of Jail Free card", () => {
    setupGame(2);
    
    useGameStore.setState({
      players: useGameStore.getState().players.map((p, i) => 
        i === 0 ? { ...p, position: 10, inJail: true, jailFreeCards: 1 } : p
      ),
    });
    
    const cashBefore = useGameStore.getState().players[0]!.cash;
    useGameStore.getState().getOutOfJail(0, "card");
    
    const state = useGameStore.getState();
    expect(state.players[0]?.inJail).toBe(false);
    expect(state.players[0]?.jailFreeCards).toBe(0);
    expect(state.players[0]?.cash).toBe(cashBefore); // No cash lost
  });
});

describe("Integration: Bankruptcy Flow", () => {
  test("player can't afford rent and goes bankrupt to creditor", () => {
    setupGame(2);
    
    // Player 0 has very little cash, Player 1 owns an expensive property
    useGameStore.setState({
      spaces: useGameStore.getState().spaces.map(s => 
        s.id === 39 ? { ...s, owner: 1 } as Property : s  // Boardwalk
      ),
      players: useGameStore.getState().players.map((p, i) => {
        if (i === 0) return { ...p, cash: 10, position: 38 };
        if (i === 1) return { ...p, properties: [39] };
        return p;
      }),
      diceRoll: { die1: 1, die2: 0, total: 1, isDoubles: false },
    });
    
    const p1InitialCash = useGameStore.getState().players[1]!.cash;
    
    // Move to Boardwalk
    useGameStore.getState().movePlayer(0, 1);
    
    const state = useGameStore.getState();
    
    // Player 0 should be bankrupt
    expect(state.players[0]?.bankrupt).toBe(true);
    
    // Player 1 should have received player 0's cash
    expect(state.players[1]?.cash).toBe(p1InitialCash + 10);
  });

  test("bankrupt player's properties return to bank (or creditor)", () => {
    setupGame(2);
    
    // Player 0 owns properties but will go bankrupt
    useGameStore.setState({
      spaces: useGameStore.getState().spaces.map(s => {
        if (s.id === 1 || s.id === 3) {
          return { ...s, owner: 0, houses: 2 } as Property;
        }
        if (s.id === 39) {
          return { ...s, owner: 1 } as Property;
        }
        return s;
      }),
      players: useGameStore.getState().players.map((p, i) => {
        if (i === 0) return { ...p, cash: 10, position: 38, properties: [1, 3] };
        if (i === 1) return { ...p, properties: [39] };
        return p;
      }),
      diceRoll: { die1: 1, die2: 0, total: 1, isDoubles: false },
    });
    
    useGameStore.getState().movePlayer(0, 1);
    
    const state = useGameStore.getState();
    
    // Player 0's properties should now belong to creditor (player 1)
    const prop1 = state.spaces.find(s => s.id === 1) as Property;
    const prop3 = state.spaces.find(s => s.id === 3) as Property;
    
    expect(prop1.owner).toBe(1);
    expect(prop3.owner).toBe(1);
    expect(state.players[1]?.properties).toContain(1);
    expect(state.players[1]?.properties).toContain(3);
  });
});

describe("Integration: Win Condition", () => {
  test("game ends when only one player remains", () => {
    setupGame(3);
    
    // Make two players bankrupt
    useGameStore.setState({
      players: useGameStore.getState().players.map((p, i) => 
        i === 0 ? p : { ...p, bankrupt: true }
      ),
    });
    
    useGameStore.getState().checkWinCondition();
    
    const state = useGameStore.getState();
    expect(state.phase).toBe("game_over");
    expect(state.winner).toBe(0);
  });
});

describe("Integration: Card Movements", () => {
  test("Advance card moves player and awards GO if passing", () => {
    setupGame(2);
    
    // Position player at Boardwalk (39), draw card that advances to Illinois (24)
    useGameStore.setState({
      players: useGameStore.getState().players.map((p, i) => 
        i === 0 ? { ...p, position: 39 } : p
      ),
    });
    
    const initialCash = useGameStore.getState().players[0]!.cash;
    
    // Simulate drawing "Advance to Illinois Avenue" (position 24, passes GO)
    const card = {
      id: 2,
      type: "chance" as const,
      text: "Advance to Illinois Avenue",
      getEffect: () => ({
        positionChange: 24,
        passGoBonus: true,  // Position 24 < 39, so passes GO
        triggerSpaceResolution: true,
      }),
    };
    
    useGameStore.getState().applyCardEffect(card, 0);
    
    const state = useGameStore.getState();
    expect(state.players[0]?.position).toBe(24);
    expect(state.players[0]?.cash).toBe(initialCash + 200); // GO bonus
  });

  test("Go to Jail card sends player to jail", () => {
    setupGame(2);
    
    const card = {
      id: 9,
      type: "chance" as const,
      text: "Go to Jail",
      getEffect: () => ({
        positionChange: "jail" as const,
      }),
    };
    
    useGameStore.getState().applyCardEffect(card, 0);
    
    const state = useGameStore.getState();
    expect(state.players[0]?.inJail).toBe(true);
    expect(state.players[0]?.position).toBe(10);
  });

  test("Collect from each player card works correctly", () => {
    setupGame(3);
    
    const card = {
      id: 26,
      type: "community_chest" as const,
      text: "It is your birthday - Collect £10 from each player",
      getEffect: () => ({
        collectFromEach: 10,
      }),
    };
    
    const initialCashes = useGameStore.getState().players.map(p => p.cash);
    useGameStore.getState().applyCardEffect(card, 0);
    
    const state = useGameStore.getState();
    
    // Player 0 should receive 20 (10 from each of 2 other players)
    expect(state.players[0]?.cash).toBe(initialCashes[0]! + 20);
    expect(state.players[1]?.cash).toBe(initialCashes[1]! - 10);
    expect(state.players[2]?.cash).toBe(initialCashes[2]! - 10);
  });

  test("Street repairs card calculates cost correctly", () => {
    setupGame(2);
    
    // Player 0 has 3 houses and 1 hotel
    useGameStore.setState({
      spaces: useGameStore.getState().spaces.map(s => {
        if (s.id === 1) return { ...s, owner: 0, houses: 3 } as Property;
        if (s.id === 3) return { ...s, owner: 0, hotel: true, houses: 0 } as Property;
        return s;
      }),
      players: useGameStore.getState().players.map((p, i) => 
        i === 0 ? { ...p, properties: [1, 3] } : p
      ),
    });
    
    const card = {
      id: 31,
      type: "community_chest" as const,
      text: "Street repairs - £40 per house, £115 per hotel",
      getEffect: () => ({
        perHouseCost: 40,
        perHotelCost: 115,
      }),
    };
    
    const initialCash = useGameStore.getState().players[0]!.cash;
    useGameStore.getState().applyCardEffect(card, 0);
    
    const state = useGameStore.getState();
    // 3 houses * 40 + 1 hotel * 115 = 120 + 115 = 235
    expect(state.players[0]?.cash).toBe(initialCash - 235);
  });
});

describe("Integration: Auction Flow", () => {
  test("complete auction with multiple bidders", () => {
    setupGame(3);
    
    // Start auction for Mediterranean
    useGameStore.getState().startAuction(1);
    
    let state = useGameStore.getState();
    expect(state.phase).toBe("auction");
    expect(state.auction?.propertyId).toBe(1);
    
    // Player 0 bids 30
    useGameStore.getState().placeBid(0, 30);
    
    state = useGameStore.getState();
    expect(state.auction?.currentBid).toBe(30);
    expect(state.auction?.highestBidder).toBe(0);
    expect(state.auction?.activePlayerIndex).toBe(1);
    
    // Player 1 bids 50
    useGameStore.getState().placeBid(1, 50);
    
    state = useGameStore.getState();
    expect(state.auction?.currentBid).toBe(50);
    expect(state.auction?.highestBidder).toBe(1);
    
    // Player 2 passes
    useGameStore.getState().passAuction(2);
    
    // Player 0 passes
    useGameStore.getState().passAuction(0);
    
    // Auction should end, player 1 wins
    state = useGameStore.getState();
    expect(state.auction).toBeUndefined();
    
    const property = state.spaces.find(s => s.id === 1) as Property;
    expect(property.owner).toBe(1);
    expect(state.players[1]?.cash).toBe(1500 - 50);
    expect(state.players[1]?.properties).toContain(1);
  });

  test("auction with no bids leaves property unowned", () => {
    setupGame(2);
    
    useGameStore.getState().startAuction(1);
    
    // Both players pass
    useGameStore.getState().passAuction(0);
    useGameStore.getState().passAuction(1);
    
    const state = useGameStore.getState();
    expect(state.auction).toBeUndefined();
    
    const property = state.spaces.find(s => s.id === 1) as Property;
    expect(property.owner).toBeUndefined();
  });
});

describe("Integration: Trading Flow", () => {
  test("complete trade with properties and cash", () => {
    setupGame(2);
    
    // Set up properties
    useGameStore.setState({
      spaces: useGameStore.getState().spaces.map(s => {
        if (s.id === 1) return { ...s, owner: 0 } as Property;
        if (s.id === 5) return { ...s, owner: 1 } as Property;
        return s;
      }),
      players: useGameStore.getState().players.map((p, i) => {
        if (i === 0) return { ...p, properties: [1], jailFreeCards: 1 };
        if (i === 1) return { ...p, properties: [5] };
        return p;
      }),
    });
    
    // Propose trade: Player 0 offers Mediterranean + 50 cash + GOOJF for Reading RR
    useGameStore.getState().proposeTrade({
      fromPlayer: 0,
      toPlayer: 1,
      cashOffered: 50,
      propertiesOffered: [1],
      jailCardsOffered: 1,
      cashRequested: 0,
      propertiesRequested: [5],
      jailCardsRequested: 0,
    });
    
    let state = useGameStore.getState();
    expect(state.phase).toBe("trading");
    expect(state.trade?.status).toBe("pending");
    
    // Accept trade
    useGameStore.getState().acceptTrade();
    
    state = useGameStore.getState();
    
    // Verify trade completed
    expect(state.trade).toBeUndefined();
    
    // Player 0 should have Reading RR, lost Mediterranean, paid 50, lost GOOJF card
    expect(state.players[0]?.properties).toContain(5);
    expect(state.players[0]?.properties).not.toContain(1);
    expect(state.players[0]?.cash).toBe(1500 - 50);
    expect(state.players[0]?.jailFreeCards).toBe(0);
    
    // Player 1 should have Mediterranean, lost Reading RR, received 50, got GOOJF card
    expect(state.players[1]?.properties).toContain(1);
    expect(state.players[1]?.properties).not.toContain(5);
    expect(state.players[1]?.cash).toBe(1500 + 50);
    expect(state.players[1]?.jailFreeCards).toBe(1);
    
    // Ownership in spaces
    const prop1 = state.spaces.find(s => s.id === 1) as Property;
    const prop5 = state.spaces.find(s => s.id === 5) as Property;
    expect(prop1.owner).toBe(1);
    expect(prop5.owner).toBe(0);
  });
});

describe("Integration: Building Flow", () => {
  test("build houses evenly then hotel", () => {
    setupGame(2);
    
    // Player 0 owns both brown properties with plenty of cash
    useGameStore.setState({
      spaces: useGameStore.getState().spaces.map(s => {
        if (s.id === 1 || s.id === 3) {
          return { ...s, owner: 0 } as Property;
        }
        return s;
      }),
      players: useGameStore.getState().players.map((p, i) => 
        i === 0 ? { ...p, properties: [1, 3], cash: 2000 } : p
      ),
    });
    
    // Build houses evenly
    useGameStore.getState().buildHouse(1);
    
    let state = useGameStore.getState();
    let prop1 = state.spaces.find(s => s.id === 1) as Property;
    expect(prop1.houses).toBe(1);
    
    // Can't build second house on property 1 until property 3 has 1
    useGameStore.getState().buildHouse(1);
    prop1 = useGameStore.getState().spaces.find(s => s.id === 1) as Property;
    expect(prop1.houses).toBe(1); // Should still be 1
    
    // Build on property 3
    useGameStore.getState().buildHouse(3);
    let prop3 = useGameStore.getState().spaces.find(s => s.id === 3) as Property;
    expect(prop3.houses).toBe(1);
    
    // Now can build more on property 1
    useGameStore.getState().buildHouse(1);
    prop1 = useGameStore.getState().spaces.find(s => s.id === 1) as Property;
    expect(prop1.houses).toBe(2);
    
    // Build up to 4 houses each
    for (let i = 0; i < 6; i++) {
      useGameStore.getState().buildHouse(3);
      useGameStore.getState().buildHouse(1);
    }
    
    state = useGameStore.getState();
    prop1 = state.spaces.find(s => s.id === 1) as Property;
    prop3 = state.spaces.find(s => s.id === 3) as Property;
    expect(prop1.houses).toBe(4);
    expect(prop3.houses).toBe(4);
    
    // Build hotel on property 1
    useGameStore.getState().buildHotel(1);
    
    state = useGameStore.getState();
    prop1 = state.spaces.find(s => s.id === 1) as Property;
    expect(prop1.hotel).toBe(true);
    expect(prop1.houses).toBe(0);
  });
});

describe("Integration: Mortgage and Unmortgage Flow", () => {
  test("mortgage property, collect money, unmortgage with 10% interest", () => {
    setupGame(2);
    
    // Player 0 owns Mediterranean
    useGameStore.setState({
      spaces: useGameStore.getState().spaces.map(s => 
        s.id === 1 ? { ...s, owner: 0 } as Property : s
      ),
      players: useGameStore.getState().players.map((p, i) => 
        i === 0 ? { ...p, properties: [1] } : p
      ),
    });
    
    const initialCash = useGameStore.getState().players[0]!.cash;
    
    // Mortgage property (mortgage value is 30)
    useGameStore.getState().mortgageProperty(1);
    
    let state = useGameStore.getState();
    let property = state.spaces.find(s => s.id === 1) as Property;
    expect(property.mortgaged).toBe(true);
    expect(state.players[0]?.cash).toBe(initialCash + 30);
    
    // Unmortgage (costs 33 = 30 * 1.1)
    useGameStore.getState().unmortgageProperty(1);
    
    state = useGameStore.getState();
    property = state.spaces.find(s => s.id === 1) as Property;
    expect(property.mortgaged).toBe(false);
    expect(state.players[0]?.cash).toBe(initialCash + 30 - 33);
  });
});
