import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Property } from "../types/game";
import { useGameStore } from "../store/gameStore";

interface PropertyDetailsModalProps {
  property: Property | null;
  ownerName?: string;
  onClose: () => void;
}

export const PropertyDetailsModal: React.FC<PropertyDetailsModalProps> = ({ property, ownerName, onClose }) => {
  const houseSupply = useGameStore(s => s.availableHouses);
  const hotelSupply = useGameStore(s => s.availableHotels);
  const enableHousingScarcity = useGameStore(s => s.settings.enableHousingScarcity);

  if (!property) return null;

  const isPropertyType = property.type === "property" || property.type === "railroad" || property.type === "utility";
  
  // Get color for property
  const getColor = () => {
    if (property.type === "railroad") return "#87CEEB";
    if (property.type === "utility") return "#90EE90";
    if (property.colorGroup) {
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
      return colors[property.colorGroup] || "#f0f0f0";
    }
    return "#f0f0f0";
  };

  const propertyColor = getColor();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.3, rotateY: -180 }}
        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
        exit={{ opacity: 0, scale: 0.3, rotateY: 180 }}
        transition={{ type: "spring", stiffness: 200, damping: 20, duration: 0.6 }}
        style={{
          position: "fixed",
          top: "15%",
          left: "27.5%",
          transform: "translate(-50%, -50%)",
          width: "320px",
          maxWidth: "90vw",
          maxHeight: "68vh",
          backgroundColor: isPropertyType ? "#FFFFFF" : propertyColor,
          borderRadius: "12px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 4px rgba(255,255,255,0.2)",
          display: "flex",
          flexDirection: "column",
          color: isPropertyType ? "#333" : "#fff",
          border: "3px solid rgba(255,255,255,0.3)",
          zIndex: 10000,
          cursor: "pointer",
          overflow: "auto",
          pointerEvents: "auto",
        }}
        onClick={onClose}
        whileHover={{ scale: 1.02 }}
      >
        {/* Property Color Bar */}
        {isPropertyType && (
          <div
            style={{
              width: "100%",
              height: "60px",
              backgroundColor: propertyColor,
              borderBottom: "3px solid #333",
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Houses / Hotel */}
            {property.houses > 0 || property.hotel ? (
              <div style={{
                display: "flex",
                justifyContent: "center",
                gap: "4px",
                alignItems: "center",
              }}>
                {property.hotel ? (
                  <span style={{ fontSize: "32px", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}>🏨</span>
                ) : (
                  Array.from({ length: property.houses }).map((_, i) => (
                    <span key={i} style={{ fontSize: "24px", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}>🏠</span>
                  ))
                )}
              </div>
            ) : (
              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#fff", textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
                {property.type === "railroad" ? "🚂" : property.type === "utility" ? (property.name.includes("Water") ? "💧" : "💡") : ""}
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Property Name */}
          <div style={{ fontWeight: "bold", fontSize: "20px", marginBottom: "4px", textAlign: "center", borderBottom: "2px solid #ddd", paddingBottom: "8px" }}>
            {property.name}
          </div>
          
          {/* Property Details */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px", lineHeight: 1.5 }}>
            <div>
              <strong>Price:</strong> £{property.price}
              {property.valueMultiplier !== undefined && property.valueMultiplier !== 1.0 && (
                <span style={{ 
                  marginLeft: "8px", 
                  color: property.valueMultiplier > 1 ? "#2e7d32" : "#d32f2f",
                  fontWeight: "bold",
                  fontSize: "12px"
                }}>
                  {property.valueMultiplier > 1 ? "📈" : "📉"} 
                  ({Math.round(property.valueMultiplier * 100)}%)
                </span>
              )}
            </div>
            <div><strong>Base Rent:</strong> £{property.baseRent}</div>
            
            {/* Regular Properties: Rent with Houses */}
            {property.type === "property" && property.rents && property.rents.length > 0 && (
              <div>
                <strong>Rent with Houses:</strong>
                <div style={{ marginLeft: "12px", marginTop: "4px", fontSize: "13px" }}>
                  {property.rents.map((rent, idx) => (
                    <div key={idx}>{(idx + 1)} house{idx + 1 !== 1 ? "s" : ""}: £{rent}</div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Railroads: Rent with Number of Railroads Owned */}
            {property.type === "railroad" && property.rents && property.rents.length > 0 && (
              <div>
                <strong>Rent with Railroads Owned:</strong>
                <div style={{ marginLeft: "12px", marginTop: "4px", fontSize: "13px" }}>
                  {property.rents.map((rent, idx) => (
                    <div key={idx}>{idx + 1} railroad{idx + 1 !== 1 ? "s" : ""}: £{rent}</div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Utilities: Dice-based Rent Calculation */}
            {property.type === "utility" && (
              <div>
                <strong>Rent Calculation:</strong>
                <div style={{ marginLeft: "12px", marginTop: "4px", fontSize: "13px" }}>
                  <div>
                    1 utility owned: {(4 * (property.valueMultiplier ?? 1)).toFixed(1)}× dice roll
                  </div>
                  <div>
                    2 utilities owned: {(10 * (property.valueMultiplier ?? 1)).toFixed(1)}× dice roll
                  </div>
                  {property.valueMultiplier !== 1.0 && (
                    <div style={{ fontSize: "11px", color: "#666", marginTop: "2px" }}>
                      (Adjusted for market value: {Math.round(property.valueMultiplier * 100)}%)
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {property.buildingCost && property.buildingCost > 0 && (
              <div>
                <strong>Building Cost:</strong> £{property.buildingCost}
                {enableHousingScarcity && (
                  <div style={{ fontSize: "11px", color: "#666", marginTop: "2px" }}>
                    Supply: {houseSupply} houses, {hotelSupply} hotels
                  </div>
                )}
              </div>
            )}
            
            <div><strong>Mortgage Value:</strong> £{property.mortgageValue}</div>
            
            {ownerName ? (
              <div><strong>Owner:</strong> {ownerName}</div>
            ) : (
              <div><strong>Owner:</strong> <span style={{ color: "#666" }}>Unowned</span></div>
            )}
            
            {property.mortgaged && (
              <div style={{ color: "#d32f2f", fontWeight: "bold" }}>⚠️ Mortgaged</div>
            )}
            
            {property.houses > 0 && (
              <div><strong>Houses:</strong> {property.houses}</div>
            )}
            
            {property.hotel && (
              <div><strong>Hotel:</strong> Yes</div>
            )}

            {enableHousingScarcity && property.buildingCost && property.buildingCost > 0 && (
              <div style={{ 
                marginTop: "8px", 
                padding: "8px", 
                backgroundColor: "rgba(0,0,0,0.05)", 
                borderRadius: "6px",
                border: "1px solid rgba(0,0,0,0.1)"
              }}>
                <div style={{ fontWeight: "bold", fontSize: "12px", marginBottom: "4px" }}>Housing Scarcity Status</div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                  <span>Houses Available:</span>
                  <span style={{ color: houseSupply === 0 ? "#d32f2f" : "#2e7d32", fontWeight: "bold" }}>
                    {houseSupply} {houseSupply === 0 ? " (OUT OF STOCK)" : ""}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                  <span>Hotels Available:</span>
                  <span style={{ color: hotelSupply === 0 ? "#d32f2f" : "#2e7d32", fontWeight: "bold" }}>
                    {hotelSupply} {hotelSupply === 0 ? " (OUT OF STOCK)" : ""}
                  </span>
                </div>
                {(houseSupply === 0 || hotelSupply === 0) && (
                  <div style={{ fontSize: "10px", color: "#d32f2f", marginTop: "4px", fontStyle: "italic" }}>
                    ⚠️ Building is currently restricted by supply!
                  </div>
                )}
              </div>
            )}
            
            {property.isInsured && property.insurancePaidUntilRound > 0 && (
              <div style={{ color: "#2e7d32", fontWeight: "bold" }}>🛡️ Insured</div>
            )}
            
            {property.valueMultiplier !== 1.0 && (
              <div>
                <strong>Value Multiplier:</strong> {property.valueMultiplier > 1 ? "+" : ""}
                {Math.round((property.valueMultiplier - 1) * 100)}%
              </div>
            )}

            {property.colorGroup && (
              <div><strong>Color Group:</strong> {property.colorGroup.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px",
          fontSize: "12px",
          textAlign: "center",
          borderTop: "1px solid rgba(0,0,0,0.1)",
          backgroundColor: "rgba(0,0,0,0.05)",
          color: "#666",
        }}>
          Click to close
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

