import type { GameState, Property, ColorGroup } from "../../types/game";

const isProperty = (space: any): space is Property => {
  return space.type === "property" || space.type === "railroad" || space.type === "utility";
};

export const hasMonopoly = (state: GameState, playerIndex: number, colorGroup: ColorGroup): boolean => {
  if (!colorGroup) return false;
  
  const groupProperties = state.spaces.filter(
    (s): s is Property => isProperty(s) && s.type === "property" && s.colorGroup === colorGroup
  );
  
  if (groupProperties.length === 0) return false;
  
  return groupProperties.every(p => p.owner === playerIndex);
};

export const getPlayerProperties = (state: GameState, playerIndex: number): Property[] => {
  return state.spaces.filter(
    (s): s is Property => isProperty(s) && s.owner === playerIndex
  );
};
