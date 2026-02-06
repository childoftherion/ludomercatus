import { describe, test, expect, beforeEach } from "bun:test"
import { GameRoom } from "./GameRoom"
import type { Property } from "../types/game"

let room: GameRoom

beforeEach(() => {
  room = new GameRoom()
})

const setupGame = (playerCount: number = 2) => {
  const names = Array.from({ length: playerCount }, (_, i) => `Player ${i + 1}`)
  const tokens = Array.from({ length: playerCount }, (_, i) => `Token${i + 1}`)
  room.initGame(names, tokens)
}

describe("Game Logic (Server)", () => {
  test("initGame creates players", () => {
    setupGame(4)
    const state = room.state
    expect(state.players.length).toBe(4)
    expect(state.phase).toBe("rolling")
    expect(state.currentPlayerIndex).toBe(0)
    expect(state.players[0]!.cash).toBe(1500)
  })

  test("rollDice updates state", () => {
    setupGame()
    const roll = room.rollDice()
    expect(roll).toBeDefined()
    expect(room.state.diceRoll).toEqual(roll)
    expect(room.state.lastDiceRoll).toEqual(roll)
  })

  test("movePlayer updates position", () => {
    setupGame()
    room.movePlayer(0, 5)
    expect(room.state.players[0]!.position).toBe(5)
  })

  test("buyProperty updates ownership", () => {
    setupGame()
    // Move to a property (e.g. 1)
    room.movePlayer(0, 1) // Old Kent Road / Mediterranean
    expect(room.state.phase).toBe("awaiting_buy_decision")

    room.buyProperty(1)
    expect((room.state.spaces[1] as Property).owner).toBe(0)
    expect(room.state.players[0]!.cash).toBeLessThan(1500)
    expect(room.state.phase).toBe("resolving_space")
  })

  test("rent calculation and payment", () => {
    setupGame()
    // P1 buys property 1
    room.movePlayer(0, 1)
    room.buyProperty(1)
    room.endTurn()

    // P2 lands on property 1
    const p1Cash = room.state.players[0]!.cash
    const p2Cash = room.state.players[1]!.cash

    room.movePlayer(1, 1) // Land on 1

    // Rent should be paid automatically if not mortgaged
    expect(room.state.players[1]!.cash).toBeLessThan(p2Cash)
    expect(room.state.players[0]!.cash).toBeGreaterThan(p1Cash)
  })

  test("utility rent rounding with value multiplier", () => {
    setupGame()
    // Give P0 utility 12 (Electric Company)
    const electricCo = room.state.spaces[12] as Property
    room.state.spaces[12] = { ...electricCo, owner: 0, valueMultiplier: 1.05 } as any
    room.state.players[0]!.properties.push(12)
    
    // P2 lands on utility 12 with a dice roll of 7
    room.state.currentPlayerIndex = 1
    room.state.diceRoll = { die1: 3, die2: 4, total: 7, isDoubles: false }
    
    const p1CashBefore = room.state.players[0]!.cash
    const p2CashBefore = room.state.players[1]!.cash
    
    room.movePlayer(1, 12)
    
    // Rent calculation: 7 * 4 = 28. 
    // Multiplied by 1.05 = 29.4
    // Rounded should be 29
    const rentPaid = p2CashBefore - room.state.players[1]!.cash
    expect(rentPaid).toBe(29)
    expect(room.state.players[0]!.cash).toBe(p1CashBefore + 29)
  })

  test("IOU interest rounding", () => {
    setupGame()
    // P0 owes P1 an IOU of £100 at 5% interest
    room.state.players[0]!.iousPayable = [{
      id: 1,
      creditorId: 1,
      debtorId: 0,
      originalAmount: 100,
      currentAmount: 100,
      interestRate: 0.05,
      turnCreated: 0,
      reason: "rent"
    }]
    room.state.players[1]!.iousReceivable = [room.state.players[0]!.iousPayable[0]!]
    
    // 3 rounds pass
    room.state.roundsCompleted = 3
    
    // Interest calculation: 100 * 0.05 * 3 = 15
    // Total owed: 115
    
    // Force state refresh
    room.payIOU(0, 1, 50)
    
    // P0 pays £50. 115 - 50 = 65 remaining
    const iou = room.state.players[0]!.iousPayable[0]
    expect(iou?.currentAmount).toBe(65)
  })

  test("jail logic", () => {
    setupGame()
    room.goToJail(0)
    expect(room.state.players[0]!.inJail).toBe(true)
    expect(room.state.players[0]!.position).toBe(10)
  })

  test("building houses requires monopoly", () => {
    setupGame()
    // Give P0 a monopoly on brown (1, 3)
    room.state.spaces[1] = { ...room.state.spaces[1], owner: 0 } as any
    room.state.spaces[3] = { ...room.state.spaces[3], owner: 0 } as any

    // Try to build
    room.buildHouse(1)
    expect((room.state.spaces[1] as Property).houses).toBe(1)
  })

  test("authorizeAction blocks out-of-turn rollDice", () => {
    setupGame()
    room.state.players[0] = { ...room.state.players[0]!, clientId: "A" } as any
    room.state.players[1] = { ...room.state.players[1]!, clientId: "B" } as any

    const result = (room as any).authorizeAction("B", "rollDice", [])
    expect(result.allowed).toBe(false)
  })

  test("authorizeAction enforces movePlayer payload and dice total", () => {
    setupGame()
    room.state.players[0] = { ...room.state.players[0]!, clientId: "A" } as any
    room.state.players[1] = { ...room.state.players[1]!, clientId: "B" } as any

    const roll = room.rollDice()
    expect(roll).toBeDefined()

    const badSteps = (room as any).authorizeAction("A", "movePlayer", [
      0,
      roll.total + 1,
    ])
    expect(badSteps.allowed).toBe(false)

    const badPlayer = (room as any).authorizeAction("A", "movePlayer", [
      1,
      roll.total,
    ])
    expect(badPlayer.allowed).toBe(false)

    const good = (room as any).authorizeAction("A", "movePlayer", [
      0,
      roll.total,
    ])
    expect(good.allowed).toBe(true)
  })

  test("authorizeAction only allows host to trigger AI", () => {
    setupGame()
    room.state.players[0] = { ...room.state.players[0]!, clientId: "A" } as any
    room.state.players[1] = { ...room.state.players[1]!, isAI: true } as any
    room.state.currentPlayerIndex = 1

    const denied = (room as any).authorizeAction("B", "executeAITurn", [])
    expect(denied.allowed).toBe(false)

    const allowed = (room as any).authorizeAction("A", "executeAITurn", [])
    expect(allowed.allowed).toBe(true)
  })
})
