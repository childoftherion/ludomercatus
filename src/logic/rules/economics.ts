import type {
  GameState,
  Player,
  Property,
  MarketHistoryEntry,
} from '../../types/game'

const isProperty = (space: any): space is Property => {
  return (
    space.type === 'property' ||
    space.type === 'railroad' ||
    space.type === 'utility'
  )
}

/** Check if an economic event is currently active */
export const isEconomicEventActive = (state: GameState, type: string): boolean => {
  return state.activeEconomicEvents?.some(e => e.type === type) ?? false
}

/**
 * Apply economic event modifiers to a rent amount.
 * Centralizes rent-affecting event logic so rent.ts and GameRoom stay consistent.
 */
export const applyRentEventModifier = (state: GameState, rent: number): number => {
  if (isEconomicEventActive(state, 'recession')) return Math.round(rent * 0.75)
  if (isEconomicEventActive(state, 'market_crash')) return Math.round(rent * 0.8)
  if (isEconomicEventActive(state, 'market_crash_1')) return Math.round(rent * 0.85)
  if (isEconomicEventActive(state, 'market_crash_2')) return Math.round(rent * 1.15)
  if (isEconomicEventActive(state, 'bull_market')) return Math.round(rent * 1.2)
  return rent
}

/**
 * Apply economic event modifiers to a property price.
 * Centralizes price-affecting event logic for getCurrentPropertyPrice and similar callers.
 */
export const applyPriceEventModifier = (state: GameState, price: number): number => {
  if (isEconomicEventActive(state, 'market_crash')) return Math.round(price * 0.8)
  if (isEconomicEventActive(state, 'market_crash_1')) return Math.round(price * 1.15)
  if (isEconomicEventActive(state, 'market_crash_2')) return Math.round(price * 0.85)
  if (isEconomicEventActive(state, 'bull_market')) return Math.round(price * 1.2)
  return Math.round(price)
}

/**
 * Get the current market price of a property, accounting for economic events
 */
export const getCurrentPropertyPrice = (
  state: GameState,
  property: Property,
): number => {
  const basePrice = property.price * property.valueMultiplier
  return applyPriceEventModifier(state, basePrice)
}

/**
 * Calculate the net worth of a player
 * Net Worth = Cash
 *           + Σ(Property Prices)
 *           - Σ(Mortgage Values for mortgaged properties)
 *           + Σ(Houses × BuildingCost / 2)
 *           + Σ(Hotels × BuildingCost / 2)
 *
 * Note: Houses/Hotels are valued at half their cost (liquidation value)
 */
export const calculateNetWorth = (
  state: GameState,
  playerIndex: number,
): number => {
  const player = state.players[playerIndex]
  if (!player) return 0

  let netWorth = player.cash

  // Get all properties owned by this player
  const ownedProperties = state.spaces.filter(
    (s): s is Property => isProperty(s) && s.owner === playerIndex,
  )

  for (const property of ownedProperties) {
    if (property.mortgaged) {
      // Mortgaged properties contribute their mortgage value (already received)
      // But we don't add the full price, just the equity remaining
      // Actually, for net worth, we should show the property value minus the mortgage debt
      // The mortgage value is what they'd get if they mortgage, but if already mortgaged,
      // they have that cash already. The property's "value" in net worth is the unmortgage cost.
      // Simpler approach: property value = price, minus mortgage value if mortgaged
      const effectivePrice = getCurrentPropertyPrice(state, property)
      netWorth += effectivePrice - property.mortgageValue
    } else {
      // Unmortgaged property at full price (adjusted for value fluctuation)
      const effectivePrice = getCurrentPropertyPrice(state, property)
      netWorth += effectivePrice
    }

    // Add building values at liquidation price (50% of cost)
    if (property.buildingCost) {
      if (property.hotel) {
        // Hotel = 5 buildings worth (4 houses + 1 hotel upgrade)
        netWorth += Math.floor((property.buildingCost * 5) / 2)
      } else if (property.houses > 0) {
        netWorth += Math.floor((property.buildingCost * property.houses) / 2)
      }
    }
  }

  // Add value of jail free cards (estimated at £50 each)
  netWorth += player.jailFreeCards * 50

  return Math.round(netWorth)
}

/**
 * Calculate 10% of net worth for progressive income tax
 */
export const calculateTenPercentTax = (
  state: GameState,
  playerIndex: number,
): number => {
  const netWorth = calculateNetWorth(state, playerIndex)
  return Math.floor(netWorth * 0.1)
}

/**
 * Get the optimal tax choice for a player
 * Returns the lower of: £200 flat tax OR 10% of net worth
 */
