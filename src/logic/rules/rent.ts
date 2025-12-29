import type { GameState, Property } from "../../types/game";
import { hasMonopoly, getPlayerProperties } from "./monopoly";

export const calculateRent = (state: GameState, property: Property, diceTotal: number): number => {
  if (property.owner === undefined || property.mortgaged) return 0;

  if (property.type === "property") {
    if (property.hotel) return property.rents[5] ?? 0;
    if (property.houses > 0) return property.rents[property.houses] ?? 0;
    
    let rent = property.baseRent;
    if (property.colorGroup && hasMonopoly(state, property.owner, property.colorGroup)) {
      rent *= 2;
    }
    return rent;
  } 
  
  if (property.type === "railroad") {
    const ownerProps = getPlayerProperties(state, property.owner);
    const railroadsOwned = ownerProps.filter(p => p.type === "railroad").length;
    return property.baseRent * Math.pow(2, Math.max(0, railroadsOwned - 1));
  } 
  
  if (property.type === "utility") {
    const ownerProps = getPlayerProperties(state, property.owner);
    const utilitiesOwned = ownerProps.filter(p => p.type === "utility").length;
    const multiplier = utilitiesOwned === 2 ? 10 : 4;
    return diceTotal * multiplier;
  }

  return 0;
};
