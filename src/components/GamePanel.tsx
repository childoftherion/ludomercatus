import React from "react";
import { motion } from "framer-motion";
import { useGameStore } from "../store/gameStore";
import { Dice, DiceDisplay } from "./Dice";
import type { Property } from "../types/game";
import { isProperty } from "../utils/helpers";

interface GamePanelProps {
  isRolling: boolean;
  isNewTurn: boolean;
  handleRollDice: () => void;
  handleRollComplete: () => void;
  handleEndTurn: () => void;
  handleBuyProperty: () => void;
  handleDeclineProperty: () => void;
  handleJailAction: (action: "card" | "pay" | "roll") => void;
  handleDrawCard: (cardType: "chance" | "community_chest") => void;
  myPlayerIndex: number;
}

export const GamePanel: React.FC<GamePanelProps> = ({
  isRolling,
  isNewTurn,
  handleRollDice,
  handleRollComplete,
  handleEndTurn,
  handleBuyProperty,
  handleDeclineProperty,
  handleJailAction,
  handleDrawCard,
  myPlayerIndex,
}) => {
  const {
    phase,
    diceRoll,
    currentPlayerIndex,
    players,
    spaces,
    lastCardDrawn,
    awaitingTaxDecision,
    chooseTaxOption,
  } = useGameStore();


  const currentPlayer = currentPlayerIndex >= 0 && currentPlayerIndex < players.length
    ? players[currentPlayerIndex]
    : null;

  const isMyTurn = currentPlayerIndex === myPlayerIndex;

  const currentSpace = currentPlayer ? spaces[currentPlayer.position] : null;

  if (!currentPlayer || phase === "auction" || phase === "trading") {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      style={{
        position: "fixed",
        top: "48px", // Start below burger menu
        right: "8px",
        width: "300px",
        maxWidth: "300px",
        height: "calc(100vh - 100px)", // Fill most of the screen height
        maxHeight: "calc(100vh - 100px)",
        textAlign: "center",
        color: "#fff",
        zIndex: 300,
        backgroundColor: "rgba(0, 0, 0, 0.95)",
        borderRadius: "12px",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.5)",
        border: "1px solid rgba(255,255,255,0.1)",
        overflowY: "auto",
        overflowX: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ padding: "12px", display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden", gap: "8px" }}> {/* Reduced padding, use flex for better fit */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "8px", flexShrink: 0 }}> {/* Reduced gap and margin */}
        <div
          style={{
            width: "24px", // Reduced size
            height: "24px",
            borderRadius: "50%",
            backgroundColor: currentPlayer.color,
            border: "2px solid #fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "14px", // Reduced font size
          }}
        >
          {currentPlayer.token}
        </div>
        <h2 style={{ margin: 0, fontSize: "16px" }}> {/* Reduced font size for better fit */}
          {currentPlayer.name}'s Turn
          {currentPlayer.isAI && <span style={{ fontSize: "11px", color: "#FF9800", marginLeft: "6px" }}>(AI)</span>}
        </h2>
      </div>

      <p style={{ fontSize: "12px", marginBottom: "6px", color: "#ccc", flexShrink: 0 }}> {/* Reduced font size and margin */}
        Cash: £{currentPlayer.cash}
      </p>

      {/* AI Thinking Indicator */}
      {currentPlayer.isAI && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            padding: "8px", // Reduced padding
            fontSize: "12px", // Reduced font size
            color: "#FF9800",
            fontWeight: "bold",
            flexShrink: 0,
          }}
        >
          <motion.span
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            AI is thinking...
          </motion.span>
        </motion.div>
      )}

      {/* Rolling phase - not in jail */}
      {phase === "rolling" && !currentPlayer.inJail && !currentPlayer.isAI && (
        <div style={{ flexShrink: 0 }}>
          {isMyTurn ? (
            <>
              {(!diceRoll || isNewTurn) && !isRolling ? (
                <motion.button
                  onClick={handleRollDice}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    padding: "10px 24px",
                    fontSize: "14px",
                    backgroundColor: "#4CAF50",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    width: "100%",
                  }}
                >
                  Roll Dice
                </motion.button>
              ) : isRolling ? (
                <Dice onRollComplete={handleRollComplete} />
              ) : (
                <div style={{ padding: "16px", color: "#ff9800", fontSize: "14px", textAlign: "center" }}>
                  <p>Dice already rolled. Check console for details.</p>
                  <p style={{ fontSize: "12px", marginTop: "8px", color: "#888" }}>
                    diceRoll: {diceRoll ? JSON.stringify(diceRoll) : "undefined"}
                  </p>
                  {isNewTurn && (
                    <p style={{ fontSize: "12px", marginTop: "8px", color: "#4CAF50" }}>
                      (New turn detected - button should appear above)
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <div style={{ padding: "16px", color: "#888", fontSize: "14px", textAlign: "center" }}>
              {myPlayerIndex === -1 ? (
                <>
                  <p style={{ color: "#ff9800", fontWeight: "bold" }}>⚠️ Player not selected</p>
                  <p style={{ fontSize: "12px", marginTop: "4px" }}>Auto-detecting player...</p>
                </>
              ) : (
                <>
                  <p>Waiting for {currentPlayer.token} {currentPlayer.name} to roll...</p>
                  <p style={{ fontSize: "12px", marginTop: "4px", color: "#666" }}>
                    Debug: currentPlayerIndex={currentPlayerIndex}, myPlayerIndex={myPlayerIndex}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Jail decision phase */}
      {(phase === "jail_decision" || (phase === "rolling" && currentPlayer.inJail)) && currentPlayer.inJail && (
        <div style={{ backgroundColor: "#333", padding: "10px", borderRadius: "8px", flexShrink: 0 }}>
          <h3 style={{ marginBottom: "4px", fontSize: "12px", color: "#ff6b6b" }}>In Jail</h3>
          <p style={{ fontSize: "11px", marginBottom: "8px", color: "#ccc" }}>
            Turn {currentPlayer.jailTurns + 1} of 3
          </p>

          {!currentPlayer.isAI && isMyTurn && (
            <div style={{ display: "flex", gap: "6px", justifyContent: "center", flexWrap: "wrap" }}>
              {currentPlayer.jailFreeCards > 0 && (
                <motion.button
                  onClick={() => handleJailAction("card")}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    padding: "8px 16px",
                    fontSize: "12px",
                    backgroundColor: "#9C27B0",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  Use Card ({currentPlayer.jailFreeCards})
                </motion.button>
              )}
              {currentPlayer.cash >= 50 && (
                <motion.button
                  onClick={() => handleJailAction("pay")}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    padding: "8px 16px",
                    fontSize: "12px",
                    backgroundColor: "#2196F3",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  Pay £50
                </motion.button>
              )}
              <motion.button
                onClick={() => handleJailAction("roll")}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  padding: "8px 16px",
                  fontSize: "12px",
                  backgroundColor: "#4CAF50",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Roll for Doubles
              </motion.button>
            </div>
          )}
        </div>
      )}

      {/* Tax decision phase - Progressive Income Tax */}
      {phase === "awaiting_tax_decision" && awaitingTaxDecision && isMyTurn && (
        <div style={{ backgroundColor: "#333", padding: "16px", borderRadius: "8px" }}>
          <h3 style={{ marginBottom: "8px", color: "#FFD700" }}>💰 Income Tax</h3>
          <p style={{ fontSize: "14px", marginBottom: "16px", color: "#ccc" }}>
            Choose your tax payment method:
          </p>

          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexDirection: "column" }}>
            <motion.button
              onClick={() => chooseTaxOption(currentPlayerIndex, "flat")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                padding: "16px 24px",
                fontSize: "16px",
                backgroundColor: awaitingTaxDecision.flatAmount <= awaitingTaxDecision.percentageAmount ? "#4CAF50" : "#555",
                color: "#fff",
                border: awaitingTaxDecision.flatAmount <= awaitingTaxDecision.percentageAmount ? "2px solid #8BC34A" : "2px solid transparent",
                borderRadius: "8px",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>Flat Tax</span>
              <span style={{ fontWeight: "bold" }}>£{awaitingTaxDecision.flatAmount}</span>
            </motion.button>

            <motion.button
              onClick={() => chooseTaxOption(currentPlayerIndex, "percentage")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                padding: "16px 24px",
                fontSize: "16px",
                backgroundColor: awaitingTaxDecision.percentageAmount < awaitingTaxDecision.flatAmount ? "#4CAF50" : "#555",
                color: "#fff",
                border: awaitingTaxDecision.percentageAmount < awaitingTaxDecision.flatAmount ? "2px solid #8BC34A" : "2px solid transparent",
                borderRadius: "8px",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>10% of Net Worth</span>
              <span style={{ fontWeight: "bold" }}>£{awaitingTaxDecision.percentageAmount}</span>
            </motion.button>
          </div>

          <p style={{ fontSize: "11px", marginTop: "12px", color: "rgba(255,255,255,0.5)", textAlign: "center" }}>
            {awaitingTaxDecision.percentageAmount < awaitingTaxDecision.flatAmount
              ? "💡 10% is cheaper for you!"
              : "💡 Flat tax is cheaper for you!"}
          </p>
        </div>
      )}

      {/* Buy decision phase */}
      {phase === "awaiting_buy_decision" && currentSpace && isProperty(currentSpace) && (
        <div style={{ backgroundColor: "#333", padding: "16px", borderRadius: "8px" }}>
          <h3 style={{ marginBottom: "8px", color: "#fff" }}>{currentSpace.name}</h3>
          <p style={{ fontSize: "16px", marginBottom: "12px", color: "#ccc" }}>
            Price: £{currentSpace.price}
          </p>

          {!currentPlayer.isAI && isMyTurn && (
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              {currentPlayer.cash >= currentSpace.price ? (
                <>
                  <motion.button
                    onClick={handleBuyProperty}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      padding: "12px 24px",
                      fontSize: "16px",
                      backgroundColor: "#4CAF50",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                    }}
                  >
                    Buy for £{currentSpace.price}
                  </motion.button>
                  <motion.button
                    onClick={handleDeclineProperty}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      padding: "12px 24px",
                      fontSize: "16px",
                      backgroundColor: "#FF9800",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                    }}
                  >
                    Auction
                  </motion.button>
                </>
              ) : (
                <div style={{ textAlign: "center" }}>
                  <p style={{ color: "#ff6b6b", fontWeight: "bold", marginBottom: "12px" }}>
                    Not enough cash!
                  </p>
                  <motion.button
                    onClick={handleDeclineProperty}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      padding: "12px 24px",
                      fontSize: "16px",
                      backgroundColor: "#FF9800",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                    }}
                  >
                    Go to Auction
                  </motion.button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Resolving space phase */}
      {phase === "resolving_space" && currentSpace && (
        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ marginBottom: "8px" }}>
            <DiceDisplay />
          </div>

          <div style={{ backgroundColor: "#333", padding: "10px", borderRadius: "8px" }}>
            <h3 style={{ marginBottom: "6px", fontSize: "13px", color: "#fff" }}>{currentSpace.name}</h3>

            {isProperty(currentSpace) && (
              <div style={{ marginBottom: "8px" }}>
                {currentSpace.owner !== undefined && currentSpace.owner !== currentPlayerIndex && (
                  <p style={{ color: "#ff6b6b", fontSize: "11px" }}>
                    Owned by {players[currentSpace.owner]?.name ?? "Unknown"}
                    {currentSpace.mortgaged && " (Mortgaged)"}
                  </p>
                )}
                {currentSpace.owner === currentPlayerIndex && (
                  <p style={{ color: "#4CAF50", fontSize: "11px" }}>You own this property!</p>
                )}
              </div>
            )}

            {currentSpace.type === "tax" && (
              <div>
                <p style={{ fontSize: "16px", marginBottom: "12px", color: "#ff6b6b" }}>
                  Paid £{currentSpace.name.includes("Income") ? 200 : 100} tax automatically
                </p>
                {!currentPlayer.isAI && isMyTurn && (
                  <motion.button
                    onClick={handleEndTurn}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      padding: "12px 24px",
                      fontSize: "16px",
                      backgroundColor: "#2196F3",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                    }}
                  >
                    End Turn
                  </motion.button>
                )}
              </div>
            )}

            {(currentSpace.type === "chance" || currentSpace.type === "community_chest") && !lastCardDrawn && (
              <div>
                {!currentPlayer.isAI && isMyTurn && (
                  <motion.button
                    onClick={() => handleDrawCard(currentSpace.type as "chance" | "community_chest")}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      padding: "8px 20px",
                      fontSize: "13px",
                      backgroundColor: currentSpace.type === "chance" ? "#FF8C00" : "#4169E1",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      width: "100%",
                    }}
                  >
                    Draw {currentSpace.type === "chance" ? "Chance" : "Community Chest"}
                  </motion.button>
                )}
              </div>
            )}
          </div>

          {diceRoll && !currentPlayer.inJail && !currentPlayer.isAI && isMyTurn && (
            <motion.button
              onClick={handleEndTurn}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                marginTop: "8px",
                padding: "10px 24px",
                fontSize: "14px",
                backgroundColor: diceRoll.isDoubles ? "#4CAF50" : "#2196F3",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold",
                width: "100%",
                flexShrink: 0,
              }}
            >
              {diceRoll.isDoubles ? "Roll Again (Doubles!)" : "End Turn"}
            </motion.button>
          )}
        </div>
      )}
      </div>
    </motion.div>
  );
};