export const getOptimalTaxChoice = (
  state: GameState,
  playerIndex: number,
): { choice: 'flat' | 'percentage'; amount: number } => {
  const tenPercent = calculateTenPercentTax(state, playerIndex)
  const flatTax = 200

  if (tenPercent < flatTax) {
    return { choice: 'percentage', amount: tenPercent }
  }
  return { choice: 'flat', amount: flatTax }
}

/**
 * Calculate the current GO salary based on inflation
 * Base: £200, increases by £25 every 2 full rounds, capped at £350
 */
export const calculateGoSalary = (roundsCompleted: number): number => {
  const BASE_SALARY = 200
  const INCREMENT = 25
  const MAX_SALARY = 350
  const ROUNDS_PER_INCREMENT = 2

  const increments = Math.floor(roundsCompleted / ROUNDS_PER_INCREMENT)
  const salary = BASE_SALARY + increments * INCREMENT

  return Math.min(salary, MAX_SALARY)
}

/**
 * Get all players sorted by net worth (descending)
 */
export const getNetWorthRanking = (
  state: GameState,
): Array<{
  playerIndex: number
  name: string
  netWorth: number
  rank: number
}> => {
  const rankings = state.players
    .map((player, index) => ({
      playerIndex: index,
      name: player.name,
      netWorth: player.bankrupt ? 0 : calculateNetWorth(state, index),
      rank: 0,
    }))
    .sort((a, b) => b.netWorth - a.netWorth)

  // Assign ranks (handling ties)
  let currentRank = 1
  for (let i = 0; i < rankings.length; i++) {
    if (i > 0 && rankings[i]!.netWorth < rankings[i - 1]!.netWorth) {
      currentRank = i + 1
    }
    rankings[i]!.rank = currentRank
  }

  return rankings
}

/**
 * Calculate total money in circulation (for economic statistics)
 */
export const calculateMoneyInCirculation = (state: GameState): number => {
  return state.players.reduce((total, player) => total + player.cash, 0)
}

/**
 * Get latest market history entry.
 */
export const getLatestMarketHistoryEntry = (
  marketHistory: MarketHistoryEntry[],
) => {
  return marketHistory[marketHistory.length - 1] ?? null
}

/**
 * Get previous market history entry.
 */
export const getPreviousMarketHistoryEntry = (
  marketHistory: MarketHistoryEntry[],
) => {
  return marketHistory[marketHistory.length - 2] ?? null
}

export type MarketHistoryTrendDirection = 'up' | 'down' | 'flat'

export interface InflationTrend {
  direction: MarketHistoryTrendDirection
  delta: number
  percentage: number
}

/**
 * Compute the inflation trend from market history.
 */
export const getInflationTrendFromHistory = (
  marketHistory: MarketHistoryEntry[],
): InflationTrend => {
  const latest = getLatestMarketHistoryEntry(marketHistory)
  const previous = getPreviousMarketHistoryEntry(marketHistory)

  if (!latest || !previous) {
    return { direction: 'flat', delta: 0, percentage: 0 }
  }

  const delta = latest.inflation - previous.inflation
  const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'
  const base = previous.inflation === 0 ? 1 : previous.inflation

  return {
    direction,
    delta,
    percentage: (delta / base) * 100,
  }
}

/**
 * Read the most recent money-in-circulation snapshot from market history.
 */
export const getMoneyInCirculationFromHistory = (
  marketHistory: MarketHistoryEntry[],
): number | null => {
  return getLatestMarketHistoryEntry(marketHistory)?.moneyInCirculation ?? null
}

/**
 * Calculate Gini coefficient for wealth inequality (0 = perfect equality, 1 = perfect inequality)
 */
export const calculateGiniCoefficient = (state: GameState): number => {
  const activePlayers = state.players.filter(p => !p.bankrupt)
  if (activePlayers.length <= 1) return 0

  const netWorths = activePlayers
    .map((_, i) =>
      calculateNetWorth(state, state.players.indexOf(activePlayers[i]!)),
    )
    .sort((a, b) => a - b)

  const n = netWorths.length
  const totalWealth = netWorths.reduce((sum, w) => sum + w, 0)

  if (totalWealth === 0) return 0

  let cumulativeSum = 0
  let weightedSum = 0

  for (let i = 0; i < n; i++) {
    cumulativeSum += netWorths[i]!
    weightedSum += cumulativeSum
  }

  // Gini = (2 * weightedSum) / (n * totalWealth) - (n + 1) / n
  const gini = (2 * weightedSum) / (n * totalWealth) - (n + 1) / n

  return Math.max(0, Math.min(1, gini))
}
