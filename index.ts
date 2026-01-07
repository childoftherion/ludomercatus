// Authored by childoftherion
import indexHtml from "./index.html";
import { GameManager } from "./src/server/GameManager";

const gameManager = GameManager.getInstance();
const defaultRoom = gameManager.createRoom("default");

const server = Bun.serve<{ roomId: string }>({
  port: 3000,
  routes: {
    "/": indexHtml,
  },
  fetch(req, server) {
    const url = new URL(req.url);
    if (url.pathname === "/ws") {
      if (server.upgrade(req, { data: { roomId: "default" } })) {
        return;
      }
      return new Response("WebSocket upgrade failed", { status: 400 });
    }
    return new Response("Not found", { status: 404 });
  },
  websocket: {
    open(ws) {
      // ws.subscribe("default");
      // ws.send(JSON.stringify({ type: "STATE_UPDATE", state: defaultRoom.state }));
      // Do nothing on open, wait for client to list/join/create
    },
    message(ws, message) {
      try {
        const data = JSON.parse(typeof message === "string" ? message : new TextDecoder().decode(message));
        
        // Room Management
        if (data.type === "CREATE_ROOM") {
          const roomId = Math.random().toString(36).substring(7);
          const mode = data.mode || "single";
          const room = gameManager.createRoom(roomId, mode);
          
          // Setup broadcast for new room
          room.subscribe((state) => {
            server.publish(roomId, JSON.stringify({ type: "STATE_UPDATE", state }));
          });
          
          ws.send(JSON.stringify({ type: "ROOM_CREATED", roomId }));
          return;
        }
        
        if (data.type === "LIST_ROOMS") {
          ws.send(JSON.stringify({ type: "ROOM_LIST", rooms: gameManager.getRoomList() }));
          return;
        }
        
        if (data.type === "JOIN_ROOM") {
          const { roomId } = data;
          const room = gameManager.getRoom(roomId);
          if (room) {
            ws.unsubscribe(ws.data.roomId);
            ws.data.roomId = roomId;
            ws.subscribe(roomId);
            ws.send(JSON.stringify({ type: "STATE_UPDATE", state: room.state }));
          }
          return;
        }

        // Game Action
        if (data.type === "ACTION") {
          const { action, payload } = data;
          const room = gameManager.getRoom(ws.data.roomId);
          
          if (room && typeof (room as any)[action] === "function") {
            console.log(`[${ws.data.roomId}] Action: ${action}`);
            (room as any)[action](...payload);
            // State update is handled by subscription
          }
        }
      } catch (e) {
        console.error("Failed to process message", e);
      }
    },
    close(ws) {
      ws.unsubscribe(ws.data.roomId);
    },
  },
  development: true,
});

// Setup broadcast for default room
defaultRoom.subscribe((state) => {
  server.publish("default", JSON.stringify({ type: "STATE_UPDATE", state }));
});

console.log("Server running on http://localhost:3000");
