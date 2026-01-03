import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "../store/gameStore";
import { getSpacePositionForToken, getBoardDimensions, subscribeToBoardDimensions } from "./Board";

// Calculate pixel position for a token on the board
const getTokenPixelPosition = (
  playerIndex: number, 
  position: number, 
  playersOnSameSpace: number, // How many players are on this space (including this one)
  indexOnSpace: number // This player's index among players on the same space (0-based)
) => {
  const boardDims = getBoardDimensions();
  const spacePos = getSpacePositionForToken(position);
  const spaceSize = boardDims.spaceSize;
  const SPACE_GAP = 0; // Match Board.tsx
  const BOARD_PADDING = 4; // Match Board.tsx
  const BOARD_BORDER = 6; // Match Board.tsx border width
  const tokenSize = 28;
  
  // Calculate grid layout for multiple tokens on the same space
  // Arrange tokens in a grid: 1 token = center, 2 = side by side, 3-4 = 2x2 grid, etc.
  let cols = 1;
  let rows = 1;
  if (playersOnSameSpace === 1) {
    cols = 1;
    rows = 1;
  } else if (playersOnSameSpace === 2) {
    cols = 2;
    rows = 1;
  } else if (playersOnSameSpace <= 4) {
    cols = 2;
    rows = 2;
  } else {
    // For 5+ players, use 3 columns
    cols = 3;
    rows = Math.ceil(playersOnSameSpace / 3);
  }
  
  // Calculate this token's position in the grid
  const colInGrid = indexOnSpace % cols;
  const rowInGrid = Math.floor(indexOnSpace / cols);
  
  // Calculate spacing between tokens
  const spacing = 4; // 4px gap between tokens
  const totalTokenWidth = cols * tokenSize + (cols - 1) * spacing;
  const totalTokenHeight = rows * tokenSize + (rows - 1) * spacing;
  
  // Center the grid of tokens within the space
  const gridOffsetX = (spaceSize - totalTokenWidth) / 2;
  const gridOffsetY = (spaceSize - totalTokenHeight) / 2;
  
  // Calculate this token's offset within the grid
  const offsetX = gridOffsetX + colInGrid * (tokenSize + spacing);
  const offsetY = gridOffsetY + rowInGrid * (tokenSize + spacing);
  
  // Calculate position relative to the board container (accounting for border)
  const x = boardDims.boardLeft + BOARD_BORDER + spacePos.col * (spaceSize + SPACE_GAP) + BOARD_PADDING + offsetX;
  const y = boardDims.boardTop + BOARD_BORDER + spacePos.row * (spaceSize + SPACE_GAP) + BOARD_PADDING + offsetY;
  
  return { x, y };
};

export const PlayerToken = ({ playerIndex }: { playerIndex: number }) => {
  const players = useGameStore((s: any) => s.players);
  const player = players[playerIndex];
  const [position, setPosition] = React.useState({ x: 0, y: 0 });

  // Update position when player moves or board resizes
  React.useEffect(() => {
    const updatePosition = () => {
      if (player && !player.bankrupt) {
        // Find all players on the same space (including this one)
        const playersOnSameSpace = players.filter(
          (p: any) => !p.bankrupt && p.position === player.position
        );
        
        // Find this player's index among players on the same space
        const indexOnSpace = playersOnSameSpace.findIndex(
          (p: any) => p.id === player.id
        );
        
        const pos = getTokenPixelPosition(
          playerIndex, 
          player.position, 
          playersOnSameSpace.length,
          indexOnSpace
        );
        setPosition(pos);
      }
    };
    
    updatePosition();
    
    // Subscribe to board dimension changes
    const unsubscribe = subscribeToBoardDimensions(() => {
      // Small delay to ensure board has updated
      setTimeout(updatePosition, 10);
    });
    
    // Update on window resize to account for board dimension changes
    const handleResize = () => {
      // Small delay to ensure board has updated
      setTimeout(updatePosition, 50);
    };
    
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      unsubscribe();
    };
  }, [playerIndex, player?.position, players, player?.bankrupt, player?.id]);

  if (!player || player.bankrupt) return null;

  const { x, y } = position;

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
