import React from "react";
import { motion } from "framer-motion";
import { useGameStore } from "../store/gameStore";
import type { Property } from "../types/game";

// Responsive space size based on viewport - maximize board size for readability
const getSpaceSize = () => {
  if (typeof window === "undefined") return 80;
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  
  // Account for fixed UI elements (updated for optimized UI):
  // - GameLog on left: 180px + 8px margin + 8px spacing = 196px
  // - Main panel on right: 300px + 8px margin + 8px spacing = 316px
  // - Top burger menu: ~48px (reduced from 60px)
  // - Bottom UserPanel: ~52px (reduced from 60px)
  const leftPanelWidth = 196;
  const rightPanelWidth = 316;
  const topSpace = 48;
  const bottomSpace = 52;
  
  // Calculate available space for the board
  const availableWidth = vw - leftPanelWidth - rightPanelWidth;
  const availableHeight = vh - topSpace - bottomSpace;
  
  // Use the smaller available dimension to ensure board fits proportionally
  const minAvailable = Math.min(availableWidth, availableHeight);
  
  // Calculate size: use ~99.8% of available space for maximum board size, with 11 spaces per side
  // Board scales proportionally to screen size
  const calculatedSize = Math.floor((minAvailable * 0.998) / 11);
  
  // Clamp between 50 and 600 for better fit - increased max for very large screens
  const result = Math.max(50, Math.min(600, calculatedSize));
  
  return result;
};

const BOARD_SIZE = 11;
const BOARD_PADDING = 4;
const SPACE_GAP = 0; // Minimal gap for maximum space utilization

// Calculate dynamic values
let SPACE_SIZE = getSpaceSize();

const getSpacePosition = (index: number, spaceSize: number) => {
  if (index === 0) return { row: 10, col: 10 }; // GO - bottom right
  if (index <= 9) return { row: 10, col: 10 - index }; // Bottom row (right to left)
  if (index === 10) return { row: 10, col: 0 }; // Jail - bottom left
  if (index <= 19) return { row: 10 - (index - 10), col: 0 }; // Left column (bottom to top)
  if (index === 20) return { row: 0, col: 0 }; // Free Parking - top left
  if (index <= 29) return { row: 0, col: index - 20 }; // Top row (left to right)
  if (index === 30) return { row: 0, col: 10 }; // Go To Jail - top right
  return { row: index - 30, col: 10 }; // Right column (top to bottom)
};

// Store for board dimensions and position (for token positioning)
let boardDimensions: {
  spaceSize: number;
  boardLeft: number;
  boardTop: number;
  boardWidth: number;
  boardHeight: number;
} = {
  spaceSize: getSpaceSize(),
  boardLeft: 0,
  boardTop: 0,
  boardWidth: 0,
  boardHeight: 0,
};

// Callback to notify when board dimensions change
let boardDimensionsListeners: Set<() => void> = new Set();

export const subscribeToBoardDimensions = (callback: () => void) => {
  boardDimensionsListeners.add(callback);
  return () => {
    boardDimensionsListeners.delete(callback);
  };
};

// Export for PlayerToken to use
export const getSpacePositionForToken = (index: number) => {
  return getSpacePosition(index, boardDimensions.spaceSize);
};

export const getSpaceSizeForToken = () => boardDimensions.spaceSize;

export const getBoardDimensions = () => boardDimensions;

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

