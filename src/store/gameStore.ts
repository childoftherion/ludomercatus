import { create } from "zustand";
import type { GameState, Player, Property, Space, Card, DiceRoll, CardEffect, AuctionState, TradeOffer, TradeState, GameLogEntry } from "../types/game";
import { boardSpaces } from "../data/board";
import { createChanceDeck, createCommunityChestDeck } from "../data/cards";
import type { ColorGroup } from "../types/game";
import { calculateRent } from "../logic/rules/rent";
import { hasMonopoly, getPlayerProperties } from "../logic/rules/monopoly";
import { executeAITurn, executeAITradeResponse } from "../logic/ai";

// Log entry ID counter
let logIdCounter = 0;

type GameStore = GameState & {
  // Core game actions
  initGame: (playerNames: string[], tokens: string[], isAIFlags?: boolean[]) => void;
  rollDice: () => DiceRoll;
  movePlayer: (playerIndex: number, steps: number) => void;
  resolveSpace: (playerIndex: number) => void;
  buyProperty: (propertyId: number) => void;
  declineProperty: (propertyId: number) => void;
  payRent: (playerIndex: number, propertyId: number, diceTotal: number) => void;
  payTax: (playerIndex: number, amount: number) => void;
  endTurn: () => void;
  
  // Jail actions
  goToJail: (playerIndex: number) => void;
  getOutOfJail: (playerIndex: number, method: "roll" | "pay" | "card") => void;
  
  // Building actions
  buildHouse: (propertyId: number) => void;
  buildHotel: (propertyId: number) => void;
  sellHouse: (propertyId: number) => void;
  sellHotel: (propertyId: number) => void;
  
  // Mortgage actions
  mortgageProperty: (propertyId: number) => void;
  unmortgageProperty: (propertyId: number) => void;
  
  // Logging
  addLogEntry: (message: string, type: GameLogEntry["type"], playerIndex?: number) => void;
  
  // Card actions
  drawCard: (playerIndex: number, type: "chance" | "community_chest") => void;
  applyCardEffect: (card: Card, playerIndex: number) => void;
  
  // Bankruptcy and win
  checkBankruptcy: (playerIndex: number) => void;
  declareBankruptcy: (playerIndex: number, creditorIndex?: number) => void;
  checkWinCondition: () => void;
  
  // Auction actions
  startAuction: (propertyId: number) => void;
  placeBid: (playerIndex: number, amount: number) => void;
  passAuction: (playerIndex: number) => void;
  endAuction: () => void;
  
  // Trading actions
  startTrade: (fromPlayer: number, toPlayer: number) => void;
  updateTradeOffer: (offer: TradeOffer) => void;
  proposeTrade: (offer: TradeOffer) => void;
  acceptTrade: () => void;
  rejectTrade: () => void;
  cancelTrade: () => void;
  
  // AI actions
  executeAITurn: () => void;
  executeAITradeResponse: () => void;
  
  // Helper functions
  getPlayerProperties: (playerIndex: number) => Property[];
  getPropertyById: (propertyId: number) => Property | undefined;
  hasMonopoly: (playerIndex: number, colorGroup: ColorGroup) => boolean;
};

const shuffleDeck = <T extends { id: number }>(deck: readonly T[]): T[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j]!;
    shuffled[j] = temp!;
  }
  return shuffled;
};

const createPlayer = (
  id: number,
  name: string,
  token: string,
  color: string,
  isAI: boolean = false
): Player => ({
  id,
  name,
  token,
  color,
  cash: 1500,
  position: 0,
  properties: [],
  inJail: false,
  jailTurns: 0,
  jailFreeCards: 0,
  bankrupt: false,
  isAI,
  lastTradeTurn: -10, // Allow trading early
});

const PLAYER_COLORS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F"];

