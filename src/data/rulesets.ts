import type { RulesetConfig, RulesetId } from '../types/game'
import { boardSpaces } from './board'
import { createChanceDeck, createCommunityChestDeck } from './cards'

/**
 * Registry of all available rulesets with their configurations
 * Each ruleset defines board layout, card decks, and rule variants
 */

export const RULESET_CONFIGS: Record<RulesetId, RulesetConfig> = {
  classic: {
    id: 'classic',
    name: 'Classic Monopoly',
    description: 'Traditional Monopoly rules with Oregon locations',
    boardSpaces: boardSpaces,
    chanceDeck: createChanceDeck(),
    communityChestDeck: createCommunityChestDeck(),
    startingCash: 1500,
    goSalary: 200,
    maxHousesPerProperty: 5,
    enableHotels: true,
    houseRent: 0, // Variable by tier
    totalHouses: 32,
    totalHotels: 12,
    enableBackwardMovement: false,
    doublesRailroadPass: false,
    doublesSpeculationWin: 0,
    dealPropertiesAtStart: false,
    propertiesDealtCount: 0,
    enableAuctions: true,
    taxAmount: 0, // Variable by space
    taxDoublingThresholds: [],
    sectionRentDoubling: false,
    rentTable: [],
    endAfterWagesCount: 0,
    cardsAndHousesValue: 0,
    jailFine: 50,
    jailMaxTurns: 3,
    enablePlayerBorrowing: false,
  },
  


  house_rules: {
    id: 'house_rules',
    name: 'House Rules',
    description: 'Fully customizable ruleset - players can modify any game parameter',
    boardSpaces: boardSpaces, // Default to classic board
    chanceDeck: createChanceDeck(), // Default to classic cards
    communityChestDeck: createCommunityChestDeck(), // Default to classic cards
    startingCash: 1500, // Default, but customizable
    goSalary: 200, // Default, but customizable
    maxHousesPerProperty: 5, // Default, but customizable
    enableHotels: true, // Default, but customizable
    houseRent: 0, // Variable by tier (default)
    totalHouses: 32, // Default, but customizable
    totalHotels: 12, // Default, but customizable
    enableBackwardMovement: false, // Default, but customizable
    doublesRailroadPass: false, // Default, but customizable
    doublesSpeculationWin: 0, // Default, but customizable
    dealPropertiesAtStart: false, // Default, but customizable
    propertiesDealtCount: 0, // Default, but customizable
    enableAuctions: true, // Default, but customizable
    taxAmount: 0, // Variable by space (default)
    taxDoublingThresholds: [], // Default, but customizable
    sectionRentDoubling: false, // Default, but customizable
    rentTable: [], // Use classic formula (default)
    endAfterWagesCount: 0, // Default, but customizable
    cardsAndHousesValue: 0, // Default, but customizable
    jailFine: 50, // Default, but customizable
    jailMaxTurns: 3, // Default, but customizable
    enablePlayerBorrowing: false, // Default, but customizable
  },
}

/**
 * Get ruleset configuration by ID
 */
export const getRulesetConfig = (rulesetId: RulesetId): RulesetConfig => {
  return RULESET_CONFIGS[rulesetId]
}

/**
 * Get all available rulesets
 */
export const getAllRulesets = (): RulesetConfig[] => {
  return Object.values(RULESET_CONFIGS)
}
