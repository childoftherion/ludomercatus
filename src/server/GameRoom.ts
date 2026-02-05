
import type {
  GameState,
  Player,
  Property,
  Space,
  Card,
  DiceRoll,
  TradeOffer,
  GameLogEntry,
  ColorGroup,
  GameSettings,
  ActiveEconomicEvent,
  EconomicEventType,
  IOU,
  AIDifficulty,
} from "../types/game"
import { DEFAULT_GAME_SETTINGS } from "../types/game"
import { boardSpaces } from "../data/board"
import { createChanceDeck, createCommunityChestDeck } from "../data/cards"
import { calculateRent } from "../logic/rules/rent"
import { hasMonopoly, getPlayerProperties } from "../logic/rules/monopoly"
import {
  calculateGoSalary,
  calculateTenPercentTax,
  getOptimalTaxChoice,
  calculateGiniCoefficient,
} from "../logic/rules/economics"
import {
  executeAITurn,
  executeAITradeResponse,
  type GameActions,
} from "../logic/ai"
import {
  validatePlayerTurn,
  validateCash,
  validatePropertyOwnership,
  validateBuilding,
  validateTradeOffer,
  validateMortgage,
} from "../utils/validation"

const PLAYER_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
  "#98D8C8",
  "#F7DC6F",
]

const isProperty = (space: Space): space is Property => {
  return (
    space.type === "property" ||
    space.type === "railroad" ||
    space.type === "utility"
  )
}

const shuffleDeck = <T extends { id: number }>(deck: readonly T[]): T[] => {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = shuffled[i]
    shuffled[i] = shuffled[j]!
    shuffled[j] = temp!
  }
  return shuffled
}

const createPlayer = (
  id: number,
  name: string,
  token: string,
  color: string,
  isAI: boolean = false,
  aiDifficulty?: AIDifficulty,
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
  aiDifficulty: isAI ? (aiDifficulty ?? "medium") : null,
  clientId: null,
  lastTradeTurn: -10,
  tradeHistory: null,
  // Bank Loans (Phase 2)
  bankLoans: [],
  totalDebt: 0,
  // IOUs (Phase 3)
  iousReceivable: [],
  iousPayable: [],
  // Chapter 11 (Phase 3)
  inChapter11: false,
  chapter11TurnsRemaining: 0,
  chapter11DebtTarget: 0,
  isConnected: true,
})

export class GameRoom implements GameActions {
  public state: GameState
  private logIdCounter = 0
  private listeners = new Set<(state: GameState) => void>()

  constructor(
    initialPhase: "setup" | "lobby" = "setup",
    settings: Partial<GameSettings> = {},
  ) {
    this.state = {
      players: [],
      currentPlayerIndex: 0,
      spaces: boardSpaces as Space[],
      chanceDeck: shuffleDeck(createChanceDeck()),
      communityChestDeck: shuffleDeck(createCommunityChestDeck()),
      diceRoll: null,
      consecutiveDoubles: 0,
      phase: initialPhase,
      passedGo: false,
      auction: null,
      trade: null,
      previousPhase: null,
      lastCardDrawn: null,
      gameLog: [],
      turn: 1,
      winner: null,
      lastDiceRoll: null,
      roomId: null,
      // Game settings
      settings: { ...DEFAULT_GAME_SETTINGS, ...settings },
      // Phase 1: Economic Realism
      roundsCompleted: 0,
      currentGoSalary: 200,
      awaitingTaxDecision: null,
      // Phase 2: Housing Scarcity
      availableHouses: 32,
      availableHotels: 12,
      // Phase 2: Economic Events
      activeEconomicEvents: [],
      // Card-triggered utility multiplier override
      utilityMultiplierOverride: null,
      // Phase 3: Rent Negotiation
      pendingRentNegotiation: null,
      // Phase 3: Bankruptcy Restructuring
      pendingBankruptcy: null,
      // Jackpot system
    jackpot: 0,
    // Market History
    marketHistory: [],
    // Multiplayer stability
    turnStartTime: Date.now(),
  }

    // Bind all public methods to `this`
    this.addPlayer = this.addPlayer.bind(this)
    this.updatePlayer = this.updatePlayer.bind(this)
    this.startGame = this.startGame.bind(this)
    this.initGame = this.initGame.bind(this)
    this.updateSettings = this.updateSettings.bind(this)
    this.rollDice = this.rollDice.bind(this)
    this.movePlayer = this.movePlayer.bind(this)
    this.buyProperty = this.buyProperty.bind(this)
    this.declineProperty = this.declineProperty.bind(this)
    this.payRent = this.payRent.bind(this)
    this.endTurn = this.endTurn.bind(this)
    this.goToJail = this.goToJail.bind(this)
    this.getOutOfJail = this.getOutOfJail.bind(this)
    this.buildHouse = this.buildHouse.bind(this)
    this.buildHotel = this.buildHotel.bind(this)
    this.sellHouse = this.sellHouse.bind(this)
    this.sellHotel = this.sellHotel.bind(this)
    this.mortgageProperty = this.mortgageProperty.bind(this)
    this.unmortgageProperty = this.unmortgageProperty.bind(this)
    this.drawCard = this.drawCard.bind(this)
    this.checkBankruptcy = this.checkBankruptcy.bind(this)
    this.declareBankruptcy = this.declareBankruptcy.bind(this)
    this.startAuction = this.startAuction.bind(this)
    this.placeBid = this.placeBid.bind(this)
    this.passAuction = this.passAuction.bind(this)
    this.endAuction = this.endAuction.bind(this)
    this.startTrade = this.startTrade.bind(this)
    this.updateTradeOffer = this.updateTradeOffer.bind(this)
    this.proposeTrade = this.proposeTrade.bind(this)
    this.acceptTrade = this.acceptTrade.bind(this)
    this.rejectTrade = this.rejectTrade.bind(this)
    this.cancelTrade = this.cancelTrade.bind(this)
    this.counterOffer = this.counterOffer.bind(this)
    this.acceptCounterOffer = this.acceptCounterOffer.bind(this)
    this.executeAITurn = this.executeAITurn.bind(this)
    this.executeAITradeResponse = this.executeAITradeResponse.bind(this)
    this.chooseTaxOption = this.chooseTaxOption.bind(this)
    this.handlePlayerDisconnect = this.handlePlayerDisconnect.bind(this)
    this.handlePlayerReconnect = this.handlePlayerReconnect.bind(this)
  }

