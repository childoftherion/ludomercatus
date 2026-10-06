import type { GameState } from "./game";

/**
 * Wire protocol shared by the Bun WebSocket server (`index.ts`) and the client
 * store (`src/store/gameStore.ts`).
 *
 * State synchronisation has two message kinds:
 *
 * - `STATE_UPDATE` is a broadcast pushed on every mutation. It is *not* assumed
 *   to be contiguous: a client that observes `version > lastVersion + 1` knows it
 *   missed at least one update and must resynchronise.
 * - `STATE_SNAPSHOT` is an authoritative full state, sent in reply to
 *   `JOIN_ROOM` and `REQUEST_STATE`. It is always applied, regardless of the
 *   version comparison.
 */

/** Why the server produced a snapshot; useful for client-side logging. */
export type SnapshotReason = "join" | "resync";

/** Broadcast pushed after every room mutation. */
export interface StateUpdateMessage {
  type: "STATE_UPDATE";
  state: GameState;
}

/** Authoritative full state, sent on join and on demand. */
export interface StateSnapshotMessage {
  type: "STATE_SNAPSHOT";
  state: GameState;
  reason: SnapshotReason;
  /**
   * Number of mutations the client had already applied when it asked, or `null`
   * when it had no usable baseline (first join, epoch change).
   */
  sinceVersion: number | null;
}

/** Client asks for an authoritative snapshot (used to close version gaps). */
export interface RequestStateMessage {
  type: "REQUEST_STATE";
  sinceVersion?: number;
}

/** Client (re)subscribes to a room's broadcasts. */
export interface JoinRoomMessage {
  type: "JOIN_ROOM";
  roomId: string;
  /**
   * Last version the client applied, so the server can report whether the
   * client is fully caught up. `undefined` on a first join.
   */
  sinceVersion?: number;
}

export type ServerMessage =
  | StateUpdateMessage
  | StateSnapshotMessage
  | { type: "PONG" }
  | { type: "ROOM_LIST"; rooms: unknown[] }
  | { type: "ROOM_CREATED"; roomId: string }
  | { type: "ERROR"; message: string };

export type ClientSyncMessage =
  | RequestStateMessage
  | JoinRoomMessage
  | { type: "PING" };

/**
 * Decide what the client should do with an incoming state payload.
 *
 * Kept as a pure function so the ordering rules are directly testable without
 * a WebSocket or a React tree.
 */
export type SyncDecision =
  /** Apply the payload as the new authoritative state. */
  | "apply"
  /**
   * Ignore the payload: it is a broadcast from the room's previous incarnation,
   * or a broadcast we have already applied.
   */
  | "ignore-stale"
  /**
   * Apply the payload and ask the server for a snapshot, because at least one
   * update was missed and this payload alone may not be enough.
   */
  | "apply-and-resync";

export interface SyncContext {
  /** Epoch the client currently believes it is synced to. */
  currentEpoch: string | null;
  /** Version the client currently has applied; -1 when it has no baseline. */
  currentVersion: number;
}

/**
 * Apply the staleness rules for a server payload.
 *
 * `isSnapshot` payloads bypass the version comparison because the server has
 * already decided they are the authoritative answer.
 */
export const decideSyncAction = (
  payload: { epoch: string; version: number },
  context: SyncContext,
  isSnapshot: boolean,
): SyncDecision => {
  // Without both an epoch and a version the client has no baseline at all, so
  // anything the server sends is the best information available.
  const hasBaseline =
    context.currentEpoch !== null && context.currentVersion >= 0;
  if (!hasBaseline) return "apply";

  // A snapshot is the server's authoritative answer to a join/resync, so it is
  // applied unconditionally. It is also the only message that may move the
  // client onto a new epoch.
  if (isSnapshot) return "apply";

  // A broadcast carrying a different epoch than we are synced to is a straggler
  // from the room's previous incarnation (the version comparison is meaningless
  // across epochs), so it must not be allowed to rewind the board. The client
  // only learns about a recreated room from a snapshot.
  if (payload.epoch !== context.currentEpoch) return "ignore-stale";

  if (payload.version <= context.currentVersion) return "ignore-stale";

  // A gap means broadcasts were missed while disconnected or throttled, so ask
  // for an authoritative snapshot even though this payload is newer.
  if (payload.version > context.currentVersion + 1) return "apply-and-resync";

  return "apply";
};