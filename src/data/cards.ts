import type { Card, CardEffect, GameState } from "../types/game";

export const createChanceDeck = (): Card[] => {
  return [
    {
      id: 1,
      type: "chance",
      text: "Advance to Go (Collect £200)",
      getEffect: () => ({
        positionChange: 0,
        cashChange: 200,
      }),
    },
    {
      id: 2,
      type: "chance",
      text: "Advance to Illinois Avenue",
      getEffect: (state, playerIndex) => {
        const currentPos = state.players[playerIndex]?.position ?? 0;
        const newPos = 24;
        return {
          positionChange: newPos,
          passGoBonus: newPos < currentPos,
          triggerSpaceResolution: true,
        };
      },
    },
    {
      id: 3,
      type: "chance",
      text: "Advance to St. Charles Place",
      getEffect: (state, playerIndex) => {
        const currentPos = state.players[playerIndex]?.position ?? 0;
        const newPos = 11;
        return {
          positionChange: newPos,
          passGoBonus: newPos < currentPos,
          triggerSpaceResolution: true,
        };
      },
    },
    {
      id: 4,
      type: "chance",
      text: "Advance token to nearest Utility",
      getEffect: (state, playerIndex) => {
        const pos = state.players[playerIndex]?.position ?? 0;
        let newPos: number;
        if (pos >= 1 && pos <= 11) newPos = 12;
        else if (pos >= 13 && pos <= 28) newPos = 28;
        else newPos = 12;
        return {
          positionChange: newPos,
          passGoBonus: newPos < pos,
          triggerSpaceResolution: true,
        };
      },
    },
    {
      id: 5,
      type: "chance",
      text: "Advance to nearest Railroad",
      getEffect: (state, playerIndex) => {
        const pos = state.players[playerIndex]?.position ?? 0;
        let newPos: number;
        if (pos >= 1 && pos <= 6) newPos = 5;
        else if (pos >= 8 && pos <= 15) newPos = 15;
        else if (pos >= 17 && pos <= 24) newPos = 25;
        else newPos = 35;
        return {
          positionChange: newPos,
          passGoBonus: newPos < pos,
          triggerSpaceResolution: true,
        };
      },
    },
    {
      id: 6,
      type: "chance",
      text: "Bank pays you dividend of £50",
      getEffect: () => ({
        cashChange: 50,
      }),
    },
    {
      id: 7,
      type: "chance",
      text: "Get out of Jail Free",
      getEffect: () => ({
        jailFreeCard: true,
      }),
    },
    {
      id: 8,
      type: "chance",
      text: "Go Back 3 Spaces",
      getEffect: (state, playerIndex) => {
        const pos = state.players[playerIndex]?.position ?? 0;
        const newPos = (pos - 3 + 40) % 40;
        return {
          positionChange: newPos,
          triggerSpaceResolution: true,
        };
      },
    },
    {
      id: 9,
      type: "chance",
      text: "Go to Jail",
      getEffect: () => ({
        positionChange: "jail",
      }),
    },
    {
      id: 10,
      type: "chance",
      text: "Make general repairs on all your property - £25 per house, £100 per hotel",
      getEffect: () => ({
        perHouseCost: 25,
        perHotelCost: 100,
      }),
    },
    {
      id: 11,
      type: "chance",
      text: "Pay poor tax of £15",
      getEffect: () => ({
        cashChange: -15,
      }),
    },
    {
      id: 12,
      type: "chance",
      text: "Take a trip to Reading Railroad",
      getEffect: (state, playerIndex) => {
        const currentPos = state.players[playerIndex]?.position ?? 0;
        const newPos = 5;
        return {
          positionChange: newPos,
          passGoBonus: newPos < currentPos,
          triggerSpaceResolution: true,
        };
      },
    },
    {
      id: 13,
      type: "chance",
      text: "Take a walk on Boardwalk",
      getEffect: () => ({
        positionChange: 39,
        triggerSpaceResolution: true,
      }),
    },
    {
      id: 14,
      type: "chance",
      text: "You have been elected Chairman - Pay each player £50",
      getEffect: () => ({
        payToEach: 50,
      }),
    },
    {
      id: 15,
      type: "chance",
      text: "Your building loan matures - Collect £150",
      getEffect: () => ({
        cashChange: 150,
      }),
    },
    {
      id: 16,
      type: "chance",
      text: "You have won a crossword competition - Collect £100",
      getEffect: () => ({
        cashChange: 100,
      }),
    },
  ];
};

export const createCommunityChestDeck = (): Card[] => {
  return [
    {
      id: 17,
      type: "community_chest",
      text: "Advance to Go (Collect £200)",
      getEffect: () => ({
        positionChange: 0,
        cashChange: 200,
      }),
    },
    {
      id: 18,
      type: "community_chest",
      text: "Bank error in your favor - Collect £200",
      getEffect: () => ({
        cashChange: 200,
      }),
    },
    {
      id: 19,
      type: "community_chest",
      text: "Doctor's fee - Pay £50",
      getEffect: () => ({
        cashChange: -50,
      }),
    },
    {
      id: 20,
      type: "community_chest",
      text: "From sale of stock you get £50",
      getEffect: () => ({
        cashChange: 50,
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
      text: "Go to Jail",
      getEffect: () => ({
        positionChange: "jail",
      }),
    },
    {
      id: 23,
      type: "community_chest",
      text: "Grand Opera Night - Collect £50 from each player",
      // FIXED: Was paying instead of collecting
      getEffect: () => ({
        collectFromEach: 50,
      }),
    },
    {
      id: 24,
      type: "community_chest",
      text: "Holiday Fund matures - Collect £100",
      getEffect: () => ({
        cashChange: 100,
      }),
    },
    {
      id: 25,
      type: "community_chest",
      text: "Income tax refund - Collect £20",
      getEffect: () => ({
        cashChange: 20,
      }),
    },
    {
      id: 26,
      type: "community_chest",
      text: "It is your birthday - Collect £10 from each player",
      getEffect: () => ({
        collectFromEach: 10,
      }),
    },
    {
      id: 27,
      type: "community_chest",
      text: "Life insurance matures - Collect £100",
      getEffect: () => ({
        cashChange: 100,
      }),
    },
    {
      id: 28,
      type: "community_chest",
      text: "Pay hospital fees of £100",
      getEffect: () => ({
        cashChange: -100,
      }),
    },
    {
      id: 29,
      type: "community_chest",
      text: "Pay school fees of £50",
      getEffect: () => ({
        cashChange: -50,
      }),
    },
    {
      id: 30,
      type: "community_chest",
      text: "Receive £25 consultancy fee",
      getEffect: () => ({
        cashChange: 25,
      }),
    },
    {
      id: 31,
      type: "community_chest",
      text: "You are assessed for street repairs - £40 per house, £115 per hotel",
      getEffect: () => ({
        perHouseCost: 40,
        perHotelCost: 115,
      }),
    },
    {
      id: 32,
      type: "community_chest",
      text: "You have won second prize in a beauty contest - Collect £10",
      getEffect: () => ({
        cashChange: 10,
      }),
    },
    {
      id: 33,
      type: "community_chest",
      text: "You inherit £100",
      getEffect: () => ({
        cashChange: 100,
      }),
    },
  ];
};
