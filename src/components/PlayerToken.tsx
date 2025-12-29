import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "../store/gameStore";
import { getSpacePosition, SPACE_SIZE, BOARD_PADDING } from "./Board";

// Calculate pixel position for a token on the board
const getTokenPixelPosition = (playerIndex: number, position: number, totalPlayers: number) => {
  const spacePos = getSpacePosition(position);
  
  // Calculate offset within the space for multiple players
  const row = Math.floor(playerIndex / 2);
  const col = playerIndex % 2;
  const offsetX = 10 + col * 28;
  const offsetY = 10 + row * 28;
  
  return {
    x: spacePos.col * (SPACE_SIZE + 4) + BOARD_PADDING + offsetX,
    y: spacePos.row * (SPACE_SIZE + 4) + BOARD_PADDING + offsetY,
  };
};

export const PlayerToken = ({ playerIndex }: { playerIndex: number }) => {
  const player = useGameStore((s: any) => s.players[playerIndex]);
  const totalPlayers = useGameStore((s: any) => s.players.length);

  if (!player || player.bankrupt) return null;

  const { x, y } = getTokenPixelPosition(playerIndex, player.position, totalPlayers);

  return (
    <motion.div
      style={{
        position: "absolute",
        width: "28px",
        height: "28px",
        borderRadius: "50%",
        background: `radial-gradient(circle at 30% 30%, ${player.color}, #000)`,
        border: "2px solid #fff",
        boxShadow: `
          0 4px 6px rgba(0, 0, 0, 0.4),
          inset 0 -4px 4px rgba(0,0,0,0.2),
          inset 0 4px 4px rgba(255,255,255,0.4)
        `,
        zIndex: 50 + playerIndex,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "16px",
        cursor: "pointer",
      }}
      initial={{ x, y, scale: 0 }}
      animate={{ 
        x, 
        y, 
        scale: 1,
      }}
      transition={{ 
        type: "spring", 
        stiffness: 120, 
        damping: 14,
        mass: 0.8,
      }}
      whileHover={{ scale: 1.2, zIndex: 100 }}
      title={`${player.name} - £${player.cash}`}
    >
      <span style={{ filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.5))" }}>
        {player.token}
      </span>
    </motion.div>
  );
};

export const PlayerTokens = () => {
  const players = useGameStore((s: any) => s.players);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    >
      <AnimatePresence>
        {players.map((player: any, index: number) => (
          <div key={player.id} style={{ pointerEvents: "auto" }}>
            <PlayerToken playerIndex={index} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};
