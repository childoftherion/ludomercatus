import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "../store/gameStore";
import type { Player, Property, TradeOffer } from "../types/game";

const COLOR_MAP: Record<string, string> = {
  brown: "#8B4513",
  light_blue: "#87CEEB",
  pink: "#FF69B4",
  orange: "#FFA500",
  red: "#FF0000",
  yellow: "#FFD700",
  green: "#228B22",
  dark_blue: "#00008B",
};

interface PlayerPropertiesPanelProps {
  playerIndex: number;
}

export const PlayerPropertiesPanel = ({ playerIndex }: PlayerPropertiesPanelProps) => {
  const { 
    players, 
    spaces, 
    currentPlayerIndex, 
    buildHouse, 
    buildHotel, 
    sellHouse, 
    sellHotel, 
    mortgageProperty, 
    unmortgageProperty,
    startTrade,
    hasMonopoly
  } = useGameStore();
  
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  
  const player = players[playerIndex];
  const isYourTurn = currentPlayerIndex === playerIndex;
  const isYou = !players[currentPlayerIndex]?.isAI && isYourTurn;

  if (!player) return null;

  // Get all properties owned by this player
  const ownedProperties = spaces.filter(
    (s): s is Property =>
      (s.type === "property" || s.type === "railroad" || s.type === "utility") &&
      (s as Property).owner === playerIndex
  ) as Property[];

  // Group properties by color
  const groupedProperties: Record<string, Property[]> = {};
  ownedProperties.forEach((prop) => {
    const key = prop.colorGroup ?? (prop.type === "railroad" ? "railroad" : "utility");
    if (!groupedProperties[key]) {
      groupedProperties[key] = [];
    }
    groupedProperties[key].push(prop);
  });

  const handlePropertyClick = (propId: number) => {
    if (!isYou) return;
    setSelectedPropertyId(selectedPropertyId === propId ? null : propId);
  };

  const handleTradeClick = () => {
    const you = players.findIndex(p => !p.isAI);
    if (you === -1 || you === playerIndex) return;
    
    startTrade(you, playerIndex);
  };

  const selectedProperty = selectedPropertyId !== null 
    ? spaces.find(s => s.id === selectedPropertyId) as Property 
    : null;

  const canBuild = selectedProperty && 
                  selectedProperty.type === "property" && 
                  selectedProperty.colorGroup &&
                  hasMonopoly(playerIndex, selectedProperty.colorGroup) &&
                  !selectedProperty.mortgaged;

  return (
    <div
      style={{
        background: "rgba(30, 30, 30, 0.95)",
        borderRadius: "12px",
        padding: "12px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        border: isYourTurn ? `2px solid ${player.color}` : "2px solid transparent",
        transition: "border-color 0.3s",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      {/* Player Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          paddingBottom: "8px",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: player.color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "16px",
            boxShadow: isYourTurn ? `0 0 10px ${player.color}` : "none",
          }}
        >
          {player.token}
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              color: "#fff",
              fontWeight: 600,
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {player.name}
            {player.bankrupt && (
              <span style={{ color: "#FF6B6B", fontSize: "10px" }}>BANKRUPT</span>
            )}
          </div>
          <div style={{ color: "#4ECDC4", fontSize: "16px", fontWeight: 700 }}>
            ${player.cash.toLocaleString()}
          </div>
        </div>
        
        {/* Trade Button - Only show if not your panel and you are human */}
        {!isYou && !player.bankrupt && players[currentPlayerIndex] && !players[currentPlayerIndex].isAI && (
          <motion.button
            onClick={handleTradeClick}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            style={{
              background: "#00B894",
              border: "none",
              borderRadius: "6px",
              color: "#fff",
              padding: "4px 8px",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            🤝 Trade
          </motion.button>
        )}
      </div>

      {/* Properties List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "300px", overflowY: "auto" }}>
        {Object.entries(groupedProperties).map(([colorGroup, properties]) => {
          const bgColor = COLOR_MAP[colorGroup] ?? (colorGroup === "railroad" ? "#666" : "#4682B4");
          const isMonopoly =
            colorGroup !== "railroad" &&
            colorGroup !== "utility" &&
            spaces.filter(
              (s) =>
                s.type === "property" &&
                (s as Property).colorGroup === colorGroup
            ).length === properties.length;

          return (
            <div key={colorGroup}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: bgColor, border: isMonopoly ? "1px solid gold" : "none" }} />
                <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>{colorGroup.replace("_", " ")}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px", paddingLeft: "14px" }}>
                {properties.map((prop) => (
                  <motion.div
                    key={prop.id}
                    onClick={() => handlePropertyClick(prop.id)}
                    whileHover={isYou ? { x: 5, background: "rgba(255,255,255,0.1)" } : {}}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      background: selectedPropertyId === prop.id 
                        ? "rgba(78, 205, 196, 0.2)" 
                        : prop.mortgaged ? "rgba(255,0,0,0.1)" : "rgba(255,255,255,0.05)",
                      cursor: isYou ? "pointer" : "default",
                      border: selectedPropertyId === prop.id ? "1px solid #4ECDC4" : "1px solid transparent",
                    }}
                  >
                    <span style={{ fontSize: "11px", color: prop.mortgaged ? "#ff6b6b" : "#fff", textDecoration: prop.mortgaged ? "line-through" : "none" }}>
                      {prop.name}
                    </span>
                    <div style={{ display: "flex", gap: "4px" }}>
                      {prop.hotel && <span>🏨</span>}
                      {!prop.hotel && prop.houses > 0 && <span style={{ color: "#4ECDC4", fontSize: "10px" }}>{prop.houses}🏠</span>}
                      {prop.mortgaged && <span style={{ color: "#ff6b6b", fontSize: "10px" }}>M</span>}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Property Management Panel */}
      <AnimatePresence>
        {isYou && selectedProperty && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              background: "rgba(0,0,0,0.3)",
              borderRadius: "8px",
              padding: "10px",
              marginTop: "4px",
              overflow: "hidden",
            }}
          >
            <div style={{ fontSize: "12px", fontWeight: "bold", marginBottom: "8px", textAlign: "center", color: "#4ECDC4" }}>
              Manage {selectedProperty.name}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
              {/* Build Button */}
              {canBuild && !selectedProperty.hotel && (
                <button
                  onClick={() => selectedProperty.houses === 4 ? buildHotel(selectedProperty.id) : buildHouse(selectedProperty.id)}
                  disabled={player.cash < (selectedProperty.buildingCost ?? 0)}
                  style={{
                    padding: "6px",
                    fontSize: "10px",
                    background: "#2E8B57",
                    border: "none",
                    borderRadius: "4px",
                    color: "#fff",
                    cursor: "pointer",
                    opacity: player.cash < (selectedProperty.buildingCost ?? 0) ? 0.5 : 1,
                  }}
                >
                  {selectedProperty.houses === 4 ? "Build Hotel" : `Build House (£${selectedProperty.buildingCost})`}
                </button>
              )}
              
              {/* Sell Button */}
              {(selectedProperty.houses > 0 || selectedProperty.hotel) && (
                <button
                  onClick={() => selectedProperty.hotel ? sellHotel(selectedProperty.id) : sellHouse(selectedProperty.id)}
                  style={{
                    padding: "6px",
                    fontSize: "10px",
                    background: "#E17055",
                    border: "none",
                    borderRadius: "4px",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  Sell {selectedProperty.hotel ? "Hotel" : "House"}
                </button>
              )}

              {/* Mortgage Button */}
              <button
                onClick={() => selectedProperty.mortgaged ? unmortgageProperty(selectedProperty.id) : mortgageProperty(selectedProperty.id)}
                disabled={!selectedProperty.mortgaged && (selectedProperty.houses > 0 || selectedProperty.hotel)}
                style={{
                  padding: "6px",
                  fontSize: "10px",
                  background: selectedProperty.mortgaged ? "#2196F3" : "#D63031",
                  border: "none",
                  borderRadius: "4px",
                  color: "#fff",
                  cursor: "pointer",
                  gridColumn: "span 2",
                  opacity: !selectedProperty.mortgaged && (selectedProperty.houses > 0 || selectedProperty.hotel) ? 0.5 : 1,
                }}
              >
                {selectedProperty.mortgaged 
                  ? `Unmortgage (£${Math.floor(selectedProperty.mortgageValue * 1.1)})` 
                  : `Mortgage (+£${selectedProperty.mortgageValue})`}
              </button>
            </div>
            {!selectedProperty.mortgaged && (selectedProperty.houses > 0 || selectedProperty.hotel) && !selectedProperty.mortgaged && (
              <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)", marginTop: "4px", textAlign: "center" }}>
                Must sell buildings before mortgaging
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PlayerPropertiesPanel;
