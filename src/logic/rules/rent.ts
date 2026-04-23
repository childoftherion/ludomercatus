import type { GameState, Property } from '../../types/game'
import { hasMonopoly, getPlayerProperties } from './monopoly'
import { applyRentEventModifier } from './economics'

/** All utility spaces on the current board (used for 4x vs 10x dice multiplier). */
export const countUtilitySpacesOnBoard = (state: GameState): number =>
  state.spaces.filter(s => s.type === 'utility').length

/**
 * Monopoly-style utility dice multiplier: 4× dice if the owner holds at least one
 * utility but not all on the board; 10× dice if they hold every utility space.
 */
export const getUtilityDiceMultiplier = (
  state: GameState,
  ownerIndex: number,
): number => {
  const totalOnBoard = countUtilitySpacesOnBoard(state)
  if (totalOnBoard <= 0) return 4

  const utilitiesOwned = getPlayerProperties(state, ownerIndex).filter(
    p => p.type === 'utility',
  ).length

  return utilitiesOwned >= totalOnBoard ? 10 : 4
}

/**
 * When a utility is unowned, the landing fee uses the single-utility rate (4× dice)
 * and is paid to the Jackpot (see GameRoom.resolveSpace). Same economic modifiers
 * as normal utility rent, without a landlord Chapter 11 reduction.
 */
export const calculateUnownedUtilityLandingFee = (
  state: GameState,
  diceTotal: number,
  property: Property,
): number => {
  if (property.type !== 'utility') return 0

  const safeDice = Number.isFinite(diceTotal) ? diceTotal : 0
  let fee = safeDice * 4

  fee = applyRentEventModifier(state, fee)

  if (
    state.settings?.enablePropertyValueFluctuation &&
    property.valueMultiplier !== 1.0
  ) {
    fee = Math.round(fee * property.valueMultiplier)
  }

  const rounded = Math.max(0, Math.round(fee))
  return Number.isFinite(rounded) ? rounded : 0
}

export const calculateRent = (
  state: GameState,
  property: Property,
  diceTotal: number,
): number => {
  if (property.owner === undefined) return 0
  if (property.mortgaged) return 0

  const safeDice = Number.isFinite(diceTotal) ? diceTotal : 0

  let rent = 0

  if (property.type === 'property') {
    if (property.hotel) rent = property.rents[5] ?? 0
    else if (property.houses > 0) rent = property.rents[property.houses] ?? 0
    else {
      rent = property.baseRent
      if (
        property.colorGroup &&
        hasMonopoly(state, property.owner, property.colorGroup)
      ) {
        rent *= 2
      }
    }
  } else if (property.type === 'railroad') {
    const ownerProps = getPlayerProperties(state, property.owner)
    const railroadsOwned = ownerProps.filter(p => p.type === 'railroad').length
    rent = property.baseRent * Math.pow(2, Math.max(0, railroadsOwned - 1))
  } else if (property.type === 'utility') {
    // Card override (e.g. "Advance to nearest Utility"): must ignore null AND undefined;
    // `undefined !== null` is true and would produce NaN (dice * undefined).
    const override = state.utilityMultiplierOverride
    if (override != null && Number.isFinite(override)) {
      rent = safeDice * override
    } else {
      const multiplier = getUtilityDiceMultiplier(state, property.owner)
      rent = safeDice * multiplier
    }
  }

  rent = applyRentEventModifier(state, rent)

  if (!Number.isFinite(rent)) rent = 0

  // Phase 3: Apply property value multiplier (appreciation/depreciation)
  if (
    state.settings?.enablePropertyValueFluctuation &&
    property.valueMultiplier !== 1.0
  ) {
    rent = Math.round(rent * property.valueMultiplier)
  }

  // Phase 3: Chapter 11 Rent Reduction
  // Players in Chapter 11 restructuring collect reduced rent (typically 50%)
  const owner = state.players[property.owner]
  if (owner?.inChapter11) {
    rent = Math.round(rent * 0.5)
  }

  const rounded = Math.max(0, Math.round(rent))
  return Number.isFinite(rounded) ? rounded : 0
}
