/**
 * Server-side Action Authorization
 *
 * Validates that only the correct clientId can perform actions for the active
 * player/phase. Rejects and logs invalid attempts.
 *
 * @module server/authorization
 */

import type { GameState, GamePhase } from "../../types/game";

// ============================================================================
// Authorization Result Types
// ============================================================================

export interface AuthResult {
  allowed: boolean;
  payload: unknown[];
  error?: string;
}

export interface AuthContext {
  clientId: string | null;
  action: string;
  payload: unknown[];
  state: GameState;
}

/**
 * Authorization outcome for logging and metrics
 */
export type AuthOutcome = "allowed" | "denied" | "error";

// ============================================================================
// Authorization Logger
// ============================================================================

export interface AuthLogger {
  log: (
    outcome: AuthOutcome,
    clientId: string | null,
    action: string,
    reason: string,
  ) => void;
}

// Default no-op logger
export const consoleAuthLogger: AuthLogger = {
  log: (outcome, clientId, action, reason) => {
    if (outcome === "denied") {
      console.warn(
        `[AUTH] Denied: client=${clientId}, action=${action}, reason=${reason}`,
      );
    }
  },
};

// ============================================================================
// Authorization Engine
// ============================================================================

export class AuthorizationEngine {
  private logger: AuthLogger;
  private auditLog: AuthLogEntry[];
  private maxAuditLogSize: number;

  constructor(options: { logger?: AuthLogger; maxAuditLogSize?: number } = {}) {
    this.logger = options.logger || consoleAuthLogger;
    this.auditLog = [];
    this.maxAuditLogSize = options.maxAuditLogSize || 1000;
  }

