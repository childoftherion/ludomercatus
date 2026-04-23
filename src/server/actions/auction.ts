/**
 * Auction logic utilities
 * Pure functions for auction calculations and flow
 */

import type { Auction, Player } from "../../types/game"

/**
 * Calculate starting bid for an auction
 * @param propertyPrice - Current price of the property
 * @returns Starting bid (10% of property value, minimum $10)
 */
export function calculateStartingBid(propertyPrice: number): number {
  return Math.max(10, Math.floor(propertyPrice * 0.1))
}

/**
 * Calculate minimum bid for an auction
 * @param currentBid - Current highest bid (0 for opening bid)
 * @param propertyPrice - Current price of the property
 * @returns Minimum bid amount
 */
export function calculateMinimumBid(
  currentBid: number,
  propertyPrice: number,
): number {
  if (currentBid === 0) {
    // Opening bid: 10% of property value (minimum $10)
    return calculateStartingBid(propertyPrice)
  }

  // Minimum increment: 10% of current bid or $10, whichever is higher
  const minIncrement = Math.max(10, Math.floor(currentBid * 0.1))
  return currentBid + minIncrement
}

/**
 * Find the next active bidder in the auction
 * @param currentPlayerIndex - Current player index
 * @param players - All players in the game
 * @param passedPlayers - Array of player indices who have passed
 * @returns Next active bidder index
 */
export function findNextBidder(
  currentPlayerIndex: number,
  players: Player[],
  passedPlayers: number[],
): number {
  let nextBidder = (currentPlayerIndex + 1) % players.length
  while (
    nextBidder !== currentPlayerIndex &&
    (players[nextBidder]?.bankrupt || passedPlayers.includes(nextBidder))
  ) {
    nextBidder = (nextBidder + 1) % players.length
  }
  return nextBidder
}

/**
 * Check if auction should end
 * @param players - All players in the game
 * @param passedPlayers - Array of player indices who have passed
 * @returns Whether auction should end (only one or zero active players)
 */
export function shouldEndAuction(
  players: Player[],
  passedPlayers: number[],
): boolean {
  const activePlayers = players.filter(
    (p, i) => !p.bankrupt && !passedPlayers.includes(i),
  )
  return activePlayers.length <= 1
}

/**
 * Validate a bid
 * @param amount - Bid amount
 * @param minimumBid - Minimum allowed bid
 * @param playerCash - Player's available cash
 * @returns Whether bid is valid and error message if invalid
 */
export function validateBid(
  amount: number,
  minimumBid: number,
  playerCash: number,
): { valid: boolean; error?: string } {
  if (amount < minimumBid) {
    return { valid: false, error: `Bid must be at least $${minimumBid}` }
  }
  if (amount > playerCash) {
    return {
      valid: false,
      error: `Cannot afford $${amount} bid (has $${playerCash})`,
    }
  }
  return { valid: true }
}
