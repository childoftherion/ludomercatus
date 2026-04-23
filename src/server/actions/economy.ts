/**
 * Economy logic utilities
 * Pure functions for economic events, GO salary, and jackpot calculations
 */

import type { ActiveEconomicEvent, EconomicEvent } from "../../types/game"

/**
 * Check if an economic event type is already active
 * @param activeEvents - Currently active economic events
 * @param eventType - Event type to check
 * @returns Whether the event is active
 */
export function isEconomicEventActive(
  activeEvents: ActiveEconomicEvent[],
  eventType: string,
): boolean {
  return activeEvents.some((e) => e.type === eventType)
}

/**
 * Find existing event index by type
 * @param activeEvents - Currently active economic events
 * @param eventType - Event type to find
 * @returns Index of existing event or -1 if not found
 */
export function findExistingEventIndex(
  activeEvents: ActiveEconomicEvent[],
  eventType: string,
): number {
  return activeEvents.findIndex((e) => e.type === eventType)
}

/**
 * Extend an existing economic event's duration
 * @param activeEvents - Currently active economic events
 * @param eventIndex - Index of event to extend
 * @param additionalTurns - Number of turns to add
 * @returns Updated active events array
 */
export function extendEventDuration(
  activeEvents: ActiveEconomicEvent[],
  eventIndex: number,
  additionalTurns: number,
): ActiveEconomicEvent[] {
  const updatedEvents = [...activeEvents]
  updatedEvents[eventIndex] = {
    ...updatedEvents[eventIndex]!,
    turnsRemaining: updatedEvents[eventIndex]!.turnsRemaining + additionalTurns,
  }
  return updatedEvents
}

/**
 * Add a new economic event
 * @param activeEvents - Currently active economic events
 * @param newEvent - New event to add
 * @returns Updated active events array
 */
export function addNewEvent(
  activeEvents: ActiveEconomicEvent[],
  newEvent: ActiveEconomicEvent,
): ActiveEconomicEvent[] {
  return [...activeEvents, newEvent]
}

/**
 * Update economic event durations (decrement by 1)
 * @param activeEvents - Currently active economic events
 * @returns Updated active events with expired events removed
 */
export function updateEventDurations(
  activeEvents: ActiveEconomicEvent[],
): { updatedEvents: ActiveEconomicEvent[]; expiredEvents: ActiveEconomicEvent[] } {
  const updatedEvents = activeEvents
    .map((event) => ({ ...event, turnsRemaining: event.turnsRemaining - 1 }))
    .filter((event) => event.turnsRemaining > 0)

  const expiredEvents = activeEvents.filter(
    (event) => !updatedEvents.find((e) => e.type === event.type),
  )

  return { updatedEvents, expiredEvents }
}

/**
 * Create an active economic event from an economic event definition
 * @param event - Economic event definition
 * @returns Active economic event
 */
export function createActiveEvent(event: EconomicEvent): ActiveEconomicEvent {
  return {
    type: event.type,
    turnsRemaining: event.duration,
    description: event.description,
  }
}
