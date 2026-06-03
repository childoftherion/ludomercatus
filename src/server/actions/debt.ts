/**
 * Debt logic utilities
 * Pure functions for IOU calculations, Chapter 11, foreclosure, and debt validation
 */

import type { IOU, Player, GameState, Property } from "../../types/game";

/**
 * Calculate total amount owed on an IOU (principal + interest)
 * @param iou - The IOU to calculate
 * @returns Total amount owed
 */
export function calculateTotalOwed(iou: IOU): number {
  const currentPrincipal = iou.currentAmount;
  const interestDue = iou.interestDue || 0;
  return currentPrincipal + interestDue;
}

/**
 * Calculate payment allocation between interest and principal
 * @param paymentAmount - Total payment amount
 * @param interestDue - Interest currently due
 * @returns Payment allocation
 */
export function calculatePaymentAllocation(
  paymentAmount: number,
  interestDue: number,
): { paymentTowardsInterest: number; paymentTowardsPrincipal: number } {
  const paymentTowardsInterest = Math.min(paymentAmount, interestDue);
  const paymentTowardsPrincipal = paymentAmount - paymentTowardsInterest;
  return { paymentTowardsInterest, paymentTowardsPrincipal };
}

/**
 * Calculate remaining amounts after payment
 * @param currentPrincipal - Current principal amount
 * @param interestDue - Interest due before payment
 * @param paymentTowardsInterest - Payment applied to interest
 * @param paymentTowardsPrincipal - Payment applied to principal
 * @returns Remaining amounts and whether IOU is paid off
 */
export function calculateRemainingAmounts(
  currentPrincipal: number,
  interestDue: number,
  paymentTowardsInterest: number,
  paymentTowardsPrincipal: number,
): {
  remainingInterest: number;
  remainingPrincipal: number;
  iouPaidOff: boolean;
} {
  const remainingInterest = interestDue - paymentTowardsInterest;
  const remainingPrincipal = currentPrincipal - paymentTowardsPrincipal;
  const iouPaidOff = remainingPrincipal <= 0;
  return { remainingInterest, remainingPrincipal, iouPaidOff };
}

/**
 * Calculate jackpot share from IOU payment
 * @param paymentTowardsPrincipal - Payment applied to principal
 * @param jackpotCutRate - Jackpot cut rate (0-1)
 * @returns Jackpot share and creditor share
 */
export function calculateJackpotShare(
  paymentTowardsPrincipal: number,
  jackpotCutRate: number,
): { jackpotShare: number; creditorShare: number } {
  const jackpotShare = Math.floor(paymentTowardsPrincipal * jackpotCutRate);
  const creditorShare = paymentTowardsPrincipal - jackpotShare;
  return { jackpotShare, creditorShare };
}

/**
 * Validate payment amount
 * @param paymentAmount - Payment amount to validate
 * @param debtorCash - Debtor's available cash
 * @param totalOwed - Total amount owed
 * @returns Whether payment is valid
 */
export function validatePaymentAmount(
  paymentAmount: number,
  debtorCash: number,
  totalOwed: number,
): boolean {
  return (
    paymentAmount > 0 &&
    paymentAmount <= debtorCash &&
    paymentAmount <= totalOwed
  );
}

/**
 * Calculate Chapter 11 debt target based on debt amount
 * @param debtAmount - Original debt amount
 * @param turnsToRepay - Number of turns to repay
 * @returns Debt target per turn
 */
export function calculateChapter11DebtTarget(
  debtAmount: number,
  turnsToRepay: number,
): number {
  return Math.ceil(debtAmount / turnsToRepay);
}

/**
 * Check if Chapter 11 should succeed
 * @param playerCash - Player's current cash
 * @param debtTarget - Debt target to reach
 * @param turnsRemaining - Turns remaining in Chapter 11
 * @returns Whether Chapter 11 should succeed
 */
export function shouldChapter11Succeed(
  playerCash: number,
  debtTarget: number,
  turnsRemaining: number,
): boolean {
  return playerCash >= debtTarget && turnsRemaining <= 1;
}

/**
 * Check if Chapter 11 should fail (bankruptcy)
 * @param playerCash - Player's current cash
 * @param debtTarget - Debt target to reach
 * @param turnsRemaining - Turns remaining in Chapter 11
 * @returns Whether Chapter 11 should fail
 */
export function shouldChapter11Fail(
  playerCash: number,
  debtTarget: number,
  turnsRemaining: number,
): boolean {
  return playerCash < debtTarget && turnsRemaining <= 1;
}

// ============================================================================
// IOU Management Functions
// ============================================================================

/**
 * Create a new IOU record
 * @param debtorId - Player ID of the debtor
 * @param creditorId - Player ID of the creditor
 * @param amount - Original debt amount
 * @param interestRate - Interest rate per round
 * @param durationRounds - How many rounds the IOU is valid
 * @param reason - Description of the debt
 * @param nextId - Next available IOU ID
 * @param jackpotCutRate - Optional percentage going to jackpot
 * @returns New IOU and incremented ID
 */
