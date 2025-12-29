import type { GameState, Property, TradeOffer, ColorGroup } from "../../types/game";
import { hasMonopoly } from "../rules/monopoly";

export interface GameActions {
  rollDice: () => any;
  movePlayer: (index: number, steps: number) => void;
  buyProperty: (id: number) => void;
  declineProperty: (id: number) => void;
  endTurn: () => void;
  getOutOfJail: (index: number, method: "card" | "pay" | "roll") => void;
  placeBid: (index: number, amount: number) => void;
  passAuction: (index: number) => void;
  startTrade: (from: number, to: number) => void;
  updateTradeOffer: (offer: TradeOffer) => void;
  proposeTrade: (offer: TradeOffer) => void;
  acceptTrade: () => void;
  rejectTrade: () => void;
  mortgageProperty: (id: number) => void;
  sellHouse: (id: number) => void;
  sellHotel: (id: number) => void;
  buildHouse: (id: number) => void;
  buildHotel: (id: number) => void;
}

const isProperty = (space: any): space is Property => {
  return space.type === "property" || space.type === "railroad" || space.type === "utility";
};

export const executeAITurn = (state: GameState, actions: GameActions) => {
  const playerIndex = state.currentPlayerIndex;
  const player = state.players[playerIndex];
  
  if (!player || !player.isAI || player.bankrupt) return;

  const currentSpace = state.spaces[player.position];

  // --- AI Management Logic (Houses & Mortgages) ---
  
  // If bankrupt (negative cash), try to raise money
  if (player.cash < 0) {
    // 1. Sell houses/hotels
    const propsWithBuildings = state.spaces.filter(
      (s): s is Property => isProperty(s) && s.owner === playerIndex && (s.houses > 0 || s.hotel)
    );
    
    if (propsWithBuildings.length > 0) {
      const prop = propsWithBuildings[0]!;
      if (prop.hotel) actions.sellHotel(prop.id);
      else actions.sellHouse(prop.id);
      return; // Execute one action at a time
    }

    // 2. Mortgage properties
    const mortgageableProps = state.spaces.filter(
      (s): s is Property => isProperty(s) && s.owner === playerIndex && !s.mortgaged && s.houses === 0 && !s.hotel
    );

    if (mortgageableProps.length > 0) {
      actions.mortgageProperty(mortgageableProps[0]!.id);
      return;
    }
  }

  // AI Trading Logic
  if (state.phase === "rolling" && (!player.lastTradeTurn || state.turn - player.lastTradeTurn > 5)) {
    const colorGroups: ColorGroup[] = ["brown", "light_blue", "pink", "orange", "red", "yellow", "green", "dark_blue"];
    
    for (const group of colorGroups) {
      if (!group) continue;
      const groupProps = state.spaces.filter((s): s is Property => isProperty(s) && s.colorGroup === group);
      const ownedByAI = groupProps.filter(s => s.owner === playerIndex);
      
      // If AI has some but not all
      if (ownedByAI.length > 0 && ownedByAI.length < groupProps.length) {
        const missingProps = groupProps.filter(s => s.owner !== playerIndex);
        
        const owners = new Set(missingProps.map(s => s.owner));
        if (owners.size === 1 && !owners.has(undefined)) {
          const targetPlayerIndex = [...owners][0]!;
          const targetPlayer = state.players[targetPlayerIndex];
          
          if (targetPlayer && !targetPlayer.bankrupt && targetPlayerIndex !== playerIndex) {
            // Calculate offer
            let totalMarketValue = 0;
            const propIds: number[] = [];
            let skipTrade = false;
            let maxAttempts = 0;

            missingProps.forEach(p => {
              const key = `${targetPlayerIndex}-${p.id}`;
              const history = player.tradeHistory?.[key];
              
              if (history) {
                maxAttempts = Math.max(maxAttempts, history.attempts);
                if (history.attempts >= 3) {
                  skipTrade = true;
                }
              }
              
              totalMarketValue += p.price;
              propIds.push(p.id);
            });
            
            if (skipTrade) continue;

            // Increase offer based on rejections: 1.5 -> 2.0 -> 2.5
            const multiplier = 1.5 + (maxAttempts * 0.5);
            const offerCash = Math.floor(totalMarketValue * multiplier);
            
            if (player.cash >= offerCash + 200) { // Ensure reserve
              // INITIATE TRADE
              // NOTE: The store handles updating 'lastTradeTurn' when we initiate.
              // But here we are just calling actions.
              // Ideally the store's executeAITurn wrapper handles the state updates for trading init?
              // No, we need to call startTrade.
              
              actions.startTrade(playerIndex, targetPlayerIndex);
              actions.updateTradeOffer({
                fromPlayer: playerIndex,
                toPlayer: targetPlayerIndex,
                cashOffered: offerCash,
                propertiesOffered: [],
                jailCardsOffered: 0,
                cashRequested: 0,
                propertiesRequested: propIds,
                jailCardsRequested: 0,
              });
              // We need to access the trade offer we just created.
              // Since actions are async/batched in React, but synchronous in Zustand usually...
              // But we can't access 'state.trade' immediately after 'actions.startTrade' if we hold 'state' const.
              // However, we constructed the offer manually above.
              
              // We can just call proposeTrade with the object directly?
              // The store implementation of proposeTrade takes an offer.
              actions.proposeTrade({
                fromPlayer: playerIndex,
                toPlayer: targetPlayerIndex,
                cashOffered: offerCash,
                propertiesOffered: [],
                jailCardsOffered: 0,
                cashRequested: 0,
                propertiesRequested: propIds,
                jailCardsRequested: 0,
              });
              return; 
            }
          }
        }
      }
    }
  }

  // Aggressive Building
  if (player.cash > 500 && state.phase === "rolling") {
    const budget = player.cash * 0.8;
    let spent = 0;
    let iterations = 0;
    
    // NOTE: This loop logic relies on state updates being reflected.
    // If we pass a static 'state' object, this loop will infinite loop or fail to see updates.
    // Store refactoring for this is tricky.
    // Ideally the AI controller should return a SEQUENCE of actions, or perform one action per tick.
    // For now, let's just do ONE building action per executeAITurn call.
    // The App.tsx useEffect calls executeAITurn every 1.2s.
    // So if we build once, we return. Next tick we build again.
    // This is actually better for UX (seeing houses pop up one by one).
    
    const monopolies = state.spaces.filter(
      (s): s is Property => 
        isProperty(s) &&
        s.type === "property" && 
        s.owner === playerIndex && 
        !!s.colorGroup && 
        hasMonopoly(state, playerIndex, s.colorGroup) &&
        !s.mortgaged &&
        !s.hotel
    );

    if (monopolies.length > 0) {
      monopolies.sort((a, b) => a.houses - b.houses);
      const propToBuild = monopolies[0]!;
      const cost = propToBuild.buildingCost ?? 0;

      if (player.cash > cost + 500) {
        if (propToBuild.houses === 4) actions.buildHotel(propToBuild.id);
        else actions.buildHouse(propToBuild.id);
        return; // Return to let UI update and wait for next tick
      }
    }
  }

  // Handle different phases
  switch (state.phase) {
    case "rolling": {
      if (player.inJail) {
        if (player.jailFreeCards > 0) actions.getOutOfJail(playerIndex, "card");
        else if (player.cash >= 50 && player.jailTurns >= 1) actions.getOutOfJail(playerIndex, "pay");
        else actions.getOutOfJail(playerIndex, "roll");
      } else {
        const roll = actions.rollDice();
        // Move is handled by store timeout usually, or we call it?
        // Store rollDice handles the log. Store creates the timeout?
        // In the original code:
        // const roll = get().rollDice();
        // setTimeout(() => get().movePlayer(playerIndex, roll.total), 1000);
        
        // We need to replicate that.
        // We can't use setTimeout here easily if we want to be pure.
        // But we can just call movePlayer? No, we want the delay.
        // The store's 'executeAITurn' handled the timeout.
        // We should move that responsibility to the store or keeping it here implies side effects.
        // Let's assume the store's 'rollDice' JUST rolls.
        // We need to trigger the move.
        
        // If we modify the store to handle the auto-move on AI roll, that violates "dumb store".
        // If we keep it here, we need async.
        
        // Let's keep it simple: The action 'movePlayer' will be called by the caller of this function
        // if we return a "ROLL" intent?
        // Or we just call actions.movePlayer inside a timeout here.
        setTimeout(() => {
           actions.movePlayer(playerIndex, roll.total);
        }, 1000);
      }
      break;
    }

    case "jail_decision": {
      if (player.jailFreeCards > 0) actions.getOutOfJail(playerIndex, "card");
      else if (player.cash >= 50 && player.jailTurns >= 1) actions.getOutOfJail(playerIndex, "pay");
      else actions.getOutOfJail(playerIndex, "roll");
      break;
    }

    case "awaiting_buy_decision": {
      if (!currentSpace || !isProperty(currentSpace)) return;
      const property = currentSpace as Property;
      const shouldBuy = player.cash >= property.price + 100;
      
      if (shouldBuy) {
        actions.buyProperty(property.id);
      } else {
        actions.declineProperty(property.id);
      }
      break;
    }

    case "auction": {
      const auction = state.auction;
      if (auction && auction.activePlayerIndex === playerIndex) {
        const prop = state.spaces.find(s => s.id === auction.propertyId) as Property;
        const maxBid = Math.min(player.cash - 50, prop.price * 1.1);
        if (auction.currentBid + 10 <= maxBid) actions.placeBid(playerIndex, auction.currentBid + 10);
        else actions.passAuction(playerIndex);
      }
      break;
    }

    case "resolving_space": {
      actions.endTurn();
      break;
    }
  }
};

