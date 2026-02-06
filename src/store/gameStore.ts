import { create } from "zustand";
import type { GameState, Property, ColorGroup, GameLogEntry, TradeOffer, GameSettings, AIDifficulty } from "../types/game";
import { DEFAULT_GAME_SETTINGS } from "../types/game";
import { boardSpaces } from "../data/board";
import { getPlayerProperties, hasMonopoly } from "../logic/rules/monopoly";
import { useLocalStore } from "./localStore";

const isProperty = (space: any): space is Property => {
  return space.type === "property" || space.type === "railroad" || space.type === "utility";
};

type GameStore = GameState & {
  connected: boolean;
  inRoom: boolean;
  connect: () => void;
  clientId: string;

  // Actions (send to server)
  initGame: (playerNames: string[], tokens: string[], isAIFlags?: boolean[], aiDifficulties?: AIDifficulty[], clientIds?: (string | undefined)[]) => void;
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
  counterOffer: (counterOffer: TradeOffer) => void;
  acceptCounterOffer: () => void;
  executeAITurn: () => void;
  executeAITradeResponse: () => void;
  chooseTaxOption: (playerIndex: number, choice: "flat" | "percentage") => void;
  updateSettings: (settings: Partial<GameSettings>) => void;
  
  // Bank Loans (Phase 2)
  takeLoan: (playerIndex: number, amount: number) => void;
  repayLoan: (playerIndex: number, loanId: number, amount: number) => void;
  getMaxLoanAmount: (playerIndex: number) => number;
  
  // Phase 3: Rent Negotiation
  forgiveRent: () => void;
  offerPaymentPlan: (partialPayment: number, interestRate: number) => void;
  acceptPaymentPlan: () => void;
  rejectPaymentPlan: () => void;
  createRentIOU: (partialPayment: number) => void;
  payIOU: (debtorIndex: number, iouId: number, amount?: number) => void;
  demandImmediatePaymentOrProperty: (propertyIdToTransfer?: number) => void;
  
  // Phase 3: Property Value Fluctuation
  appreciateColorGroup: (colorGroup: ColorGroup, multiplier?: number) => void;
  depreciateColorGroup: (colorGroup: ColorGroup, rate?: number) => void;
  
  // Phase 3: Property Insurance
  buyPropertyInsurance: (propertyId: number, playerIndex: number) => void;
  getInsuranceCost: (propertyId: number) => number;
  
  // Phase 3: Bankruptcy Restructuring
  enterChapter11: () => void;
  declineRestructuring: () => void;
  
  // Phase 3: Debt Service & Foreclosure
  payDebtService: () => void;
  handleForeclosureDecision: (outcome: "restructure" | "foreclose", propertyId?: number) => void;
  
  // Room actions
  createRoom: (mode?: "single" | "multi") => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: () => void;
  listRooms: () => void;
  
  // Lobby actions
  addPlayer: (name: string, token: string, clientId: string, isMobile?: boolean) => void;
  updatePlayer: (index: number, name: string, token: string) => void;
  assignPlayer: (index: number, clientId: string) => void;
  startGame: () => void;

  rooms: { id: string; players: number }[];
  
  // Helpers (local read-only)
  getPlayerProperties: (playerIndex: number) => Property[];
  getPropertyById: (propertyId: number) => Property | undefined;
  hasMonopoly: (playerIndex: number, colorGroup: ColorGroup) => boolean;
};

