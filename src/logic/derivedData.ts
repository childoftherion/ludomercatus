import type { GameState, GamePhase, Player, Property } from '../types/game';
import { calculateNetWorth, calculateMoneyInCirculation, calculateGiniCoefficient } from './rules/economics';

export const getActivePlayer = (state: GameState): Player | null => {
  const { 
    phase, 
    players, 
    currentPlayerIndex, 
    auction, 
    pendingForeclosure, 
    pendingRentNegotiation, 
    pendingDebtService, 
    pendingBankruptcy 
  } = state;

  let actorIndex = currentPlayerIndex;

  if (phase === 'auction' && auction) {
    actorIndex = auction.activePlayerIndex;
  } else if (phase === 'awaiting_foreclosure_decision' && pendingForeclosure) {
    actorIndex = pendingForeclosure.creditorIndex;
  } else if (phase === 'awaiting_rent_negotiation' && pendingRentNegotiation) {
    actorIndex = pendingRentNegotiation.status === 'creditor_decision'
      ? pendingRentNegotiation.creditorIndex
      : pendingRentNegotiation.debtorIndex;
  } else if (phase === 'awaiting_debt_service' && pendingDebtService) {
    actorIndex = pendingDebtService.playerIndex;
  } else if (phase === 'awaiting_bankruptcy_decision' && pendingBankruptcy) {
    actorIndex = pendingBankruptcy.playerIndex;
  }

  return players[actorIndex] ?? null;
};

export const getNetWorthRankings = (state: GameState): (Player & { netWorth: number })[] => {
  return state.players
    .map(player => ({
      ...player,
      netWorth: calculateNetWorth(state, player.id),
    }))
    .sort((a, b) => b.netWorth - a.netWorth);
};

export const getMoneyInCirculation = (state: GameState): number => {
  return calculateMoneyInCirculation(state);
};

export const getMyPlayerIndex = (players: Player[], clientId: string): number => {
  return players.findIndex(p => p.clientId === clientId);
};

export const getPhaseMessage = (
  phase: GamePhase,
  isMyTurn: boolean,
  currentPlayerName: string,
): string => {
  if (!isMyTurn) {
    const WAITING_MESSAGES: Partial<Record<GamePhase, string>> = {
      rolling: `Waiting for ${currentPlayerName} to roll...`,
      moving: `${currentPlayerName} is moving...`,
      resolving_space: `${currentPlayerName} is resolving their landing...`,
      awaiting_buy_decision: `${currentPlayerName} is deciding whether to buy...`,
      awaiting_tax_decision: `${currentPlayerName} is choosing a tax option...`,
      jail_decision: `${currentPlayerName} is deciding how to leave jail...`,
      auction: `Auction in progress...`,
      trading: `A trade is being negotiated...`,
      building: `${currentPlayerName} is managing properties...`,
      awaiting_rent_negotiation: `Rent negotiation in progress...`,
      awaiting_bankruptcy_decision: `${currentPlayerName} is facing bankruptcy...`,
      awaiting_debt_service: `${currentPlayerName} is settling debts...`,
      awaiting_foreclosure_decision: `Foreclosure decision pending...`,
    };
    return WAITING_MESSAGES[phase] ?? '';
  }

  const PHASE_MESSAGES: Partial<Record<GamePhase, string>> = {
    rolling: 'Roll the dice to move.',
    moving: 'Moving to your destination...',
    resolving_space: 'Resolve this space, then end your turn or manage properties.',
    awaiting_buy_decision: 'Buy this property or send it to auction.',
    awaiting_tax_decision: 'Choose flat tax or 10% of net worth.',
    jail_decision: 'Try to roll doubles, pay the fine, or use a card.',
    auction: 'Place your bid or pass.',
    trading: 'Review the trade proposal.',
    building: 'Build houses/hotels or mortgage properties.',
    awaiting_rent_negotiation: 'Negotiate the rent payment.',
    awaiting_bankruptcy_decision: 'Choose Chapter 11 restructuring or declare bankruptcy.',
    awaiting_debt_service: 'Pay your outstanding debts.',
    awaiting_foreclosure_decision: 'Decide how to handle the missed payment.',
  };
  return PHASE_MESSAGES[phase] ?? '';
};

export interface MarketStatusSummary {
  marketCondition: 'Normal' | 'Recession' | 'Crash' | 'Bull' | 'Bubble' | 'Yield Crisis';
  goSalary: number;
  housesRemaining: number;
  hotelsRemaining: number;
  moneyInCirculation: number;
  giniCoefficient: number;
  activePlayers: number;
  totalPlayers: number;
}

export const getMarketStatusSummary = (state: GameState): MarketStatusSummary => {
  const events = state.activeEconomicEvents ?? [];
  let marketCondition: MarketStatusSummary['marketCondition'] = 'Normal';

  for (const event of events) {
    if (event.type === 'recession') marketCondition = 'Recession';
    else if (event.type === 'market_crash') marketCondition = 'Crash';
    else if (event.type === 'bull_market') marketCondition = 'Bull';
    else if (event.type === 'market_crash_1') marketCondition = 'Bubble';
    else if (event.type === 'market_crash_2') marketCondition = 'Yield Crisis';
  }

  return {
    marketCondition,
    goSalary: state.currentGoSalary,
    housesRemaining: state.availableHouses,
    hotelsRemaining: state.availableHotels,
    moneyInCirculation: calculateMoneyInCirculation(state),
    giniCoefficient: calculateGiniCoefficient(state),
    activePlayers: state.players.filter(p => !p.bankrupt).length,
    totalPlayers: state.players.length,
  };
};
