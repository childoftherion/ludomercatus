/**
 * Multiplayer logic utilities
 * Pure functions for player connection, reconnection, and assignment
 */

import type { Player } from "../../types/game"

/**
 * Check if a player can claim an AI seat
 * @param player - The player to check
 * @param clientId - The requesting client ID
 * @returns Whether the seat can be claimed
 */
export function canClaimAiSeat(player: Player, clientId: string): boolean {
  return (
    player.isAI &&
    (!player.isConnected ||
      player.clientId === null ||
      player.clientId === clientId ||
      player.previousClientId === clientId)
  )
}

/**
 * Check if a player can claim a human seat
 * @param player - The player to check
 * @param clientId - The requesting client ID
 * @returns Whether the seat can be claimed
 */
export function canClaimHumanSeat(player: Player, clientId: string): boolean {
  return !player.isAI && (!player.isConnected || player.clientId === clientId)
}

/**
 * Check if a player can be claimed
 * @param player - The player to check
 * @param clientId - The requesting client ID
 * @returns Whether the player can be claimed
 */
export function canClaimPlayer(player: Player, clientId: string): boolean {
  return canClaimAiSeat(player, clientId) || canClaimHumanSeat(player, clientId)
}

/**
 * Find player index by client ID or previous client ID
 * @param players - All players
 * @param clientId - Client ID to search for
 * @returns Player index or -1 if not found
 */
export function findPlayerIndexByClientId(
  players: Player[],
  clientId: string,
): number {
  return players.findIndex(
    (p) => p.clientId === clientId || p.previousClientId === clientId,
  )
}

/**
 * Create a disconnected player state
 * @param player - Current player state
 * @returns Updated player with disconnected state
 */
export function createDisconnectedPlayer(player: Player): Player {
  return { ...player, isConnected: false }
}

/**
 * Create an AI player state from a disconnected human
 * @param player - Current player state
 * @param aiDifficulty - AI difficulty level
 * @returns Updated player with AI state
 */
export function createAiPlayer(
  player: Player,
  aiDifficulty: "easy" | "medium" | "hard" = "medium",
): Player {
  return {
    ...player,
    isAI: true,
    aiDifficulty,
    previousClientId: player.clientId,
    clientId: null,
    isConnected: false,
  }
}

/**
 * Create a reconnected player state
 * @param player - Current player state
 * @param clientId - New client ID
 * @returns Updated player with reconnected state
 */
export function createReconnectedPlayer(
  player: Player,
  clientId: string,
): Player {
  return {
    ...player,
    isAI: false,
    aiDifficulty: null,
    isConnected: true,
    clientId,
    previousClientId: null,
  }
}

/**
 * Check if a player seat is taken by another client
 * @param player - The player to check
 * @param clientId - The requesting client ID
 * @returns Whether the seat is taken by another client
 */
export function isSeatTakenByAnother(
  player: Player,
  clientId: string,
): boolean {
  return player.clientId !== null && player.clientId !== clientId
}
