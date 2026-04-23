/**
 * Trade logic utilities
 * Pure functions for trade validation and calculations
 */

import type { TradeOffer, Player, Property, Space } from "../../types/game"

/**
 * Validate a trade offer
 * @param offer - The trade offer to validate
 * @param fromPlayer - The player offering the trade
 * @param toPlayer - The player receiving the trade offer
 * @param spaces - All spaces on the board
 * @returns Validation result with error message if invalid
 */
export function validateTradeOffer(
  offer: TradeOffer,
  fromPlayer: Player,
  toPlayer: Player,
  spaces: Space[],
): { valid: boolean; error?: string } {
  if (!fromPlayer || !toPlayer) return { valid: false, error: "Invalid players" }

  // Check cash
  if (offer.cashOffered > 0 && fromPlayer.cash < offer.cashOffered) {
    return {
      valid: false,
      error: `${fromPlayer.name} has insufficient cash to offer`,
    }
  }
  if (offer.cashRequested > 0 && toPlayer.cash < offer.cashRequested) {
    return {
      valid: false,
      error: `${toPlayer.name} has insufficient cash to give`,
    }
  }

  // Check jail cards
  if (fromPlayer.jailFreeCards < offer.jailCardsOffered) {
    return {
      valid: false,
      error: `${fromPlayer.name} doesn't have enough Jail Free cards`,
    }
  }
  if (toPlayer.jailFreeCards < offer.jailCardsRequested) {
    return {
      valid: false,
      error: `${toPlayer.name} doesn't have enough Jail Free cards`,
    }
  }

  // Check properties and color group buildings
  for (const propId of offer.propertiesOffered) {
    const result = checkPropertyValid(propId, offer.fromPlayer, fromPlayer.name, spaces)
    if (!result.valid) return result
  }

  for (const propId of offer.propertiesRequested) {
    const result = checkPropertyValid(propId, offer.toPlayer, toPlayer.name, spaces)
    if (!result.valid) return result
  }

  return { valid: true }
}

/**
 * Check if a property can be traded
 * @param propId - Property ID to check
 * @param ownerIndex - Expected owner index
 * @param ownerName - Owner name for error messages
 * @param spaces - All spaces on the board
 * @returns Validation result
 */
function checkPropertyValid(
  propId: number,
  ownerIndex: number,
  ownerName: string,
  spaces: Space[],
): { valid: boolean; error?: string } {
  const prop = spaces.find((s) => s.id === propId) as Property | undefined
  if (!prop || prop.owner !== ownerIndex) {
    return {
      valid: false,
      error: `${ownerName} no longer owns ${prop?.name || "property"}`,
    }
  }

  // Standard Monopoly rules: Cannot trade a property if ANY property in its color group has buildings
  if (prop.colorGroup) {
    const groupProps = spaces.filter(
      (s): s is Property => isProperty(s) && s.colorGroup === prop.colorGroup,
    )
    const hasBuildingsInGroup = groupProps.some((p) => p.houses > 0 || p.hotel)
    if (hasBuildingsInGroup) {
      return {
        valid: false,
        error: `Cannot trade ${prop.name} because its color group has buildings. Sell all buildings first.`,
      }
    }
  } else {
    // For railroads/utilities without color groups
    if (prop.houses > 0 || prop.hotel) {
      return {
        valid: false,
        error: `Cannot trade ${prop.name} because it has buildings`,
      }
    }
  }
  return { valid: true }
}

/**
 * Type guard for property spaces
 */
function isProperty(space: Space): space is Property {
  return space.type === "property" || space.type === "railroad" || space.type === "utility"
}

/**
 * Generate a trade history key for tracking repeated offers
 * @param toPlayer - Player receiving the offer
 * @param propertyIds - Property IDs being requested
 * @returns Trade history key
 */
export function generateTradeHistoryKey(toPlayer: number, propertyIds: number[]): string {
  const sortedIds = [...propertyIds].sort((a, b) => a - b)
  return `${toPlayer}-set:${sortedIds.join(",")}`
}

/**
 * Check if trade roles were swapped
 * @param newOffer - New trade offer
 * @param oldFromPlayer - Original from player index
 * @returns Whether roles were swapped
 */
export function areRolesSwapped(newOffer: TradeOffer, oldFromPlayer: number): boolean {
  return newOffer.fromPlayer !== oldFromPlayer
}
