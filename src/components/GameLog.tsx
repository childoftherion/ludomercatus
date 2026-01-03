import React, { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "../store/gameStore";
import type { GameLogEntry } from "../types/game";

const getLogIcon = (type: GameLogEntry["type"]): string => {
  switch (type) {
    case "roll": return "🎲";
    case "move": return "🚶";
    case "buy": return "🏠";
    case "rent": return "💰";
    case "card": return "🃏";
    case "jail": return "🔒";
    case "tax": return "📋";
    case "auction": return "🔨";
    case "trade": return "🤝";
    case "bankrupt": return "💸";
    case "system": return "📢";
    default: return "•";
  }
};

const getLogColor = (type: GameLogEntry["type"]): string => {
  switch (type) {
    case "roll": return "#4ECDC4";
    case "move": return "#45B7D1";
    case "buy": return "#96CEB4";
    case "rent": return "#FFD93D";
    case "card": return "#DDA0DD";
    case "jail": return "#FF6B6B";
    case "tax": return "#F7DC6F";
    case "auction": return "#E17055";
    case "trade": return "#00B894";
    case "bankrupt": return "#D63031";
    case "system": return "#74B9FF";
    default: return "#999";
  }
};

export const GameLog = () => {
  const { gameLog, players } = useGameStore();
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top when new entries are added (newest at top)
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = 0;
    }
  }, [gameLog.length]);

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  return (
    <div
      style={{
        background: "rgba(30, 30, 30, 0.95)",
        borderRadius: "10px",
        padding: "12px",
        height: "100%", // Use full height of parent container
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        overflow: "hidden", // Prevent scrollbars
      }}
    >
      <h3
        style={{
          margin: "0 0 8px 0",
          color: "#fff",
          fontSize: "12px",
          fontWeight: 600,
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          paddingBottom: "6px",
        }}
      >
        Game Log
      </h3>
      <div
        ref={logContainerRef}
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden", // Prevent horizontal scrollbars
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          minHeight: 0, // Allow flex shrinking
        }}
      >
        <AnimatePresence>
          {gameLog.length === 0 ? (
            <div
              style={{
                color: "rgba(255,255,255,0.4)",
                fontSize: "12px",
                textAlign: "center",
                padding: "20px",
              }}
            >
              Game events will appear here...
            </div>
          ) : (
            [...gameLog].reverse().map((entry) => {
              const player = entry.playerIndex !== undefined ? players[entry.playerIndex] : undefined;
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "6px",
                    padding: "4px 6px",
                    borderRadius: "4px",
                    background: "rgba(255,255,255,0.05)",
                    borderLeft: `2px solid ${getLogColor(entry.type)}`,
                  }}
                >
                  <span style={{ fontSize: "12px" }}>{getLogIcon(entry.type)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        color: "#fff",
                        fontSize: "11px",
                        lineHeight: 1.3,
                        wordBreak: "break-word",
                      }}
                    >
                      {entry.message}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        marginTop: "1px",
                      }}
                    >
                      {player && (
                        <span
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            background: player.color,
                          }}
                        />
                      )}
                      <span
                        style={{
                          color: "rgba(255,255,255,0.4)",
                          fontSize: "9px",
                        }}
                      >
                        {formatTime(entry.timestamp)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default GameLog;
