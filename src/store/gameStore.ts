import { create } from "zustand";
import type { GameState, Property, ColorGroup, GameLogEntry, TradeOffer } from "../types/game";
import { boardSpaces } from "../data/board";
import { getPlayerProperties, hasMonopoly } from "../logic/rules/monopoly";

const isProperty = (space: any): space is Property => {
  return space.type === "property" || space.type === "railroad" || space.type === "utility";
};

type GameStore = GameState & {
  connected: boolean;
  connect: () => void;

  // Actions (send to server)
  initGame: (playerNames: string[], tokens: string[], isAIFlags?: boolean[]) => void;
  rollDice: () => void;
  movePlayer: (playerIndex: number, steps: number) => void;
  buyProperty: (propertyId: number) => void;
  declineProperty: (propertyId: number) => void;
  payRent: (playerIndex: number, propertyId: number, diceTotal: number) => void;
  payTax: (playerIndex: number, amount: number) => void;
  endTurn: () => void;
  goToJail: (playerIndex: number) => void;
  getOutOfJail: (playerIndex: number, method: "roll" | "pay" | "card") => void;
  buildHouse: (propertyId: number) => void;
  buildHotel: (propertyId: number) => void;
  sellHouse: (propertyId: number) => void;
  sellHotel: (propertyId: number) => void;
  mortgageProperty: (propertyId: number) => void;
  unmortgageProperty: (propertyId: number) => void;
  drawCard: (playerIndex: number, type: "chance" | "community_chest") => void;
  checkBankruptcy: (playerIndex: number) => void;
  declareBankruptcy: (playerIndex: number, creditorIndex?: number) => void;
  checkWinCondition: () => void;
  startAuction: (propertyId: number) => void;
  placeBid: (playerIndex: number, amount: number) => void;
  passAuction: (playerIndex: number) => void;
  endAuction: () => void;
  startTrade: (fromPlayer: number, toPlayer: number) => void;
  updateTradeOffer: (offer: TradeOffer) => void;
  proposeTrade: (offer: TradeOffer) => void;
  acceptTrade: () => void;
  rejectTrade: () => void;
  cancelTrade: () => void;
  executeAITurn: () => void;
  executeAITradeResponse: () => void;
  
  // Helpers (local read-only)
  getPlayerProperties: (playerIndex: number) => Property[];
  getPropertyById: (propertyId: number) => Property | undefined;
  hasMonopoly: (playerIndex: number, colorGroup: ColorGroup) => boolean;
};

let socket: WebSocket | null = null;

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  players: [],
  currentPlayerIndex: 0,
  spaces: boardSpaces,
  chanceDeck: [],
  communityChestDeck: [],
  diceRoll: undefined,
  consecutiveDoubles: 0,
  phase: "setup",
  passedGo: false,
  auction: undefined,
  trade: undefined,
  lastCardDrawn: undefined,
  gameLog: [],
  turn: 1,
  connected: false,

  connect: () => {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    socket = new WebSocket(`${protocol}//${host}/ws`);

    socket.onopen = () => {
      console.log("Connected to game server");
      set({ connected: true });
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "STATE_UPDATE") {
          console.log("Received state update", data.state);
          set({ ...data.state });
        }
      } catch (e) {
        console.error("Failed to parse server message", e);
      }
    };

    socket.onclose = () => {
      console.log("Disconnected from game server");
      set({ connected: false });
      // Retry connection?
      setTimeout(() => get().connect(), 3000);
    };
  },

  // Generic action sender
  ...([
    "initGame", "rollDice", "movePlayer", "buyProperty", "declineProperty", 
    "payRent", "payTax", "endTurn", "goToJail", "getOutOfJail", 
    "buildHouse", "buildHotel", "sellHouse", "sellHotel", 
    "mortgageProperty", "unmortgageProperty", "drawCard", 
    "checkBankruptcy", "declareBankruptcy", "checkWinCondition", 
    "startAuction", "placeBid", "passAuction", "endAuction", 
    "startTrade", "updateTradeOffer", "proposeTrade", "acceptTrade", 
    "rejectTrade", "cancelTrade", "executeAITurn", "executeAITradeResponse"
  ].reduce((acc, action) => {
    acc[action] = (...args: any[]) => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "ACTION", action, payload: args }));
      } else {
        console.warn("Socket not connected, action ignored:", action);
      }
    };
    return acc;
  }, {} as any)),

  // Helpers
  getPlayerProperties: (playerIndex: number): Property[] => {
    const state = get();
    return getPlayerProperties(state, playerIndex);
  },

  getPropertyById: (propertyId: number): Property | undefined => {
    const state = get();
    const space = state.spaces.find(s => s.id === propertyId);
    return space && isProperty(space) ? space : undefined;
  },

  hasMonopoly: (playerIndex: number, colorGroup: ColorGroup): boolean => {
    const state = get();
    return hasMonopoly(state, playerIndex, colorGroup);
  },
}));