export function createIOU(
  debtorId: number,
  creditorId: number,
  amount: number,
  interestRate: number = 0.05,
  durationRounds: number = 5,
  reason: string = "Debt",
  nextId: number = 1,
  jackpotCutRate: number = 0,
): { iou: IOU; nextId: number } {
  const iou: IOU = {
    id: nextId,
    debtorId,
    creditorId,
    originalAmount: amount,
    currentAmount: amount,
    interestRate,
    turnCreated: 0, // Will be set by caller
    reason,
    jackpotCutRate,
    interestDue: 0,
    interestFraction: 0,
    durationRounds,
    roundsRemaining: durationRounds,
  };
  return { iou, nextId: nextId + 1 };
}

/**
 * Settle an IOU completely - remove it and update cash
 * @param iou - The IOU to settle
 * @param creditorCash - Current creditor cash (will be increased)
 * @param jackpotCutRate - Percentage going to jackpot
 * @returns { creditorCash: number, jackpotShare: number }
 */
export function settleIOU(
  iou: IOU,
  creditorCash: number,
  jackpotCutRate: number = 0,
): { creditorCash: number; jackpotShare: number } {
  const totalOwed = calculateTotalOwed(iou);
  const jackpotShare = Math.floor(totalOwed * jackpotCutRate);
  const creditorShare = totalOwed - jackpotShare;

  return {
    creditorCash: creditorCash + creditorShare,
    jackpotShare,
  };
}

/**
 * Calculate interest due when a player passes GO
 * @param iou - The IOU to calculate interest for
 * @returns Interest accumulated during this circuit
 */
export function calculateInterestOnGo(iou: IOU): {
  interestDue: number;
  interestFraction: number;
} {
  const currentFraction = iou.interestFraction || 0;
  const newFraction = currentFraction + iou.interestRate / 12; // Monthly accumulation

  if (newFraction >= 1) {
    const wholeInterest = Math.floor(newFraction);
    return {
      interestDue: wholeInterest,
      interestFraction: newFraction - wholeInterest,
    };
  }

  return {
    interestDue: 0,
    interestFraction: newFraction,
  };
}

/**
 * Tick all IOUs for a player (called each turn)
 * Decrements roundsRemaining and calculates interest
 * @param player - The player whose IOUs to tick
 * @param currentRound - Current round number
 * @returns Updated IOUs array and next ID
 */
export function tickIOUs(
  player: Player,
  currentRound: number,
  nextId: number,
): { ious: IOU[]; nextId: number; expiredIOUs: IOU[] } {
  const expiredIOUs: IOU[] = [];
  const updatedIOUs = player.iousPayable
    .map((iou) => {
      const newRoundsRemaining = iou.roundsRemaining - 1;

      if (newRoundsRemaining <= 0) {
        expiredIOUs.push(iou);
        return null;
      }

      return {
        ...iou,
        roundsRemaining: newRoundsRemaining,
      };
    })
    .filter((iou): iou is IOU => iou !== null);

  return { ious: updatedIOUs, nextId, expiredIOUs };
}

/**
 * Calculate total debt including all loans and IOUs payable
 * @param player - The player to calculate for
 * @returns Total debt amount
 */
export function calculateTotalPlayerDebt(player: Player): number {
  const loanDebt = player.bankLoans.reduce(
    (sum, loan) => sum + loan.totalOwed,
    0,
  );
  const iouDebt = player.iousPayable.reduce(
    (sum, iou) => sum + calculateTotalOwed(iou),
    0,
  );
  return loanDebt + iouDebt;
}

/**
 * Calculate total receivables (IOUs owed to this player)
 * @param player - The player to calculate for
 * @returns Total receivable amount
 */
export function calculateTotalReceivables(player: Player): number {
  return player.iousReceivable.reduce(
    (sum, iou) => sum + calculateTotalOwed(iou),
    0,
  );
}

/**
 * Find the best property to seize in foreclosure
 * @param state - Current game state
 * @param debtorIndex - Index of the debtor player
 * @returns The most valuable un-mortgaged property, or null
 */
export function findBestForeclosureProperty(
  state: GameState,
  debtorIndex: number,
): { property: Property; value: number } | null {
  const debtorProperties = state.spaces
    .filter(
      (s): s is Property =>
        s.type === "property" || s.type === "railroad" || s.type === "utility",
    )
    .filter((p) => p.owner === debtorIndex && !p.mortgaged);

  if (debtorProperties.length === 0) return null;

  let bestProperty = debtorProperties[0]!;
  let bestValue = bestProperty.price || bestProperty.baseRent * 10;

  for (const prop of debtorProperties.slice(1)) {
    const value = prop.price || prop.baseRent * 10;
    if (value > bestValue) {
      bestProperty = prop;
      bestValue = value;
    }
  }

  return { property: bestProperty, value: bestValue };
}

