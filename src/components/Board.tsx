import React from "react";
import { motion } from "framer-motion";
import { useGameStore } from "../store/gameStore";
import type { Property } from "../types/game";

const SPACE_SIZE = 80;
const BOARD_SIZE = 11;
const BOARD_PADDING = 20;

const getSpacePosition = (index: number) => {
  if (index === 0) return { row: 10, col: 10 }; // GO - bottom right
  if (index <= 9) return { row: 10, col: 10 - index }; // Bottom row (right to left)
  if (index === 10) return { row: 10, col: 0 }; // Jail - bottom left
  if (index <= 19) return { row: 10 - (index - 10), col: 0 }; // Left column (bottom to top)
  if (index === 20) return { row: 0, col: 0 }; // Free Parking - top left
  if (index <= 29) return { row: 0, col: index - 20 }; // Top row (left to right)
  if (index === 30) return { row: 0, col: 10 }; // Go To Jail - top right
  return { row: index - 30, col: 10 }; // Right column (top to bottom)
};

// Export for PlayerToken to use
export { getSpacePosition, SPACE_SIZE, BOARD_PADDING };

const getColorForSpace = (space: { type: string; colorGroup?: string | null }): string => {
  if (space.type === "railroad") return "#87CEEB";
  if (space.type === "utility") return "#90EE90";
  if (space.type === "property" && space.colorGroup) {
    const colors: Record<string, string> = {
      brown: "#8B4513",
      light_blue: "#87CEEB",
      pink: "#FF69B4",
      orange: "#FFA500",
      red: "#FF0000",
      yellow: "#FFD700",
      green: "#008000",
      dark_blue: "#00008B",
    };
    return colors[space.colorGroup] || "#f0f0f0";
  }
  if (space.type === "go") return "#32CD32";
  if (space.type === "jail") return "#808080";
  if (space.type === "go_to_jail") return "#FF6347";
  if (space.type === "free_parking") return "#FFD700";
  if (space.type === "tax") return "#DC143C";
  if (space.type === "chance" || space.type === "community_chest") return "#FF8C00";
  return "#f0f0f0";
};

const getSpaceIcon = (space: { type: string; name: string }) => {
  if (space.type === "railroad") return "🚂";
  if (space.type === "utility") return space.name.includes("Water") ? "💧" : "💡";
  if (space.type === "chance") return "❓";
  if (space.type === "community_chest") return "📦";
  if (space.type === "go") return "🏁";
  if (space.type === "jail") return "🔒";
  if (space.type === "go_to_jail") return "👮";
  if (space.type === "free_parking") return "🚗";
  if (space.type === "tax") return "💰";
  return null;
};

const Space = ({ space }: { space: { id: number; name: string; type: string; colorGroup?: string | null }; }) => {
  const pos = getSpacePosition(space.id);
  const spaces = useGameStore((s) => s.spaces);
  const property = spaces.find((s) => s.id === space.id) as Property | undefined;
  
  const icon = getSpaceIcon(space);
  const isPropertyType = space.type === "property";
  const color = getColorForSpace(space);

  return (
    <motion.div
      className={`space space-${space.type}`}
      style={{
        position: "absolute",
        width: SPACE_SIZE,
        height: SPACE_SIZE,
        left: pos.col * (SPACE_SIZE + 4) + BOARD_PADDING,
        top: pos.row * (SPACE_SIZE + 4) + BOARD_PADDING,
        backgroundColor: isPropertyType ? "#E8F5E9" : color,
        border: "1px solid #333",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: isPropertyType ? "flex-start" : "center",
        fontSize: "9px",
        fontWeight: "bold",
        color: "#333",
        borderRadius: "2px",
        textAlign: "center",
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }}
      whileHover={{ scale: 1.05, zIndex: 10 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* Property Color Bar */}
      {isPropertyType && (
        <div
          style={{
            width: "100%",
            height: "20%",
            backgroundColor: color,
            borderBottom: "1px solid #333",
            marginBottom: "4px",
          }}
        />
      )}

      {/* Content */}
      <div style={{ 
        flex: 1, 
        display: "flex", 
        flexDirection: "column", 
        alignItems: "center", 
        justifyContent: "center",
        padding: "2px",
        width: "100%"
      }}>
        {/* Icon for non-properties */}
        {icon && !isPropertyType && (
          <div style={{ fontSize: "24px", marginBottom: "4px" }}>{icon}</div>
        )}
        
        <div style={{ lineHeight: 1.1, fontSize: isPropertyType ? "8px" : "9px" }}>{space.name}</div>
        
        {/* Price or Icon for properties */}
        {property && (property.type === "property" || property.type === "railroad" || property.type === "utility") && (
          <div style={{ fontSize: "8px", marginTop: "2px", fontWeight: "normal" }}>£{property.price}</div>
        )}
        
        {/* Icon for properties (railroads/utilities) handled above, but maybe add small icons for properties? */}
        {icon && isPropertyType && (
           <div style={{ fontSize: "12px", marginTop: "2px" }}>{icon}</div>
        )}
      </div>
    </motion.div>
  );
};

export const Board = () => {
  const spaces = useGameStore((s) => s.spaces);
  
  const boardWidth = BOARD_SIZE * (SPACE_SIZE + 4) + BOARD_PADDING * 2;
  const boardHeight = BOARD_SIZE * (SPACE_SIZE + 4) + BOARD_PADDING * 2;

  return (
    <div
      id="game-board"
      style={{
        position: "relative",
        width: boardWidth + 16, // Add border width
        height: boardHeight + 16,
        backgroundColor: "#CDEAC0", 
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
        flexShrink: 0,
        border: "8px solid #2E8B57",
        boxSizing: "border-box",
      }}
    >
      {/* Render spaces */}
      {spaces.map((space) => (
        <Space
          key={space.id}
          space={space}
        />
      ))}

      {/* Center board area - Monopoly Logo */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          transformOrigin: "center",
          fontSize: "64px",
          fontWeight: "900",
          color: "rgba(0,0,0,0.1)",
          letterSpacing: "8px",
          pointerEvents: "none",
          userSelect: "none",
          textAlign: "center",
          rotate: "-45deg",
        }}
      >
        MONOPOLY
      </div>
    </div>
  );
};
