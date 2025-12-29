import indexHtml from "./index.html";
import { GameManager } from "./src/server/GameManager";

const gameManager = GameManager.getInstance();
const defaultRoom = gameManager.createRoom("default");

Bun.serve({
  port: 3000,
  routes: {
    "/": indexHtml,
  },
  fetch(req, server) {
    const url = new URL(req.url);
    if (url.pathname === "/ws") {
      if (server.upgrade(req)) {
        return;
      }
      return new Response("WebSocket upgrade failed", { status: 400 });
    }
    return new Response("Not found", { status: 404 });
  },
  websocket: {
    open(ws) {
      ws.subscribe("default");
      ws.send(JSON.stringify({ type: "STATE_UPDATE", state: defaultRoom.state }));
    },
    message(ws, message) {
      try {
        const data = JSON.parse(typeof message === "string" ? message : new TextDecoder().decode(message));
        
        if (data.type === "ACTION") {
          const { action, payload } = data;
          if (typeof (defaultRoom as any)[action] === "function") {
            console.log(`Executing action: ${action}`, payload);
            (defaultRoom as any)[action](...payload);
            const updateMsg = JSON.stringify({ type: "STATE_UPDATE", state: defaultRoom.state });
            ws.publish("default", updateMsg);
            ws.send(updateMsg);
          }
        }
      } catch (e) {
        console.error("Failed to process message", e);
      }
    },
    close(ws) {
      ws.unsubscribe("default");
    },
  },
  development: true,
});

console.log("Server running on http://localhost:3000");
