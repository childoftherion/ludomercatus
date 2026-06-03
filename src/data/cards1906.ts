import type { Card, CardEffect, GameState } from "../types/game"

/**
 * 1906 Landlord's Game card decks – Pacific Northwest edition
 *
 * The 1906 game uses "Chance" cards (green) and a different set of
 * community-style cards. The original game also has Education and
 * Professor cards used only under Single Tax Rules (not implemented here).
 *
 * Key differences from classic:
 * - Cards reference 1906 board locations (Mother Earth, railroads, etc.)
 * - No "Advance to nearest Utility" (1906 has no utilities)
 * - Speculation-related cards
 * - Broker's License card
 */

export const createChanceDeck1906 = (): Card[] => {
  return [
    {
      id: 1,
      type: "chance",
      text: "Advance to Mother Earth – Collect $100 Wages",
      getEffect: () => ({
        positionChange: 0,
        cashChange: 100,
      }),
    },
    {
      id: 2,
      type: "chance",
      text: "Advance to Crater Lake",
      getEffect: (state, playerIndex) => {
        const currentPos = state.players[playerIndex]?.position ?? 0
        const newPos = 44
        return {
          positionChange: newPos,
          passGoBonus: newPos < currentPos,
          triggerSpaceResolution: true,
        }
      },
    },
    {
      id: 3,
      type: "chance",
      text: "Advance to Hood River",
      getEffect: (state, playerIndex) => {
        const currentPos = state.players[playerIndex]?.position ?? 0
        const newPos = 12
        return {
          positionChange: newPos,
          passGoBonus: newPos < currentPos,
          triggerSpaceResolution: true,
        }
      },
    },
    {
      id: 4,
      type: "chance",
      text: "Advance to nearest Railroad – If owned, pay owner twice the fare",
      getEffect: (state, playerIndex) => {
        const pos = state.players[playerIndex]?.position ?? 0
        // Railroads at positions 6, 17, 28, 39
        const railroads = [6, 17, 28, 39]
        let nearest = railroads[0]!
        for (const rr of railroads) {
          if (rr > pos && (rr - pos) < (nearest - pos)) {
            nearest = rr
          }
        }
        return {
          positionChange: nearest,
          passGoBonus: nearest < pos,
          triggerSpaceResolution: true,
        }
      },
    },
    {
      id: 5,
      type: "chance",
      text: "Bank pays you dividend of $25",
      getEffect: () => ({
        cashChange: 25,
      }),
    },
    {
      id: 6,
      type: "chance",
      text: "Get out of Jail Free",
      getEffect: () => ({
        jailFreeCard: true,
      }),
    },
    {
      id: 7,
      type: "chance",
      text: "Go Back 3 Spaces",
      getEffect: (state, playerIndex) => {
        const pos = state.players[playerIndex]?.position ?? 0
        const totalSpaces = 45 // 1906 board has 46 spaces (0-45)
        const newPos = (pos - 3 + totalSpaces) % totalSpaces
        return {
          positionChange: newPos,
          triggerSpaceResolution: true,
        }
      },
    },
    {
      id: 8,
      type: "chance",
      text: "Go to Jail – Go directly to Jail",
      getEffect: () => ({
        positionChange: "jail",
      }),
    },
    {
      id: 9,
      type: "chance",
      text: "Make general repairs on all your property – $10 per house",
      getEffect: () => ({
        perHouseCost: 10,
        perHotelCost: 0, // No hotels in 1906
      }),
    },
    {
      id: 10,
      type: "chance",
      text: "Pay taxes of $10",
      getEffect: () => ({
        cashChange: -10,
      }),
    },
    {
      id: 11,
      type: "chance",
      text: "Take a trip on the Astoria & Columbia River Railroad",
      getEffect: (state, playerIndex) => {
        const currentPos = state.players[playerIndex]?.position ?? 0
        const newPos = 6
        return {
          positionChange: newPos,
          passGoBonus: newPos < currentPos,
          triggerSpaceResolution: true,
        }
      },
    },
    {
      id: 12,
      type: "chance",
      text: "You have been elected Chairman – Pay each player $25",
      getEffect: () => ({
        payToEach: 25,
      }),
    },
    {
      id: 13,
      type: "chance",
      text: "Your speculation pays off – Collect $50",
      getEffect: () => ({
        cashChange: 50,
      }),
    },
    {
      id: 14,
      type: "chance",
      text: "Advance to Public Treasury",
      getEffect: (state, playerIndex) => {
        const currentPos = state.players[playerIndex]?.position ?? 0
        const newPos = 22
        return {
          positionChange: newPos,
          passGoBonus: newPos < currentPos,
          triggerSpaceResolution: true,
        }
      },
    },
    {
      id: 15,
      type: "chance",
      text: "Broker's License – You may buy from the pack at original price",
      getEffect: () => ({
        cashChange: 0,
      }),
    },
  ]
}

export const createCommunityChestDeck1906 = (): Card[] => {
  return [
    {
      id: 17,
      type: "community_chest",
      text: "Advance to Mother Earth – Collect $100 Wages",
      getEffect: () => ({
        positionChange: 0,
        cashChange: 100,
      }),
    },
    {
      id: 18,
      type: "community_chest",
      text: "Bank error in your favor – Collect $50",
      getEffect: () => ({
        cashChange: 50,
      }),
    },
    {
      id: 19,
      type: "community_chest",
      text: "Doctor's fee – Pay $25",
      getEffect: () => ({
        cashChange: -25,
      }),
    },
    {
      id: 20,
      type: "community_chest",
      text: "From sale of stock you get $25",
      getEffect: () => ({
        cashChange: 25,
      }),
    },
    {
      id: 21,
      type: "community_chest",
      text: "Get out of Jail Free",
      getEffect: () => ({
        jailFreeCard: true,
      }),
    },
    {
      id: 22,
      type: "community_chest",
      text: "Go to Jail – Go directly to Jail",
      getEffect: () => ({
        positionChange: "jail",
      }),
    },
    {
      id: 23,
      type: "community_chest",
      text: "Grand Opera Night – Collect $25 from each player",
      getEffect: () => ({
        collectFromEach: 25,
      }),
    },
    {
      id: 24,
      type: "community_chest",
      text: "Holiday Fund matures – Collect $50",
      getEffect: () => ({
        cashChange: 50,
      }),
    },
    {
      id: 25,
      type: "community_chest",
      text: "Income tax refund – Collect $10",
      getEffect: () => ({
        cashChange: 10,
      }),
    },
    {
      id: 26,
      type: "community_chest",
      text: "It is your birthday – Collect $10 from each player",
      getEffect: () => ({
        collectFromEach: 10,
      }),
    },
    {
      id: 27,
      type: "community_chest",
      text: "Pay hospital fees of $25",
      getEffect: () => ({
        cashChange: -25,
      }),
    },
    {
      id: 28,
      type: "community_chest",
      text: "Receive $25 consultancy fee",
      getEffect: () => ({
        cashChange: 25,
      }),
    },
    {
      id: 29,
      type: "community_chest",
      text: "You are assessed for street repairs – $10 per house",
      getEffect: () => ({
        perHouseCost: 10,
        perHotelCost: 0,
      }),
    },
    {
      id: 30,
      type: "community_chest",
      text: "You inherit $50",
      getEffect: () => ({
        cashChange: 50,
      }),
    },
  ]
}
