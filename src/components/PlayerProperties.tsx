import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "../store/gameStore";
import { calculateNetWorth } from "../logic/rules/economics";
import { audioManager } from "../utils/audio";
import type { Player, Property, TradeOffer, BankLoan, IOU } from "../types/game";

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
  myPlayerIndex: number;
}

export const PlayerPropertiesPanel = ({ playerIndex, myPlayerIndex }: PlayerPropertiesPanelProps) => {
  const state = useGameStore();
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
    hasMonopoly,
    settings,
    availableHouses,
    availableHotels,
    takeLoan,
    repayLoan,
    payIOU,
    buyPropertyInsurance,
    roundsCompleted,
  } = state;
  
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [loanAmount, setLoanAmount] = useState(100);
  const [repayAmount, setRepayAmount] = useState(0);
  const [selectedLoanId, setSelectedLoanId] = useState<number | null>(null);
  const [selectedIOUId, setSelectedIOUId] = useState<number | null>(null);
  const [iouPayAmount, setIOUPayAmount] = useState(0);
  
  const player = players[playerIndex];
  const isYourTurn = currentPlayerIndex === playerIndex;
  const isYou = myPlayerIndex === playerIndex;

  // Hidden wealth: should we hide this player's financial info?
  const shouldHideWealth = settings?.hideOpponentWealth && !isYou && !player?.bankrupt;
  const shouldHideProperties = settings?.hideOpponentProperties && !isYou && !player?.bankrupt;

  // Calculate net worth
  const netWorth = useMemo(() => {
    if (!player || player.bankrupt) return 0;
    return calculateNetWorth(state, playerIndex);
  }, [state, playerIndex, player]);

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
    if (myPlayerIndex === null || myPlayerIndex === playerIndex) return;
    startTrade(myPlayerIndex, playerIndex);
  };

  const selectedProperty = selectedPropertyId !== null 
    ? spaces.find(s => s.id === selectedPropertyId) as Property 
    : null;

  const canBuild = selectedProperty && 
                  selectedProperty.type === "property" && 
                  selectedProperty.colorGroup &&
                  hasMonopoly(playerIndex, selectedProperty.colorGroup) &&
                  !selectedProperty.mortgaged;

  // Debug logging for build availability
  React.useEffect(() => {
    if (isYou && selectedProperty) {
      const buildDebug = {
        selectedProperty: selectedProperty.name,
        type: selectedProperty.type,
        colorGroup: selectedProperty.colorGroup,
        hasMonopoly: selectedProperty.colorGroup ? hasMonopoly(playerIndex, selectedProperty.colorGroup) : false,
        mortgaged: selectedProperty.mortgaged,
        canBuild: canBuild,
        houses: selectedProperty.houses,
        hotel: selectedProperty.hotel,
        buildingCost: selectedProperty.buildingCost,
        playerCash: player.cash,
        canAfford: player.cash >= (selectedProperty.buildingCost ?? 0),
      };
      console.log("[Build Debug]", buildDebug);
    }
  }, [isYou, selectedProperty, canBuild, playerIndex, player]);

  return (
    <div
      style={{
        background: "rgba(30, 30, 30, 0.95)",
        borderRadius: "10px",
        padding: "10px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        border: isYourTurn ? `2px solid ${player.color}` : "2px solid transparent",
        transition: "border-color 0.3s",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        position: "relative",
        zIndex: 20003, // Highest z-index to ensure it appears above all other elements
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
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            background: player.color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "14px",
            boxShadow: isYourTurn ? `0 0 8px ${player.color}` : "none",
          }}
        >
          {player.token}
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              color: "#fff",
              fontWeight: 600,
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            {player.name}
            {player.bankrupt && (
              <span style={{ color: "#FF6B6B", fontSize: "10px" }}>BANKRUPT</span>
            )}
            {player.isAI && (
              <span style={{ color: "#FF9800", fontSize: "10px" }}>AI</span>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {shouldHideWealth ? (
              <>
                <div style={{ color: "#888", fontSize: "16px", fontWeight: 700, fontStyle: "italic" }}>
                  💰 Hidden
                </div>
                <div 
                  style={{ 
                    color: "rgba(255,255,255,0.4)", 
                    fontSize: "11px",
                    fontStyle: "italic",
                  }}
                >
                  🔒 Wealth is private
                </div>
              </>
            ) : (
              <>
                <div style={{ color: "#4ECDC4", fontSize: "14px", fontWeight: 700 }}>
                  £{player.cash.toLocaleString()}
                </div>
                <div 
                  style={{ 
                    color: "rgba(255,255,255,0.6)", 
                    fontSize: "10px",
                    display: "flex",
                    alignItems: "center",
                    gap: "3px",
                  }}
                  title="Net Worth = Cash + Properties + Buildings (at liquidation value)"
                >
                  <span style={{ color: "#FFD700" }}>📊</span>
                  Net: £{netWorth.toLocaleString()}
                </div>
                {/* Show debt if player has loans */}
                {player.totalDebt > 0 && (
                  <div 
                    style={{ 
                      color: "#FF6B6B", 
                      fontSize: "11px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                    title="Total debt from bank loans"
                  >
                    <span>🏦</span>
                    Debt: £{player.totalDebt.toLocaleString()}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        
        {/* Trade Button - Only show if not your panel and you are logged in */}
        {!isYou && !player.bankrupt && myPlayerIndex !== null && (
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
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "200px", overflowY: "auto" }}>
        {shouldHideProperties ? (
          // Hidden properties mode - just show count
          <div style={{ 
            padding: "12px", 
            textAlign: "center", 
            color: "rgba(255,255,255,0.5)",
            fontStyle: "italic",
          }}>
            <div style={{ fontSize: "24px", marginBottom: "4px" }}>🔒</div>
            <div>{ownedProperties.length} properties owned</div>
            <div style={{ fontSize: "10px", marginTop: "4px" }}>Details hidden</div>
          </div>
        ) : (
          Object.entries(groupedProperties).map(([colorGroup, properties]) => {
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
                <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "3px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: bgColor, border: isMonopoly ? "1px solid gold" : "none" }} />
                  <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>{colorGroup.replace("_", " ")}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "1px", paddingLeft: "12px" }}>
                  {properties.map((prop) => {
                    const propCanBuild = prop.type === "property" && 
                                        prop.colorGroup &&
                                        hasMonopoly(playerIndex, prop.colorGroup) &&
                                        !prop.mortgaged &&
                                        !prop.hotel;
                    
                    return (
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
                          border: selectedPropertyId === prop.id 
                            ? "1px solid #4ECDC4" 
                            : propCanBuild && isYou 
                              ? "1px solid rgba(46, 139, 87, 0.5)" 
                              : "1px solid transparent",
                        }}
                        title={isYou && propCanBuild ? "Click to build houses/hotels" : isYou ? "Click to manage property" : undefined}
                      >
                        <span style={{ fontSize: "11px", color: prop.mortgaged ? "#ff6b6b" : "#fff", textDecoration: prop.mortgaged ? "line-through" : "none" }}>
                          {prop.name}
                          {isYou && propCanBuild && <span style={{ color: "#4CAF50", marginLeft: "4px" }}>🏗️</span>}
                        </span>
                        <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                          {prop.hotel && <span>🏨</span>}
                          {!prop.hotel && prop.houses > 0 && <span style={{ color: "#4ECDC4", fontSize: "10px" }}>{prop.houses}🏠</span>}
                          {prop.mortgaged && <span style={{ color: "#ff6b6b", fontSize: "10px" }}>M</span>}
                          {prop.isInsured && prop.insurancePaidUntilRound > roundsCompleted && (
                            <span title={`Insured until round ${prop.insurancePaidUntilRound}`} style={{ fontSize: "10px" }}>🛡️</span>
                          )}
                          {settings?.enablePropertyValueFluctuation && prop.valueMultiplier !== 1.0 && (
                            <span 
                              title={`Value: ${Math.round(prop.valueMultiplier * 100)}%`} 
                              style={{ 
                                fontSize: "9px", 
                                color: prop.valueMultiplier > 1.0 ? "#22c55e" : "#ef4444",
                                fontWeight: "bold"
                              }}
                            >
                              {prop.valueMultiplier > 1.0 ? "↑" : "↓"}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Help message when no property is selected */}
      {isYou && !selectedProperty && ownedProperties.length > 0 && (
        <div style={{
          marginTop: "8px",
          padding: "8px",
          background: "rgba(78, 205, 196, 0.1)",
          borderRadius: "6px",
          border: "1px solid rgba(78, 205, 196, 0.3)",
          fontSize: "10px",
          color: "#4ECDC4",
          textAlign: "center",
        }}>
          💡 Click on a property to manage it (build houses/hotels, mortgage, etc.)
        </div>
      )}

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
            {/* Housing supply indicator */}
            {settings?.enableHousingScarcity && (
              <div style={{ 
                fontSize: "9px", 
                color: "rgba(255,255,255,0.5)", 
                marginBottom: "6px",
                display: "flex",
                justifyContent: "space-between",
              }}>
                <span>🏠 {availableHouses}/32</span>
                <span>🏨 {availableHotels}/12</span>
              </div>
            )}
            {/* Why can't build message */}
            {selectedProperty.type === "property" && !canBuild && !selectedProperty.hotel && (
              <div style={{
                fontSize: "9px",
                color: "#ff9800",
                marginBottom: "6px",
                padding: "4px",
                background: "rgba(255, 152, 0, 0.1)",
                borderRadius: "4px",
                textAlign: "center",
              }}>
                {selectedProperty.mortgaged 
                  ? "⚠️ Unmortgage property to build"
                  : !selectedProperty.colorGroup
                    ? "⚠️ Cannot build on this property type"
                    : !hasMonopoly(playerIndex, selectedProperty.colorGroup)
                      ? "⚠️ Need monopoly on all " + selectedProperty.colorGroup.replace("_", " ") + " properties"
                      : "⚠️ Cannot build"}
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
              {/* Build Button */}
              {canBuild && !selectedProperty.hotel && (() => {
                const isHouse = selectedProperty.houses < 4;
                const canAfford = player.cash >= (selectedProperty.buildingCost ?? 0);
                const hasSupply = isHouse 
                  ? (!settings?.enableHousingScarcity || availableHouses > 0)
                  : (!settings?.enableHousingScarcity || availableHotels > 0);
                const isDisabled = !canAfford || !hasSupply;
                
                let tooltip = "";
                if (!canAfford) tooltip = `Insufficient funds (Need £${selectedProperty.buildingCost})`;
                else if (!hasSupply) tooltip = isHouse ? "Housing shortage: No houses available in market!" : "Hotel shortage: No hotels available in market!";
                
                return (
                  <button
                    onClick={() => {
                      if (selectedProperty.houses === 4) {
                        buildHotel(selectedProperty.id);
                      } else {
                        buildHouse(selectedProperty.id);
                      }
                      audioManager.playBuild();
                    }}
                    disabled={isDisabled}
                    style={{
                      padding: "6px",
                      fontSize: "10px",
                      background: !isDisabled ? "#2E8B57" : "#666",
                      border: "none",
                      borderRadius: "4px",
                      color: "#fff",
                      cursor: isDisabled ? "not-allowed" : "pointer",
                      opacity: isDisabled ? 0.5 : 1,
                      position: "relative",
                    }}
                    title={tooltip}
                  >
                    {selectedProperty.houses === 4 
                      ? `Build Hotel (£${selectedProperty.buildingCost})${!hasSupply ? " ⚠️" : ""}` 
                      : `Build House (£${selectedProperty.buildingCost})${!hasSupply ? " ⚠️" : ""}`}
                  </button>
                );
              })()}
              
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

              {/* Insurance Button - Phase 3 */}
              {settings?.enablePropertyInsurance && !selectedProperty.mortgaged && (
                <button
                  onClick={() => buyPropertyInsurance(selectedProperty.id, playerIndex)}
                  disabled={
                    (selectedProperty.isInsured && selectedProperty.insurancePaidUntilRound > roundsCompleted) ||
                    player.cash < Math.ceil(selectedProperty.price * (settings?.insuranceCostPercent ?? 0.05))
                  }
                  style={{
                    padding: "6px",
                    fontSize: "10px",
                    background: selectedProperty.isInsured && selectedProperty.insurancePaidUntilRound > roundsCompleted
                      ? "#22c55e" 
                      : "#8b5cf6",
                    border: "none",
                    borderRadius: "4px",
                    color: "#fff",
                    cursor: selectedProperty.isInsured && selectedProperty.insurancePaidUntilRound > roundsCompleted ? "default" : "pointer",
                    gridColumn: "span 2",
                    opacity: player.cash < Math.ceil(selectedProperty.price * (settings?.insuranceCostPercent ?? 0.05)) ? 0.5 : 1,
                  }}
                >
                  {selectedProperty.isInsured && selectedProperty.insurancePaidUntilRound > roundsCompleted
                    ? `🛡️ Insured (${selectedProperty.insurancePaidUntilRound - roundsCompleted} rounds)`
                    : `🛡️ Insure (£${Math.ceil(selectedProperty.price * (settings?.insuranceCostPercent ?? 0.05))})`}
                </button>
              )}
            </div>
            {!selectedProperty.mortgaged && (selectedProperty.houses > 0 || selectedProperty.hotel) && !selectedProperty.mortgaged && (
              <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)", marginTop: "4px", textAlign: "center" }}>
                Must sell buildings before mortgaging
              </div>
            )}
            {settings?.enablePropertyInsurance && (
              <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)", marginTop: "4px", textAlign: "center" }}>
                Insurance protects against repair card costs
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bank Loans Section - Only for your own panel */}
      {isYou && settings?.enableBankLoans && (
        <div
          style={{
            marginTop: "8px",
            padding: "10px",
            background: "rgba(100, 100, 200, 0.1)",
            borderRadius: "8px",
            border: "1px solid rgba(100, 100, 200, 0.3)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: "bold", color: "#9B9BFF" }}>
              🏦 Bank Loans
            </span>
            <motion.button
              onClick={() => setShowLoanModal(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                background: "#6366F1",
                border: "none",
                borderRadius: "4px",
                color: "#fff",
                padding: "4px 8px",
                fontSize: "10px",
                cursor: "pointer",
              }}
            >
              + Take Loan
            </motion.button>
          </div>

          {/* Active Loans List */}
          {player.bankLoans && player.bankLoans.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {player.bankLoans.map((loan) => (
                <div
                  key={loan.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "4px 6px",
                    background: "rgba(255, 100, 100, 0.1)",
                    borderRadius: "4px",
                    fontSize: "10px",
                  }}
                >
                  <span style={{ color: "#FF6B6B" }}>
                    £{loan.totalOwed.toLocaleString()} ({Math.round(loan.interestRate * 100)}%/turn)
                  </span>
                  <button
                    onClick={() => {
                      setSelectedLoanId(loan.id);
                      setRepayAmount(Math.min(player.cash, loan.totalOwed));
                    }}
                    style={{
                      background: "#00B894",
                      border: "none",
                      borderRadius: "3px",
                      color: "#fff",
                      padding: "2px 6px",
                      fontSize: "9px",
                      cursor: "pointer",
                    }}
                  >
                    Repay
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textAlign: "center" }}>
              No active loans
            </div>
          )}
        </div>
      )}

      {/* IOUs Section - Phase 3 */}
      {player.inChapter11 && (
        <div
          style={{
            marginTop: "8px",
            padding: "10px",
            background: "rgba(247, 220, 111, 0.15)",
            borderRadius: "8px",
            border: "1px solid rgba(247, 220, 111, 0.4)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
            <span style={{ fontSize: "12px", fontWeight: "bold", color: "#F7DC6F" }}>
              ⚖️ Chapter 11 Restructuring
            </span>
          </div>
          <div style={{ fontSize: "10px", color: "#ddd" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
              <span>Debt Target:</span>
              <span style={{ fontWeight: "bold" }}>£{player.chapter11DebtTarget.toLocaleString()}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Turns Left:</span>
              <span style={{ fontWeight: "bold" }}>{player.chapter11TurnsRemaining}</span>
            </div>
            <div style={{ marginTop: "6px", fontSize: "9px", color: "rgba(255,255,255,0.5)", fontStyle: "italic" }}>
              Collecting 50% rent until debt is cleared.
            </div>
          </div>
        </div>
      )}

      {settings?.enableRentNegotiation && (player.iousPayable?.length > 0 || player.iousReceivable?.length > 0) && (
        <div
          style={{
            marginTop: "8px",
            padding: "8px",
            background: "rgba(239, 68, 68, 0.1)",
            borderRadius: "6px",
            border: "1px solid rgba(239, 68, 68, 0.3)",
          }}
        >
          {/* IOUs Payable (Debts) */}
          {player.iousPayable && player.iousPayable.length > 0 && (
            <>
              <div style={{ 
                fontSize: "10px", 
                color: "#ef4444", 
                marginBottom: "6px",
                fontWeight: "bold",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                📋 IOUs Owed ({player.iousPayable.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "8px" }}>
                {player.iousPayable.map((iou: IOU) => {
                  const creditor = players[iou.creditorId];
                  return (
                    <div
                      key={iou.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "4px 6px",
                        background: "rgba(239, 68, 68, 0.15)",
                        borderRadius: "4px",
                        fontSize: "10px",
                      }}
                    >
                      <div>
                        <span style={{ color: "#ef4444" }}>£{iou.currentAmount.toLocaleString()}</span>
                        <span style={{ color: "#888", marginLeft: "4px" }}>
                          to {creditor?.name || "Unknown"}
                        </span>
                        <span style={{ color: "#666", marginLeft: "4px", fontSize: "9px" }}>
                          ({Math.round(iou.interestRate * 100)}%/turn)
                        </span>
                      </div>
                      {isYou && (
                        <button
                          onClick={() => {
                            setSelectedIOUId(iou.id);
                            setIOUPayAmount(Math.min(player.cash, iou.currentAmount));
                          }}
                          style={{
                            background: "#22c55e",
                            border: "none",
                            borderRadius: "3px",
                            color: "#fff",
                            padding: "2px 6px",
                            fontSize: "9px",
                            cursor: "pointer",
                          }}
                        >
                          Pay
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* IOUs Receivable (Money Owed TO You) */}
          {player.iousReceivable && player.iousReceivable.length > 0 && (
            <>
              <div style={{ 
                fontSize: "10px", 
                color: "#22c55e", 
                marginBottom: "6px",
                fontWeight: "bold",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                💰 IOUs Receivable ({player.iousReceivable.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {player.iousReceivable.map((iou: IOU) => {
                  const debtor = players[iou.debtorId];
                  return (
                    <div
                      key={iou.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "4px 6px",
                        background: "rgba(34, 197, 94, 0.15)",
                        borderRadius: "4px",
                        fontSize: "10px",
                      }}
                    >
                      <div>
                        <span style={{ color: "#22c55e" }}>£{iou.currentAmount.toLocaleString()}</span>
                        <span style={{ color: "#888", marginLeft: "4px" }}>
                          from {debtor?.name || "Unknown"}
                        </span>
                      </div>
                      <span style={{ color: "#666", fontSize: "9px" }}>
                        {iou.reason}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Loan Modal */}
      <AnimatePresence>
        {showLoanModal && isYou && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
            onClick={() => setShowLoanModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "#2a2a3a",
                borderRadius: "12px",
                padding: "20px",
                minWidth: "300px",
                maxWidth: "400px",
              }}
            >
              <h3 style={{ margin: "0 0 16px 0", color: "#fff", textAlign: "center" }}>
                🏦 Bank Loan
              </h3>
              
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", marginBottom: "8px" }}>
                  Interest Rate: <span style={{ color: "#FF6B6B" }}>{Math.round((settings?.loanInterestRate ?? 0.1) * 100)}% per turn</span>
                </div>
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", marginBottom: "8px" }}>
                  Max Loan: <span style={{ color: "#4ECDC4" }}>£{Math.floor(netWorth * (settings?.maxLoanPercent ?? 0.5) - player.totalDebt).toLocaleString()}</span>
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "12px", color: "#fff", display: "block", marginBottom: "4px" }}>
                  Loan Amount:
                </label>
                <input
                  type="number"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(Math.max(50, parseInt(e.target.value) || 0))}
                  min={50}
                  max={Math.floor(netWorth * (settings?.maxLoanPercent ?? 0.5) - player.totalDebt)}
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "6px",
                    border: "1px solid rgba(255,255,255,0.2)",
                    background: "rgba(255,255,255,0.1)",
                    color: "#fff",
                    fontSize: "14px",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => {
                    takeLoan(playerIndex, loanAmount);
                    setShowLoanModal(false);
                  }}
                  style={{
                    flex: 1,
                    padding: "10px",
                    background: "#6366F1",
                    border: "none",
                    borderRadius: "6px",
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  Take Loan
                </button>
                <button
                  onClick={() => setShowLoanModal(false)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    background: "rgba(255,255,255,0.1)",
                    border: "none",
                    borderRadius: "6px",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Repay Loan Modal */}
      <AnimatePresence>
        {selectedLoanId !== null && isYou && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
            onClick={() => setSelectedLoanId(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "#2a2a3a",
                borderRadius: "12px",
                padding: "20px",
                minWidth: "300px",
              }}
            >
              <h3 style={{ margin: "0 0 16px 0", color: "#fff", textAlign: "center" }}>
                💰 Repay Loan
              </h3>
              
              {(() => {
                const loan = player.bankLoans?.find(l => l.id === selectedLoanId);
                if (!loan) return null;
                return (
                  <>
                    <div style={{ marginBottom: "16px", fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>
                      <div>Amount Owed: <span style={{ color: "#FF6B6B" }}>£{loan.totalOwed.toLocaleString()}</span></div>
                      <div>Your Cash: <span style={{ color: "#4ECDC4" }}>£{player.cash.toLocaleString()}</span></div>
                    </div>

                    <div style={{ marginBottom: "16px" }}>
                      <label style={{ fontSize: "12px", color: "#fff", display: "block", marginBottom: "4px" }}>
                        Repayment Amount:
                      </label>
                      <input
                        type="number"
                        value={repayAmount}
                        onChange={(e) => setRepayAmount(Math.max(0, Math.min(player.cash, parseInt(e.target.value) || 0)))}
                        min={0}
                        max={Math.min(player.cash, loan.totalOwed)}
                        style={{
                          width: "100%",
                          padding: "8px",
                          borderRadius: "6px",
                          border: "1px solid rgba(255,255,255,0.2)",
                          background: "rgba(255,255,255,0.1)",
                          color: "#fff",
                          fontSize: "14px",
                        }}
                      />
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => {
                          repayLoan(playerIndex, selectedLoanId, repayAmount);
                          setSelectedLoanId(null);
                        }}
                        disabled={repayAmount <= 0}
                        style={{
                          flex: 1,
                          padding: "10px",
                          background: repayAmount > 0 ? "#00B894" : "#666",
                          border: "none",
                          borderRadius: "6px",
                          color: "#fff",
                          cursor: repayAmount > 0 ? "pointer" : "not-allowed",
                          fontWeight: "bold",
                        }}
                      >
                        Repay £{repayAmount}
                      </button>
                      <button
                        onClick={() => setSelectedLoanId(null)}
                        style={{
                          flex: 1,
                          padding: "10px",
                          background: "rgba(255,255,255,0.1)",
                          border: "none",
                          borderRadius: "6px",
                          color: "#fff",
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* IOU Payment Modal - Phase 3 */}
      <AnimatePresence>
        {selectedIOUId !== null && isYou && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
            onClick={() => setSelectedIOUId(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              style={{
                background: "#2a2a3a",
                borderRadius: "12px",
                padding: "20px",
                minWidth: "300px",
              }}
            >
              <h3 style={{ margin: "0 0 16px 0", color: "#fff", textAlign: "center" }}>
                📋 Pay IOU
              </h3>
              
              {(() => {
                const iou = player.iousPayable?.find((i: IOU) => i.id === selectedIOUId);
                if (!iou) return null;
                const creditor = players[iou.creditorId];
                return (
                  <>
                    <div style={{ marginBottom: "16px", fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>
                      <div>Amount Owed: <span style={{ color: "#ef4444" }}>£{iou.currentAmount.toLocaleString()}</span></div>
                      <div>To: <span style={{ color: "#4ECDC4" }}>{creditor?.name || "Unknown"}</span></div>
                      <div>Reason: <span style={{ color: "#888" }}>{iou.reason}</span></div>
                      <div>Your Cash: <span style={{ color: "#22c55e" }}>£{player.cash.toLocaleString()}</span></div>
                    </div>

                    <div style={{ marginBottom: "16px" }}>
                      <label style={{ fontSize: "12px", color: "#fff", display: "block", marginBottom: "4px" }}>
                        Payment Amount:
                      </label>
                      <input
                        type="number"
                        value={iouPayAmount}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIOUPayAmount(Math.max(0, Math.min(player.cash, parseInt(e.target.value) || 0)))}
                        min={0}
                        max={Math.min(player.cash, iou.currentAmount)}
                        style={{
                          width: "100%",
                          padding: "8px",
                          borderRadius: "6px",
                          border: "1px solid rgba(255,255,255,0.2)",
                          background: "rgba(255,255,255,0.1)",
                          color: "#fff",
                          fontSize: "14px",
                        }}
                      />
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => {
                          payIOU(playerIndex, selectedIOUId, iouPayAmount);
                          setSelectedIOUId(null);
                        }}
                        disabled={iouPayAmount <= 0}
                        style={{
                          flex: 1,
                          padding: "10px",
                          background: iouPayAmount > 0 ? "#22c55e" : "#666",
                          border: "none",
                          borderRadius: "6px",
                          color: "#fff",
                          cursor: iouPayAmount > 0 ? "pointer" : "not-allowed",
                          fontWeight: "bold",
                        }}
                      >
                        Pay £{iouPayAmount}
                      </button>
                      <button
                        onClick={() => setSelectedIOUId(null)}
                        style={{
                          flex: 1,
                          padding: "10px",
                          background: "rgba(255,255,255,0.1)",
                          border: "none",
                          borderRadius: "6px",
                          color: "#fff",
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PlayerPropertiesPanel;