const Space = ({ space, spaceSize }: { space: { id: number; name: string; type: string; colorGroup?: string | null }; spaceSize: number }) => {
  const pos = getSpacePosition(space.id, spaceSize);
  const spaces = useGameStore((s) => s.spaces);
  const property = spaces.find((s) => s.id === space.id) as Property | undefined;
  
  const icon = getSpaceIcon(space);
  const isPropertyType = space.type === "property";
  const color = getColorForSpace(space);

  // Calculate font sizes based on space size - scale proportionally for larger boards
  // These scale dynamically as the board expands, ensuring property cards remain readable
  const fontSize = Math.max(9, Math.floor(spaceSize * 0.20)); // Increased from 0.18 for better readability on larger boards
  const priceFontSize = Math.max(8, Math.floor(spaceSize * 0.18)); // Increased from 0.16
  const iconSize = Math.max(16, Math.floor(spaceSize * 0.40)); // Increased from 0.35 for better visibility

  return (
    <motion.div
      className={`space space-${space.type}`}
      style={{
        position: "absolute",
        width: spaceSize,
        height: spaceSize,
        left: pos.col * (spaceSize + SPACE_GAP) + BOARD_PADDING,
        top: pos.row * (spaceSize + SPACE_GAP) + BOARD_PADDING,
        backgroundColor: isPropertyType ? "#E8F5E9" : color,
        border: "1px solid #333",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: isPropertyType ? "flex-start" : "center",
        fontSize: `${fontSize}px`,
        fontWeight: "bold",
        color: "#333",
        borderRadius: "3px",
        textAlign: "center",
        overflow: "hidden",
        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
      }}
      whileHover={{ scale: 1.08, zIndex: 10 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* Property Color Bar */}
      {isPropertyType && (
        <div
          style={{
            width: "100%",
            height: "25%",
            backgroundColor: color,
            borderBottom: "2px solid #333",
            marginBottom: "3px",
            position: "relative",
          }}
        >
          {/* Houses / Hotel */}
          {property && (property.houses > 0 || property.hotel) && (
            <div style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "100%",
              display: "flex",
              justifyContent: "center",
              gap: "1px",
              zIndex: 5
            }}>
              {property.hotel ? (
                <span style={{ fontSize: `${Math.floor(spaceSize * 0.2)}px`, filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.5))" }}>🏨</span>
              ) : (
                Array.from({ length: property.houses }).map((_, i) => (
                  <span key={i} style={{ fontSize: `${Math.floor(spaceSize * 0.15)}px`, filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.5))" }}>🏠</span>
                ))
              )}
            </div>
          )}
        </div>
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
          <div style={{ fontSize: `${iconSize}px`, marginBottom: "2px" }}>{icon}</div>
        )}
        
        <div style={{ lineHeight: 1.2, fontSize: `${fontSize}px`, padding: "2px 3px", fontWeight: "bold" }}>{space.name}</div>
        
        {/* Price or Icon for properties */}
        {property && (property.type === "property" || property.type === "railroad" || property.type === "utility") && (
          <div style={{ fontSize: `${priceFontSize}px`, marginTop: "1px", fontWeight: "normal" }}>£{property.price}</div>
        )}
        
        {/* Icon for properties (railroads/utilities) */}
        {icon && isPropertyType && (
           <div style={{ fontSize: `${Math.floor(iconSize * 0.7)}px`, marginTop: "1px" }}>{icon}</div>
        )}
      </div>
    </motion.div>
  );
};