  /**
   * Authorize an action against the current game state
   */
  authorize(ctx: AuthContext): AuthResult {
    const { clientId, action, payload, state } = ctx;
    const payloadArray: unknown[] = Array.isArray(payload) ? payload : [];

    const allow = (nextPayload: unknown[] = payloadArray): AuthResult => {
      this.logAuth("allowed", clientId, action, "Action permitted");
      return { allowed: true, payload: nextPayload };
    };

    const deny = (reason: string): AuthResult => {
      this.logAuth("denied", clientId, action, reason);
      return { allowed: false, payload: payloadArray, error: reason };
    };

    // --- Pre-game actions ---
    if (action === "initGame") {
      return allow(payloadArray);
    }

    if (action === "addPlayer") {
      if (!clientId) return deny("Missing clientId");
      const [name, token, _clientId, isMobile] = payloadArray;
      if (state.phase !== "lobby")
        return deny("Cannot add players after game starts");
      return allow([name, token, clientId, isMobile]);
    }

    if (action === "assignPlayer") {
      return this.authorizeAssignPlayer(clientId, payloadArray, state);
    }

    if (action === "startGame") {
      if (!clientId) return deny("Missing clientId");
      const actorIndex = this.findPlayerIndexByClientId(state, clientId);
      if (actorIndex === -1) return deny("Unknown player");
      if (state.players.length < 2) return deny("Need at least 2 players");
      return allow(payloadArray);
    }

    if (action === "updateSettings") {
      if (!clientId) return deny("Missing clientId");
      const actorIndex = this.findPlayerIndexByClientId(state, clientId);
      if (actorIndex === -1) return deny("Unknown player");
      if (actorIndex !== 0) return deny("Only host can update settings");
      if (state.phase !== "lobby" && state.phase !== "setup")
        return deny("Cannot update settings during game");
      return allow(payloadArray);
    }

    // --- In-game actions ---
    const actorIndex = clientId
      ? this.findPlayerIndexByClientId(state, clientId)
      : -1;
    const isCurrentTurn = actorIndex === state.currentPlayerIndex;
    const isHostClient = this.isHostClient(state, actorIndex);

    // Execute AI turn - only host can do this
    if (action === "executeAITurn" || action === "executeAITradeResponse") {
      if (!isHostClient) return deny("Only host can run AI");

      if (action === "executeAITurn") {
        const player = state.players[state.currentPlayerIndex];
        if (player?.isAI && state.phase === "rolling" && state.diceRoll) {
          return deny("AI already rolled, waiting for move");
        }
      }
      return allow(payloadArray);
    }

    // Turn-based actions - must be current player's turn
    if (action === "rollDice") {
      if (!isCurrentTurn) return deny("Not your turn");
      const player = state.players[state.currentPlayerIndex];
      if (!player || player.isAI) return deny("Not allowed - AI turn");
      if (state.phase !== "rolling")
        return deny(`Not allowed - phase is ${state.phase}`);
      if (player.inJail) return deny("Not allowed - in jail");
      if (state.diceRoll) return deny("Not allowed - already rolled");
      return allow(payloadArray);
    }

    if (action === "movePlayer") {
      const [playerIndex, steps] = payloadArray;
      if (typeof playerIndex !== "number" || typeof steps !== "number") {
        return deny("Invalid payload");
      }
      if (playerIndex !== actorIndex) return deny("Not allowed");
      if (state.phase !== "moving" && state.phase !== "rolling") {
        return deny(`Not allowed - phase is ${state.phase}`);
      }
      const rollTotal = state.diceRoll?.total;
      if (typeof rollTotal !== "number")
        return deny("Not allowed - no dice roll");
      if (steps !== rollTotal)
        return deny(`Not allowed - steps ${steps} !== dice ${rollTotal}`);
      return allow(payloadArray);
    }

    if (action === "buyProperty" || action === "declineProperty") {
      if (state.phase !== "awaiting_buy_decision")
        return deny("Not allowed - not awaiting buy decision");
      return allow(payloadArray);
    }

    if (action === "endTurn") {
      if (state.phase !== "resolving_space")
        return deny("Not allowed - not resolving space");
      return allow(payloadArray);
    }

    if (action === "getOutOfJail") {
      const [playerIndex, method] = payloadArray;
      if (typeof playerIndex !== "number") return deny("Invalid payload");
      if (playerIndex !== actorIndex) return deny("Not allowed");
      if (!isCurrentTurn) return deny("Not your turn");
      if (method !== "roll" && method !== "pay" && method !== "card")
        return deny("Invalid method");
      const player = state.players[playerIndex];
      if (!player?.inJail) return deny("Not in jail");
      if (state.phase !== "jail_decision" && state.phase !== "rolling")
        return deny("Not allowed");
      return allow(payloadArray);
    }

    if (action === "chooseTaxOption") {
      const [playerIndex, choice] = payloadArray;
      if (typeof playerIndex !== "number") return deny("Invalid payload");
      if (playerIndex !== actorIndex) return deny("Not allowed");
      if (!isCurrentTurn) return deny("Not your turn");
      if (choice !== "flat" && choice !== "percentage")
        return deny("Invalid choice");
      if (state.phase !== "awaiting_tax_decision") return deny("Not allowed");
      return allow(payloadArray);
    }

    // Auction actions
    if (action === "placeBid" || action === "passAuction") {
      const [playerIndex] = payloadArray;
      if (typeof playerIndex !== "number") return deny("Invalid payload");
      if (playerIndex !== actorIndex) return deny("Not allowed");
      if (state.phase !== "auction" || !state.auction)
        return deny("Not allowed");
      if (state.auction.activePlayerIndex !== playerIndex)
        return deny("Not your turn to bid");
      return allow(payloadArray);
    }

    // Trade actions
    if (this.isTradeAction(action)) {
      return this.authorizeTradeAction(
        clientId,
        action,
        payloadArray,
        state,
        actorIndex,
        isCurrentTurn,
        isHostClient,
      );
    }

    // Rent negotiation actions
    if (this.isRentNegotiationAction(action)) {
      return this.authorizeRentNegotiationAction(
        clientId,
        action,
        payloadArray,
        state,
        actorIndex,
        isHostClient,
      );
    }

    // Debt service actions
    if (action === "payDebtService") {
      const debt = state.pendingDebtService;
      if (!debt || state.phase !== "awaiting_debt_service")
        return deny("Not allowed");
      if (actorIndex === debt.playerIndex) return allow(payloadArray);
      if (isHostClient && state.players[debt.playerIndex]?.isAI)
        return allow(payloadArray);
      return deny("Not allowed");
    }

    // Chapter 11 actions
    if (action === "enterChapter11" || action === "declineRestructuring") {
      const pending = (state as any).pendingBankruptcy;
      if (!pending || state.phase !== "awaiting_bankruptcy_decision")
        return deny("Not allowed");
      if (actorIndex !== pending.playerIndex) return deny("Not allowed");
      return allow(payloadArray);
    }

    // Foreclosure actions
    if (action === "handleForeclosureDecision") {
      const foreclosure = state.pendingForeclosure;
      if (!foreclosure || state.phase !== "awaiting_foreclosure_decision")
        return deny("Not allowed");
      if (actorIndex === foreclosure.creditorIndex) return allow(payloadArray);
      if (isHostClient && state.players[foreclosure.creditorIndex]?.isAI)
        return allow(payloadArray);
      return deny("Not allowed");
    }

    // Building/mortgage/loan actions - must be current player's turn
    if (
      action === "buildHouse" ||
      action === "buildHotel" ||
      action === "sellHouse" ||
      action === "sellHotel" ||
      action === "mortgageProperty" ||
      action === "unmortgageProperty" ||
      action === "takeLoan" ||
      action === "repayLoan" ||
      action === "buyPropertyInsurance"
    ) {
      if (!isCurrentTurn) return deny("Not your turn");
      if (state.phase === "setup" || state.phase === "lobby")
        return deny("Not allowed");
      if (state.phase === "auction" || state.phase === "trading")
        return deny("Not allowed");
      return allow(payloadArray);
    }

    // Card draw
    if (action === "drawCard") {
      const [playerIndex] = payloadArray;
      if (typeof playerIndex !== "number") return deny("Invalid payload");
      if (playerIndex !== actorIndex) return deny("Not allowed");
      if (!isCurrentTurn) return deny("Not your turn");
      return allow(payloadArray);
    }

    // Unknown action - allow by default (for future compatibility)
    return allow(payloadArray);
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private authorizeAssignPlayer(
    clientId: string | null,
    payload: unknown[],
    state: GameState,
  ): AuthResult {
    if (!clientId)
      return { allowed: false, payload: [], error: "Missing clientId" };
    const [index, isMobile] = payload;
    if (typeof index !== "number")
      return { allowed: false, payload: [], error: "Invalid player index" };

    const player = state.players[index];
    if (!player)
      return { allowed: false, payload: [], error: "Invalid player slot" };

    // A player can't claim a seat occupied by another connected human.
    if (
      player.clientId &&
      player.clientId !== clientId &&
      player.isConnected &&
      !player.isAI
    ) {
      return {
        allowed: false,
        payload: [],
        error: "Seat occupied by another human",
      };
    }

    // A player can't claim an AI seat taken over by another human.
    if (player.isAI && player.clientId && player.clientId !== clientId) {
      const occupyingPlayer = state.players.find(
        (p) => p.clientId === player.clientId,
      );
      if (occupyingPlayer && occupyingPlayer.isConnected) {
        return {
          allowed: false,
          payload: [],
          error: "Seat occupied by active player",
        };
      }
    }

    return { allowed: true, payload: [index, clientId, isMobile] };
  }

  private isTradeAction(action: string): boolean {
    return [
      "startTrade",
      "updateTradeOffer",
      "proposeTrade",
      "acceptTrade",
      "rejectTrade",
      "cancelTrade",
      "counterOffer",
    ].includes(action);
  }

  private authorizeTradeAction(
    clientId: string | null,
    action: string,
    payload: unknown[],
    state: GameState,
    actorIndex: number,
    isCurrentTurn: boolean,
    isHostClient: boolean,
  ): AuthResult {
    const trade = state.trade;

    if (action === "startTrade") {
      const [fromPlayer] = payload;
      if (typeof fromPlayer !== "number")
        return { allowed: false, payload, error: "Invalid payload" };
      if (fromPlayer !== actorIndex)
        return { allowed: false, payload, error: "Not allowed" };
      if (!isCurrentTurn)
        return { allowed: false, payload, error: "Not your turn" };
      if (state.phase === "auction")
        return {
          allowed: false,
          payload,
          error: "Cannot trade during auction",
        };
      return { allowed: true, payload };
    }

    if (!trade) return { allowed: false, payload, error: "No active trade" };

    const { offer, status } = trade;
    const isFrom = actorIndex === offer.fromPlayer;
    const isTo = actorIndex === offer.toPlayer;

    if (!isFrom && !isTo)
      return { allowed: false, payload, error: "Not part of this trade" };

    if (action === "proposeTrade" && !isFrom)
      return { allowed: false, payload, error: "Not allowed" };
    if (action === "counterOffer" && !isTo)
      return { allowed: false, payload, error: "Not allowed" };
    if (action === "cancelTrade" && !isFrom)
      return { allowed: false, payload, error: "Not allowed" };
    if (
      (action === "acceptTrade" || action === "rejectTrade") &&
      status !== "pending"
    ) {
      return { allowed: false, payload, error: "Trade not pending" };
    }
    if ((action === "acceptTrade" || action === "rejectTrade") && !isTo) {
      return { allowed: false, payload, error: "Not allowed" };
    }

    return { allowed: true, payload };
  }

  private isRentNegotiationAction(action: string): boolean {
    return [
      "forgiveRent",
      "createRentIOU",
      "demandImmediatePaymentOrProperty",
      "offerPaymentPlan",
      "acceptPaymentPlan",
      "rejectPaymentPlan",
    ].includes(action);
  }

  private authorizeRentNegotiationAction(
    clientId: string | null,
    action: string,
    payload: unknown[],
    state: GameState,
    actorIndex: number,
    isHostClient: boolean,
  ): AuthResult {
    const negotiation = state.pendingRentNegotiation;
    if (!negotiation || state.phase !== "awaiting_rent_negotiation") {
      return { allowed: false, payload, error: "Not allowed" };
    }

    if (
      action === "forgiveRent" ||
      action === "createRentIOU" ||
      action === "demandImmediatePaymentOrProperty"
    ) {
      if (action === "createRentIOU") {
        if (actorIndex === negotiation.debtorIndex)
          return { allowed: true, payload };
        if (isHostClient && state.players[negotiation.debtorIndex]?.isAI)
          return { allowed: true, payload };
        return { allowed: false, payload, error: "Not allowed" };
      }
      if (actorIndex === negotiation.creditorIndex)
        return { allowed: true, payload };
      if (isHostClient && state.players[negotiation.creditorIndex]?.isAI)
        return { allowed: true, payload };
      return { allowed: false, payload, error: "Not allowed" };
    }

    if (action === "offerPaymentPlan") {
      if (negotiation.status !== "creditor_decision")
        return { allowed: false, payload, error: "Not allowed" };
      if (actorIndex === negotiation.creditorIndex)
        return { allowed: true, payload };
      if (isHostClient && state.players[negotiation.creditorIndex]?.isAI)
        return { allowed: true, payload };
      return {
        allowed: false,
        payload,
        error: "Only creditor can offer payment plan",
      };
    }

    if (action === "acceptPaymentPlan" || action === "rejectPaymentPlan") {
      if (negotiation.status !== "debtor_decision")
        return { allowed: false, payload, error: "Not allowed" };
      if (actorIndex === negotiation.debtorIndex)
        return { allowed: true, payload };
      if (isHostClient && state.players[negotiation.debtorIndex]?.isAI)
        return { allowed: true, payload };
      return { allowed: false, payload, error: "Only debtor can respond" };
    }

    return {
      allowed: false,
      payload,
      error: "Unknown rent negotiation action",
    };
  }

  private findPlayerIndexByClientId(
    state: GameState,
    clientId: string,
  ): number {
    return state.players.findIndex((p) => p.clientId === clientId);
  }

  private isHostClient(state: GameState, actorIndex: number): boolean {
    const firstHumanIndex = state.players.findIndex((p) => !p.isAI);
    return firstHumanIndex !== -1 && actorIndex === firstHumanIndex;
  }

  private logAuth(
    outcome: AuthOutcome,
    clientId: string | null,
    action: string,
    reason: string,
  ): void {
    const entry: AuthLogEntry = {
      outcome,
      clientId,
      action,
      reason,
      timestamp: Date.now(),
    };

    this.auditLog.push(entry);

    // Trim audit log
    if (this.auditLog.length > this.maxAuditLogSize) {
      this.auditLog = this.auditLog.slice(-this.maxAuditLogSize / 2);
    }

    this.logger.log(outcome, clientId, action, reason);
  }

  /**
   * Get audit log entries (for debugging/monitoring)
   */
  getAuditLog(limit: number = 50): AuthLogEntry[] {
    return this.auditLog.slice(-limit);
  }

  /**
   * Get authorization statistics
   */
  getStats(): {
    total: number;
    allowed: number;
    denied: number;
    denialRate: number;
  } {
    const total = this.auditLog.length;
    const denied = this.auditLog.filter((e) => e.outcome === "denied").length;
    const allowed = total - denied;
    return {
      total,
      allowed,
      denied,
      denialRate: total > 0 ? denied / total : 0,
    };
  }
}

// ============================================================================
// Audit Log Types
// ============================================================================

export interface AuthLogEntry {
  outcome: AuthOutcome;
  clientId: string | null;
  action: string;
  reason: string;
  timestamp: number;
}
