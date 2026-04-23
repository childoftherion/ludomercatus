/**
 * Debt logic utilities
 * Pure functions for IOU calculations, Chapter 11, and foreclosure
 */

import type { IOU, Player } from "../../types/game"

/**
 * Calculate total amount owed on an IOU (principal + interest)
 * @param iou - The IOU to calculate
 * @returns Total amount owed
 */
export function calculateTotalOwed(iou: IOU): number {
  const currentPrincipal = iou.currentAmount
  const interestDue = iou.interestDue || 0
  return currentPrincipal + interestDue
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
  const paymentTowardsInterest = Math.min(paymentAmount, interestDue)
  const paymentTowardsPrincipal = paymentAmount - paymentTowardsInterest
  return { paymentTowardsInterest, paymentTowardsPrincipal }
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
  remainingInterest: number
  remainingPrincipal: number
  iouPaidOff: boolean
} {
  const remainingInterest = interestDue - paymentTowardsInterest
  const remainingPrincipal = currentPrincipal - paymentTowardsPrincipal
  const iouPaidOff = remainingPrincipal <= 0
  return { remainingInterest, remainingPrincipal, iouPaidOff }
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
  const jackpotShare = Math.floor(paymentTowardsPrincipal * jackpotCutRate)
  const creditorShare = paymentTowardsPrincipal - jackpotShare
  return { jackpotShare, creditorShare }
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
  )
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
  return Math.ceil(debtAmount / turnsToRepay)
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
  return playerCash >= debtTarget && turnsRemaining <= 1
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
  return playerCash < debtTarget && turnsRemaining <= 1
}
