import indexHtml from "./index.html";
import { GameManager } from "./src/server/GameManager";
import type { GameRoom } from "./src/server/GameRoom";
import type { GameState } from "./src/types/game";
import type {
  SnapshotReason,
  StateSnapshotMessage,
} from "./src/types/sync";

const gameManager = GameManager.getInstance();
const defaultRoom = gameManager.createRoom("default");

const PORT = Number(process.env.PORT ?? 7070);

/** Build the authoritative snapshot payload sent on join and on resync. */
const snapshotMessage = (
  state: GameState,
  reason: SnapshotReason,
  sinceVersion: unknown,
): StateSnapshotMessage => ({
  type: "STATE_SNAPSHOT",
  state,
  reason,
  sinceVersion:
    typeof sinceVersion === "number" && Number.isFinite(sinceVersion)
      ? sinceVersion
      : null,
});

const server = Bun.serve<{ roomId: string; clientId: string | null }>({
  port: PORT,
  routes: {
    "/": indexHtml,
  },
  fetch(req: Request, server: any) {
    const url = new URL(req.url);
    if (url.pathname === "/favicon.ico") {
      return new Response(null, { status: 204 });
    }
    if (url.pathname === "/ws") {
      const clientId = url.searchParams.get("clientId");
      if (server.upgrade(req, { data: { roomId: "default", clientId } })) {
        return;
      }
      return new Response("WebSocket upgrade failed", { status: 400 });
    }
    return new Response("Not found", { status: 404 });
  },
  websocket: {
    open(ws: any) {
      // ws.subscribe("default");
      // ws.send(JSON.stringify({ type: "STATE_UPDATE", state: defaultRoom.state }));
      // Do nothing on open, wait for client to list/join/create
    },
    message(ws: any, message: any) {
      try {
        const data = JSON.parse(
          typeof message === "string"
            ? message
            : new TextDecoder().decode(message),
        );

        if (data.type === "PING") {
          ws.send(JSON.stringify({ type: "PONG" }));
          return;
        }

        // Room Management
        if (data.type === "CREATE_ROOM") {
          const roomId = Math.random().toString(36).substring(7);
          const mode = data.mode || "single";
          const settings = data.settings || {};

          // For single-player, include player data in the create request
          const playerData = data.playerData; // { names, tokens, isAIFlags, aiDifficulties, clientIds }

          const room = gameManager.createRoom(roomId, mode, settings);

          // Setup broadcast for new room
          room.subscribe((state) => {
            server.publish(
              roomId,
              JSON.stringify({ type: "STATE_UPDATE", state }),
            );
          });

          // For single-player mode, automatically initialize the game
          if (mode === "single" && playerData) {
            const { names, tokens, isAIFlags, aiDifficulties, clientIds } =
              playerData;
            room.initGame(
              names,
              tokens,
              isAIFlags,
              aiDifficulties,
              clientIds,
              settings,
            );
          }

          ws.send(JSON.stringify({ type: "ROOM_CREATED", roomId }));
          return;
        }

        if (data.type === "CREATE_SINGLE_PLAYER_GAME") {
          const roomId = Math.random().toString(36).substring(7);
          const { playerData, settings } = data;
          const { names, tokens, isAIFlags, aiDifficulties, clientIds } =
            playerData;

          const room = gameManager.createRoom(roomId, "single", settings);

          // Setup broadcast for new room
          room.subscribe((state) => {
            server.publish(
              roomId,
              JSON.stringify({ type: "STATE_UPDATE", state }),
            );
          });

          // Initialize the game immediately for single-player
          room.initGame(
            names,
            tokens,
            isAIFlags,
            aiDifficulties,
            clientIds,
            settings,
          );

          ws.send(JSON.stringify({ type: "ROOM_CREATED", roomId }));
          return;
        }

        if (data.type === "LIST_ROOMS") {
          ws.send(
            JSON.stringify({
              type: "ROOM_LIST",
              rooms: gameManager.getRoomList(),
            }),
          );
          return;
        }

        if (data.type === "JOIN_ROOM") {
          const { roomId } = data;
          const room = gameManager.getRoom(roomId);
          if (room) {
            ws.unsubscribe(ws.data.roomId);
            ws.data.roomId = roomId;
            // Subscribe before snapshotting so no mutation can slip through
            // between the snapshot and the start of broadcasts.
            ws.subscribe(roomId);

            // Notify room of reconnection if clientId matches a player
            if (typeof (room as any).handlePlayerReconnect === "function") {
              (room as any).handlePlayerReconnect(ws.data.clientId);
            }

            // Always answer a join with a full snapshot: a reconnecting client
            // may have missed any number of broadcasts while offline.
            ws.send(
              JSON.stringify(
                snapshotMessage(room.state, "join", data.sinceVersion),
              ),
            );
          }
          return;
        }

        // Client detected a gap in the broadcast sequence (typically after a
        // reconnect) and wants the authoritative state.
        if (data.type === "REQUEST_STATE") {
          const room: GameRoom | undefined = gameManager.getRoom(
            ws.data.roomId,
          );
          // No room means the client's subscription is stale; it needs to
          // re-join, and a silent reply keeps that decision on the client.
          if (room) {
            ws.send(
              JSON.stringify(
                snapshotMessage(room.state, "resync", data.sinceVersion),
              ),
            );
          }
          return;
        }

        // Game Action
        if (data.type === "ACTION") {
          gameManager.touchRoom(ws.data.roomId);
          const { action, payload } = data;
          const room = gameManager.getRoom(ws.data.roomId);

          if (room && typeof (room as any)[action] === "function") {
            const authorization =
              typeof (room as any).authorizeAction === "function"
                ? (room as any).authorizeAction(
                    ws.data.clientId,
                    action,
                    payload,
                  )
                : { allowed: true, payload };

            if (!authorization.allowed) {
              ws.send(
                JSON.stringify({
                  type: "ERROR",
                  message: authorization.error ?? "Action not allowed",
                }),
              );
              return;
            }

            console.log(`[${ws.data.roomId}] Action: ${action}`);
            (room as any)[action](...(authorization.payload ?? payload));
            // State update is handled by subscription
          }
        }
      } catch (e) {
        console.error("Failed to process message", e);
      }
    },
    close(ws: any) {
      ws.unsubscribe(ws.data.roomId);
      const room = gameManager.getRoom(ws.data.roomId);
      if (room && typeof (room as any).handlePlayerDisconnect === "function") {
        (room as any).handlePlayerDisconnect(ws.data.clientId);
      }
    },
  },
  development: true,
});

// Setup broadcast for default room
defaultRoom.subscribe((state) => {
  server.publish("default", JSON.stringify({ type: "STATE_UPDATE", state }));
});

console.log(`Server running on http://localhost:${server.port}`);