const isProperty = (space: Space): space is Property => {
  return space.type === "property" || space.type === "railroad" || space.type === "utility";
};

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  players: [],
  currentPlayerIndex: 0,
  spaces: boardSpaces as Space[],
  chanceDeck: shuffleDeck(createChanceDeck()),
  communityChestDeck: shuffleDeck(createCommunityChestDeck()),
  diceRoll: undefined,
  consecutiveDoubles: 0,
  phase: "setup",
  passedGo: false,
  auction: undefined,
  trade: undefined,
  lastCardDrawn: undefined,
  gameLog: [],
  turn: 1,

  // ============ HELPER FUNCTIONS ============
  
  getPlayerProperties: (playerIndex: number): Property[] => {
    return getPlayerProperties(get(), playerIndex);
  },

  getPropertyById: (propertyId: number): Property | undefined => {
    const state = get();
    const space = state.spaces.find(s => s.id === propertyId);
    return space && isProperty(space) ? space : undefined;
  },

  hasMonopoly: (playerIndex: number, colorGroup: ColorGroup): boolean => {
    return hasMonopoly(get(), playerIndex, colorGroup);
  },

  // ============ CORE GAME ACTIONS ============

  initGame: (playerNames: string[], tokens: string[], isAIFlags: boolean[] = []) => {
    const players = playerNames.map((name, index) =>
      createPlayer(
        index, 
        name, 
        tokens[index] ?? name, 
        PLAYER_COLORS[index] ?? "#999999",
        isAIFlags[index] ?? false
      )
    );

    set({
      players,
      currentPlayerIndex: 0,
      spaces: boardSpaces as Space[],
      chanceDeck: shuffleDeck(createChanceDeck()),
      communityChestDeck: shuffleDeck(createCommunityChestDeck()),
      phase: "rolling",
      diceRoll: undefined,
      consecutiveDoubles: 0,
      passedGo: false,
      auction: undefined,
      trade: undefined,
      lastCardDrawn: undefined,
      gameLog: [],
      turn: 1,
    });

    get().addLogEntry(`Game started with ${players.length} players!`, "system");
  },

  rollDice: () => {
    const state = get();
    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    const total = die1 + die2;
    const isDoubles = die1 === die2;

    const roll: DiceRoll = { die1, die2, total, isDoubles };

    set({ diceRoll: roll, lastDiceRoll: roll });

    const player = state.players[state.currentPlayerIndex];
    if (player) {
      const doublesText = isDoubles ? " (Doubles!)" : "";
      get().addLogEntry(`${player.name} rolled ${die1} + ${die2} = ${total}${doublesText}`, "roll", state.currentPlayerIndex);
    }

    return roll;
  },

  movePlayer: (playerIndex, steps) => {
    const state = get();
    const player = state.players[playerIndex];
    if (!player || player.inJail || player.bankrupt) return;

    const oldPosition = player.position;
    const newPosition = (oldPosition + steps) % 40;
    const passedGo = newPosition < oldPosition && steps > 0;

    set({
      players: state.players.map((p, i) =>
        i === playerIndex
          ? { 
              ...p, 
              position: newPosition, 
              cash: p.cash + (passedGo ? 200 : 0) 
            }
          : p
      ),
      passedGo,
      phase: "resolving_space",
    });
    
    const space = state.spaces[newPosition];
    const goBonus = passedGo ? " (collected £200 passing GO)" : "";
    if (space) {
      get().addLogEntry(`${player.name} moved to ${space.name}${goBonus}`, "move", playerIndex);
    }
    
    get().resolveSpace(playerIndex);
  },

  resolveSpace: (playerIndex: number) => {
    const state = get();
    const player = state.players[playerIndex];
    if (!player) return;

    const space = state.spaces[player.position];
    if (!space) return;

    switch (space.type) {
      case "property":
      case "railroad":
      case "utility": {
        const property = space as Property;
        if (property.owner === undefined) {
          set({ phase: "awaiting_buy_decision" });
        } else if (property.owner !== playerIndex && !property.mortgaged) {
          const diceTotal = state.diceRoll?.total ?? 7;
          get().payRent(playerIndex, property.id, diceTotal);
        }
        break;
      }
      
      case "chance":
      case "community_chest":
        get().drawCard(playerIndex, space.type);
        break;
        
      case "tax": {
        const amount = space.name.includes("Income") ? 200 : 100;
        get().payTax(playerIndex, amount);
        break;
      }
        
      case "go_to_jail":
        get().goToJail(playerIndex);
        break;
        
      default:
        break;
    }
  },

  buyProperty: (propertyId) => {
    const state = get();
    const playerIndex = state.currentPlayerIndex;
    const player = state.players[playerIndex];
    const property = state.spaces.find((s) => s.id === propertyId) as Property;

    if (!player || !property || property.owner !== undefined || player.cash < property.price) return;

    set({
      spaces: state.spaces.map((s) =>
        s.id === propertyId ? { ...(s as Property), owner: playerIndex } : s
      ),
      players: state.players.map((p, i) =>
        i === playerIndex
          ? {
              ...p,
              cash: p.cash - property.price,
              properties: [...p.properties, property.id],
            }
          : p
      ),
      phase: "resolving_space",
    });

    get().addLogEntry(`${player.name} bought ${property.name} for £${property.price}`, "buy", playerIndex);
  },

  declineProperty: (propertyId) => {
    get().startAuction(propertyId);
  },

  payRent: (playerIndex, propertyId, diceTotal) => {
    const state = get();
    const payer = state.players[playerIndex];
    const property = state.spaces.find((s) => s.id === propertyId) as Property;
    
    if (!payer || !property) return;

    const rent = calculateRent(state, property, diceTotal);

    if (rent <= 0) return;

    if (payer.cash >= rent) {
      set({
        players: state.players.map((p, i) => {
          if (i === playerIndex) return { ...p, cash: p.cash - rent };
          if (i === property.owner) return { ...p, cash: p.cash + rent };
          return p;
        }),
      });

      const owner = state.players[property.owner!];
      get().addLogEntry(`${payer.name} paid £${rent} rent to ${owner?.name}`, "rent", playerIndex);
    } else {
      get().declareBankruptcy(playerIndex, property.owner);
    }
  },

  payTax: (playerIndex, amount) => {
    const state = get();
    const player = state.players[playerIndex];
    if (!player) return;

    if (player.cash >= amount) {
      set({
        players: state.players.map((p, i) =>
          i === playerIndex ? { ...p, cash: p.cash - amount } : p
        ),
      });
      get().addLogEntry(`${player.name} paid £${amount} in taxes`, "tax", playerIndex);
    } else {
      get().declareBankruptcy(playerIndex);
    }
  },

  endTurn: () => {
    const state = get();
    const roll = state.diceRoll;
    const currentPlayer = state.players[state.currentPlayerIndex];

    if (roll?.isDoubles && !currentPlayer?.inJail && !currentPlayer?.bankrupt) {
      if (state.consecutiveDoubles >= 2) {
        get().goToJail(state.currentPlayerIndex);
        return;
      }
      set({
        phase: "rolling",
        diceRoll: undefined,
        consecutiveDoubles: state.consecutiveDoubles + 1,
        lastCardDrawn: undefined,
      });
      return;
    }

    let nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
    let loopCount = 0;
    while (state.players[nextPlayerIndex]?.bankrupt && loopCount < state.players.length) {
      nextPlayerIndex = (nextPlayerIndex + 1) % state.players.length;
      loopCount++;
    }

    const nextPlayer = state.players[nextPlayerIndex];
    set({
      currentPlayerIndex: nextPlayerIndex,
      phase: nextPlayer?.inJail ? "jail_decision" : "rolling",
      diceRoll: undefined,
      consecutiveDoubles: 0,
      passedGo: false,
      lastCardDrawn: undefined,
      turn: state.turn + 1,
    });
  },

  goToJail: (playerIndex) => {
    const state = get();
    const player = state.players[playerIndex];
    
    set({
      players: state.players.map((p, i) =>
        i === playerIndex
          ? { ...p, position: 10, inJail: true, jailTurns: 0 }
          : p
      ),
      consecutiveDoubles: 0,
      diceRoll: undefined,
    });

    if (player) {
      get().addLogEntry(`${player.name} went to Jail!`, "jail", playerIndex);
    }

    setTimeout(() => {
      get().endTurn();
    }, 1500);
  },

  getOutOfJail: (playerIndex, method) => {
    const state = get();
    const player = state.players[playerIndex];
    if (!player) return;

    if (method === "pay") {
      if (player.cash >= 50) {
        set({
          players: state.players.map((p, i) =>
            i === playerIndex
              ? { ...p, cash: p.cash - 50, inJail: false, jailTurns: 0 }
              : p
          ),
          phase: "rolling",
        });
      }
    } else if (method === "card") {
      if (player.jailFreeCards > 0) {
        set({
          players: state.players.map((p, i) =>
            i === playerIndex
              ? { ...p, jailFreeCards: p.jailFreeCards - 1, inJail: false, jailTurns: 0 }
              : p
          ),
          phase: "rolling",
        });
      }
    } else if (method === "roll") {
      const roll = get().rollDice();
      if (roll.isDoubles) {
        set({
          players: state.players.map((p, i) =>
            i === playerIndex ? { ...p, inJail: false, jailTurns: 0 } : p
          ),
          consecutiveDoubles: 0,
        });
        get().movePlayer(playerIndex, roll.total);
      } else {
        const newJailTurns = player.jailTurns + 1;
        if (newJailTurns >= 3) {
          set({
            players: state.players.map((p, i) =>
              i === playerIndex ? { ...p, cash: p.cash - 50, inJail: false, jailTurns: 0 } : p
            ),
          });
          get().movePlayer(playerIndex, roll.total);
        } else {
          set({
            players: state.players.map((p, i) =>
              i === playerIndex ? { ...p, jailTurns: newJailTurns } : p
            ),
          });
          get().endTurn();
        }
      }
    }
  },

  buildHouse: (propertyId) => {
    const state = get();
    const playerIndex = state.currentPlayerIndex;
    const player = state.players[playerIndex];
    if (!player) return;
    const property = state.spaces.find(s => s.id === propertyId) as Property;
    if (!property || property.owner !== playerIndex || property.houses >= 4 || !property.buildingCost || player.cash < property.buildingCost || !property.colorGroup) return;

    if (!get().hasMonopoly(playerIndex, property.colorGroup)) return;

    const groupProperties = state.spaces.filter((s): s is Property => isProperty(s) && s.colorGroup === property.colorGroup);
    const minHouses = Math.min(...groupProperties.map(p => p.houses));
    if (property.houses > minHouses) return;

    set({
      spaces: state.spaces.map(s => s.id === propertyId ? { ...s, houses: (s as Property).houses + 1 } : s),
      players: state.players.map((p, i) => i === playerIndex ? { ...p, cash: p.cash - property.buildingCost! } : p)
    });
    get().addLogEntry(`${player.name} built a house on ${property.name}`, "system", playerIndex);
  },

  buildHotel: (propertyId) => {
    const state = get();
    const playerIndex = state.currentPlayerIndex;
    const player = state.players[playerIndex];
    if (!player) return;
    const property = state.spaces.find(s => s.id === propertyId) as Property;
    if (!property || property.owner !== playerIndex || property.houses !== 4 || !property.buildingCost || player.cash < property.buildingCost || !property.colorGroup) return;

    const groupProperties = state.spaces.filter((s): s is Property => isProperty(s) && s.colorGroup === property.colorGroup);
    if (!groupProperties.every(p => p.houses === 4 || p.hotel)) return;

    set({
      spaces: state.spaces.map(s => s.id === propertyId ? { ...s, houses: 0, hotel: true } : s),
      players: state.players.map((p, i) => i === playerIndex ? { ...p, cash: p.cash - property.buildingCost! } : p)
    });
    get().addLogEntry(`${player.name} built a hotel on ${property.name}`, "system", playerIndex);
  },

  sellHouse: (propertyId) => {
    const state = get();
    const playerIndex = state.currentPlayerIndex;
    const player = state.players[playerIndex];
    if (!player) return;
    const property = state.spaces.find(s => s.id === propertyId) as Property;
    if (!property || property.owner !== playerIndex || property.houses <= 0) return;

    const sellValue = Math.floor((property.buildingCost ?? 0) / 2);
    set({
      spaces: state.spaces.map(s => s.id === propertyId ? { ...s, houses: (s as Property).houses - 1 } : s),
      players: state.players.map((p, i) => i === playerIndex ? { ...p, cash: p.cash + sellValue } : p)
    });
    get().addLogEntry(`${player.name} sold a house on ${property.name}`, "system", playerIndex);
  },

  sellHotel: (propertyId) => {
    const state = get();
    const playerIndex = state.currentPlayerIndex;
    const player = state.players[playerIndex];
    if (!player) return;
    const property = state.spaces.find(s => s.id === propertyId) as Property;
    if (!property || property.owner !== playerIndex || !property.hotel) return;

    const sellValue = Math.floor((property.buildingCost ?? 0) / 2);
    set({
      spaces: state.spaces.map(s => s.id === propertyId ? { ...s, houses: 4, hotel: false } : s),
      players: state.players.map((p, i) => i === playerIndex ? { ...p, cash: p.cash + sellValue } : p)
    });
    get().addLogEntry(`${player.name} sold a hotel on ${property.name}`, "system", playerIndex);
  },

  mortgageProperty: (propertyId) => {
    const state = get();
    const space = state.spaces.find(s => s.id === propertyId) as Property;
    if (!space || space.owner === undefined || space.mortgaged || space.houses > 0 || space.hotel) return;

    set({
      spaces: state.spaces.map(s => s.id === propertyId ? { ...s, mortgaged: true } : s),
      players: state.players.map((p, i) => i === space.owner ? { ...p, cash: p.cash + space.mortgageValue } : p)
    });
    const owner = state.players[space.owner];
    if (owner) get().addLogEntry(`${owner.name} mortgaged ${space.name}`, "system", space.owner);
  },

  unmortgageProperty: (propertyId) => {
    const state = get();
    const space = state.spaces.find(s => s.id === propertyId) as Property;
    if (!space || space.owner === undefined || !space.mortgaged) return;

    const unmortgageCost = Math.floor(space.mortgageValue * 1.1);
    const player = state.players[space.owner];
    if (!player || player.cash < unmortgageCost) return;

    set({
      spaces: state.spaces.map(s => s.id === propertyId ? { ...s, mortgaged: false } : s),
      players: state.players.map((p, i) => i === space.owner ? { ...p, cash: p.cash - unmortgageCost } : p)
    });
    get().addLogEntry(`${player.name} unmortgaged ${space.name}`, "system", space.owner);
  },

  addLogEntry: (message, type, playerIndex) => {
    const state = get();
    const entry: GameLogEntry = { id: ++logIdCounter, timestamp: Date.now(), playerIndex, message, type };
    set({ gameLog: [...state.gameLog.slice(-49), entry] });
  },

  drawCard: (playerIndex, type) => {
    const state = get();
    const deck = type === "chance" ? state.chanceDeck : state.communityChestDeck;
    const card = deck[0];
    const player = state.players[playerIndex];
    if (!card || !player) return;

    get().addLogEntry(`${player.name} drew ${type === "chance" ? "Chance" : "Community Chest"}: "${card.text}"`, "card", playerIndex);
    get().applyCardEffect(card, playerIndex);

    const updatedDeck = [...deck.slice(1), card];
    if (type === "chance") set({ chanceDeck: updatedDeck });
    else set({ communityChestDeck: updatedDeck });
  },

  applyCardEffect: (card, playerIndex) => {
    const state = get();
    const effect = card.getEffect(state, playerIndex);
    const player = state.players[playerIndex];
    if (!player) return;

    let newPlayers = [...state.players];
    let cashChange = effect.cashChange ?? 0;
    let newPosition = player.position;

    if (effect.jailFreeCard) {
      newPlayers = newPlayers.map((p, i) => i === playerIndex ? { ...p, jailFreeCards: p.jailFreeCards + 1 } : p);
    }

    if (effect.positionChange !== undefined) {
      if (effect.positionChange === "jail") {
        get().goToJail(playerIndex);
        return;
      } else {
        newPosition = effect.positionChange;
        // Trust the card effect logic for the bonus
        if (effect.passGoBonus) cashChange += 200;
      }
    }

    if (effect.collectFromEach) {
      const amount = effect.collectFromEach;
      newPlayers = newPlayers.map((p, i) => {
        if (i === playerIndex) return p;
        if (!p.bankrupt) {
          const payment = Math.min(p.cash, amount);
          cashChange += payment;
          return { ...p, cash: p.cash - payment };
        }
        return p;
      });
    }

    if (effect.payToEach) {
      const amount = effect.payToEach;
      newPlayers = newPlayers.map((p, i) => {
        if (i === playerIndex) return p;
        if (!p.bankrupt) {
          cashChange -= amount;
          return { ...p, cash: p.cash + amount };
        }
        return p;
      });
    }

    if (effect.perHouseCost || effect.perHotelCost) {
      const playerProperties = get().getPlayerProperties(playerIndex);
      let totalCost = 0;
      playerProperties.forEach(prop => {
        if (prop.hotel) totalCost += effect.perHotelCost ?? 0;
        else totalCost += prop.houses * (effect.perHouseCost ?? 0);
      });
      cashChange -= totalCost;
    }

    set({
      players: newPlayers.map((p, i) => i === playerIndex ? { ...p, position: newPosition, cash: p.cash + cashChange } : p),
      lastCardDrawn: card,
    });

    if (effect.triggerSpaceResolution) get().resolveSpace(playerIndex);
  },

  checkBankruptcy: (playerIndex) => {
    const player = get().players[playerIndex];
    if (player && player.cash < 0) get().declareBankruptcy(playerIndex);
  },

  declareBankruptcy: (playerIndex, creditorIndex) => {
    const state = get();
    const player = state.players[playerIndex];
    if (!player) return;

    const playerPropertyIds = player.properties;

    set({
      players: state.players.map((p, i) => {
        if (i === playerIndex) return { ...p, bankrupt: true, cash: 0, properties: [] };
        if (i === creditorIndex && creditorIndex !== undefined) {
          return { 
            ...p, 
            cash: p.cash + Math.max(0, player.cash),
            properties: [...p.properties, ...playerPropertyIds],
            jailFreeCards: p.jailFreeCards + player.jailFreeCards
          };
        }
        return p;
      }),
      spaces: state.spaces.map(s => (isProperty(s) && s.owner === playerIndex) ? { ...s, owner: creditorIndex, houses: 0, hotel: false, mortgaged: false } : s)
    });
    get().addLogEntry(`${player.name} went bankrupt!`, "bankrupt", playerIndex);
    
    // Check if game over
    get().checkWinCondition();

    // If current player went bankrupt, end their turn immediately
    if (state.currentPlayerIndex === playerIndex) {
      get().endTurn();
    }
  },

  checkWinCondition: () => {
    const activePlayers = get().players.filter(p => !p.bankrupt);
    if (activePlayers.length === 1) {
      set({ winner: activePlayers[0]!.id, phase: "game_over" });
    }
  },

  startAuction: (propertyId) => {
    let startingBidder = get().currentPlayerIndex;
    set({
      auction: { propertyId, currentBid: 0, highestBidder: null, activePlayerIndex: startingBidder, passedPlayers: [] },
      phase: "auction"
    });
    const prop = get().spaces.find(s => s.id === propertyId);
    get().addLogEntry(`Auction started for ${prop?.name}!`, "auction");
  },

  placeBid: (playerIndex, amount) => {
    const state = get();
    if (!state.auction || amount <= state.auction.currentBid) return;
    set({ auction: { ...state.auction, currentBid: amount, highestBidder: playerIndex, activePlayerIndex: (playerIndex + 1) % state.players.length } });
  },

  passAuction: (playerIndex) => {
    const state = get();
    if (!state.auction) return;
    const passed = [...state.auction.passedPlayers, playerIndex];
    const activePlayers = state.players.filter((p, i) => !p.bankrupt && !passed.includes(i));
    
    if (activePlayers.length <= 1) get().endAuction();
    else set({ auction: { ...state.auction, passedPlayers: passed, activePlayerIndex: (playerIndex + 1) % state.players.length } });
  },

  endAuction: () => {
    const state = get();
    const auction = state.auction;
    if (!auction) return;
    if (auction.highestBidder !== null) {
      const winner = state.players[auction.highestBidder]!;
      set({
        spaces: state.spaces.map(s => s.id === auction.propertyId ? { ...s, owner: auction.highestBidder } : s),
        players: state.players.map((p, i) => i === auction.highestBidder ? { ...p, cash: p.cash - auction.currentBid, properties: [...p.properties, auction.propertyId] } : p),
        auction: undefined, phase: "resolving_space"
      });
      get().addLogEntry(`${winner.name} won auction for £${auction.currentBid}`, "auction");
    } else {
      set({ auction: undefined, phase: "resolving_space" });
    }
  },

  startTrade: (fromPlayer, toPlayer) => {
    const state = get();
    set({ 
      trade: { offer: { fromPlayer, toPlayer, cashOffered: 0, propertiesOffered: [], jailCardsOffered: 0, cashRequested: 0, propertiesRequested: [], jailCardsRequested: 0 }, status: "draft" }, 
      phase: "trading",
      previousPhase: state.phase, // Save current phase
    });
  },

  updateTradeOffer: (offer) => {
    set(state => ({ trade: state.trade ? { ...state.trade, offer } : undefined }));
  },

  proposeTrade: (offer) => {
    set({ trade: { offer, status: "pending" }, phase: "trading" });
  },

  acceptTrade: () => {
    const state = get();
    const trade = state.trade;
    if (!trade) return;
    const { offer } = trade;
    set({
      players: state.players.map((p, i) => {
        if (i === offer.fromPlayer) {
          return {
            ...p,
            cash: p.cash - offer.cashOffered + offer.cashRequested,
            jailFreeCards: p.jailFreeCards - offer.jailCardsOffered + offer.jailCardsRequested,
            properties: [
              ...p.properties.filter(id => !offer.propertiesOffered.includes(id)),
              ...offer.propertiesRequested,
            ],
          };
        }
        if (i === offer.toPlayer) {
          return {
            ...p,
            cash: p.cash - offer.cashRequested + offer.cashOffered,
            jailFreeCards: p.jailFreeCards - offer.jailCardsRequested + offer.jailCardsOffered,
            properties: [
              ...p.properties.filter(id => !offer.propertiesRequested.includes(id)),
              ...offer.propertiesOffered,
            ],
          };
        }
        return p;
      }),
      spaces: state.spaces.map(s => {
        if (!isProperty(s)) return s;
        if (offer.propertiesOffered.includes(s.id)) return { ...s, owner: offer.toPlayer };
        if (offer.propertiesRequested.includes(s.id)) return { ...s, owner: offer.fromPlayer };
        return s;
      }),
      trade: undefined, 
      phase: state.previousPhase ?? "resolving_space", // Restore phase
      previousPhase: undefined,
    });
    get().addLogEntry(`Trade completed!`, "trade");
  },

  rejectTrade: () => {
    const state = get();
    const trade = state.trade;
    
    if (trade) {
      const initiator = state.players[trade.offer.fromPlayer];
      
      // If AI was initiator, update memory
      if (initiator && initiator.isAI) {
        // Record rejection for each requested property
        const newHistory = { ...(initiator.tradeHistory || {}) };
        
        trade.offer.propertiesRequested.forEach(propId => {
          const key = `${trade.offer.toPlayer}-${propId}`;
          const current = newHistory[key] || { attempts: 0, lastOffer: 0 };
          newHistory[key] = {
            attempts: current.attempts + 1,
            lastOffer: trade.offer.cashOffered
          };
        });
        
        // Update player
        set({
          players: state.players.map((p, i) => 
            i === trade.offer.fromPlayer ? { ...p, tradeHistory: newHistory } : p
          )
        });
      }
    }

    set({ 
      trade: undefined, 
      phase: state.previousPhase ?? "resolving_space",
      previousPhase: undefined,
    });
  },

  cancelTrade: () => {
    const state = get();
    set({ 
      trade: undefined, 
      phase: state.previousPhase ?? "resolving_space",
      previousPhase: undefined,
    });
  },

  executeAITurn: () => {
    executeAITurn(get(), get());
  },

  executeAITradeResponse: () => {
    executeAITradeResponse(get(), get());
  }
}));
