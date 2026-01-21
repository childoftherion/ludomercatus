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