export const executeAITradeResponse = (state: GameState, actions: GameActions) => {
  const { trade, spaces } = state;
  if (!trade || trade.status !== "pending") return;
  
  const { offer } = trade;
  const aiPlayerIndex = offer.toPlayer;
  
  const calculateValuation = (ownerIndex: number, cash: number, propertyIds: number[], jailCards: number) => {
    let value = cash + (jailCards * 50);
    
    propertyIds.forEach(id => {
      const p = spaces.find(s => s.id === id);
      if (p && isProperty(p)) {
        let propValue = p.price;
        
        if (p.colorGroup) {
           const groupProps = spaces.filter((s): s is Property => isProperty(s) && s.colorGroup === p.colorGroup);
           const ownedByPlayer = groupProps.filter(s => s.owner === ownerIndex && s.id !== id);
           
           if (ownedByPlayer.length === groupProps.length - 1) {
              propValue *= 3.0; 
           } else if (ownedByPlayer.length > 0) {
              propValue *= 1.2;
           }
        }
        value += propValue;
      }
    });
    return value;
  };

  const valueReceived = calculateValuation(aiPlayerIndex, offer.cashOffered, offer.propertiesOffered, offer.jailCardsOffered);
  const valueGiven = calculateValuation(aiPlayerIndex, offer.cashRequested, offer.propertiesRequested, offer.jailCardsRequested);
  
  if (valueReceived >= valueGiven * 0.95) actions.acceptTrade();
  else actions.rejectTrade();
};
