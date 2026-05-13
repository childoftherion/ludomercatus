/**
 * Core game logic utilities
 * Pure functions for dice rolling, movement, and jail calculations
 */

import type { DiceRoll } from "../../types/game";

/**
 * Roll two dice and return the result
 */
export function rollDice(): DiceRoll {
  const die1 = Math.floor(Math.random() * 6) + 1;
  const die2 = Math.floor(Math.random() * 6) + 1;
  const total = die1 + die2;
  const isDoubles = die1 === die2;

  return { die1, die2, total, isDoubles };
}

/**
 * Calculate new position after moving steps.
 * Supports both 40-space (classic) and 48-space (1906) boards.
 * @param currentPosition - Current position on board
 * @param steps - Number of steps to move
 * @param boardSize - Total number of spaces on the board (40 or 48)
 * @returns New position and whether GO/Mother Earth was passed
 */
export function calculateNewPosition(
  currentPosition: number,
  steps: number,
  boardSize: number = 40,
): { newPosition: number; passedGo: boolean } {
  const newPosition = (currentPosition + steps) % boardSize;
  const passedGo = newPosition < currentPosition && steps > 0;
  return { newPosition, passedGo };
}

/**
 * Calculate backward movement (for 1906 backward movement between chances).
 * Used when a player lands on a Chance space that sends them backward.
 * @param currentPosition - Current position on board
 * @param steps - Number of steps to move backward (negative value)
 * @param boardSize - Total number of spaces on the board (40 or 48)
 * @returns New position and whether GO/Mother Earth was passed
 */
export function calculateBackwardPosition(
  currentPosition: number,
  steps: number,
  boardSize: number = 40,
): { newPosition: number; passedGo: boolean } {
  const newPosition =
    (((currentPosition - steps) % boardSize) + boardSize) % boardSize;
  // When moving backward, "passing GO" means wrapping around the end
  const passedGo = newPosition > currentPosition && steps > 0;
  return { newPosition, passedGo };
}

/**
 * Get the position of the "GO" / "Mother Earth" space for a given ruleset.
 * In classic: position 0 (GO). In 1906: position 0 (Mother Earth).
 */
export function getGoPosition(): number {
  return 0;
}

/**
 * Check if a space is a railroad.
 * For 1906: railroads are at positions 7, 18, 30, 41.
 * For classic: railroads are at positions 5, 15, 25, 35.
 */
export function isRailroadSpace(position: number, boardSize: number): boolean {
  if (boardSize === 48) {
    // 1906 railroads
    return [7, 18, 30, 41].includes(position);
  }
  // Classic railroads
  return [5, 15, 25, 35].includes(position);
}

/**
 * Calculate 1906 doubles railroad pass movement.
 * When a player rolls doubles and passes a railroad, they move to the next railroad.
 * @param currentPosition - Current position
 * @param boardSize - Total number of spaces (48 for 1906)
 * @returns New position after railroad pass, or original position if no pass
 */
export function calculateDoublesRailroadPass(
  currentPosition: number,
  boardSize: number = 48,
): number {
  const railroads = [7, 18, 30, 41];

  // Find the next railroad after current position
  for (const railroad of railroads) {
    if (railroad > currentPosition) {
      return railroad;
    }
  }

  // Wrap around to the first railroad
  return railroads[0]!;
}

/**
 * Find the previous Chance space position for 1906 backward movement.
 * In 1906, Chance spaces are at positions 5, 15, 22, 33.
 * When a card says "go backward to the next Chance", this finds it.
 */
export function findPreviousChancePosition(
  currentPosition: number,
  boardSize: number = 48,
): number {
  const chancePositions = [5, 15, 22, 33];

  // Find the previous chance (going backward from current position)
  for (let i = chancePositions.length - 1; i >= 0; i--) {
    if (chancePositions[i]! < currentPosition) {
      return chancePositions[i]!;
    }
  }

  // If already at the first chance, wrap around to the last
  return chancePositions[chancePositions.length - 1]!;
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
  const newConsecutiveDoubles = isDoubles ? consecutiveDoubles + 1 : 0;
  const shouldGoToJail = newConsecutiveDoubles >= 3;
  return { shouldGoToJail, newConsecutiveDoubles };
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
): {
  mustPay: boolean;
  staysInJail: boolean;
  getsOut: boolean;
  newJailTurns: number;
} {
  if (isDoubles) {
    return {
      mustPay: false,
      staysInJail: false,
      getsOut: true,
      newJailTurns: 0,
    };
  }

  const newJailTurns = currentJailTurns + 1;
  if (newJailTurns >= 3) {
    return {
      mustPay: true,
      staysInJail: false,
      getsOut: true,
      newJailTurns: 0,
    };
  }

  return { mustPay: false, staysInJail: true, getsOut: false, newJailTurns };
}
