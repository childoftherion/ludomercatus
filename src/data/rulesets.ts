import type { RulesetConfig, RulesetId } from '../types/game'
import { boardSpaces } from './board'
import { boardSpaces1906 } from './board1906'
import { createChanceDeck, createCommunityChestDeck } from './cards'
import { createChanceDeck1906, createCommunityChestDeck1906 } from './cards1906'

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
  
  '1906_landlords': {
    id: '1906_landlords',
    name: '1906: Landlord\'s Rules',
    description: 'Original 1906 Landlord\'s Game with Pacific Northwest locations and historic rules',
    boardSpaces: boardSpaces1906,
    chanceDeck: createChanceDeck1906(),
    communityChestDeck: createCommunityChestDeck1906(),
    startingCash: 600, // 2 players: $600 each
    goSalary: 100, // Wages per circuit
    maxHousesPerProperty: 3,
    enableHotels: false,
    houseRent: 10, // Fixed $10 per house
    totalHouses: Infinity, // Unlimited houses
    totalHotels: 0,
    enableBackwardMovement: true,
    doublesRailroadPass: true,
    doublesSpeculationWin: 100,
    dealPropertiesAtStart: true,
    propertiesDealtCount: 24,
    enableAuctions: false,
    taxAmount: 10, // Fixed $10 tax
    taxDoublingThresholds: [
      { houses: 10, taxAmount: 20 },
      { houses: 25, taxAmount: 40 },
    ],
    sectionRentDoubling: true,
    rentTable: [
      // 1906 Land Rent Table: [tier][houses] where tier 0 = cheapest
      [2, 4, 8, 16],    // Tier 1
      [4, 8, 16, 32],    // Tier 2
      [6, 12, 24, 48],   // Tier 3
      [8, 16, 32, 64],   // Tier 4
      [10, 20, 40, 80],  // Tier 5
      [12, 24, 48, 96],  // Tier 6
      [14, 28, 56, 112], // Tier 7
      [16, 32, 64, 128], // Tier 8
      [18, 36, 72, 144], // Tier 9
      [20, 40, 80, 160], // Tier 10
      [22, 44, 88, 176], // Tier 11
    ],
    endAfterWagesCount: 5,
    cardsAndHousesValue: 100,
    jailFine: 50,
    jailMaxTurns: 3,
    enablePlayerBorrowing: true,
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