/**
 * Validate debt invariants - ensures game state consistency
 * @param state - Current game state
 * @returns Validation result with any errors found
 */
export function validateDebtInvariants(state: GameState): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check that all IOUs have valid debtor/creditor references
  for (const player of state.players) {
    for (const iou of player.iousPayable) {
      if (iou.roundsRemaining < 0) {
        errors.push(
          `IOU ${iou.id} has negative roundsRemaining: ${iou.roundsRemaining}`,
        );
      }

      if (iou.currentAmount < 0) {
        errors.push(
          `IOU ${iou.id} has negative currentAmount: ${iou.currentAmount}`,
        );
      }

      // Check for orphaned IOUs (debtor doesn't exist)
      const debtor = state.players.find((p) => p.id === iou.debtorId);
      if (!debtor) {
        errors.push(
          `IOU ${iou.id} references non-existent debtor ${iou.debtorId}`,
        );
      }
    }

    for (const iou of player.iousReceivable) {
      // Check for orphaned receivable IOUs (creditor doesn't exist)
      const creditor = state.players.find((p) => p.id === iou.creditorId);
      if (!creditor) {
        errors.push(
          `Receivable IOU ${iou.id} references non-existent creditor ${iou.creditorId}`,
        );
      }
    }
  }

  // Check that totalDebt matches sum of loans
  for (const player of state.players) {
    const calculatedDebt = player.bankLoans.reduce(
      (sum, loan) => sum + loan.totalOwed,
      0,
    );
    if (Math.abs(player.totalDebt - calculatedDebt) > 1) {
      errors.push(
        `Player ${player.name} totalDebt (${player.totalDebt}) doesn't match sum of loans (${calculatedDebt})`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate the net worth adjustment for Chapter 11 status
 * Players in Chapter 11 have reduced effective net worth
 * @param state - Current game state
 * @param playerIndex - Player index
 * @returns Net worth adjustment factor (0-1)
 */
export function getChapter11NetWorthFactor(
  state: GameState,
  playerIndex: number,
): number {
  const player = state.players[playerIndex];
  if (!player || !player.inChapter11) {
    return 1.0;
  }

  // Chapter 11 players have 50% effective net worth
  return 0.5;
}

/**
 * Calculate the rent reduction for a Chapter 11 player
 * When a player in Chapter 11 owns properties, they collect reduced rent
 * @param baseRent - The base rent amount
 * @param playerIndex - Owner's player index
 * @returns Adjusted rent amount
 */
export function calculateChapter11Rent(
  baseRent: number,
  playerIndex: number,
  state: GameState,
): number {
  const player = state.players[playerIndex];
  if (!player || !player.inChapter11) {
    return baseRent;
  }

  // Chapter 11 players collect 50% of rent
  return Math.round(baseRent * 0.5);
}

/**
 * Check if a player should be eliminated (bankrupt and no assets)
 * @param state - Current game state
 * @param playerIndex - Player index to check
 * @returns Whether the player should be eliminated
 */
export function shouldEliminatePlayer(
  state: GameState,
  playerIndex: number,
): boolean {
  const player = state.players[playerIndex];
  if (!player) return false;

  if (!player.bankrupt) return false;

  // Check if player has any un-mortgaged properties
  const hasAssets = player.properties.some((propId) => {
    const space = state.spaces.find((s) => s.id === propId) as
      | Property
      | undefined;
    return space && !space.mortgaged;
  });

  // Check if player has any IOUs receivable
  const hasReceivables = player.iousReceivable.length > 0;

  return !hasAssets && !hasReceivables && player.cash <= 0;
}

/**
 * Process Chapter 11 turn - decrement turns and check success/failure
 * @param player - The player in Chapter 11
 * @param playerCash - Current cash (after rent/other income)
 * @returns Chapter 11 outcome
 */
export function processChapter11Turn(
  player: Player,
  playerCash: number,
): {
  continuing: boolean;
  succeeded: boolean;
  failed: boolean;
  message: string;
} {
  if (!player.inChapter11) {
    return {
      continuing: false,
      succeeded: false,
      failed: false,
      message: "Player is not in Chapter 11",
    };
  }

  const turnsRemaining = player.chapter11TurnsRemaining - 1;

  if (turnsRemaining <= 0) {
    if (playerCash >= player.chapter11DebtTarget) {
      return {
        continuing: false,
        succeeded: true,
        failed: false,
        message: `Chapter 11 succeeded! Paid $${player.chapter11DebtTarget}`,
      };
    } else {
      return {
        continuing: false,
        succeeded: false,
        failed: true,
        message: `Chapter 11 failed! Needed $${player.chapter11DebtTarget}, had $${playerCash}`,
      };
    }
  }

  return {
    continuing: true,
    succeeded: false,
    failed: false,
    message: `Chapter 11 ongoing: ${turnsRemaining} turns remaining, need $${player.chapter11DebtTarget}`,
  };
}
