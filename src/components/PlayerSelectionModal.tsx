import React from "react";
import { motion } from "framer-motion";
import { useGameStore } from "../store/gameStore";
import { useLocalStore } from "../store/localStore";

export const PlayerSelectionModal = () => {
  const players = useGameStore((s) => s.players);
  const phase = useGameStore((s) => s.phase);
  const { myPlayerIndex, setMyPlayerIndex } = useLocalStore();

  if (phase === "setup" || myPlayerIndex !== null) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          backgroundColor: "#1a1a2a",
          padding: "32px",
          borderRadius: "16px",
          width: "400px",
          textAlign: "center",
          color: "#fff",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <h2 style={{ marginBottom: "24px", color: "#4ECDC4" }}>Who are you?</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {players.map((player, index) => (
            <motion.button
              key={player.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setMyPlayerIndex(index)}
              disabled={player.bankrupt || player.isAI}
              style={{
                padding: "16px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: player.isAI ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.1)",
                color: "#fff",
                cursor: player.isAI ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                opacity: player.bankrupt ? 0.5 : 1,
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: player.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                }}
              >
                {player.token}
              </div>
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ fontWeight: "bold" }}>{player.name}</div>
                <div style={{ fontSize: "12px", color: "#ccc" }}>
                  {player.isAI ? "AI Player" : "Human Player"}
                </div>
              </div>
              {player.isAI && <span style={{ fontSize: "12px", color: "#FF9800" }}>(Taken)</span>}
            </motion.button>
          ))}
        </div>
        
        <div style={{ marginTop: "24px", fontSize: "14px", color: "#666" }}>
          Select a human player to control.
        </div>
      </motion.div>
    </div>
  );
};