let socket: WebSocket | null = null;

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  clientId: useLocalStore.getState().clientId,
  players: [],
  currentPlayerIndex: 0,
  spaces: boardSpaces,
  chanceDeck: [],
  communityChestDeck: [],
  diceRoll: null,
  consecutiveDoubles: 0,
  phase: "setup",
  passedGo: false,
  auction: null,
  trade: null,
  lastCardDrawn: null,
  previousPhase: null,
  winner: null,
  lastDiceRoll: null,
  gameLog: [],
  turn: 1,
  connected: false,
  inRoom: false,
  roomId: null,
  rooms: [],
  // Game settings
  settings: DEFAULT_GAME_SETTINGS,
  // Phase 1: Economic Realism
  roundsCompleted: 0,
  currentGoSalary: 200,
  awaitingTaxDecision: null,
  // Phase 2: Housing Scarcity
  availableHouses: 32,
  availableHotels: 12,
  // Phase 2: Economic Events
  activeEconomicEvents: [],
  // Phase 3: Rent Negotiation
  pendingRentNegotiation: null,
  // Phase 3: Bankruptcy
  pendingBankruptcy: null,
  // Card-triggered utility multiplier override
  utilityMultiplierOverride: null,
  // Jackpot system
  jackpot: 0,

  connect: () => {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;

    const clientId = useLocalStore.getState().clientId;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    socket = new WebSocket(`${protocol}//${host}/ws?clientId=${clientId}`);

    socket.onopen = () => {
      console.log("Connected to game server");
      set({ connected: true });
      // Reset reconnect attempts on successful connection
      (get() as any).reconnectAttempts = 0;
      // Ask for room list immediately
      socket?.send(JSON.stringify({ type: "LIST_ROOMS" }));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "STATE_UPDATE") {
          console.log("Received state update", data.state);
          set({ ...data.state, inRoom: true });
        } else if (data.type === "ROOM_LIST") {
          set({ rooms: data.rooms });
        } else if (data.type === "ROOM_CREATED") {
          // Auto-join the created room
          console.log("Room created, joining:", data.roomId);
          get().joinRoom(data.roomId);
        }
      } catch (e) {
        console.error("Failed to parse server message", e);
      }
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      set({ connected: false });
    };

    socket.onclose = (event) => {
      console.log("Disconnected from game server", event.code, event.reason);
      set({ connected: false });
      
      // Only retry if it wasn't a clean close and we're in a room
      if (event.code !== 1000 && get().inRoom) {
        // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
        const retryCount = (get() as any).reconnectAttempts || 0;
        const maxRetries = 5;
        
        if (retryCount < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
          console.log(`Reconnecting in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})...`);
          
          setTimeout(() => {
            (get() as any).reconnectAttempts = retryCount + 1;
            get().connect();
          }, delay);
        } else {
          console.error("Max reconnection attempts reached. Please refresh the page.");
          set({ connected: false, inRoom: false });
        }
      }
    };
  },

  createRoom: (mode = "single") => {
    socket?.send(JSON.stringify({ type: "CREATE_ROOM", mode }));
  },
  joinRoom: (roomId: string) => {
    socket?.send(JSON.stringify({ type: "JOIN_ROOM", roomId }));
  },
  leaveRoom: () => {
    set({ inRoom: false });
  },
  listRooms: () => {
    socket?.send(JSON.stringify({ type: "LIST_ROOMS" }));
  },
  addPlayer: (name: string, token: string) => { // Updated signature
    const clientId = useLocalStore.getState().clientId;
    const isMobile = window.innerWidth <= 768; // Detect mobile on join
    socket?.send(JSON.stringify({ type: "ACTION", action: "addPlayer", payload: [name, token, clientId, isMobile] }));
  },
  updatePlayer: (index, name, token) => {
    socket?.send(JSON.stringify({ type: "ACTION", action: "updatePlayer", payload: [index, name, token] }));
  },
  startGame: () => {
    socket?.send(JSON.stringify({ type: "ACTION", action: "startGame", payload: [] }));
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
    "rejectTrade", "cancelTrade", "counterOffer", "acceptCounterOffer",
    "executeAITurn", "executeAITradeResponse",
    "chooseTaxOption", "updateSettings", "takeLoan", "repayLoan", "getMaxLoanAmount",
    "forgiveRent", "offerPaymentPlan", "acceptPaymentPlan", "rejectPaymentPlan", "createRentIOU", "payIOU", "demandImmediatePaymentOrProperty",
    "buyPropertyInsurance", "getInsuranceCost",
    "enterChapter11", "declineRestructuring",
    "payDebtService", "handleForeclosureDecision",
    "appreciateColorGroup", "depreciateColorGroup", "assignPlayer"
  ].reduce((acc, action) => {
    acc[action] = (...args: any[]) => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        try {
          // Safe serialization: handle cyclic references and non-serializable values
          const seen = new WeakSet();
          const replacer = (key: string, val: any): any => {
            // Skip functions, undefined, and symbols
            if (typeof val === "function" || val === undefined || typeof val === "symbol") {
              return null;
            }
            // Handle cyclic references
            if (typeof val === "object" && val !== null) {
              if (seen.has(val)) {
                return "[Circular]";
              }
              seen.add(val);
            }
            return val;
          };
          
          // Clean each argument
          const cleanedPayload = args.map((arg, idx) => {
            if (typeof arg === "object" && arg !== null) {
              try {
                // Use the replacer to clean the object
                const cleaned = JSON.parse(JSON.stringify(arg, replacer));
                return cleaned;
              } catch (e) {
                console.warn(`Failed to clean arg for action ${action}:`, e);
                // Return a safe fallback
                try {
                  // Try a simpler approach: just stringify with basic replacer
                  return JSON.parse(JSON.stringify(arg, (k, v) => {
                    if (typeof v === "function" || v === undefined || typeof v === "symbol") return null;
                    return v;
                  }));
                } catch (e2) {
                  console.error(`Failed to serialize arg for action ${action}, using null:`, e2);
                  return null;
                }
              }
            }
            return arg;
          });
          
          // Now stringify the entire payload with the same replacer approach
          const seen2 = new WeakSet();
          const finalReplacer = (key: string, val: any): any => {
            if (typeof val === "function" || val === undefined || typeof val === "symbol") {
              return null;
            }
            if (typeof val === "object" && val !== null) {
              if (seen2.has(val)) {
                return "[Circular]";
              }
              seen2.add(val);
            }
            return val;
          };
          
          const message = JSON.stringify({ type: "ACTION", action, payload: cleanedPayload }, finalReplacer);
          socket.send(message);
        } catch (e) {
          console.error(`Failed to send action ${action}:`, e);
          // Last resort: try to send with minimal payload
          try {
            const minimalPayload = args.map(arg => {
              if (typeof arg === "object" && arg !== null) {
                try {
                  return JSON.parse(JSON.stringify(arg));
                } catch {
                  return null;
                }
              }
              return arg;
            });
            socket.send(JSON.stringify({ type: "ACTION", action, payload: minimalPayload }));
          } catch (e2) {
            console.error(`Completely failed to send action ${action}:`, e2);
          }
        }
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
