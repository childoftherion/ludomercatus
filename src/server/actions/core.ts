/**
 * Core game logic utilities
 * Pure functions for dice rolling, movement, and jail calculations
 */

import type { DiceRoll } from "../../types/game"

/**
 * Roll two dice and return the result
 */
export function rollDice(): DiceRoll {
  const die1 = Math.floor(Math.random() * 6) + 1
  const die2 = Math.floor(Math.random() * 6) + 1
  const total = die1 + die2
  const isDoubles = die1 === die2

  return { die1, die2, total, isDoubles }
}

/**
 * Calculate new position after moving steps
 * @param currentPosition - Current position on board (0-39)
 * @param steps - Number of steps to move
 * @returns New position and whether GO was passed
 */
export function calculateNewPosition(
  currentPosition: number,
  steps: number,
): { newPosition: number; passedGo: boolean } {
  const newPosition = (currentPosition + steps) % 40
  const passedGo = newPosition < currentPosition && steps > 0
  return { newPosition, passedGo }
}

/**
 * Check if player should go to jail for 3 consecutive doubles
 * @param consecutiveDoubles - Current count of consecutive doubles
 * @param isDoubles - Whether current roll is doubles
 * @returns Whether player should go to jail and new consecutive doubles count
 */
export function checkThreeDoubles(
  consecutiveDoubles: number,
  isDoubles: boolean,
): { shouldGoToJail: boolean; newConsecutiveDoubles: number } {
  const newConsecutiveDoubles = isDoubles ? consecutiveDoubles + 1 : 0
  const shouldGoToJail = newConsecutiveDoubles >= 3
  return { shouldGoToJail, newConsecutiveDoubles }
}

/**
 * Calculate jail turns and whether player is forced to pay
 * @param currentJailTurns - Current number of turns spent in jail
 * @param isDoubles - Whether player rolled doubles
 * @returns Whether player must pay, stays in jail, or gets out
 */
export function calculateJailOutcome(
  currentJailTurns: number,
  isDoubles: boolean,
): { mustPay: boolean; staysInJail: boolean; getsOut: boolean; newJailTurns: number } {
  if (isDoubles) {
    return { mustPay: false, staysInJail: false, getsOut: true, newJailTurns: 0 }
  }

  const newJailTurns = currentJailTurns + 1
  if (newJailTurns >= 3) {
    return { mustPay: true, staysInJail: false, getsOut: true, newJailTurns: 0 }
  }

  return { mustPay: false, staysInJail: true, getsOut: false, newJailTurns }
}
