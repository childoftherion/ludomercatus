import React from "react";
import { motion } from "framer-motion";
import { useGameStore } from "../store/gameStore";
import type { Property } from "../types/game";

// Responsive space size based on viewport - maximize board size for readability
const getSpaceSize = () => {
  if (typeof window === "undefined") return 80;
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const isMobile = vw <= 768;
  
  // Account for fixed UI elements (updated for optimized UI):
  // - GameLog on left: 180px + 8px margin + 8px spacing = 196px
  // - Main panel on right: 300px + 8px margin + 8px spacing = 316px
  // - Top burger menu: ~48px (reduced from 60px)
  // - Bottom UserPanel: ~52px (reduced from 60px)
  const leftPanelWidth = isMobile ? 0 : 196;
  const rightPanelWidth = isMobile ? 0 : 316;
  const topSpace = isMobile ? 60 : 48; // A bit more space at top for mobile
  const bottomSpace = isMobile ? 80 : 52; // More space for UserPanel on mobile
  
  // Calculate available space for the board
  const availableWidth = vw - (isMobile ? 20 : (leftPanelWidth + rightPanelWidth));
  const availableHeight = vh - topSpace - bottomSpace;
  
  // Use the smaller available dimension to ensure board fits proportionally
  const minAvailable = Math.min(availableWidth, availableHeight);
  
  // Calculate size: use ~99.8% of available space for maximum board size, with 11 spaces per side
  // Board scales proportionally to screen size
  const calculatedSize = Math.floor((minAvailable * 0.998) / 11);
  
  // Clamp between 40 and 600 for better fit - increased max for very large screens
  const result = Math.max(40, Math.min(600, calculatedSize));
  
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

const Space = ({ space, spaceSize, onPropertyClick }: { space: { id: number; name: string; type: string; colorGroup?: string | null }; spaceSize: number; onPropertyClick?: (property: Property) => void }) => {
  const pos = getSpacePosition(space.id, spaceSize);
  const spaces = useGameStore((s) => s.spaces);
  const property = spaces.find((s) => s.id === space.id) as Property | undefined;
  
  const icon = getSpaceIcon(space);
  const isPropertyType = space.type === "property";
  const isClickableProperty = property !== undefined && (space.type === "property" || space.type === "railroad" || space.type === "utility");
  const color = getColorForSpace(space);

  // Calculate font sizes based on space size - scale proportionally for larger boards
  // Optimized for better text fitting and readability
  const fontSize = Math.max(8, Math.floor(spaceSize * 0.16)); // Reduced to fit more text
  const priceFontSize = Math.max(7, Math.floor(spaceSize * 0.14)); // Reduced for better fit
  const iconSize = Math.max(14, Math.floor(spaceSize * 0.30)); // Reduced to make room for text

  return (
    <motion.div
      className={`space space-${space.type}`}
      style={{
        position: "absolute",
        width: spaceSize,
        height: spaceSize,
        left: pos.col * (spaceSize + SPACE_GAP) + BOARD_PADDING,
        top: pos.row * (spaceSize + SPACE_GAP) + BOARD_PADDING,
        backgroundColor: isPropertyType ? "#FFFFFF" : color,
        border: "2px solid #333",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: isPropertyType ? "flex-start" : "center",
        fontSize: `${fontSize}px`,
        fontWeight: "bold",
        color: "#333",
        borderRadius: "4px",
        textAlign: "center",
        overflow: "hidden",
        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
        cursor: isClickableProperty ? "pointer" : "default",
      }}
      whileHover={{ scale: 2.0, zIndex: 100 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      onClick={(e) => {
        e.stopPropagation();
        if (isClickableProperty && onPropertyClick) {
          onPropertyClick(property);
        }
      }}
    >
      {/* Property Color Bar - Increased visibility */}
      {isPropertyType && (
        <div
          style={{
            width: "100%",
            height: "30%",
            backgroundColor: color,
            borderBottom: "3px solid #333",
            position: "relative",
            minHeight: "20px",
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
        padding: "3px 2px",
        width: "100%",
        overflow: "hidden",
      }}>
        {/* Icon for non-properties */}
        {icon && !isPropertyType && (
          <div style={{ fontSize: `${iconSize}px`, marginBottom: "2px", flexShrink: 0 }}>{icon}</div>
        )}
        
        {/* Property name with word wrapping */}
        <div style={{ 
          lineHeight: 1.1, 
          fontSize: `${fontSize}px`, 
          padding: "1px 2px", 
          fontWeight: "bold",
          textAlign: "center",
          wordBreak: "break-word",
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: isPropertyType ? 2 : 3,
          WebkitBoxOrient: "vertical",
          maxHeight: isPropertyType ? `${fontSize * 2.2}px` : `${fontSize * 3.3}px`,
          width: "100%",
        }}>
          {space.name}
        </div>
        
        {/* Price or Icon for properties */}
        {property && (property.type === "property" || property.type === "railroad" || property.type === "utility") && (
          <div style={{ 
            fontSize: `${priceFontSize}px`, 
            marginTop: "1px", 
            fontWeight: "normal",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: "2px"
          }}>
            £{property.price}
            {property.valueMultiplier !== undefined && property.valueMultiplier !== 1.0 && (
              <span style={{ fontSize: `${Math.floor(priceFontSize * 0.8)}px` }}>
                {property.valueMultiplier > 1 ? "📈" : "📉"}
              </span>
            )}
          </div>
        )}
        
        {/* Icon for properties (railroads/utilities) */}
        {icon && isPropertyType && (
           <div style={{ 
             fontSize: `${Math.floor(iconSize * 0.6)}px`, 
             marginTop: "1px",
             flexShrink: 0,
           }}>
             {icon}
           </div>
        )}
      </div>

    </motion.div>
  );
};

export const Board = ({ onPropertyClick }: { onPropertyClick?: (property: Property) => void }) => {
  const spaces = useGameStore((s) => s.spaces);
  const jackpot = useGameStore((s) => s.jackpot);
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
      const isMobile = window.innerWidth <= 768;
      
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
      
      // Clamp between 40 and 600 for better fit - increased max for very large screens
      // Property cards will scale proportionally with space size
      const result = Math.max(40, Math.min(600, calculatedSize));
      
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
        overflow: "visible", // Allow hover tooltips to overflow
      }}
    >
      {/* LUDOMERCATUS Title at Top Center - Above Board */}
      <div
        style={{
          position: "absolute",
          top: "-45px",
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: `${Math.max(20, Math.floor(spaceSize * 0.35))}px`,
          fontWeight: "900",
          color: "#2E8B57",
          letterSpacing: "3px",
          textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
          pointerEvents: "none",
          userSelect: "none",
          zIndex: 10,
          whiteSpace: "nowrap",
        }}
      >
        LUDOMERCATUS
      </div>

      <div
        ref={boardRef}
        id="game-board"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: boardWidth + 12, // Add border width
          height: boardHeight + 12,
          backgroundColor: "#E8F5E9", 
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
          border: "6px solid #2E8B57",
          boxSizing: "border-box",
          zIndex: 1, // Low z-index - board is behind modals and UserPanel
          overflow: "visible", // Allow hover tooltips to overflow
        }}
      >

      {/* Render spaces */}
      {spaces.map((space) => (
        <Space
          key={space.id}
          space={space}
          spaceSize={spaceSize}
          onPropertyClick={onPropertyClick}
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
          backgroundColor: "#F0F8F0",
          borderRadius: "8px",
          border: "3px solid #2E8B57",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "inset 0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        {/* Card Stacks - Chance and Community Chest with dashed borders */}
        <div style={{
          position: "absolute",
          display: "flex",
          gap: `${centerSize * 0.2}px`,
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          zIndex: 2,
        }}>
          {/* Community Chest Card Stack - Top Left */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            style={{
              position: "relative",
              width: `${centerSize * 0.28}px`,
              height: `${centerSize * 0.28}px`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              border: "3px dashed #4169E1",
              borderRadius: "8px",
              backgroundColor: "rgba(65, 105, 225, 0.05)",
              padding: "4px",
            }}
          >
            {/* Stack effect - multiple cards */}
            {[0, 1, 2].map((offset) => (
              <div
                key={offset}
                style={{
                  position: "absolute",
                  width: `${centerSize * 0.22}px`,
                  height: `${centerSize * 0.30}px`,
                  backgroundColor: "#4169E1",
                  borderRadius: "6px",
                  border: "2px solid rgba(255,255,255,0.3)",
                  boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
                  transform: `translate(${offset * 2}px, ${offset * 2}px) rotate(${offset * -1.5}deg)`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 3 - offset,
                }}
              >
                {offset === 0 && (
                  <>
                    <div style={{ fontSize: `${Math.floor(centerSize * 0.10)}px`, marginBottom: "4px" }}>📦</div>
                    <div style={{ 
                      fontSize: `${Math.floor(centerSize * 0.055)}px`, 
                      fontWeight: "bold",
                      color: "#fff",
                      textAlign: "center",
                      padding: "0 4px",
                      lineHeight: 1.1,
                    }}>
                      COMMUNITY<br/>CHEST
                    </div>
                  </>
                )}
              </div>
            ))}
          </motion.div>

          {/* Chance Card Stack - Bottom Right */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
            style={{
              position: "relative",
              width: `${centerSize * 0.28}px`,
              height: `${centerSize * 0.28}px`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              border: "3px dashed #FF8C00",
              borderRadius: "8px",
              backgroundColor: "rgba(255, 140, 0, 0.05)",
              padding: "4px",
            }}
          >
            {/* Stack effect - multiple cards */}
            {[0, 1, 2].map((offset) => (
              <div
                key={offset}
                style={{
                  position: "absolute",
                  width: `${centerSize * 0.22}px`,
                  height: `${centerSize * 0.30}px`,
                  backgroundColor: "#FF8C00",
                  borderRadius: "6px",
                  border: "2px solid rgba(255,255,255,0.3)",
                  boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
                  transform: `translate(${offset * 2}px, ${offset * 2}px) rotate(${offset * 1.5}deg)`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 3 - offset,
                }}
              >
                {offset === 0 && (
                  <>
                    <div style={{ fontSize: `${Math.floor(centerSize * 0.10)}px`, marginBottom: "4px" }}>❓</div>
                    <div style={{ 
                      fontSize: `${Math.floor(centerSize * 0.055)}px`, 
                      fontWeight: "bold",
                      color: "#fff",
                      textAlign: "center",
                      padding: "0 4px",
                      lineHeight: 1.1,
                    }}>
                      CHANCE
                    </div>
                  </>
                )}
              </div>
            ))}
          </motion.div>
        </div>
        
        {/* Jackpot Display */}
        {jackpot > 0 && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              position: "absolute",
              bottom: `${centerSize * 0.08}px`,
              left: "50%",
              transform: "translateX(-50%)",
              backgroundColor: "#FFD700",
              borderRadius: "8px",
              padding: `${Math.floor(centerSize * 0.04)}px ${Math.floor(centerSize * 0.06)}px`,
              border: "2px solid #FFA500",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              zIndex: 4,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "2px",
            }}
          >
            <div style={{
              fontSize: `${Math.floor(centerSize * 0.05)}px`,
              fontWeight: "bold",
              color: "#8B4513",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}>
              🎰 Free Parking Jackpot
            </div>
            <div style={{
              fontSize: `${Math.floor(centerSize * 0.08)}px`,
              fontWeight: "900",
              color: "#8B4513",
            }}>
              £{jackpot.toLocaleString()}
            </div>
          </motion.div>
        )}
        
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