export const Board = () => {
  const spaces = useGameStore((s) => s.spaces);
  const boardRef = React.useRef<HTMLDivElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [spaceSize, setSpaceSize] = React.useState(getSpaceSize());
  
  // Calculate space size based on actual container dimensions
  React.useEffect(() => {
    const updateSpaceSize = () => {
      if (!containerRef.current || !boardRef.current) return;
      
      const container = containerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      
      // Account for board border (6px on each side = 12px total)
      const borderWidth = 12;
      const availableWidth = containerWidth - borderWidth;
      const availableHeight = containerHeight - borderWidth;
      
      // Calculate space size based on both dimensions - use the smaller to maintain square board
      // Board expands to fill available space proportionally, positioned at top-left
      // Use maximum available space (99.8%) to ensure board fills screen
      const widthBasedSize = Math.floor((availableWidth * 0.998) / 11);
      const heightBasedSize = Math.floor((availableHeight * 0.998) / 11);
      
      // Use the smaller dimension to maintain square board, ensuring maximum expansion
      // This allows the board to expand down and to the right as much as possible
      // Board scales proportionally to screen size
      const calculatedSize = Math.min(widthBasedSize, heightBasedSize);
      
      // Clamp between 50 and 600 for better fit - increased max for very large screens
      // Property cards will scale proportionally with space size
      const result = Math.max(50, Math.min(600, calculatedSize));
      
      setSpaceSize(result);
      
      // Update board dimensions for token positioning
      // Board is positioned at top-left (0, 0) within the container
      // Note: boardWidth/Height in the style includes the border (12px total), so we match that here
      const actualBoardWidth = BOARD_SIZE * (result + SPACE_GAP) + BOARD_PADDING * 2 + 12; // +12 for border (6px each side)
      const actualBoardHeight = BOARD_SIZE * (result + SPACE_GAP) + BOARD_PADDING * 2 + 12;
      
      // Board is positioned at top-left (butting up against game log)
      const boardLeft = 0;
      const boardTop = 0;
      
      boardDimensions = {
        spaceSize: result,
        boardLeft: boardLeft,
        boardTop: boardTop,
        boardWidth: actualBoardWidth,
        boardHeight: actualBoardHeight,
      };
      
      // Notify all listeners that board dimensions have changed
      boardDimensionsListeners.forEach(callback => callback());
    };
    
    // Initial calculation
    updateSpaceSize();
    
    // Update on window resize
    const handleResize = () => {
      updateSpaceSize();
    };
    
    // Use ResizeObserver to watch container size changes
    let resizeObserver: ResizeObserver | null = null;
    if (containerRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(updateSpaceSize);
      resizeObserver.observe(containerRef.current);
    }
    
    window.addEventListener("resize", handleResize);
    
    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, []);
  
  const boardWidth = BOARD_SIZE * (spaceSize + SPACE_GAP) + BOARD_PADDING * 2;
  const boardHeight = BOARD_SIZE * (spaceSize + SPACE_GAP) + BOARD_PADDING * 2;
  
  // Calculate center area (smaller - about 2.5 spaces worth for better property visibility)
  const centerSize = (spaceSize + SPACE_GAP) * 2.5;
  const centerLeft = (boardWidth - centerSize) / 2;
  const centerTop = (boardHeight - centerSize) / 2;

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
      }}
    >
      <div
        ref={boardRef}
        id="game-board"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: boardWidth + 12, // Add border width
          height: boardHeight + 12,
          backgroundColor: "#CDEAC0", 
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
          border: "6px solid #2E8B57",
          boxSizing: "border-box",
          zIndex: 1, // Low z-index - board is behind modals and UserPanel
        }}
      >
      {/* Render spaces */}
      {spaces.map((space) => (
        <Space
          key={space.id}
          space={space}
          spaceSize={spaceSize}
        />
      ))}

      {/* Center board area - Reduced size for card display */}
      <div
        style={{
          position: "absolute",
          top: centerTop,
          left: centerLeft,
          width: centerSize,
          height: centerSize,
          backgroundColor: "#B8E6B8",
          borderRadius: "8px",
          border: "3px solid #2E8B57",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "inset 0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        {/* Ludomercatus Logo - Smaller */}
        <div
          style={{
            fontSize: `${Math.floor(centerSize * 0.15)}px`,
            fontWeight: "900",
            color: "rgba(0,0,0,0.15)",
            letterSpacing: "2px",
            pointerEvents: "none",
            userSelect: "none",
            textAlign: "center",
            rotate: "-45deg",
            position: "absolute",
          }}
        >
          LUDOMERCATUS
        </div>
        
        {/* Card display area will be rendered here by App.tsx */}
        <div id="board-center-card-area" style={{ 
          position: "relative", 
          width: "100%", 
          height: "100%",
          zIndex: 5 
        }} />
      </div>
    </div>
    </div>
  );
};
