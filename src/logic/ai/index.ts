import type { GameState, Property, TradeOffer, ColorGroup } from "../../types/game";
import { hasMonopoly } from "../rules/monopoly";
import { calculateNetWorth } from "../rules/economics";

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
  acceptCounterOffer: () => void;
  mortgageProperty: (id: number) => void;
  sellHouse: (id: number) => void;
  sellHotel: (id: number) => void;
  buildHouse: (id: number) => void;
  buildHotel: (id: number) => void;
  // Phase 2: Bank Loans
  takeLoan?: (playerIndex: number, amount: number) => void;
  repayLoan?: (playerIndex: number, loanId: number, amount: number) => void;
  getMaxLoanAmount?: (playerIndex: number) => number;
  // Phase 3: Rent Negotiation
  forgiveRent?: () => void;
  createRentIOU?: (partialPayment: number) => void;
  payIOU?: (debtorIndex: number, iouId: number, amount?: number) => void;
  demandImmediatePaymentOrProperty?: (propertyIdToTransfer?: number) => void;
  // Phase 3: Property Insurance
  buyPropertyInsurance?: (propertyId: number, playerIndex: number) => void;
  // Phase 3: Tax Decision
  chooseTaxOption?: (playerIndex: number, choice: "flat" | "percentage") => void;
  // Phase 3: Bankruptcy
  enterChapter11?: () => void;
  declineRestructuring?: () => void;
}

const isProperty = (space: any): space is Property => {
  return space.type === "property" || space.type === "railroad" || space.type === "utility";
};

// Helper: Calculate ROI for a property
const calculatePropertyROI = (state: GameState, property: Property, playerIndex: number): number => {
  if (property.owner !== undefined && property.owner !== playerIndex) return 0;
  
  let expectedRent = property.baseRent;
  
  // If we'd complete a monopoly, rent doubles
  if (property.colorGroup) {
    const groupProps = state.spaces.filter(
      (s): s is Property => isProperty(s) && s.colorGroup === property.colorGroup
    );
    const ownedByPlayer = groupProps.filter(s => s.owner === playerIndex);
    if (ownedByPlayer.length === groupProps.length - 1) {
      expectedRent *= 2; // Would complete monopoly
    }
  }
  
  // Rough ROI: expected rent per turn / price
  return expectedRent / property.price;
};

// Helper: Check if buying would complete a monopoly
const wouldCompleteMonopoly = (state: GameState, playerIndex: number, property: Property): boolean => {
  if (!property.colorGroup) return false;
  
  const groupProps = state.spaces.filter(
    (s): s is Property => isProperty(s) && s.colorGroup === property.colorGroup
  );
  const ownedByPlayer = groupProps.filter(s => s.owner === playerIndex);
  
  return ownedByPlayer.length === groupProps.length - 1;
};

// Helper: Check if buying would block an opponent's monopoly
const wouldBlockOpponent = (state: GameState, playerIndex: number, property: Property): boolean => {
  if (!property.colorGroup) return false;
  
  const groupProps = state.spaces.filter(
    (s): s is Property => isProperty(s) && s.colorGroup === property.colorGroup
  );
  
  // Check if any single opponent owns all other properties in this group
  const otherProps = groupProps.filter(s => s.id !== property.id);
  if (otherProps.length === 0) return false;
  
  const firstOwner = otherProps[0]?.owner;
  if (firstOwner === undefined || firstOwner === playerIndex) return false;
  
  return otherProps.every(s => s.owner === firstOwner);
};

