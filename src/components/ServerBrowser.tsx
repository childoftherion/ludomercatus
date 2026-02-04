import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { useGameStore } from "../store/gameStore";

export const ServerBrowser = () => {
  const rooms = useGameStore((s) => s.rooms);
  const listRooms = useGameStore((s) => s.listRooms);
  const createRoom = useGameStore((s) => s.createRoom);
  const joinRoom = useGameStore((s) => s.joinRoom);

  useEffect(() => {
    // Poll for rooms
    const interval = setInterval(listRooms, 2000);
    listRooms();
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: "#1a1a2a",
        padding: "40px",
        gap: "24px",
        color: "#fff",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          borderRadius: "16px",
          padding: "40px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
          textAlign: "center",
          maxWidth: "600px",
          width: "100%",
        }}
      >
        <h1 style={{ fontSize: "42px", color: "#2E8B57", marginBottom: "8px", fontWeight: 700 }}>
          Ludomercatus
        </h1>
        <p style={{ color: "#aaa", marginBottom: "32px", fontSize: "16px" }}>
          Choose your game mode
        </p>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => createRoom("single")}
          style={{
            padding: "20px 40px",
            fontSize: "18px",
            fontWeight: 600,
            backgroundColor: "#2E8B57",
            color: "#fff",
            border: "none",
            borderRadius: "12px",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(46, 139, 87, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            width: "100%",
            marginBottom: "32px",
          }}
        >
          <span style={{ fontSize: "24px" }}>🎮</span>
          Single Player
        </motion.button>

        <div style={{ 
          display: "flex", 
          flexDirection: "column", 
          gap: "16px", 
          padding: "24px", 
          backgroundColor: "rgba(0,0,0,0.2)", 
          borderRadius: "12px",
          width: "100%",
          boxSizing: "border-box",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: "20px", color: "#4ECDC4", margin: 0 }}>Multiplayer Lobby</h2>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => createRoom("multi")}
              style={{
                padding: "8px 16px",
                fontSize: "14px",
                fontWeight: "bold",
                backgroundColor: "#4169E1",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              + New Room
            </motion.button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "200px", overflowY: "auto" }}>
            {rooms.length === 0 ? (
              <div style={{ color: "#aaa", fontStyle: "italic", padding: "12px" }}>No public rooms. Create one!</div>
            ) : (
              rooms.map((room) => (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px",
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    borderRadius: "6px",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontWeight: "bold", fontSize: "14px" }}>Room {room.id}</div>
                    <div style={{ fontSize: "12px", color: "#aaa" }}>{room.players} players</div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => joinRoom(room.id)}
                    style={{
                      padding: "6px 16px",
                      fontSize: "12px",
                      backgroundColor: "#2196F3",
                      color: "#fff",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    Join
                  </motion.button>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