  public subscribe(listener: (state: GameState) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify() {
    this.listeners.forEach((listener) => listener(this.state))
  }

  // --- State Updates ---
  // Helper to replicate Zustand's partial update behavior
  private setState(partial: Partial<GameState>) {
    const prevPhase = this.state.phase
    const prevPlayer = this.state.currentPlayerIndex

    this.state = { ...this.state, ...partial }

    // If turn or phase changed, reset timer
    if (
      partial.phase !== undefined &&
      (partial.phase !== prevPhase ||
        partial.currentPlayerIndex !== prevPlayer ||
        partial.currentPlayerIndex !== undefined)
    ) {
      this.state.turnStartTime = Date.now()
    }

    this.notify()
  }

  public authorizeAction(
    clientId: string | null,
    action: string,
    payload: unknown,
  ): { allowed: boolean; payload: unknown[]; error?: string } {
    const payloadArray: unknown[] = Array.isArray(payload) ? payload : []
    const resolvedClientId = typeof clientId === "string" ? clientId : null

    const allow = (nextPayload: unknown[] = payloadArray) => ({
      allowed: true,
      payload: nextPayload,
    })
    const deny = (error: string) => ({
      allowed: false,
      payload: payloadArray,
      error,
    })

    if (action === "initGame") return allow(payloadArray)

    if (action === "addPlayer") {
      if (!resolvedClientId) return deny("Missing clientId")
      const [name, token, _clientId, isMobile] = payloadArray
      return allow([name, token, resolvedClientId, isMobile])
    }

    if (action === "assignPlayer") {
      if (!resolvedClientId) return deny("Missing clientId")
      const [index] = payloadArray
      return allow([index, resolvedClientId])
    }

    const actorIndex = resolvedClientId
      ? this.state.players.findIndex((p) => p.clientId === resolvedClientId)
      : -1

    if (action === "updatePlayer") {
      if (actorIndex === -1) return deny("Unknown player")
      const [index] = payloadArray
      if (typeof index !== "number" || index !== actorIndex)
        return deny("Not allowed")
      return allow(payloadArray)
    }

    if (action === "startGame") {
      if (actorIndex === -1) return deny("Unknown player")
      return allow(payloadArray)
    }

    if (action === "updateSettings") {
      if (actorIndex !== 0) return deny("Only host can update settings")
      return allow(payloadArray)
    }

    const isCurrentTurn = actorIndex === this.state.currentPlayerIndex

    const isHostClient = (() => {
      const firstHumanIndex = this.state.players.findIndex((p) => !p.isAI)
      return firstHumanIndex !== -1 && actorIndex === firstHumanIndex
    })()

    if (action === "executeAITurn" || action === "executeAITradeResponse") {
      if (!isHostClient) return deny("Only host can run AI")
      
      // If it's an AI turn and they have already rolled but haven't moved, 
      // block the executeAITurn action to prevent re-rolling
      if (action === "executeAITurn") {
        const player = this.state.players[this.state.currentPlayerIndex]
        if (player?.isAI && this.state.phase === "rolling" && this.state.diceRoll) {
          return deny("AI already rolled, waiting for move")
        }
      }
      
      return allow(payloadArray)
    }

    if (
      action === "rollDice" ||
      action === "movePlayer" ||
      action === "buyProperty" ||
      action === "declineProperty" ||
      action === "endTurn"
    ) {
      if (!isCurrentTurn) return deny("Not your turn")
    }

    if (action === "rollDice") {
      const player = this.state.players[this.state.currentPlayerIndex]
      if (!player || player.isAI) return deny("Not allowed")
      if (this.state.phase !== "rolling") return deny("Not allowed")
      if (player.inJail) return deny("Not allowed")
      if (this.state.diceRoll) return deny("Not allowed")
      return allow(payloadArray)
    }

    if (action === "movePlayer") {
      const [playerIndex, steps] = payloadArray
      if (typeof playerIndex !== "number" || typeof steps !== "number")
        return deny("Invalid payload")
      if (playerIndex !== actorIndex) return deny("Not allowed")
      
      // Allow moving in "moving" phase OR "rolling" phase (for legacy/jail scenarios)
      if (this.state.phase !== "moving" && this.state.phase !== "rolling") return deny("Not allowed")
      
      const rollTotal = this.state.diceRoll?.total
      if (typeof rollTotal !== "number") return deny("Not allowed")
      if (steps !== rollTotal) return deny("Not allowed")
      return allow(payloadArray)
    }

    if (action === "buyProperty" || action === "declineProperty") {
      if (this.state.phase !== "awaiting_buy_decision")
        return deny("Not allowed")
      return allow(payloadArray)
    }

    if (action === "endTurn") {
      if (this.state.phase !== "resolving_space") return deny("Not allowed")
      return allow(payloadArray)
    }

    if (action === "getOutOfJail") {
      const [playerIndex, method] = payloadArray
      if (typeof playerIndex !== "number") return deny("Invalid payload")
      if (playerIndex !== actorIndex) return deny("Not allowed")
      if (!isCurrentTurn) return deny("Not your turn")
      if (method !== "roll" && method !== "pay" && method !== "card")
        return deny("Invalid payload")
      const player = this.state.players[playerIndex]
      if (!player?.inJail) return deny("Not allowed")
      if (
        this.state.phase !== "jail_decision" &&
        this.state.phase !== "rolling"
      )
        return deny("Not allowed")
      return allow(payloadArray)
    }

    if (action === "chooseTaxOption") {
      const [playerIndex, choice] = payloadArray
      if (typeof playerIndex !== "number") return deny("Invalid payload")
      if (playerIndex !== actorIndex) return deny("Not allowed")
      if (!isCurrentTurn) return deny("Not your turn")
      if (choice !== "flat" && choice !== "percentage")
        return deny("Invalid payload")
      if (
        this.state.phase !== "awaiting_tax_decision" ||
        this.state.awaitingTaxDecision?.playerIndex !== playerIndex
      )
        return deny("Not allowed")
      return allow(payloadArray)
    }

    if (action === "placeBid" || action === "passAuction") {
      const [playerIndex] = payloadArray
      if (typeof playerIndex !== "number") return deny("Invalid payload")
      if (playerIndex !== actorIndex) return deny("Not allowed")
      if (this.state.phase !== "auction" || !this.state.auction)
        return deny("Not allowed")
      if (this.state.auction.activePlayerIndex !== playerIndex)
        return deny("Not allowed")
      return allow(payloadArray)
    }

    if (
      action === "startTrade" ||
      action === "updateTradeOffer" ||
      action === "proposeTrade" ||
      action === "acceptTrade" ||
      action === "rejectTrade" ||
      action === "cancelTrade" ||
      action === "counterOffer" ||
      action === "acceptCounterOffer"
    ) {
      const trade = this.state.trade
      if (action === "startTrade") {
        const [fromPlayer] = payloadArray
        if (typeof fromPlayer !== "number") return deny("Invalid payload")
        if (fromPlayer !== actorIndex) return deny("Not allowed")
        if (!isCurrentTurn) return deny("Not your turn")
        if (this.state.phase === "auction")
          return deny("Cannot trade during an auction")
        return allow(payloadArray)
      }

      if (!trade) return deny("Not allowed")
      const { offer, status } = trade
      const isFrom = actorIndex === offer.fromPlayer
      const isTo = actorIndex === offer.toPlayer

      if (!isFrom && !isTo) return deny("Not allowed")

      if (action === "updateTradeOffer" || action === "proposeTrade") {
        if (!isFrom) return deny("Not allowed")
      }

      if (action === "counterOffer") {
        if (!isTo) return deny("Not allowed")
      }

      if (action === "cancelTrade") {
        if (!isFrom) return deny("Not allowed")
      }

      if (action === "acceptTrade" || action === "rejectTrade") {
        if (status === "pending") {
          if (!isTo) return deny("Not allowed")
        } else if (status === "counter_pending") {
          if (!isFrom) return deny("Not allowed")
        } else {
          return deny("Not allowed")
        }
      }

      if (action === "acceptCounterOffer") {
        if (!isFrom || status !== "counter_pending") return deny("Not allowed")
      }

      return allow(payloadArray)
    }

    if (
      action === "forgiveRent" ||
      action === "createRentIOU" ||
      action === "demandImmediatePaymentOrProperty"
    ) {
      const negotiation = this.state.pendingRentNegotiation
      if (!negotiation || this.state.phase !== "awaiting_rent_negotiation")
        return deny("Not allowed")
      if (action === "createRentIOU") {
        if (actorIndex !== negotiation.debtorIndex) return deny("Not allowed")
      } else {
        if (actorIndex !== negotiation.creditorIndex) return deny("Not allowed")
      }
      return allow(payloadArray)
    }

    if (action === "payIOU") {
      const [debtorIndex] = payloadArray
      if (typeof debtorIndex !== "number") return deny("Invalid payload")
      if (debtorIndex !== actorIndex) return deny("Not allowed")
      if (this.state.phase === "auction")
        return deny("Cannot pay IOUs during an auction")
      return allow(payloadArray)
    }

    if (action === "enterChapter11" || action === "declineRestructuring") {
      const pending = (this.state as any).pendingBankruptcy
      if (!pending || this.state.phase !== "awaiting_bankruptcy_decision")
        return deny("Not allowed")
      if (actorIndex !== pending.playerIndex) return deny("Not allowed")
      return allow(payloadArray)
    }

    if (
      action === "buildHouse" ||
      action === "buildHotel" ||
      action === "sellHouse" ||
      action === "sellHotel" ||
      action === "mortgageProperty" ||
      action === "unmortgageProperty" ||
      action === "takeLoan" ||
      action === "repayLoan" ||
      action === "buyPropertyInsurance" ||
      action === "appreciateColorGroup" ||
      action === "depreciateColorGroup"
    ) {
      if (!isCurrentTurn) return deny("Not your turn")
      if (this.state.phase === "setup" || this.state.phase === "lobby")
        return deny("Not allowed")
      if (this.state.phase === "auction" || this.state.phase === "trading")
        return deny("Not allowed")
      return allow(payloadArray)
    }

    if (action === "drawCard") {
      const [playerIndex] = payloadArray
      if (typeof playerIndex !== "number") return deny("Invalid payload")
      if (playerIndex !== actorIndex) return deny("Not allowed")
      if (!isCurrentTurn) return deny("Not your turn")
      return allow(payloadArray)
    }

    return allow(payloadArray)
  }

  // --- Lobby Actions ---

  public addPlayer(
    name: string,
    token: string,
    clientId: string,
    isMobile?: boolean,
  ) {
    if (this.state.phase !== "lobby") return

    const existingIndex = this.state.players.findIndex(
      (p) => p.clientId === clientId,
    )
    if (existingIndex !== -1) {
      this.updatePlayer(existingIndex, name, token)
      // Update mobile status if provided
      if (isMobile !== undefined) {
        const players = [...this.state.players]
        if (players[existingIndex]) {
          players[existingIndex].isMobile = isMobile
          this.setState({ players })
        }
      }
      return
    }

    const index = this.state.players.length
    if (index >= 8) return

    // Ensure unique name
    let uniqueName = name
    let counter = 2
    while (this.state.players.some((p) => p.name === uniqueName)) {
      uniqueName = `${name} (${counter})`
      counter++
    }

    const newPlayer = createPlayer(
      index,
      uniqueName,
      token,
      PLAYER_COLORS[index] ?? "#999999",
      false,
    )
    newPlayer.clientId = clientId
    newPlayer.isMobile = !!isMobile

    this.setState({
      players: [...this.state.players, newPlayer],
    })
    this.addLogEntry(
      `${uniqueName} joined the lobby!${isMobile ? " (Mobile)" : ""}`,
      "system",
    )
  }

  public handlePlayerDisconnect(clientId: string) {
    const playerIndex = this.state.players.findIndex(
      (p) => p.clientId === clientId,
    )
    if (playerIndex === -1) return

    const player = this.state.players[playerIndex]
    if (!player) return

    const updatedPlayers = [...this.state.players]
    updatedPlayers[playerIndex] = { ...player, isConnected: false }

    this.setState({ players: updatedPlayers })
    this.addLogEntry(`${player.name} disconnected.`, "system")

    // If it's their turn and they are not AI, start a timeout to skip their turn
    if (this.state.currentPlayerIndex === playerIndex && !player.isAI) {
      setTimeout(() => {
        // Check if still disconnected and still their turn
        const currentPlayer = this.state.players[this.state.currentPlayerIndex]
        if (
          currentPlayer &&
          !currentPlayer.isConnected &&
          this.state.currentPlayerIndex === playerIndex
        ) {
          this.addLogEntry(
            `${currentPlayer.name} timed out. Converting to AI.`,
            "system",
          )

          // Convert to AI instead of just skipping
          const updatedPlayers = [...this.state.players]
          updatedPlayers[playerIndex] = {
            ...currentPlayer,
            isAI: true,
            aiDifficulty: "medium",
          }

          this.setState({ players: updatedPlayers })

          // If it's still "rolling" and they haven't rolled, the client-side AI trigger
          // (which runs on the first human player) will now pick this up and execute the turn.
        }
      }, 30000) // 30 seconds timeout
    }
  }

  public handlePlayerReconnect(clientId: string) {
    const playerIndex = this.state.players.findIndex(
      (p) => p.clientId === clientId,
    )
    if (playerIndex === -1) return

    const player = this.state.players[playerIndex]
    if (!player) return

    const updatedPlayers = [...this.state.players]
    updatedPlayers[playerIndex] = { ...player, isConnected: true }

    this.setState({ players: updatedPlayers })
    this.addLogEntry(`${player.name} reconnected!`, "system")
  }

  public updatePlayer(index: number, name: string, token: string) {
    if (this.state.phase !== "lobby") return
    const player = this.state.players[index]
    if (!player) return

    const updatedPlayers = [...this.state.players]
    updatedPlayers[index] = { ...player, name, token }
    this.setState({ players: updatedPlayers })
  }

  public assignPlayer(index: number, clientId: string) {
    const player = this.state.players[index]
    if (!player) return

    // We used to block reassigning if already taken, but this causes issues on refresh
    // if client IDs change or server sessions linger.
    // We now allow re-claiming human players to ensure session recovery.
    if (player.isAI) {
      console.warn(`[GameRoom] Cannot claim AI player ${index}`)
      return
    }

    // Assign clientId to the player
    const updatedPlayers = [...this.state.players]
    updatedPlayers[index] = { ...player, clientId }

    this.setState({ players: updatedPlayers })
    this.addLogEntry(`${player.name} claimed by a new session!`, "system")
    console.log(
      `[GameRoom] Player ${index} (${player.name}) claimed by ${clientId}`,
    )
  }

  public startGame() {
    if (this.state.players.length < 2) return
    this.setState({ phase: "rolling" })
    this.addLogEntry("Game Started!", "system")
  }

  // --- GameActions Implementation ---

  public initGame(
    playerNames: string[],
    tokens: string[],
    isAIFlags: boolean[] = [],
    aiDifficulties: AIDifficulty[] = [],
    clientIds: (string | undefined)[] = [],
  ) {
    const players = playerNames.map((name, index) => {
      const player = createPlayer(
        index,
        name,
        tokens[index] ?? name,
        PLAYER_COLORS[index] ?? "#999999",
        isAIFlags[index] ?? false,
        aiDifficulties[index],
      )
      if (clientIds[index]) {
        player.clientId = clientIds[index]
      }
      return player
    })

    this.setState({
      players,
      currentPlayerIndex: 0,
      spaces: boardSpaces as Space[],
      chanceDeck: shuffleDeck(createChanceDeck()),
      communityChestDeck: shuffleDeck(createCommunityChestDeck()),
      phase: "rolling",
      diceRoll: null,
      consecutiveDoubles: 0,
      passedGo: false,
      auction: null,
      trade: null,
      lastCardDrawn: null,
      gameLog: [],
      turn: 1,
      winner: null,
      lastDiceRoll: null,
      roomId: null,
      // Game settings
      settings: this.state.settings,
      // Phase 1: Economic Realism
      roundsCompleted: 0,
      currentGoSalary: 200,
      awaitingTaxDecision: null,
      // Phase 2: Housing Scarcity
      availableHouses: 32,
      availableHotels: 12,
      // Phase 2: Economic Events
      activeEconomicEvents: [],
      // Card-triggered utility multiplier override
      utilityMultiplierOverride: null,
      // Phase 3: Rent Negotiation
      pendingRentNegotiation: null,
      // Phase 3: Bankruptcy Restructuring
      pendingBankruptcy: null,
      // Jackpot system
      jackpot: 0,
    })

    this.addLogEntry(`Game started with ${players.length} players!`, "system")
  }

  // Update game settings
  public updateSettings(settings: Partial<GameSettings>) {
    this.setState({
      settings: { ...this.state.settings, ...settings },
    })
  }

  public rollDice() {
    const die1 = Math.floor(Math.random() * 6) + 1
    const die2 = Math.floor(Math.random() * 6) + 1
    const total = die1 + die2
    const isDoubles = die1 === die2

    const roll: DiceRoll = { die1, die2, total, isDoubles }

    // Phase 1: Verify Jail Rules - 3 consecutive doubles = Jail
    let nextConsecutiveDoubles = isDoubles ? this.state.consecutiveDoubles + 1 : 0
    
    if (nextConsecutiveDoubles >= 3) {
      this.setState({
        diceRoll: roll,
        lastDiceRoll: roll,
        consecutiveDoubles: 0,
        phase: "moving",
      })
      this.addLogEntry(
        `${this.state.players[this.state.currentPlayerIndex]?.name} rolled 3 consecutive doubles! GO TO JAIL!`,
        "jail",
        this.state.currentPlayerIndex,
      )
      this.goToJail(this.state.currentPlayerIndex)
      return roll
    }

    this.setState({
      diceRoll: roll,
      lastDiceRoll: roll,
      consecutiveDoubles: isDoubles ? this.state.consecutiveDoubles + 1 : 0,
      phase: "moving",
    })

    const player = this.state.players[this.state.currentPlayerIndex]
    if (player) {
      const doublesText = isDoubles ? " (Doubles!)" : ""
      const consecutiveText =
        isDoubles && this.state.consecutiveDoubles > 0
          ? ` (${this.state.consecutiveDoubles + 1}/3 consecutive)`
          : ""
      this.addLogEntry(
        `${player.name} rolled ${die1} + ${die2} = ${total}${doublesText}${consecutiveText}`,
        "roll",
        this.state.currentPlayerIndex,
      )
    }

    return roll
  }

  public movePlayer(playerIndex: number, steps: number) {
    const player = this.state.players[playerIndex]
    if (!player || player.inJail || player.bankrupt) return

    const oldPosition = player.position
    const newPosition = (oldPosition + steps) % 40
    const passedGo = newPosition < oldPosition && steps > 0

    // Use dynamic GO salary (inflation mechanic)
    const goSalary = this.state.currentGoSalary

    this.setState({
      players: this.state.players.map((p, i) =>
        i === playerIndex
          ? {
              ...p,
              position: newPosition,
              cash: p.cash + (passedGo ? goSalary : 0),
            }
          : p,
      ),
      passedGo,
      phase: "resolving_space",
    })

    const space = this.state.spaces[newPosition]
    const goBonus = passedGo ? ` (collected £${goSalary} passing GO)` : ""
    if (space) {
      this.addLogEntry(
        `${player.name} moved to ${space.name}${goBonus}`,
        "move",
        playerIndex,
      )
    }

    this.resolveSpace(playerIndex)
  }

  public resolveSpace(playerIndex: number) {
    const player = this.state.players[playerIndex]
    if (!player) return

    const space = this.state.spaces[player.position]
    if (!space) return

    switch (space.type) {
      case "property":
      case "railroad":
      case "utility": {
        const property = space as Property
        if (property.owner === undefined) {
          this.setState({ phase: "awaiting_buy_decision" })
        } else if (property.owner !== playerIndex && !property.mortgaged) {
          const diceTotal = this.state.diceRoll?.total ?? 7
          this.payRent(playerIndex, property.id, diceTotal)
        }
        break
      }

      case "chance":
      case "community_chest":
        this.drawCard(playerIndex, space.type)
        break

      case "tax": {
        // Check for Tax Holiday economic event
        if (
          space.name.includes("Income") &&
          this.isEconomicEventActive("tax_holiday")
        ) {
          this.addLogEntry(
            `🎉 ${player.name} enjoys Tax Holiday - no Income Tax!`,
            "tax",
            playerIndex,
          )
          break
        }

        if (space.name.includes("Income")) {
          // Progressive Income Tax: Player chooses 10% of net worth OR £200
          const percentageAmount = calculateTenPercentTax(
            this.state,
            playerIndex,
          )
          const flatAmount = 200

          // For AI players, automatically choose the optimal option
          if (player.isAI) {
            const optimal = getOptimalTaxChoice(this.state, playerIndex)
            this.payTax(playerIndex, optimal.amount)
            this.addLogEntry(
              `${player.name} chose to pay ${optimal.choice === "percentage" ? "10%" : "flat £200"} (£${optimal.amount})`,
              "tax",
              playerIndex,
            )
          } else {
            // Human player gets a choice
            this.setState({
              phase: "awaiting_tax_decision" as any, // Will add to GamePhase
              awaitingTaxDecision: {
                playerIndex,
                flatAmount,
                percentageAmount,
              },
            })
          }
        } else {
          // Luxury Tax is always flat £100
          this.payTax(playerIndex, 100)
        }
        break
      }

      case "go_to_jail":
        this.goToJail(playerIndex)
        break

      case "free_parking":
        // Trigger economic event if enabled
        if (this.state.settings.enableEconomicEvents) {
          this.triggerEconomicEvent(playerIndex)
        }
        // Check for jackpot win (30% chance if jackpot > 0)
        if (this.state.jackpot > 0 && Math.random() < 0.3) {
          const jackpotAmount = this.state.jackpot
          this.setState({
            players: this.state.players.map((p, i) =>
              i === playerIndex ? { ...p, cash: p.cash + jackpotAmount } : p,
            ),
            jackpot: 0,
          })
          this.addLogEntry(
            `🎉 ${player.name} won the Free Parking jackpot of £${jackpotAmount}!`,
            "system",
            playerIndex,
          )
        }
        // Free Parking is otherwise a safe space - nothing happens
        break
    }
  }

  // ============ ECONOMIC EVENTS SYSTEM (Phase 2) ============

  private getRandomEconomicEvent(): {
    type: EconomicEventType
    description: string
    duration: number
  } {
    const events: Array<{
      type: EconomicEventType
      description: string
      duration: number
      weight: number
    }> = [
      {
        type: "recession",
        description: "📉 Recession! All rents reduced by 25%",
        duration: 3,
        weight: 15,
      },
      {
        type: "housing_boom",
        description: "🏗️ Housing Boom! Building costs increase 50%",
        duration: 2,
        weight: 15,
      },
      {
        type: "tax_holiday",
        description: "🎉 Tax Holiday! No income tax",
        duration: 2,
        weight: 10,
      },
      {
        type: "market_crash",
        description: "💥 Market Crash! Property values drop 20%",
        duration: 3,
        weight: 10,
      },
      {
        type: "bull_market",
        description: "📈 Bull Market! Property values increase 20%",
        duration: 3,
        weight: 15,
      },
      {
        type: "banking_crisis",
        description: "🏦 Banking Crisis! Loan interest rates double",
        duration: 2,
        weight: 10,
      },
      {
        type: "economic_stimulus",
        description: "💰 Economic Stimulus! All players collect £100",
        duration: 0,
        weight: 25,
      },
    ]

    // Weighted random selection
    const totalWeight = events.reduce((sum, e) => sum + e.weight, 0)
    let random = Math.random() * totalWeight

    for (const event of events) {
      random -= event.weight
      if (random <= 0) {
        return {
          type: event.type,
          description: event.description,
          duration: event.duration,
        }
      }
    }

    return events[0]! // Fallback
  }

  public triggerEconomicEvent(playerIndex: number) {
    const player = this.state.players[playerIndex]
    if (!player) return

    const event = this.getRandomEconomicEvent()

    // Log the event
    this.addLogEntry(
      `${player.name} triggered an economic event: ${event.description}`,
      "system",
      playerIndex,
    )

    // Handle immediate effects
    if (event.type === "economic_stimulus") {
      // Give £100 to all active players
      this.setState({
        players: this.state.players.map((p) =>
          p.bankrupt ? p : { ...p, cash: p.cash + 100 },
        ),
      })
      this.addLogEntry("All players received £100 stimulus!", "system")
      return
    }

    // Check if this event type is already active
    const existingEventIndex = this.state.activeEconomicEvents.findIndex(
      (e) => e.type === event.type,
    )

    if (existingEventIndex >= 0) {
      // Extend existing event
      const updatedEvents = [...this.state.activeEconomicEvents]
      updatedEvents[existingEventIndex] = {
        ...updatedEvents[existingEventIndex]!,
        turnsRemaining:
          updatedEvents[existingEventIndex]!.turnsRemaining + event.duration,
      }
      this.setState({ activeEconomicEvents: updatedEvents })
      this.addLogEntry(
        `${event.description} extended by ${event.duration} turns!`,
        "system",
      )
    } else {
      // Add new event
      const newEvent: ActiveEconomicEvent = {
        type: event.type,
        turnsRemaining: event.duration,
        description: event.description,
      }
      this.setState({
        activeEconomicEvents: [...this.state.activeEconomicEvents, newEvent],
      })
    }
  }

  // Decrement economic event durations at end of each round
  public updateEconomicEvents() {
    if (this.state.activeEconomicEvents.length === 0) return

    const updatedEvents = this.state.activeEconomicEvents
      .map((event) => ({ ...event, turnsRemaining: event.turnsRemaining - 1 }))
      .filter((event) => event.turnsRemaining > 0)

    // Log expired events
    const expiredEvents = this.state.activeEconomicEvents.filter(
      (event) => !updatedEvents.find((e) => e.type === event.type),
    )

    expiredEvents.forEach((event) => {
      this.addLogEntry(`${event.description} has ended.`, "system")
    })

    this.setState({ activeEconomicEvents: updatedEvents })
  }

  // Check if an economic event is active
  public isEconomicEventActive(type: EconomicEventType): boolean {
    return this.state.activeEconomicEvents.some((e) => e.type === type)
  }

  // New method for handling tax decision
  public chooseTaxOption(playerIndex: number, choice: "flat" | "percentage") {
    const taxDecision = this.state.awaitingTaxDecision
    if (!taxDecision || taxDecision.playerIndex !== playerIndex) return

    const player = this.state.players[playerIndex]
    if (!player) return

    const amount =
      choice === "flat" ? taxDecision.flatAmount : taxDecision.percentageAmount

    this.setState({ awaitingTaxDecision: null, phase: "resolving_space" })
    this.setState({ awaitingTaxDecision: undefined, phase: "resolving_space" })
    this.payTax(playerIndex, amount)

    this.addLogEntry(
      `${player.name} chose to pay ${choice === "percentage" ? "10%" : "flat £200"} (£${amount})`,
      "tax",
      playerIndex,
    )
  }

  public buyProperty(propertyId: number) {
    const playerIndex = this.state.currentPlayerIndex

    // Validate turn order
    const turnValidation = validatePlayerTurn(this.state, playerIndex, [
      "awaiting_buy_decision",
    ])
    if (!turnValidation.valid) {
      this.addLogEntry(
        turnValidation.error || "Invalid action",
        "system",
        playerIndex,
      )
      return
    }

    const player = this.state.players[playerIndex]
    const property = this.state.spaces.find(
      (s) => s.id === propertyId,
    ) as Property

    if (!player || !property) {
      this.addLogEntry("Property or player not found", "system", playerIndex)
      return
    }

    if (property.owner !== undefined) {
      this.addLogEntry("This property is already owned", "system", playerIndex)
      return
    }

    // Validate cash
    const cashValidation = validateCash(player, property.price, "buy property")
    if (!cashValidation.valid) {
      this.addLogEntry(
        cashValidation.error || "Insufficient funds",
        "system",
        playerIndex,
      )
      return
    }

    this.setState({
      spaces: this.state.spaces.map((s) =>
        s.id === propertyId ? { ...(s as Property), owner: playerIndex } : s,
      ),
      players: this.state.players.map((p, i) =>
        i === playerIndex
          ? {
              ...p,
              cash: p.cash - property.price,
              properties: [...p.properties, property.id],
            }
          : p,
      ),
      phase: "resolving_space",
    })

    this.addLogEntry(
      `${player.name} bought ${property.name} for £${property.price}`,
      "buy",
      playerIndex,
    )
  }

  public declineProperty(propertyId: number) {
    this.startAuction(propertyId)
  }

  public payRent(playerIndex: number, propertyId: number, diceTotal: number) {
    const payer = this.state.players[playerIndex]
    const property = this.state.spaces.find(
      (s) => s.id === propertyId,
    ) as Property

    if (!payer || !property || property.owner === undefined) return

    const rent = calculateRent(this.state, property, diceTotal)

    if (rent <= 0) {
      // Clear utility multiplier override even if no rent is paid
      this.setState({ utilityMultiplierOverride: null })
      return
    }

    if (payer.cash >= rent) {
      this.setState({
        players: this.state.players.map((p, i) => {
          if (i === playerIndex) return { ...p, cash: p.cash - rent }
          if (i === property.owner) return { ...p, cash: p.cash + rent }
          return p
        }),
        // Clear utility multiplier override after rent is paid
        utilityMultiplierOverride: null,
      })

      const owner = this.state.players[property.owner]
      this.addLogEntry(
        `${payer.name} paid £${rent} rent to ${owner?.name}`,
        "rent",
        playerIndex,
      )
    } else if (this.state.settings.enableRentNegotiation) {
      // Phase 3: Initiate rent negotiation instead of immediate bankruptcy
      this.initiateRentNegotiation(
        playerIndex,
        property.owner,
        propertyId,
        rent,
      )
    } else if (this.state.settings.enableBankruptcyRestructuring) {
      // Phase 3: Offer Chapter 11 restructuring
      this.offerRestructuring(playerIndex, property.owner, rent)
    } else {
      this.declareBankruptcy(playerIndex, property.owner)
    }
  }

  // Phase 3: Rent Negotiation System
  public initiateRentNegotiation(
    debtorIndex: number,
    creditorIndex: number,
    propertyId: number,
    rentAmount: number,
  ) {
    const debtor = this.state.players[debtorIndex]
    if (!debtor) return

    this.setState({
      phase: "awaiting_rent_negotiation",
      pendingRentNegotiation: {
        debtorIndex,
        creditorIndex,
        propertyId,
        rentAmount,
        debtorCanAfford: debtor.cash,
        status: "creditor_decision",
      },
    })

    const creditor = this.state.players[creditorIndex]
    this.addLogEntry(
      `${debtor.name} cannot afford £${rentAmount} rent. Negotiation started with ${creditor?.name}`,
      "rent",
      debtorIndex,
    )
  }

  // Creditor forgives the rent entirely
  public forgiveRent() {
    const negotiation = this.state.pendingRentNegotiation
    if (!negotiation) return

    const creditor = this.state.players[negotiation.creditorIndex]
    const debtor = this.state.players[negotiation.debtorIndex]

    this.setState({
      phase: "resolving_space",
      pendingRentNegotiation: null,
      utilityMultiplierOverride: null,
    })

    this.addLogEntry(
      `${creditor?.name} forgave £${negotiation.rentAmount} rent owed by ${debtor?.name}`,
      "rent",
      negotiation.creditorIndex,
    )
  }

  // Creditor proposes an IOU (payment plan)
  public offerPaymentPlan(partialPayment: number, interestRate: number) {
    const negotiation = this.state.pendingRentNegotiation
    if (!negotiation || negotiation.status !== "creditor_decision") return

    const creditor = this.state.players[negotiation.creditorIndex]
    const debtor = this.state.players[negotiation.debtorIndex]
    if (!creditor || !debtor) return

    this.setState({
      pendingRentNegotiation: {
        ...negotiation,
        status: "debtor_decision",
        proposedIOU: {
          partialPayment: Math.floor(partialPayment),
          interestRate,
        },
      },
    })

    this.addLogEntry(
      `${creditor.name} offered a payment plan to ${debtor.name}: £${partialPayment} now, rest as IOU at ${interestRate * 100}% interest`,
      "rent",
      negotiation.creditorIndex,
    )
  }

  // Debtor accepts the proposed payment plan
  public acceptPaymentPlan() {
    const negotiation = this.state.pendingRentNegotiation
    if (!negotiation || negotiation.status !== "debtor_decision" || !negotiation.proposedIOU) return

    const { debtorIndex, creditorIndex, rentAmount, proposedIOU } = negotiation
    const { partialPayment, interestRate } = proposedIOU
    const debtor = this.state.players[debtorIndex]
    const creditor = this.state.players[creditorIndex]

    if (!debtor || !creditor) return

    // Ensure partial payment doesn't exceed what debtor has
    const actualPayment = Math.floor(Math.min(partialPayment, debtor.cash))
    const remainingDebt = Math.round(rentAmount - actualPayment)

    // Create IOU for remaining amount
    const newIOU: IOU = {
      id: Date.now(),
      debtorId: debtorIndex,
      creditorId: creditorIndex,
      originalAmount: remainingDebt,
      currentAmount: remainingDebt,
      interestRate: interestRate,
      turnCreated: this.state.turn,
      reason: `Rent for ${(this.state.spaces.find((s) => s.id === negotiation.propertyId) as Property)?.name || "property"}`,
    }

    this.setState({
      players: this.state.players.map((p, i) => {
        if (i === debtorIndex) {
          return {
            ...p,
            cash: p.cash - actualPayment,
            iousPayable: [...p.iousPayable, newIOU],
          }
        }
        if (i === creditorIndex) {
          return {
            ...p,
            cash: p.cash + actualPayment,
            iousReceivable: [...p.iousReceivable, newIOU],
          }
        }
        return p
      }),
      phase: "resolving_space",
      pendingRentNegotiation: null,
      utilityMultiplierOverride: null,
    })

    this.addLogEntry(
      `${debtor.name} accepted the payment plan from ${creditor.name}`,
      "rent",
      debtorIndex,
    )
  }

  // Debtor rejects the proposed payment plan
  public rejectPaymentPlan() {
    const negotiation = this.state.pendingRentNegotiation
    if (!negotiation || negotiation.status !== "debtor_decision") return

    const creditor = this.state.players[negotiation.creditorIndex]
    const debtor = this.state.players[negotiation.debtorIndex]

    this.setState({
      pendingRentNegotiation: {
        ...negotiation,
        status: "creditor_decision",
        proposedIOU: undefined,
      },
    })

    this.addLogEntry(
      `${debtor?.name} rejected the payment plan. ${creditor?.name} must choose another option.`,
      "rent",
      negotiation.debtorIndex,
    )
  }

  // Debtor pays what they can now, rest becomes an IOU
  public createRentIOU(partialPayment: number) {
    const negotiation = this.state.pendingRentNegotiation
    if (!negotiation) return

    const { debtorIndex, creditorIndex, rentAmount } = negotiation
    const debtor = this.state.players[debtorIndex]
    const creditor = this.state.players[creditorIndex]

    if (!debtor || !creditor) return

    // Ensure partial payment doesn't exceed what debtor has
    const actualPayment = Math.floor(Math.min(partialPayment, debtor.cash))
    const remainingDebt = Math.round(rentAmount - actualPayment)

    // Create IOU for remaining amount
    const newIOU: IOU = {
      id: Date.now(),
      debtorId: debtorIndex,
      creditorId: creditorIndex,
      originalAmount: remainingDebt,
      currentAmount: remainingDebt,
      interestRate: this.state.settings.iouInterestRate,
      turnCreated: this.state.turn,
      reason: `Rent for ${(this.state.spaces.find((s) => s.id === negotiation.propertyId) as Property)?.name || "property"}`,
    }

    this.setState({
      players: this.state.players.map((p, i) => {
        if (i === debtorIndex) {
          return {
            ...p,
            cash: p.cash - actualPayment,
            iousPayable: [...p.iousPayable, newIOU],
          }
        }
        if (i === creditorIndex) {
          return {
            ...p,
            cash: p.cash + actualPayment,
            iousReceivable: [...p.iousReceivable, newIOU],
          }
        }
        return p
      }),
      phase: "resolving_space",
      pendingRentNegotiation: null,
      utilityMultiplierOverride: null,
    })

    this.addLogEntry(
      `${debtor.name} paid £${actualPayment} now, owes £${remainingDebt} IOU to ${creditor.name}`,
      "rent",
      debtorIndex,
    )
  }

  // Pay off an IOU (full or partial)
  public payIOU(debtorIndex: number, iouId: number, amount?: number) {
    const debtor = this.state.players[debtorIndex]
    if (!debtor) return

    const iou = debtor.iousPayable.find((i) => i.id === iouId)
    if (!iou) return

    const creditor = this.state.players[iou.creditorId]
    if (!creditor) return

    // Calculate interest based on rounds passed since turnCreated
    const roundsPassed = Math.max(0, this.state.roundsCompleted - (iou.turnCreated || 0))
    const totalInterest = Math.round(iou.originalAmount * (iou.interestRate || 0) * roundsPassed)
    const currentTotalOwed = Math.round(iou.originalAmount + totalInterest)

    // Ensure payment is a whole number and at least £1
    const rawPaymentAmount = amount
      ? Math.min(amount, currentTotalOwed, debtor.cash)
      : Math.min(currentTotalOwed, debtor.cash)
    // Round down to whole number and ensure minimum of £1
    const paymentAmount = Math.max(1, Math.floor(rawPaymentAmount))

    // Validate payment amount
    if (
      paymentAmount <= 0 ||
      paymentAmount > debtor.cash ||
      paymentAmount > currentTotalOwed
    )
      return

    const remainingDebt = Math.round(currentTotalOwed - paymentAmount)
    const iouPaidOff = remainingDebt <= 0

    this.setState({
      players: this.state.players.map((p, i) => {
        if (i === debtorIndex) {
          return {
            ...p,
            cash: p.cash - paymentAmount,
            iousPayable: iouPaidOff
              ? p.iousPayable.filter((io) => io.id !== iouId)
              : p.iousPayable.map((io) =>
                  io.id === iouId
                    ? { ...io, currentAmount: remainingDebt }
                    : io,
                ),
          }
        }
        if (i === iou.creditorId) {
          return {
            ...p,
            cash: p.cash + paymentAmount,
            iousReceivable: iouPaidOff
              ? p.iousReceivable.filter((io) => io.id !== iouId)
              : p.iousReceivable.map((io) =>
                  io.id === iouId
                    ? { ...io, currentAmount: remainingDebt }
                    : io,
                ),
          }
        }
        return p
      }),
    })

    if (iouPaidOff) {
      this.addLogEntry(
        `${debtor.name} paid off IOU of £${paymentAmount} to ${creditor.name}`,
        "rent",
        debtorIndex,
      )
    } else {
      this.addLogEntry(
        `${debtor.name} paid £${paymentAmount} on IOU, £${remainingDebt} remaining to ${creditor.name}`,
        "rent",
        debtorIndex,
      )
    }
  }

  // Apply interest to all IOUs at end of turn
  public applyIOUInterest(playerIndex: number) {
    const player = this.state.players[playerIndex]
    if (!player || player.iousPayable.length === 0) return

    // Simply log that interest is accruing (it's calculated on-the-fly during payment)
    this.addLogEntry(
      `Interest is accruing on ${player.name}'s IOUs.`,
      "system",
      playerIndex,
    )
  }

  // Creditor demands immediate payment or property transfer
  public demandImmediatePaymentOrProperty(propertyIdToTransfer?: number) {
    const negotiation = this.state.pendingRentNegotiation
    if (!negotiation) return

    const { debtorIndex, creditorIndex, propertyId, rentAmount } = negotiation
    const debtor = this.state.players[debtorIndex]
    const creditor = this.state.players[creditorIndex]

    if (!debtor || !creditor) return

    if (propertyIdToTransfer !== undefined) {
      // Transfer property as payment
      const propertyToTransfer = this.state.spaces.find(
        (s) => s.id === propertyIdToTransfer,
      ) as Property
      if (!propertyToTransfer || propertyToTransfer.owner !== debtorIndex)
        return

      // Calculate property value using precision-safe effective value
      const propertyValue = propertyToTransfer.mortgaged
        ? this.getEffectiveMortgageValue(propertyToTransfer.id)
        : this.getEffectivePropertyValue(propertyToTransfer.id)

      // Transfer property and settle difference
      const difference = rentAmount - propertyValue

      this.setState({
        spaces: this.state.spaces.map((s) =>
          s.id === propertyIdToTransfer
            ? ({ ...s, owner: creditorIndex } as Property)
            : s,
        ),
        players: this.state.players.map((p, i) => {
          if (i === debtorIndex) {
            const newProps = p.properties.filter(
              (pid) => pid !== propertyIdToTransfer,
            )
            // If debtor owes more than property value, pay the difference from cash
            const cashChange = difference > 0 ? Math.min(difference, p.cash) : 0
            return { ...p, properties: newProps, cash: p.cash - cashChange }
          }
          if (i === creditorIndex) {
            const cashChange =
              difference > 0 ? Math.min(difference, debtor.cash) : 0
            return {
              ...p,
              properties: [...p.properties, propertyIdToTransfer],
              cash: p.cash + cashChange,
            }
          }
          return p
        }),
        phase: "resolving_space",
        pendingRentNegotiation: null,
        utilityMultiplierOverride: null,
      })

      this.addLogEntry(
        `${debtor.name} transferred ${propertyToTransfer.name} to ${creditor.name} as rent payment`,
        "rent",
        debtorIndex,
      )
    } else {
      // No property transfer - debtor goes bankrupt
      this.setState({
        pendingRentNegotiation: null,
        utilityMultiplierOverride: null,
      })
      this.declareBankruptcy(debtorIndex, creditorIndex)
    }
  }

  public payTax(playerIndex: number, amount: number) {
    const player = this.state.players[playerIndex]
    if (!player) return

    if (player.cash >= amount) {
      this.setState({
        players: this.state.players.map((p, i) =>
          i === playerIndex ? { ...p, cash: p.cash - amount } : p,
        ),
      })
      this.addLogEntry(
        `${player.name} paid £${amount} in taxes`,
        "tax",
        playerIndex,
      )
    } else if (this.state.settings.enableBankruptcyRestructuring) {
      // Phase 3: Offer Chapter 11 restructuring
      this.offerRestructuring(playerIndex, null as any, amount)
    } else {
      this.declareBankruptcy(playerIndex)
    }
  }

  public endTurn() {
    const roll = this.state.diceRoll
    const currentPlayer = this.state.players[this.state.currentPlayerIndex]
    const isDoubles = roll?.isDoubles && currentPlayer && !currentPlayer.inJail

    if (
      isDoubles &&
      currentPlayer &&
      !currentPlayer.bankrupt
    ) {
      const newConsecutiveDoubles = this.state.consecutiveDoubles

      // Three doubles in a row = go to jail (already incremented in rollDice)
      if (newConsecutiveDoubles >= 3) {
        console.log(
          `[GameRoom] ${currentPlayer.name} rolled 3 doubles in a row! Going to jail.`,
        )
        this.addLogEntry(
          `${currentPlayer.name} rolled 3 doubles in a row and went to Jail!`,
          "jail",
          this.state.currentPlayerIndex,
        )
        this.goToJail(this.state.currentPlayerIndex)
        return
      }

      // Less than 3 doubles - allow another roll
      console.log(
        `[GameRoom] ${currentPlayer.name} rolled doubles (${newConsecutiveDoubles}/3). Allowing another roll.`,
      )
      this.setState({
        phase: "rolling",
        diceRoll: null,
        lastDiceRoll: null,
        consecutiveDoubles: newConsecutiveDoubles,
        lastCardDrawn: null,
      })
      return
    }

    // Non-doubles roll or player in jail - reset consecutiveDoubles counter
    if (
      roll &&
      !roll.isDoubles &&
      this.state.consecutiveDoubles > 0 &&
      currentPlayer
    ) {
      console.log(
        `[GameRoom] ${currentPlayer.name} rolled non-doubles. Resetting consecutiveDoubles counter.`,
      )
    }

    let nextPlayerIndex = this.state.currentPlayerIndex
    let newConsecutiveDoubles = 0

    if (isDoubles) {
      // This part should theoretically not be reached due to the return above, 
      // but keeping it consistent with the logic for safety or future refactors.
      newConsecutiveDoubles = this.state.consecutiveDoubles
    } else {
      // Normal end of turn - move to next player
      nextPlayerIndex =
        (this.state.currentPlayerIndex + 1) % this.state.players.length
      let loopCount = 0
      while (
        this.state.players[nextPlayerIndex]?.bankrupt &&
        loopCount < this.state.players.length
      ) {
        nextPlayerIndex = (nextPlayerIndex + 1) % this.state.players.length
        loopCount++
      }
      newConsecutiveDoubles = 0
    }

    // Check if we completed a full round (back to player 0 or first non-bankrupt player)
    const activePlayers = this.state.players.filter((p) => !p.bankrupt)

    // Safety check: if phase is still "moving" and diceRoll exists, move the player first
    if (this.state.phase === "moving" && this.state.diceRoll) {
      console.log(
        `[GameRoom] endTurn called while phase is "moving". Moving player ${this.state.currentPlayerIndex} first.`,
      )
      this.movePlayer(this.state.currentPlayerIndex, this.state.diceRoll.total)
    }

    // Apply loan interest to the current player before ending their turn
    const endingPlayer = this.state.players[this.state.currentPlayerIndex]
    if (endingPlayer && !endingPlayer.bankrupt && !isDoubles) {
      this.applyLoanInterest(this.state.currentPlayerIndex)
      // Phase 3: Apply IOU interest at end of turn
      this.applyIOUInterest(this.state.currentPlayerIndex)
      // Phase 3: Check Chapter 11 status
      if (endingPlayer.inChapter11) {
        this.checkChapter11Status(this.state.currentPlayerIndex)
      }
    }

    const firstActiveIndex = this.state.players.findIndex((p) => !p.bankrupt)
    const completedRound =
      nextPlayerIndex <= this.state.currentPlayerIndex &&
      nextPlayerIndex === firstActiveIndex &&
      activePlayers.length > 1

    let newRoundsCompleted = this.state.roundsCompleted
    let newGoSalary = this.state.currentGoSalary
    let newMarketHistory = [...this.state.marketHistory]

    if (completedRound) {
      newRoundsCompleted = this.state.roundsCompleted + 1
      const calculatedSalary = calculateGoSalary(newRoundsCompleted)

      // Log inflation if salary increased
      if (
        calculatedSalary > this.state.currentGoSalary &&
        this.state.settings.enableInflation
      ) {
        this.addLogEntry(
          `💹 Inflation! GO salary increased to £${calculatedSalary}`,
          "system",
        )
      }
      newGoSalary = calculatedSalary

      // Record market history
      newMarketHistory.push({
        round: newRoundsCompleted,
        inflation: newGoSalary,
        gini: calculateGiniCoefficient(this.state),
      })

      // Update economic events at end of round
      this.updateEconomicEvents()

      // Phase 3: Check for expired insurance policies at end of round
      this.checkInsuranceExpiry()
    }

    const nextPlayer = this.state.players[nextPlayerIndex]
    this.setState({
      currentPlayerIndex: nextPlayerIndex,
      phase: nextPlayer?.inJail ? "jail_decision" : "rolling",
      diceRoll: null,
      lastDiceRoll: null,
      consecutiveDoubles: 0,
      passedGo: false,
      lastCardDrawn: null,
      turn: this.state.turn + 1,
      roundsCompleted: newRoundsCompleted,
      currentGoSalary: newGoSalary,
      marketHistory: newMarketHistory,
    })
  }

  public goToJail(playerIndex: number) {
    const player = this.state.players[playerIndex]
    const wasThreeDoubles = this.state.consecutiveDoubles >= 2 // Check before reset

    this.setState({
      players: this.state.players.map((p, i) =>
        i === playerIndex
          ? { ...p, position: 10, inJail: true, jailTurns: 0 }
          : p,
      ),
      consecutiveDoubles: 0, // Reset doubles counter when going to jail
      diceRoll: null,
      lastDiceRoll: null,
      phase: "jail_decision", // Set phase to jail decision
    })

    if (player) {
      const reason = wasThreeDoubles ? " (3 doubles in a row)" : ""
      this.addLogEntry(
        `${player.name} went to Jail!${reason}`,
        "jail",
        playerIndex,
      )
    }

    // Do NOT end turn immediately to allow client to show animation/message.
    // The player must click "End Turn" or AI will handle it.
    this.setState({ phase: "resolving_space" })
  }

  public getOutOfJail(playerIndex: number, method: "roll" | "pay" | "card") {
    const player = this.state.players[playerIndex]
    if (!player) return

    if (method === "pay") {
      if (player.cash >= 50) {
        this.setState({
          players: this.state.players.map((p, i) =>
            i === playerIndex
              ? { ...p, cash: p.cash - 50, inJail: false, jailTurns: 0 }
              : p,
          ),
          phase: "rolling",
        })
      }
    } else if (method === "card") {
      if (player.jailFreeCards > 0) {
        this.setState({
          players: this.state.players.map((p, i) =>
            i === playerIndex
              ? {
                  ...p,
                  jailFreeCards: p.jailFreeCards - 1,
                  inJail: false,
                  jailTurns: 0,
                }
              : p,
          ),
          phase: "rolling",
        })
      }
    } else if (method === "roll") {
      const roll = this.rollDice()
      if (roll.isDoubles) {
        this.setState({
          players: this.state.players.map((p, i) =>
            i === playerIndex ? { ...p, inJail: false, jailTurns: 0 } : p,
          ),
          consecutiveDoubles: 0,
        })
        this.movePlayer(playerIndex, roll.total)
      } else {
        const newJailTurns = player.jailTurns + 1
        if (newJailTurns >= 3) {
          this.setState({
            players: this.state.players.map((p, i) =>
              i === playerIndex
                ? { ...p, cash: p.cash - 50, inJail: false, jailTurns: 0 }
                : p,
            ),
          })
          this.movePlayer(playerIndex, roll.total)
        } else {
          this.setState({
            players: this.state.players.map((p, i) =>
              i === playerIndex ? { ...p, jailTurns: newJailTurns } : p,
            ),
          })
          this.endTurn()
        }
      }
    }
  }

  // ... (Implementing other methods similarly, standard logic) ...
  // To save space, I'll implement the rest quickly.

  public buildHouse(propertyId: number) {
    const playerIndex = this.state.currentPlayerIndex

    // Validate turn order
    const turnValidation = validatePlayerTurn(this.state, playerIndex, [
      "rolling",
      "resolving_space",
    ])
    if (!turnValidation.valid) {
      this.addLogEntry(
        turnValidation.error || "Invalid action",
        "system",
        playerIndex,
      )
      return
    }

    const player = this.state.players[playerIndex]
    if (!player) {
      this.addLogEntry("Player not found", "system", playerIndex)
      return
    }

    // Validate building rules
    const buildingValidation = validateBuilding(
      this.state,
      propertyId,
      playerIndex,
    )
    if (!buildingValidation.valid) {
      this.addLogEntry(
        buildingValidation.error || "Cannot build house",
        "system",
        playerIndex,
      )
      return
    }

    const property = this.state.spaces.find(
      (s) => s.id === propertyId,
    ) as Property
    if (!property || property.houses >= 4 || !property.buildingCost) {
      this.addLogEntry(
        "Cannot build more houses on this property",
        "system",
        playerIndex,
      )
      return
    }

    // Calculate actual building cost (may be modified by economic events)
    let buildingCost = property.buildingCost
    if (this.isEconomicEventActive("housing_boom")) {
      buildingCost = Math.floor(buildingCost * 1.5) // 50% increase during housing boom
    }

    // Validate cash
    const cashValidation = validateCash(player, buildingCost, "build house")
    if (!cashValidation.valid) {
      this.addLogEntry(
        cashValidation.error || "Insufficient funds",
        "system",
        playerIndex,
      )
      return
    }

    // Housing scarcity check
    if (
      this.state.settings.enableHousingScarcity &&
      this.state.availableHouses <= 0
    ) {
      this.addLogEntry(
        `🏠 Housing shortage! No houses available to build.`,
        "system",
        playerIndex,
      )
      return
    }

    this.setState({
      spaces: this.state.spaces.map((s) =>
        s.id === propertyId ? { ...s, houses: (s as Property).houses + 1 } : s,
      ),
      players: this.state.players.map((p, i) =>
        i === playerIndex ? { ...p, cash: p.cash - buildingCost } : p,
      ),
      // Decrement available houses
      availableHouses: this.state.settings.enableHousingScarcity
        ? this.state.availableHouses - 1
        : this.state.availableHouses,
    })

    const housesLeft = this.state.availableHouses
    const scarcityWarning =
      this.state.settings.enableHousingScarcity && housesLeft <= 5
        ? ` (${housesLeft} houses left!)`
        : ""
    const boomWarning = this.isEconomicEventActive("housing_boom") ? " 🏗️" : ""
    this.addLogEntry(
      `${player.name} built a house on ${property.name} for £${buildingCost}${scarcityWarning}${boomWarning}`,
      "system",
      playerIndex,
    )

    // Phase 3: Property Value Fluctuation - appreciate properties in color group
    if (
      this.state.settings.enablePropertyValueFluctuation &&
      property.colorGroup
    ) {
      this.appreciateColorGroup(property.colorGroup)
    }
  }

  public buildHotel(propertyId: number) {
    const playerIndex = this.state.currentPlayerIndex
    const player = this.state.players[playerIndex]
    if (!player) return
    const property = this.state.spaces.find(
      (s) => s.id === propertyId,
    ) as Property
    if (
      !property ||
      property.owner !== playerIndex ||
      property.houses !== 4 ||
      !property.buildingCost ||
      !property.colorGroup
    )
      return

    // Calculate actual building cost (may be modified by economic events)
    let buildingCost = property.buildingCost
    if (this.isEconomicEventActive("housing_boom")) {
      buildingCost = Math.floor(buildingCost * 1.5) // 50% increase during housing boom
    }

    if (player.cash < buildingCost) {
      this.addLogEntry(
        `Cannot afford £${buildingCost} to build hotel${this.isEconomicEventActive("housing_boom") ? " (Housing Boom prices!)" : ""}`,
        "system",
        playerIndex,
      )
      return
    }

    // Hotel scarcity check
    if (
      this.state.settings.enableHousingScarcity &&
      this.state.availableHotels <= 0
    ) {
      this.addLogEntry(
        `🏨 Hotel shortage! No hotels available to build.`,
        "system",
        playerIndex,
      )
      return
    }

    const groupProperties = this.state.spaces.filter(
      (s): s is Property =>
        isProperty(s) && s.colorGroup === property.colorGroup,
    )
    if (!groupProperties.every((p) => p.houses === 4 || p.hotel)) return

    this.setState({
      spaces: this.state.spaces.map((s) =>
        s.id === propertyId ? { ...s, houses: 0, hotel: true } : s,
      ),
      players: this.state.players.map((p, i) =>
        i === playerIndex ? { ...p, cash: p.cash - buildingCost } : p,
      ),
      // Return 4 houses to supply, take 1 hotel
      availableHouses: this.state.settings.enableHousingScarcity
        ? this.state.availableHouses + 4
        : this.state.availableHouses,
      availableHotels: this.state.settings.enableHousingScarcity
        ? this.state.availableHotels - 1
        : this.state.availableHotels,
    })

    const hotelsLeft = this.state.availableHotels
    const scarcityWarning =
      this.state.settings.enableHousingScarcity && hotelsLeft <= 3
        ? ` (${hotelsLeft} hotels left!)`
        : ""
    const boomWarning = this.isEconomicEventActive("housing_boom") ? " 🏗️" : ""
    this.addLogEntry(
      `${player.name} built a hotel on ${property.name} for £${buildingCost}${scarcityWarning}${boomWarning}`,
      "system",
      playerIndex,
    )

    // Phase 3: Property Value Fluctuation - appreciate properties in color group (hotels appreciate more)
    if (
      this.state.settings.enablePropertyValueFluctuation &&
      property.colorGroup
    ) {
      this.appreciateColorGroup(property.colorGroup, 2) // Double appreciation for hotels
    }
  }

  public sellHouse(propertyId: number) {
    const playerIndex = this.state.currentPlayerIndex
    const player = this.state.players[playerIndex]
    if (!player) return
    const property = this.state.spaces.find(
      (s) => s.id === propertyId,
    ) as Property
    if (!property || property.owner !== playerIndex || property.houses <= 0)
      return

    const sellValue = Math.floor((property.buildingCost ?? 0) / 2)
    this.setState({
      spaces: this.state.spaces.map((s) =>
        s.id === propertyId ? { ...s, houses: (s as Property).houses - 1 } : s,
      ),
      players: this.state.players.map((p, i) =>
        i === playerIndex ? { ...p, cash: p.cash + sellValue } : p,
      ),
      // Return house to supply
      availableHouses: this.state.settings.enableHousingScarcity
        ? this.state.availableHouses + 1
        : this.state.availableHouses,
    })
    this.addLogEntry(
      `${player.name} sold a house on ${property.name} for £${sellValue}`,
      "system",
      playerIndex,
    )
  }

  public sellHotel(propertyId: number) {
    const playerIndex = this.state.currentPlayerIndex
    const player = this.state.players[playerIndex]
    if (!player) return
    const property = this.state.spaces.find(
      (s) => s.id === propertyId,
    ) as Property
    if (!property || property.owner !== playerIndex || !property.hotel) return

    // When selling a hotel, you get 4 houses back - but only if there are enough houses available!
    if (
      this.state.settings.enableHousingScarcity &&
      this.state.availableHouses < 4
    ) {
      this.addLogEntry(
        `🏠 Cannot sell hotel - not enough houses available (need 4, have ${this.state.availableHouses})`,
        "system",
        playerIndex,
      )
      return
    }

    const sellValue = Math.floor((property.buildingCost ?? 0) / 2)
    this.setState({
      spaces: this.state.spaces.map((s) =>
        s.id === propertyId ? { ...s, houses: 4, hotel: false } : s,
      ),
      players: this.state.players.map((p, i) =>
        i === playerIndex ? { ...p, cash: p.cash + sellValue } : p,
      ),
      // Return hotel, take 4 houses
      availableHouses: this.state.settings.enableHousingScarcity
        ? this.state.availableHouses - 4
        : this.state.availableHouses,
      availableHotels: this.state.settings.enableHousingScarcity
        ? this.state.availableHotels + 1
        : this.state.availableHotels,
    })
    this.addLogEntry(
      `${player.name} sold a hotel on ${property.name} for £${sellValue}`,
      "system",
      playerIndex,
    )
  }

  public mortgageProperty(propertyId: number) {
    const playerIndex = this.state.currentPlayerIndex

    // Validate turn order
    const turnValidation = validatePlayerTurn(this.state, playerIndex, [
      "rolling",
      "resolving_space",
    ])
    if (!turnValidation.valid) {
      this.addLogEntry(
        turnValidation.error || "Invalid action",
        "system",
        playerIndex,
      )
      return
    }

    // Validate mortgage
    const mortgageValidation = validateMortgage(
      this.state,
      propertyId,
      playerIndex,
      false,
    )
    if (!mortgageValidation.valid) {
      this.addLogEntry(
        mortgageValidation.error || "Cannot mortgage property",
        "system",
        playerIndex,
      )
      return
    }

    const space = this.state.spaces.find((s) => s.id === propertyId) as Property
    if (!space) return

    // Calculate jackpot contribution (15% of mortgage value)
    const jackpotContribution = Math.floor(space.mortgageValue * 0.15)
    const playerReceives = space.mortgageValue - jackpotContribution

    this.setState({
      spaces: this.state.spaces.map((s) =>
        s.id === propertyId ? { ...s, mortgaged: true } : s,
      ),
      players: this.state.players.map((p, i) =>
        i === playerIndex ? { ...p, cash: p.cash + playerReceives } : p,
      ),
      jackpot: this.state.jackpot + jackpotContribution,
    })
    const owner = this.state.players[playerIndex]
    if (owner) {
      this.addLogEntry(
        `${owner.name} mortgaged ${space.name} (received £${playerReceives}, £${jackpotContribution} added to jackpot)`,
        "system",
        playerIndex,
      )
    }
  }

  public unmortgageProperty(propertyId: number) {
    const playerIndex = this.state.currentPlayerIndex

    // Validate turn order
    const turnValidation = validatePlayerTurn(this.state, playerIndex, [
      "rolling",
      "resolving_space",
    ])
    if (!turnValidation.valid) {
      this.addLogEntry(
        turnValidation.error || "Invalid action",
        "system",
        playerIndex,
      )
      return
    }

    // Validate unmortgage
    const mortgageValidation = validateMortgage(
      this.state,
      propertyId,
      playerIndex,
      true,
    )
    if (!mortgageValidation.valid) {
      this.addLogEntry(
        mortgageValidation.error || "Cannot unmortgage property",
        "system",
        playerIndex,
      )
      return
    }

    const space = this.state.spaces.find((s) => s.id === propertyId) as Property
    if (!space) return

    const unmortgageCost = Math.floor(space.mortgageValue * 1.1)
    const player = this.state.players[playerIndex]
    if (!player) return

    this.setState({
      spaces: this.state.spaces.map((s) =>
        s.id === propertyId ? { ...s, mortgaged: false } : s,
      ),
      players: this.state.players.map((p, i) =>
        i === playerIndex ? { ...p, cash: p.cash - unmortgageCost } : p,
      ),
    })
    this.addLogEntry(
      `${player.name} unmortgaged ${space.name} for £${unmortgageCost}`,
      "system",
      playerIndex,
    )
  }

  // ============ PROPERTY INSURANCE SYSTEM (Phase 3) ============

  // Calculate insurance cost for a property
  public getInsuranceCost(propertyId: number): number {
    if (!this.state.settings.enablePropertyInsurance) return 0

    const property = this.state.spaces.find(
      (s) => s.id === propertyId,
    ) as Property
    if (!property) return 0

    // Insurance cost is a percentage of property value per round
    return Math.ceil(property.price * this.state.settings.insuranceCostPercent)
  }

  // Buy insurance for a property (covers for 5 rounds)
  public buyPropertyInsurance(propertyId: number, playerIndex: number) {
    if (!this.state.settings.enablePropertyInsurance) return

    const property = this.state.spaces.find(
      (s) => s.id === propertyId,
    ) as Property
    const player = this.state.players[playerIndex]

    if (!property || !player || property.owner !== playerIndex) return

    const insuranceCost = this.getInsuranceCost(propertyId)
    if (player.cash < insuranceCost) {
      this.addLogEntry(
        `${player.name} cannot afford £${insuranceCost} insurance for ${property.name}`,
        "system",
        playerIndex,
      )
      return
    }

    const coverageRounds = 5 // Insurance covers for 5 rounds
    const newPaidUntilRound = this.state.roundsCompleted + coverageRounds

    this.setState({
      spaces: this.state.spaces.map((s) =>
        s.id === propertyId
          ? ({
              ...s,
              isInsured: true,
              insurancePaidUntilRound: newPaidUntilRound,
            } as Property)
          : s,
      ),
      players: this.state.players.map((p, i) =>
        i === playerIndex ? { ...p, cash: p.cash - insuranceCost } : p,
      ),
    })

    this.addLogEntry(
      `${player.name} insured ${property.name} for £${insuranceCost} (covers ${coverageRounds} rounds)`,
      "system",
      playerIndex,
    )
  }

  // Check and expire insurance at the end of each round
  public checkInsuranceExpiry() {
    const currentRound = this.state.roundsCompleted
    const expiredProperties: string[] = []

    const updatedSpaces = this.state.spaces.map((s) => {
      if (
        isProperty(s) &&
        s.isInsured &&
        s.insurancePaidUntilRound <= currentRound
      ) {
        expiredProperties.push(s.name)
        return {
          ...s,
          isInsured: false,
          insurancePaidUntilRound: 0,
        } as Property
      }
      return s
    })

    if (expiredProperties.length > 0) {
      this.setState({ spaces: updatedSpaces })
      this.addLogEntry(
        `Insurance expired on: ${expiredProperties.join(", ")}`,
        "system",
      )
    }
  }

  // Check if property is insured (used for card effects)
  public isPropertyInsured(propertyId: number): boolean {
    if (!this.state.settings.enablePropertyInsurance) return false

    const property = this.state.spaces.find(
      (s) => s.id === propertyId,
    ) as Property
    if (!property) return false

    return (
      property.isInsured &&
      property.insurancePaidUntilRound > this.state.roundsCompleted
    )
  }

  // ============ PROPERTY VALUE FLUCTUATION (Phase 3) ============

  // Appreciate all properties in a color group (called when building)
  public appreciateColorGroup(colorGroup: ColorGroup, multiplier: number = 1) {
    if (!this.state.settings.enablePropertyValueFluctuation || !colorGroup)
      return

    const rate = this.state.settings.appreciationRate * multiplier
    const appreciatedProperties: string[] = []

    const updatedSpaces = this.state.spaces.map((s) => {
      if (isProperty(s) && s.colorGroup === colorGroup) {
        // Use precision to avoid floating point issues
        const newMultiplier =
          Math.round((s.valueMultiplier + rate) * 100) / 100
        const cappedMultiplier = Math.min(2.0, newMultiplier) // Cap at 2x

        if (cappedMultiplier !== s.valueMultiplier) {
          appreciatedProperties.push(s.name)
          return { ...s, valueMultiplier: cappedMultiplier } as Property
        }
      }
      return s
    })

    if (appreciatedProperties.length > 0) {
      this.setState({ spaces: updatedSpaces })
      const percentChange = Math.round(rate * 100)
      this.addLogEntry(
        `📈 ${colorGroup.replace("_", " ")} properties appreciated ${percentChange}%!`,
        "system",
      )
    }
  }

  // Depreciate all properties in a color group (called by economic events or mortgaging)
  public depreciateColorGroup(colorGroup: ColorGroup, rate: number = 0.05) {
    if (!this.state.settings.enablePropertyValueFluctuation || !colorGroup)
      return

    const depreciatedProperties: string[] = []

    const updatedSpaces = this.state.spaces.map((s) => {
      if (isProperty(s) && s.colorGroup === colorGroup) {
        // Use precision to avoid floating point issues
        const newMultiplier =
          Math.round((s.valueMultiplier - rate) * 100) / 100
        const cappedMultiplier = Math.max(0.5, newMultiplier) // Floor at 0.5x

        if (cappedMultiplier !== s.valueMultiplier) {
          depreciatedProperties.push(s.name)
          return { ...s, valueMultiplier: cappedMultiplier } as Property
        }
      }
      return s
    })

    if (depreciatedProperties.length > 0) {
      this.setState({ spaces: updatedSpaces })
      const percentChange = Math.round(rate * 100)
      this.addLogEntry(
        `📉 ${colorGroup.replace("_", " ")} properties depreciated ${percentChange}%!`,
        "system",
      )
    }
  }

  // Apply market-wide value changes (for economic events)
  public applyMarketValueChange(changePercent: number) {
    if (!this.state.settings.enablePropertyValueFluctuation) return

    const rate = changePercent / 100

    const updatedSpaces = this.state.spaces.map((s) => {
      if (isProperty(s)) {
        // Use precision to avoid floating point issues
        const newMultiplier =
          Math.round((s.valueMultiplier + rate) * 100) / 100
        return {
          ...s,
          valueMultiplier: Math.max(0.5, Math.min(2.0, newMultiplier)),
        } as Property
      }
      return s
    })

    this.setState({ spaces: updatedSpaces })

    if (changePercent > 0) {
      this.addLogEntry(
        `📈 Market rally! All properties appreciated ${changePercent}%`,
        "system",
      )
    } else {
      this.addLogEntry(
        `📉 Market downturn! All properties depreciated ${Math.abs(changePercent)}%`,
        "system",
      )
    }
  }

  // Get effective property value (base price × multiplier)
  public getEffectivePropertyValue(propertyId: number): number {
    const property = this.state.spaces.find(
      (s) => s.id === propertyId,
    ) as Property
    if (!property) return 0

    if (!this.state.settings.enablePropertyValueFluctuation) {
      return property.price
    }

    return Math.round(property.price * property.valueMultiplier)
  }

  // Get effective mortgage value
  public getEffectiveMortgageValue(propertyId: number): number {
    const property = this.state.spaces.find(
      (s) => s.id === propertyId,
    ) as Property
    if (!property) return 0

    if (!this.state.settings.enablePropertyValueFluctuation) {
      return property.mortgageValue
    }

    return Math.round(property.mortgageValue * property.valueMultiplier)
  }

  // ============ BANK LOANS SYSTEM (Phase 2) ============

  // Calculate net worth for loan limit calculations
  private calculateNetWorth(playerIndex: number): number {
    const player = this.state.players[playerIndex]
    if (!player || player.bankrupt) return 0

    let netWorth = player.cash

    // Add property values
    this.state.spaces.forEach((space) => {
      if (isProperty(space) && space.owner === playerIndex) {
        if (!space.mortgaged) {
          // Use precision-safe effective value
          netWorth += this.getEffectivePropertyValue(space.id)
          // Add building values at half cost (liquidation value)
          const buildingCost = space.buildingCost ?? 0
          netWorth += Math.floor(space.houses * (buildingCost / 2))
          if (space.hotel) netWorth += Math.floor(buildingCost / 2)
        }
      }
    })

    // Subtract existing debt
    netWorth -= player.totalDebt

    return Math.max(0, Math.round(netWorth))
  }

  // Get maximum loan amount a player can take
  public getMaxLoanAmount(playerIndex: number): number {
    if (!this.state.settings.enableBankLoans) return 0

    const player = this.state.players[playerIndex]
    if (!player || player.bankrupt) return 0

    const netWorth = this.calculateNetWorth(playerIndex)
    const maxLoan = Math.floor(netWorth * this.state.settings.maxLoanPercent)

    // Subtract existing loans from max
    const existingLoans = player.totalDebt
    return Math.max(0, maxLoan - existingLoans)
  }

  // Take a loan from the bank
  public takeLoan(playerIndex: number, amount: number) {
    if (!this.state.settings.enableBankLoans) {
      this.addLogEntry(
        "Bank loans are disabled for this game.",
        "system",
        playerIndex,
      )
      return
    }

    const player = this.state.players[playerIndex]
    if (!player || player.bankrupt) return

    // Validate loan amount
    const maxLoan = this.getMaxLoanAmount(playerIndex)
    if (amount <= 0) {
      this.addLogEntry("Invalid loan amount.", "system", playerIndex)
      return
    }
    if (amount > maxLoan) {
      this.addLogEntry(
        `Cannot borrow £${amount}. Maximum available: £${maxLoan}`,
        "system",
        playerIndex,
      )
      return
    }

    // Minimum loan amount
    const minLoan = 50
    if (amount < minLoan) {
      this.addLogEntry(
        `Minimum loan amount is £${minLoan}`,
        "system",
        playerIndex,
      )
      return
    }

    // Create the loan
    const newLoan = {
      id: Date.now(),
      amount: amount,
      interestRate: this.state.settings.loanInterestRate,
      turnTaken: this.state.turn,
      totalOwed: amount,
    }

    this.setState({
      players: this.state.players.map((p, i) =>
        i === playerIndex
          ? {
              ...p,
              cash: p.cash + amount,
              bankLoans: [...p.bankLoans, newLoan],
              totalDebt: p.totalDebt + amount,
            }
          : p,
      ),
    })

    const interestPercent = Math.round(
      this.state.settings.loanInterestRate * 100,
    )
    this.addLogEntry(
      `🏦 ${player.name} took a loan of £${amount} (${interestPercent}% interest/turn)`,
      "system",
      playerIndex,
    )
  }

  // Repay a loan (partially or fully)
  public repayLoan(playerIndex: number, loanId: number, amount: number) {
    const player = this.state.players[playerIndex]
    if (!player || player.bankrupt) return

    const loanIndex = player.bankLoans.findIndex((l) => l.id === loanId)
    if (loanIndex === -1) {
      this.addLogEntry("Loan not found.", "system", playerIndex)
      return
    }

    const loan = player.bankLoans[loanIndex]!

    // Validate repayment amount
    if (amount <= 0) {
      this.addLogEntry("Invalid repayment amount.", "system", playerIndex)
      return
    }
    if (amount > player.cash) {
      this.addLogEntry(
        `Insufficient funds. You have £${player.cash}`,
        "system",
        playerIndex,
      )
      return
    }

    const actualRepayment = Math.min(amount, loan.totalOwed)
    const remainingDebt = loan.totalOwed - actualRepayment

    let updatedLoans: typeof player.bankLoans
    if (remainingDebt <= 0) {
      // Loan fully repaid - remove it
      updatedLoans = player.bankLoans.filter((l) => l.id !== loanId)
      this.addLogEntry(
        `🏦 ${player.name} fully repaid a loan of £${actualRepayment}!`,
        "system",
        playerIndex,
      )
    } else {
      // Partial repayment
      updatedLoans = player.bankLoans.map((l) =>
        l.id === loanId ? { ...l, totalOwed: remainingDebt } : l,
      )
      this.addLogEntry(
        `🏦 ${player.name} repaid £${actualRepayment} on loan (£${remainingDebt} remaining)`,
        "system",
        playerIndex,
      )
    }

    this.setState({
      players: this.state.players.map((p, i) =>
        i === playerIndex
          ? {
              ...p,
              cash: p.cash - actualRepayment,
              bankLoans: updatedLoans,
              totalDebt: updatedLoans.reduce((sum, l) => sum + l.totalOwed, 0),
            }
          : p,
      ),
    })
  }

  // Apply interest to all loans at end of turn
  public applyLoanInterest(playerIndex: number) {
    if (!this.state.settings.enableBankLoans) return

    const player = this.state.players[playerIndex]
    if (!player || player.bankrupt || player.bankLoans.length === 0) return

    // Check for banking crisis - double interest rates
    const interestMultiplier = this.isEconomicEventActive("banking_crisis")
      ? 2
      : 1

    let totalInterest = 0
    const updatedLoans = player.bankLoans.map((loan) => {
      const interest = Math.ceil(
        loan.totalOwed * loan.interestRate * interestMultiplier,
      )
      totalInterest += interest
      return { ...loan, totalOwed: loan.totalOwed + interest }
    })

    if (totalInterest > 0) {
      this.setState({
        players: this.state.players.map((p, i) =>
          i === playerIndex
            ? {
                ...p,
                bankLoans: updatedLoans,
                totalDebt: updatedLoans.reduce(
                  (sum, l) => sum + l.totalOwed,
                  0,
                ),
              }
            : p,
        ),
      })
      this.addLogEntry(
        `📈 ${player.name}'s loans accrued £${totalInterest} in interest (total debt: £${updatedLoans.reduce((sum, l) => sum + l.totalOwed, 0)})`,
        "system",
        playerIndex,
      )
    }
  }

  public addLogEntry(
    message: string,
    type: GameLogEntry["type"],
    playerIndex?: number,
  ) {
    const entry: GameLogEntry = {
      id: ++this.logIdCounter,
      timestamp: Date.now(),
      playerIndex,
      message,
      type,
    }
    this.setState({ gameLog: [...this.state.gameLog.slice(-49), entry] })
  }

  public drawCard(playerIndex: number, type: "chance" | "community_chest") {
    const deck =
      type === "chance" ? this.state.chanceDeck : this.state.communityChestDeck
    const card = deck[0]
    const player = this.state.players[playerIndex]
    if (!card || !player) return

    this.addLogEntry(
      `${player.name} drew ${type === "chance" ? "Chance" : "Community Chest"}: "${card.text}"`,
      "card",
      playerIndex,
    )
    this.applyCardEffect(card, playerIndex)

    const updatedDeck = [...deck.slice(1), card]
    if (type === "chance") this.setState({ chanceDeck: updatedDeck })
    else this.setState({ communityChestDeck: updatedDeck })
  }

  public applyCardEffect(card: Card, playerIndex: number) {
    const effect = card.getEffect(this.state, playerIndex)
    const player = this.state.players[playerIndex]
    if (!player) return

    let newPlayers = [...this.state.players]
    let cashChange = effect.cashChange ?? 0
    let newPosition = player.position

    if (effect.jailFreeCard) {
      newPlayers = newPlayers.map((p, i) =>
        i === playerIndex ? { ...p, jailFreeCards: p.jailFreeCards + 1 } : p,
      )
    }

    if (effect.positionChange !== undefined) {
      if (effect.positionChange === "jail") {
        this.goToJail(playerIndex)
        return
      } else {
        newPosition = effect.positionChange
        if (effect.passGoBonus) cashChange += 200
      }
    }

    if (effect.collectFromEach) {
      const amount = effect.collectFromEach
      newPlayers = newPlayers.map((p, i) => {
        if (i === playerIndex) return p
        if (!p.bankrupt) {
          const payment = Math.min(p.cash, amount)
          cashChange += payment
          return { ...p, cash: p.cash - payment }
        }
        return p
      })
    }

    if (effect.payToEach) {
      const amount = effect.payToEach
      newPlayers = newPlayers.map((p, i) => {
        if (i === playerIndex) return p
        if (!p.bankrupt) {
          cashChange -= amount
          return { ...p, cash: p.cash + amount }
        }
        return p
      })
    }

    if (effect.perHouseCost || effect.perHotelCost) {
      const playerProperties = getPlayerProperties(this.state, playerIndex)
      let totalCost = 0
      let insuredSavings = 0
      playerProperties.forEach((prop) => {
        // Phase 3: Check if property is insured - insured properties don't pay repair costs
        if (this.isPropertyInsured(prop.id)) {
          if (prop.hotel) insuredSavings += effect.perHotelCost ?? 0
          else insuredSavings += prop.houses * (effect.perHouseCost ?? 0)
        } else {
          if (prop.hotel) totalCost += effect.perHotelCost ?? 0
          else totalCost += prop.houses * (effect.perHouseCost ?? 0)
        }
      })
      cashChange -= totalCost
      if (insuredSavings > 0) {
        this.addLogEntry(
          `${player.name} saved £${insuredSavings} thanks to property insurance!`,
          "system",
          playerIndex,
        )
      }
    }

    this.setState({
      players: newPlayers.map((p, i) =>
        i === playerIndex
          ? { ...p, position: newPosition, cash: p.cash + cashChange }
          : p,
      ),
      lastCardDrawn: card,
      // Set utility multiplier override if card specifies one
      utilityMultiplierOverride: effect.utilityMultiplier,
    })

    if (effect.triggerSpaceResolution) this.resolveSpace(playerIndex)
  }

  public checkBankruptcy(playerIndex: number) {
    const player = this.state.players[playerIndex]
    if (player && player.cash < 0) this.declareBankruptcy(playerIndex)
  }

  // Phase 3: Offer Chapter 11 restructuring before full bankruptcy
  public offerRestructuring(
    playerIndex: number,
    creditorIndex?: number,
    debtAmount?: number,
  ) {
    if (!this.state.settings.enableBankruptcyRestructuring) {
      this.declareBankruptcy(playerIndex, creditorIndex)
      return
    }

    const player = this.state.players[playerIndex]
    if (!player || player.inChapter11) {
      // Already in Chapter 11 or doesn't exist - proceed to full bankruptcy
      this.declareBankruptcy(playerIndex, creditorIndex)
      return
    }

    // Check if player has any assets to restructure with
    const hasAssets = player.properties.length > 0
    if (!hasAssets) {
      // No assets to restructure - proceed to full bankruptcy
      this.declareBankruptcy(playerIndex, creditorIndex)
      return
    }

    // Store pending bankruptcy info and offer restructuring choice
    this.setState({
      phase: "awaiting_bankruptcy_decision",
      pendingBankruptcy: {
        playerIndex,
        creditorIndex,
        debtAmount: debtAmount ?? Math.abs(player.cash),
      },
    })

    this.addLogEntry(
      `⚠️ ${player.name} is facing bankruptcy! They can choose Chapter 11 restructuring or declare full bankruptcy.`,
      "bankrupt",
      playerIndex,
    )
  }

  // Player chooses to enter Chapter 11 restructuring
  public enterChapter11() {
    const pending = (this.state as any).pendingBankruptcy
    if (!pending) return

    const { playerIndex, creditorIndex, debtAmount } = pending
    const player = this.state.players[playerIndex]
    if (!player) return

    const turnsToRepay = this.state.settings.chapter11Turns

    this.setState({
      players: this.state.players.map((p, i) =>
        i === playerIndex
          ? {
              ...p,
              inChapter11: true,
              chapter11TurnsRemaining: turnsToRepay,
              chapter11DebtTarget: debtAmount,
            }
          : p,
      ),
      phase: "resolving_space",
      pendingBankruptcy: null,
      // Clear trades involving this player during restructuring
      trade:
        this.state.trade &&
        (this.state.trade.offer.fromPlayer === playerIndex ||
          this.state.trade.offer.toPlayer === playerIndex)
          ? null
          : this.state.trade,
    })

    this.addLogEntry(
      `📋 ${player.name} entered Chapter 11 restructuring! They have ${turnsToRepay} turns to pay off £${debtAmount} or will be liquidated.`,
      "bankrupt",
      playerIndex,
    )
  }

  // Player chooses full bankruptcy instead of restructuring
  public declineRestructuring() {
    const pending = (this.state as any).pendingBankruptcy
    if (!pending) {
      console.warn(
        "[GameRoom] declineRestructuring called but no pending bankruptcy",
      )
      return
    }

    const { playerIndex, creditorIndex } = pending

    console.log(
      `[GameRoom] Player ${playerIndex} declining restructuring, declaring bankruptcy`,
    )

    this.setState({
      pendingBankruptcy: null,
      phase:
        this.state.phase === "awaiting_bankruptcy_decision"
          ? "resolving_space"
          : this.state.phase,
    })
    this.declareBankruptcy(playerIndex, creditorIndex)
  }

  // Check Chapter 11 status at end of turn
  public checkChapter11Status(playerIndex: number) {
    const player = this.state.players[playerIndex]
    if (!player || !player.inChapter11) return

    // Decrement turns remaining
    const newTurnsRemaining = player.chapter11TurnsRemaining - 1

    if (newTurnsRemaining <= 0) {
      // Time's up - check if they've paid off debt
      if (player.cash >= player.chapter11DebtTarget) {
        // Successfully emerged from Chapter 11
        this.setState({
          players: this.state.players.map((p, i) =>
            i === playerIndex
              ? {
                  ...p,
                  inChapter11: false,
                  chapter11TurnsRemaining: 0,
                  chapter11DebtTarget: 0,
                  cash: p.cash - p.chapter11DebtTarget,
                }
              : p,
          ),
        })
        this.addLogEntry(
          `🎉 ${player.name} successfully emerged from Chapter 11 restructuring!`,
          "bankrupt",
          playerIndex,
        )
      } else {
        // Failed to meet obligations - full liquidation
        this.addLogEntry(
          `💀 ${player.name} failed to meet Chapter 11 obligations and will be liquidated!`,
          "bankrupt",
          playerIndex,
        )
        this.declareBankruptcy(playerIndex)
      }
    } else {
      // Update turns remaining
      this.setState({
        players: this.state.players.map((p, i) =>
          i === playerIndex
            ? { ...p, chapter11TurnsRemaining: newTurnsRemaining }
            : p,
        ),
      })

      const progress = Math.round(
        (player.cash / player.chapter11DebtTarget) * 100,
      )
      this.addLogEntry(
        `📊 ${player.name} Chapter 11: ${newTurnsRemaining} turns left, ${progress}% of £${player.chapter11DebtTarget} target`,
        "system",
        playerIndex,
      )
    }
  }

  public declareBankruptcy(playerIndex: number, creditorIndex?: number) {
    const player = this.state.players[playerIndex]
    if (!player) return

    const playerPropertyIds = player.properties
    let housesToReturn = 0
    let hotelsToReturn = 0

    this.state.spaces.forEach((s) => {
      if (isProperty(s) && s.owner === playerIndex) {
        if (s.hotel) {
          hotelsToReturn += 1
        } else {
          housesToReturn += s.houses
        }
      }
    })

    this.setState({
      players: this.state.players.map((p, i) => {
        if (i === playerIndex)
          return {
            ...p,
            bankrupt: true,
            cash: 0,
            properties: [],
            inChapter11: false,
            chapter11TurnsRemaining: 0,
            chapter11DebtTarget: 0,
            // Hardening: Clear financial obligations
            bankLoans: [],
            totalDebt: 0,
            iousPayable: [],
            iousReceivable: [],
          }
        if (i === creditorIndex && creditorIndex !== undefined) {
          return {
            ...p,
            cash: p.cash + Math.max(0, player.cash),
            properties: [...p.properties, ...playerPropertyIds],
            jailFreeCards: p.jailFreeCards + player.jailFreeCards,
            // Hardening: Transfer receivables to creditor and update their creditorId
            iousReceivable: [
              ...p.iousReceivable.filter((iou) => iou.debtorId !== playerIndex),
              ...player.iousReceivable.map((iou) => ({
                ...iou,
                creditorId: creditorIndex,
              })),
            ],
          }
        }
        // Hardening: Update other players' IOUs
        const updatedPayable = p.iousPayable
          .map((iou) =>
            iou.creditorId === playerIndex && creditorIndex !== undefined
              ? { ...iou, creditorId: creditorIndex }
              : iou,
          )
          .filter(
            (iou) => iou.creditorId !== playerIndex || creditorIndex !== undefined,
          )

        const updatedReceivable = p.iousReceivable.filter(
          (iou) => iou.debtorId !== playerIndex,
        )

        return {
          ...p,
          iousPayable: updatedPayable,
          iousReceivable: updatedReceivable,
        }
      }),
      spaces: this.state.spaces.map((s) =>
        isProperty(s) && s.owner === playerIndex
          ? {
              ...s,
              owner: creditorIndex,
              houses: 0,
              hotel: false,
              mortgaged: false,
            }
          : s,
      ),
      availableHouses: this.state.availableHouses + housesToReturn,
      availableHotels: this.state.availableHotels + hotelsToReturn,
      // Hardening: Clear trade if the bankrupt player was involved
      trade:
        this.state.trade &&
        (this.state.trade.offer.fromPlayer === playerIndex ||
          this.state.trade.offer.toPlayer === playerIndex)
          ? null
          : this.state.trade,
      // Hardening: Handle auction if bankrupt player was involved
      auction:
        this.state.auction &&
        (this.state.auction.highestBidder === playerIndex ||
          this.state.auction.activePlayerIndex === playerIndex)
          ? null // Simplest: cancel auction. Better: skip them. For now, cancel to be safe.
          : this.state.auction,
      // Hardening: Reset phase if we were in a sub-phase for this player
      phase:
        this.state.phase === "auction" ||
        this.state.phase === "trading" ||
        this.state.phase === "awaiting_bankruptcy_decision" ||
        this.state.phase === "awaiting_rent_negotiation"
          ? "resolving_space"
          : this.state.phase,
    })
    this.addLogEntry(`${player.name} went bankrupt!`, "bankrupt", playerIndex)

    this.checkWinCondition()

    if (this.state.currentPlayerIndex === playerIndex) {
      this.endTurn()
    }
  }

  public checkWinCondition() {
    const activePlayers = this.state.players.filter((p) => !p.bankrupt)
    if (activePlayers.length === 1) {
      this.setState({ winner: activePlayers[0]!.id, phase: "game_over" })
    }
  }

  public startAuction(propertyId: number) {
    let startingBidder = this.state.currentPlayerIndex
    const property = this.state.spaces.find(
      (s) => s.id === propertyId,
    ) as Property
    // Starting bid is 10% of property value (minimum £10)
    const startingBid = Math.max(10, Math.floor((property?.price ?? 100) * 0.1))

    this.setState({
      auction: {
        propertyId,
        currentBid: 0, // No bid yet
        highestBidder: null,
        activePlayerIndex: startingBidder,
        passedPlayers: [],
      },
      phase: "auction",
    })
    this.addLogEntry(
      `🔨 Auction started for ${property?.name}! Minimum opening bid: £${startingBid}`,
      "auction",
    )
  }

  // Calculate minimum bid increment
  public getMinimumBid(propertyId: number): number {
    const auction = this.state.auction
    if (!auction) return 10

    const property = this.state.spaces.find(
      (s) => s.id === propertyId,
    ) as Property

    if (auction.currentBid === 0) {
      // Opening bid: 10% of property value (minimum £10)
      return Math.max(10, Math.floor((property?.price ?? 100) * 0.1))
    }

    // Minimum increment: 10% of current bid or £10, whichever is higher
    const minIncrement = Math.max(10, Math.floor(auction.currentBid * 0.1))
    return auction.currentBid + minIncrement
  }

  public placeBid(playerIndex: number, amount: number) {
    if (!this.state.auction) return

    const player = this.state.players[playerIndex]
    if (!player || player.bankrupt) return

    // CRITICAL: Only allow the active player to bid
    if (playerIndex !== this.state.auction.activePlayerIndex) {
      console.warn(
        `[GameRoom] Security: Player ${playerIndex} attempted to bid when active player is ${this.state.auction.activePlayerIndex}`,
      )
      this.addLogEntry(
        `It's not ${player.name}'s turn to bid`,
        "system",
        playerIndex,
      )
      return
    }

    const minimumBid = this.getMinimumBid(this.state.auction.propertyId)

    // Validate bid amount
    if (amount < minimumBid) {
      this.addLogEntry(
        `Bid must be at least £${minimumBid}`,
        "system",
        playerIndex,
      )
      return
    }

    // Check if player can afford the bid
    if (amount > player.cash) {
      this.addLogEntry(
        `${player.name} cannot afford £${amount} bid (has £${player.cash})`,
        "system",
        playerIndex,
      )
      return
    }

    // Find next active bidder
    let nextBidder = (playerIndex + 1) % this.state.players.length
    while (
      nextBidder !== playerIndex &&
      (this.state.players[nextBidder]?.bankrupt ||
        this.state.auction.passedPlayers.includes(nextBidder))
    ) {
      nextBidder = (nextBidder + 1) % this.state.players.length
    }

    this.setState({
      auction: {
        ...this.state.auction,
        currentBid: amount,
        highestBidder: playerIndex,
        activePlayerIndex: nextBidder,
      },
    })

    this.addLogEntry(`${player.name} bid £${amount}`, "auction", playerIndex)
  }

  public passAuction(playerIndex: number) {
    if (!this.state.auction) return

    const player = this.state.players[playerIndex]
    if (!player || player.bankrupt) return

    // CRITICAL: Only allow the active player to pass
    if (playerIndex !== this.state.auction.activePlayerIndex) {
      console.warn(
        `[GameRoom] Security: Player ${playerIndex} attempted to pass when active player is ${this.state.auction.activePlayerIndex}`,
      )
      this.addLogEntry(
        `It's not ${player.name}'s turn to bid`,
        "system",
        playerIndex,
      )
      return
    }

    if (player) {
      this.addLogEntry(`${player.name} passed`, "auction", playerIndex)
    }

    const passed = [...this.state.auction.passedPlayers, playerIndex]
    const activePlayers = this.state.players.filter(
      (p, i) => !p.bankrupt && !passed.includes(i),
    )

    if (activePlayers.length <= 1) {
      // If only one player left (or none), end auction
      this.endAuction()
    } else {
      // Find next active bidder
      let nextBidder = (playerIndex + 1) % this.state.players.length
      while (
        this.state.players[nextBidder]?.bankrupt ||
        passed.includes(nextBidder)
      ) {
        nextBidder = (nextBidder + 1) % this.state.players.length
      }

      this.setState({
        auction: {
          ...this.state.auction,
          passedPlayers: passed,
          activePlayerIndex: nextBidder,
        },
      })
    }
  }

  public endAuction() {
    const auction = this.state.auction
    if (!auction) return

    const property = this.state.spaces.find((s) => s.id === auction.propertyId)

    if (auction.highestBidder !== null && auction.currentBid > 0) {
      const winner = this.state.players[auction.highestBidder]!
      this.setState({
        spaces: this.state.spaces.map((s) =>
          s.id === auction.propertyId
            ? { ...s, owner: auction.highestBidder }
            : s,
        ),
        players: this.state.players.map((p, i) =>
          i === auction.highestBidder
            ? {
                ...p,
                cash: p.cash - auction.currentBid,
                properties: [...p.properties, auction.propertyId],
              }
            : p,
        ),
        auction: null,
        phase: "resolving_space",
      })
      this.addLogEntry(
        `🎉 ${winner.name} won ${property?.name} for £${auction.currentBid}!`,
        "auction",
      )
    } else {
      // No bids - property goes back to the bank
      this.setState({ auction: null, phase: "resolving_space" })
      this.addLogEntry(
        `No bids placed. ${property?.name} remains unowned.`,
        "auction",
      )
    }
  }

  public startTrade(fromPlayer: number, toPlayer: number) {
    this.setState({
      trade: {
        offer: {
          fromPlayer,
          toPlayer,
          cashOffered: 0,
          propertiesOffered: [],
          jailCardsOffered: 0,
          cashRequested: 0,
          propertiesRequested: [],
          jailCardsRequested: 0,
        },
        status: "draft",
        counterOffer: null,
        counterOfferMadeBy: null,
      },
      phase: "trading",
      previousPhase: this.state.phase,
    })
  }

  public updateTradeOffer(offer: TradeOffer) {
    this.setState({
      trade: this.state.trade ? { ...this.state.trade, offer } : null,
    })
  }

  public proposeTrade(offer: TradeOffer) {
    this.setState({
      trade: {
        offer,
        status: "pending",
        counterOffer: null,
        counterOfferMadeBy: null,
      },
      phase: "trading",
    })
  }

  private validateTradeOffer(offer: TradeOffer): { valid: boolean; error?: string } {
    const fromPlayer = this.state.players[offer.fromPlayer]
    const toPlayer = this.state.players[offer.toPlayer]

    if (!fromPlayer || !toPlayer) return { valid: false, error: "Invalid players" }

    // Check cash
    // ALLOW negative cash for receiving player if it's a gift or beneficial trade
    // BUT forbid giving more cash than they currently have if they are already negative
    if (offer.cashOffered > 0 && fromPlayer.cash < offer.cashOffered)
      return {
        valid: false,
        error: `${fromPlayer.name} has insufficient cash to offer`,
      }
    if (offer.cashRequested > 0 && toPlayer.cash < offer.cashRequested)
      return {
        valid: false,
        error: `${toPlayer.name} has insufficient cash to give`,
      }

    // Check jail cards
    if (fromPlayer.jailFreeCards < offer.jailCardsOffered)
      return {
        valid: false,
        error: `${fromPlayer.name} doesn't have enough Jail Free cards`,
      }
    if (toPlayer.jailFreeCards < offer.jailCardsRequested)
      return {
        valid: false,
        error: `${toPlayer.name} doesn't have enough Jail Free cards`,
      }

    // Check properties
    for (const propId of offer.propertiesOffered) {
      const prop = this.state.spaces.find((s) => s.id === propId) as
        | Property
        | undefined
      if (!prop || prop.owner !== offer.fromPlayer)
        return {
          valid: false,
          error: `${fromPlayer.name} no longer owns ${prop?.name || "property"}`,
        }
      if (prop.houses > 0 || prop.hotel)
        return {
          valid: false,
          error: `Cannot trade ${prop.name} because it has buildings`,
        }
    }

    for (const propId of offer.propertiesRequested) {
      const prop = this.state.spaces.find((s) => s.id === propId) as
        | Property
        | undefined
      if (!prop || prop.owner !== offer.toPlayer)
        return {
          valid: false,
          error: `${toPlayer.name} no longer owns ${prop?.name || "property"}`,
        }
      if (prop.houses > 0 || prop.hotel)
        return {
          valid: false,
          error: `Cannot trade ${prop.name} because it has buildings`,
        }
    }

    return { valid: true }
  }

  public acceptTrade() {
    const trade = this.state.trade
    if (!trade) return

    const validation = this.validateTradeOffer(trade.offer)
    if (!validation.valid) {
      this.addLogEntry(`Trade failed: ${validation.error}`, "system")
      this.setState({
        trade: null,
        phase: this.state.previousPhase ?? "resolving_space",
        previousPhase: null,
      })
      return
    }

    const { offer } = trade
    this.setState({
      players: this.state.players.map((p, i) => {
        if (i === offer.fromPlayer) {
          return {
            ...p,
            cash: p.cash - offer.cashOffered + offer.cashRequested,
            jailFreeCards:
              p.jailFreeCards -
              offer.jailCardsOffered +
              offer.jailCardsRequested,
            properties: [
              ...p.properties.filter(
                (id) => !offer.propertiesOffered.includes(id),
              ),
              ...offer.propertiesRequested,
            ],
          }
        }
        if (i === offer.toPlayer) {
          return {
            ...p,
            cash: p.cash - offer.cashRequested + offer.cashOffered,
            jailFreeCards:
              p.jailFreeCards -
              offer.jailCardsRequested +
              offer.jailCardsOffered,
            properties: [
              ...p.properties.filter(
                (id) => !offer.propertiesRequested.includes(id),
              ),
              ...offer.propertiesOffered,
            ],
          }
        }
        return p
      }),
      spaces: this.state.spaces.map((s) => {
        if (!isProperty(s)) return s
        if (offer.propertiesOffered.includes(s.id))
          return { ...s, owner: offer.toPlayer }
        if (offer.propertiesRequested.includes(s.id))
          return { ...s, owner: offer.fromPlayer }
        return s
      }),
      trade: null,
      phase: this.state.previousPhase ?? "resolving_space",
      previousPhase: null,
    })
    this.addLogEntry(`Trade completed!`, "trade")
  }

  public rejectTrade() {
    const trade = this.state.trade
    if (trade) {
      // If there's a counter-offer, rejecting it should go back to the original offer
      if (trade.status === "counter_pending" && trade.counterOffer) {
        this.setState({
          trade: {
            ...trade,
            counterOffer: null,
            counterOfferMadeBy: null,
            status: "pending",
          },
        })
        this.addLogEntry(
          `${this.state.players[trade.offer.fromPlayer]?.name} rejected the counter-offer. Original offer still pending.`,
          "trade",
          trade.offer.fromPlayer,
        )
        return
      }

      // Normal rejection
      const initiator = this.state.players[trade.offer.fromPlayer]
      if (initiator && initiator.isAI) {
        const newHistory = { ...(initiator.tradeHistory || {}) }
        trade.offer.propertiesRequested.forEach((propId) => {
          const key = `${trade.offer.toPlayer}-${propId}`
          const current = newHistory[key] || { attempts: 0, lastOffer: 0 }
          newHistory[key] = {
            attempts: current.attempts + 1,
            lastOffer: trade.offer.cashOffered,
          }
        })
        this.setState({
          players: this.state.players.map((p, i) =>
            i === trade.offer.fromPlayer
              ? { ...p, tradeHistory: newHistory }
              : p,
          ),
        })
      }
    }

    this.setState({
      trade: null,
      phase: this.state.previousPhase ?? "resolving_space",
      previousPhase: null,
    })
  }

  public cancelTrade() {
    this.setState({
      trade: null,
      phase: this.state.previousPhase ?? "resolving_space",
      previousPhase: null,
    })
  }

  public counterOffer(counterOffer: TradeOffer) {
    const trade = this.state.trade
    if (!trade || trade.status !== "pending") return

    // Only the receiver can make a counter-offer
    if (counterOffer.fromPlayer !== trade.offer.toPlayer) {
      console.warn("[GameRoom] Only the receiver can make a counter-offer")
      return
    }

    // Check if this player has already made a counter-offer
    if (trade.counterOfferMadeBy === counterOffer.fromPlayer) {
      console.warn("[GameRoom] Player has already made a counter-offer")
      return
    }

    // Validate counter-offer: receiver becomes the new initiator
    const receiver = this.state.players[counterOffer.fromPlayer]
    const originalInitiator = this.state.players[trade.offer.fromPlayer]

    if (!receiver || !originalInitiator) return

    // Validate cash amounts
    if (counterOffer.cashOffered > 0 && counterOffer.cashOffered > receiver.cash) {
      this.addLogEntry(
        `${receiver.name} doesn't have enough cash for counter-offer`,
        "system",
        counterOffer.fromPlayer,
      )
      return
    }

    if (counterOffer.cashRequested > 0 && counterOffer.cashRequested > originalInitiator.cash) {
      this.addLogEntry(
        `${originalInitiator.name} doesn't have enough cash for this counter-offer`,
        "system",
        counterOffer.fromPlayer,
      )
      return
    }

    // Validate properties (mortgaged properties are allowed - buyer assumes mortgage debt)
    const receiverProps = this.state.spaces.filter(
      (s) =>
        (s.type === "property" ||
          s.type === "railroad" ||
          s.type === "utility") &&
        (s as Property).owner === counterOffer.fromPlayer &&
        (s as Property).houses === 0 &&
        !(s as Property).hotel,
    )

    const initiatorProps = this.state.spaces.filter(
      (s) =>
        (s.type === "property" ||
          s.type === "railroad" ||
          s.type === "utility") &&
        (s as Property).owner === counterOffer.toPlayer &&
        (s as Property).houses === 0 &&
        !(s as Property).hotel,
    )

    // Check if all offered properties are valid
    const invalidOffered = counterOffer.propertiesOffered.some(
      (id) => !receiverProps.find((p) => p.id === id),
    )

    // Check if all requested properties are valid
    const invalidRequested = counterOffer.propertiesRequested.some(
      (id) => !initiatorProps.find((p) => p.id === id),
    )

    if (invalidOffered || invalidRequested) {
      this.addLogEntry(
        "Invalid properties in counter-offer",
        "system",
        counterOffer.fromPlayer,
      )
      return
    }

    // Update trade state with counter-offer
    this.setState({
      trade: {
        ...trade,
        counterOffer,
        counterOfferMadeBy: counterOffer.fromPlayer,
        status: "counter_pending",
      },
    })

    this.addLogEntry(
      `${receiver.name} made a counter-offer to ${originalInitiator.name}`,
      "trade",
      counterOffer.fromPlayer,
    )
  }

  public acceptCounterOffer() {
    const trade = this.state.trade
    if (!trade || trade.status !== "counter_pending" || !trade.counterOffer)
      return

    const validation = this.validateTradeOffer(trade.counterOffer)
    if (!validation.valid) {
      this.addLogEntry(`Counter-offer failed: ${validation.error}`, "system")
      this.setState({
        trade: null,
        phase: this.state.previousPhase ?? "resolving_space",
        previousPhase: null,
      })
      return
    }

    // The original initiator accepts the counter-offer
    // Execute the counter-offer (roles are reversed)
    const counterOffer = trade.counterOffer
    const originalInitiator = this.state.players[trade.offer.fromPlayer]
    const originalReceiver = this.state.players[trade.offer.toPlayer]

    if (!originalInitiator || !originalReceiver) return

    // Execute the counter-offer trade
    this.setState({
      players: this.state.players.map((p, i) => {
        if (i === counterOffer.fromPlayer) {
          // Original receiver gives what they offered
          return {
            ...p,
            cash:
              p.cash - counterOffer.cashOffered + counterOffer.cashRequested,
            jailFreeCards:
              p.jailFreeCards -
              counterOffer.jailCardsOffered +
              counterOffer.jailCardsRequested,
            properties: [
              ...p.properties.filter(
                (id) => !counterOffer.propertiesOffered.includes(id),
              ),
              ...counterOffer.propertiesRequested,
            ],
          }
        }
        if (i === counterOffer.toPlayer) {
          // Original initiator gives what was requested
          return {
            ...p,
            cash:
              p.cash - counterOffer.cashRequested + counterOffer.cashOffered,
            jailFreeCards:
              p.jailFreeCards -
              counterOffer.jailCardsRequested +
              counterOffer.jailCardsOffered,
            properties: [
              ...p.properties.filter(
                (id) => !counterOffer.propertiesRequested.includes(id),
              ),
              ...counterOffer.propertiesOffered,
            ],
          }
        }
        return p
      }),
      spaces: this.state.spaces.map((s) => {
        if (!isProperty(s)) return s
        if (counterOffer.propertiesOffered.includes(s.id))
          return { ...s, owner: counterOffer.toPlayer }
        if (counterOffer.propertiesRequested.includes(s.id))
          return { ...s, owner: counterOffer.fromPlayer }
        return s
      }),
      trade: null,
      phase: this.state.previousPhase ?? "resolving_space",
      previousPhase: null,
    })

    this.addLogEntry(
      `Counter-offer accepted! Trade completed between ${originalReceiver.name} and ${originalInitiator.name}`,
      "trade",
    )
  }

  public executeAITurn() {
    const player = this.state.players[this.state.currentPlayerIndex]
    console.log(
      `[GameRoom] executeAITurn called for ${player?.name} (index ${this.state.currentPlayerIndex}, phase ${this.state.phase})`,
    )
    executeAITurn(this.state, this)
  }

  public executeAITradeResponse() {
    executeAITradeResponse(this.state, this)
  }
}