export const executeAITurn = (state: GameState, actions: GameActions) => {
  // During auctions, use the auction's active player index instead of currentPlayerIndex
  let playerIndex = state.currentPlayerIndex;
  if (state.phase === "auction" && state.auction) {
    playerIndex = state.auction.activePlayerIndex;
  }
  
  const player = state.players[playerIndex];
  
  if (!player || !player.isAI || player.bankrupt) return;

  const currentSpace = state.spaces[player.position];
  
  // Calculate AI's net worth for economic decisions
  const netWorth = calculateNetWorth(state, playerIndex);
  const cashReserve = Math.max(200, netWorth * 0.15); // Keep 15% of net worth or £200 as reserve

  // --- Phase 3: Handle Bankruptcy Decision ---
  if (state.phase === "awaiting_bankruptcy_decision") {
    // AI always chooses Chapter 11 if available (try to survive)
    if (actions.enterChapter11) {
      actions.enterChapter11();
      return;
    }
  }

  // --- Phase 3: Handle Tax Decision ---
  if (state.phase === "awaiting_tax_decision" && state.awaitingTaxDecision) {
    if (actions.chooseTaxOption) {
      const { flatAmount, percentageAmount } = state.awaitingTaxDecision;
      // AI chooses the cheaper option
      const choice = flatAmount <= percentageAmount ? "flat" : "percentage";
      actions.chooseTaxOption(playerIndex, choice);
      return;
    }
  }

  // --- Phase 3: Handle Rent Negotiation (as creditor) ---
  if (state.phase === "awaiting_rent_negotiation" && state.pendingRentNegotiation) {
    const { creditorIndex, rentAmount, debtorCanAfford } = state.pendingRentNegotiation;
    
    if (creditorIndex === playerIndex) {
      // AI is the creditor - decide what to do
      if (debtorCanAfford >= rentAmount * 0.5) {
        // Debtor can pay at least half - accept IOU
        if (actions.createRentIOU) {
          actions.createRentIOU(debtorCanAfford);
          return;
        }
      } else {
        // Debtor can't pay much - demand bankruptcy or property
        if (actions.demandImmediatePaymentOrProperty) {
          // For now, just force bankruptcy (could be smarter about property selection)
          actions.demandImmediatePaymentOrProperty(undefined);
          return;
        }
      }
    }
  }

  // --- Phase 2: Smart Loan Management ---
  if (state.settings?.enableBankLoans && actions.takeLoan && actions.getMaxLoanAmount) {
    // Consider taking a loan if we're low on cash but have a good opportunity
    if (player.cash < 200 && player.totalDebt < netWorth * 0.3) {
      // Calculate desired loan amount
      const desiredLoan = Math.min(200, Math.floor(netWorth * 0.2));
      // Check maximum available loan amount to prevent infinite loops
      const maxAvailableLoan = actions.getMaxLoanAmount(playerIndex);
      if (maxAvailableLoan > 0) {
        // Take the smaller of desired amount or maximum available
        const loanAmount = Math.min(desiredLoan, maxAvailableLoan);
        if (loanAmount >= 50) {
          actions.takeLoan(playerIndex, loanAmount);
          return;
        }
      }
    }
    
    // Repay loans if we have excess cash
    if (player.bankLoans.length > 0 && player.cash > cashReserve * 2) {
      const loan = player.bankLoans[0];
      if (loan && actions.repayLoan) {
        const repayAmount = Math.min(loan.totalOwed, player.cash - cashReserve);
        if (repayAmount > 0) {
          actions.repayLoan(playerIndex, loan.id, repayAmount);
          return;
        }
      }
    }
  }

  // --- Phase 3: Pay off IOUs ---
  if (player.iousPayable && player.iousPayable.length > 0 && player.cash > cashReserve) {
    const iou = player.iousPayable[0];
    if (iou && actions.payIOU) {
      // Calculate payment amount, ensuring it's a whole number and at least $1
      const rawPayAmount = Math.min(iou.currentAmount, player.cash - cashReserve);
      // Round down to whole number and ensure minimum of $1
      const payAmount = Math.max(1, Math.floor(rawPayAmount));
      // Only pay if we have at least $1 available and the IOU has at least $1 remaining
      if (payAmount >= 1 && rawPayAmount >= 1 && player.cash >= payAmount) {
        actions.payIOU(playerIndex, iou.id, payAmount);
        return;
      }
    }
  }

  // --- Phase 3: Buy Insurance for Valuable Properties ---
  if (state.settings?.enablePropertyInsurance && actions.buyPropertyInsurance && player.cash > cashReserve * 1.5) {
    const uninsuredProps = state.spaces.filter(
      (s): s is Property => 
        isProperty(s) && 
        s.owner === playerIndex && 
        !s.mortgaged && 
        !s.isInsured &&
        (s.houses > 0 || s.hotel) // Only insure developed properties
    );
    
    if (uninsuredProps.length > 0) {
      // Insure the most developed property first
      const propToInsure = uninsuredProps.sort((a, b) => {
        const aValue = a.hotel ? 5 : a.houses;
        const bValue = b.hotel ? 5 : b.houses;
        return bValue - aValue;
      })[0];
      
      if (propToInsure) {
        const insuranceCost = Math.ceil(propToInsure.price * (state.settings.insuranceCostPercent ?? 0.05));
        if (player.cash > insuranceCost + cashReserve) {
          actions.buyPropertyInsurance(propToInsure.id, playerIndex);
          return;
        }
      }
    }
  }

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
      
      // Enhanced AI buying logic
      let shouldBuy = false;
      const priceWithReserve = property.price + cashReserve;
      
      if (player.cash >= priceWithReserve) {
        // Always buy if we'd complete a monopoly
        if (wouldCompleteMonopoly(state, playerIndex, property)) {
          shouldBuy = true;
        }
        // Buy if we'd block an opponent's monopoly
        else if (wouldBlockOpponent(state, playerIndex, property)) {
          shouldBuy = true;
        }
        // Buy if ROI is good enough
        else {
          const roi = calculatePropertyROI(state, property, playerIndex);
          shouldBuy = roi > 0.08; // 8% return threshold
        }
      } else if (player.cash >= property.price) {
        // Low on cash but still can afford - only buy if completing/blocking monopoly
        shouldBuy = wouldCompleteMonopoly(state, playerIndex, property) || 
                    wouldBlockOpponent(state, playerIndex, property);
      }
      
      // Consider taking a loan to buy if it would complete a monopoly
      if (!shouldBuy && wouldCompleteMonopoly(state, playerIndex, property) && 
          state.settings?.enableBankLoans && actions.takeLoan && actions.getMaxLoanAmount) {
        const shortfall = property.price - player.cash + 50; // Extra buffer
        const maxAvailableLoan = actions.getMaxLoanAmount(playerIndex);
        
        if (maxAvailableLoan > 0 && shortfall <= maxAvailableLoan && shortfall >= 50) {
          actions.takeLoan(playerIndex, shortfall);
          // Will buy on next turn after loan is processed
          return;
        }
      }
      
      if (shouldBuy) {
        actions.buyProperty(property.id);
      } else {
        actions.declineProperty(property.id);
      }
      break;
    }

    case "auction": {
      const auction = state.auction;
      if (!auction) {
        console.warn("[AI] Auction phase but no auction state found");
        break;
      }
      
      // During auctions, the active player is determined by auction.activePlayerIndex, not currentPlayerIndex
      // We need to check if THIS AI player is the active bidder
      if (auction.activePlayerIndex === playerIndex) {
        const prop = state.spaces.find(s => s.id === auction.propertyId) as Property;
        
        console.log(`[AI Auction] ${player.name} (${playerIndex}) is active bidder for ${prop?.name}, current bid: £${auction.currentBid}`);
        
        // Calculate max bid based on strategic value
        let maxBidMultiplier = 1.0;
        
        // Bid more aggressively if completing monopoly
        if (prop && wouldCompleteMonopoly(state, playerIndex, prop)) {
          maxBidMultiplier = 2.0; // Pay up to 2x for monopoly completion
          console.log(`[AI Auction] ${player.name} would complete monopoly - bidding aggressively`);
        }
        // Bid more if blocking opponent
        else if (prop && wouldBlockOpponent(state, playerIndex, prop)) {
          maxBidMultiplier = 1.5; // Pay up to 1.5x to block
          console.log(`[AI Auction] ${player.name} would block opponent - bidding moderately`);
        }
        
        const maxBid = Math.min(
          player.cash - cashReserve,
          prop ? prop.price * maxBidMultiplier : player.cash
        );
        
        // Calculate minimum bid increment (10% or £10)
        const minIncrement = Math.max(10, Math.floor(auction.currentBid * 0.1));
        const nextBid = auction.currentBid === 0 
          ? Math.max(10, Math.floor((prop?.price ?? 100) * 0.1)) // Opening bid
          : auction.currentBid + minIncrement;
        
        console.log(`[AI Auction] ${player.name} maxBid: £${maxBid}, nextBid: £${nextBid}, cash: £${player.cash}, reserve: £${cashReserve}`);
        
        if (nextBid <= maxBid && nextBid <= player.cash) {
          console.log(`[AI Auction] ${player.name} placing bid of £${nextBid}`);
          actions.placeBid(playerIndex, nextBid);
        } else {
          console.log(`[AI Auction] ${player.name} passing (nextBid £${nextBid} > maxBid £${maxBid} or cash)`);
          actions.passAuction(playerIndex);
        }
      } else {
        console.log(`[AI Auction] ${player.name} (${playerIndex}) is not active bidder (active: ${auction.activePlayerIndex})`);
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
  if (!trade) return;
  
  // Handle counter-offers: AI is the original initiator responding to a counter-offer
  if (trade.status === "counter_pending" && trade.counterOffer) {
    const { counterOffer, offer } = trade;
    // The original initiator (who made the first offer) needs to respond
    const aiPlayerIndex = offer.fromPlayer;
    const aiPlayer = state.players[aiPlayerIndex];
    
    // Only process if this is an AI player
    if (!aiPlayer || !aiPlayer.isAI) return;
    
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

    // In a counter-offer, roles are reversed:
    // - counterOffer.fromPlayer (original receiver) is offering things
    // - counterOffer.toPlayer (original initiator/AI) is receiving things
    // So for the AI: valueReceived = what they get, valueGiven = what they give
    const valueReceived = calculateValuation(
      aiPlayerIndex, 
      counterOffer.cashRequested,  // AI receives cash
      counterOffer.propertiesRequested,  // AI receives properties
      counterOffer.jailCardsRequested  // AI receives jail cards
    );
    const valueGiven = calculateValuation(
      aiPlayerIndex,
      counterOffer.cashOffered,  // AI gives cash
      counterOffer.propertiesOffered,  // AI gives properties
      counterOffer.jailCardsOffered  // AI gives jail cards
    );
    
    if (valueReceived >= valueGiven * 0.95) {
      actions.acceptCounterOffer();
    } else {
      // Reject the counter-offer (goes back to original offer)
      actions.rejectTrade();
    }
    return;
  }
  
  // Handle initial trade proposals: AI is the receiver
  if (trade.status !== "pending") return;
  
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
