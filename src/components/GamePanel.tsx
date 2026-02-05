import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useGameStore } from "../store/gameStore"
import { Dice, DiceDisplay } from "./Dice"
import type { Property } from "../types/game"
import { isProperty } from "../utils/helpers"
import { useIsMobile } from "../utils/useIsMobile"

interface GamePanelProps {
  isRolling: boolean
  isNewTurn: boolean
  handleRollDice: () => void
  handleRollComplete: () => void
  handleEndTurn: () => void
  handleBuyProperty: () => void
  handleDeclineProperty: () => void
  handleJailAction: (action: "card" | "pay" | "roll") => void
  handleDrawCard: (cardType: "chance" | "community_chest") => void
  myPlayerIndex: number
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
  const isMobile = useIsMobile()
  const phase = useGameStore((s) => s.phase)
  const diceRoll = useGameStore((s) => s.diceRoll)
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex)
  const players = useGameStore((s) => s.players)
  const spaces = useGameStore((s) => s.spaces)

  // Select only the current player and current space to avoid unnecessary re-renders
  const currentPlayer = useGameStore((s) =>
    s.currentPlayerIndex >= 0 && s.currentPlayerIndex < s.players.length
      ? s.players[s.currentPlayerIndex]
      : null
  )
  const currentSpace = useGameStore((s) => {
    const player = s.currentPlayerIndex >= 0 && s.currentPlayerIndex < s.players.length
      ? s.players[s.currentPlayerIndex]
      : null;
    return player ? s.spaces[player.position] : null;
  })

  const lastCardDrawn = useGameStore((s) => s.lastCardDrawn)
  const awaitingTaxDecision = useGameStore((s) => s.awaitingTaxDecision)
  const chooseTaxOption = useGameStore((s) => s.chooseTaxOption)
  const pendingRentNegotiation = useGameStore((s) => s.pendingRentNegotiation)
  const pendingBankruptcy = useGameStore((s) => s.pendingBankruptcy)
  const forgiveRent = useGameStore((s) => s.forgiveRent)
  const createRentIOU = useGameStore((s) => s.createRentIOU)
  const demandImmediatePaymentOrProperty = useGameStore((s) => s.demandImmediatePaymentOrProperty)
  const enterChapter11 = useGameStore((s) => s.enterChapter11)
  const declineRestructuring = useGameStore((s) => s.declineRestructuring)

  const isMyTurn = currentPlayerIndex === myPlayerIndex

  const [isExpanded, setIsExpanded] = React.useState(!isMobile)

  React.useEffect(() => {
    if (!isMobile) {
      setIsExpanded(true)
      return
    }
    if (isMyTurn) setIsExpanded(true)
    else setIsExpanded(false)
  }, [isMobile, isMyTurn, currentPlayerIndex])

  const cardPadding = isMobile ? "10px" : "16px"
  const buttonFontSize = isMobile ? "14px" : "16px"

  if (!currentPlayer || phase === "auction" || phase === "trading" || phase === "game_over") {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      style={{
        position: "fixed",
        top: isMobile ? "auto" : "48px",
        right: isMobile ? "8px" : "8px",
        left: isMobile ? "8px" : "auto",
        bottom: isMobile ? "calc(56px + env(safe-area-inset-bottom))" : "auto",
        width: isMobile ? "auto" : "300px",
        maxWidth: isMobile ? "none" : "300px",
        height: isMobile
          ? isExpanded
            ? "min(45vh, 420px)"
            : "56px"
          : "calc(100vh - 100px)",
        maxHeight: isMobile ? "min(45vh, 420px)" : "calc(100vh - 100px)",
        textAlign: "center",
        color: "#fff",
        zIndex: 300,
        backgroundColor: "rgba(0, 0, 0, 0.95)",
        borderRadius: "12px",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.5)",
        border: "1px solid rgba(255,255,255,0.1)",
        overflowY: "hidden",
        overflowX: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: isMobile ? "10px 12px" : "12px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          flexShrink: 0,
          borderBottom:
            isMobile && isExpanded
              ? "1px solid rgba(255,255,255,0.08)"
              : "none",
        }}
      >
        <div
          style={{
            width: isMobile ? "26px" : "24px",
            height: isMobile ? "26px" : "24px",
            borderRadius: "50%",
            backgroundColor: currentPlayer.color,
            border: "2px solid #fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "14px",
            flexShrink: 0,
          }}
        >
          {currentPlayer.token}
        </div>
        <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
          <div
            style={{
              margin: 0,
              fontSize: isMobile ? "14px" : "16px",
              fontWeight: 700,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {currentPlayer.name}'s Turn
            {currentPlayer.isAI && (
              <span
                style={{
                  fontSize: "11px",
                  color: "#FF9800",
                  marginLeft: "6px",
                }}
              >
                (AI)
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: "12px",
              color: "#ccc",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {isMyTurn
              ? `Cash: £${currentPlayer.cash}`
              : myPlayerIndex === -1
                ? "Select a player to join"
                : `Waiting for ${currentPlayer.token} ${currentPlayer.name}...`}
          </div>
        </div>
        {isMobile && (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setIsExpanded((v) => !v)}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontSize: "16px",
              lineHeight: 1,
            }}
            aria-label={isExpanded ? "Collapse panel" : "Expand panel"}
          >
            {isExpanded ? "▾" : "▴"}
          </motion.button>
        )}
      </div>

      <AnimatePresence>
        {(!isMobile || isExpanded) && (
          <motion.div
            initial={isMobile ? { height: 0, opacity: 0 } : undefined}
            animate={{ height: "auto", opacity: 1 }}
            exit={isMobile ? { height: 0, opacity: 0 } : undefined}
            style={{
              padding: isMobile ? "10px 12px 12px" : "12px",
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
            }}
          >
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

          {/* Rolling or Moving phase - not in jail */}
          {(phase === "rolling" || phase === "moving") &&
            !currentPlayer.inJail &&
            !currentPlayer.isAI && (
              <div style={{ flexShrink: 0 }}>
                {isMyTurn ? (
                  <>
                    {(phase === "rolling" && (!diceRoll || isNewTurn) && !isRolling) ? (
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
                    ) : (isRolling || phase === "moving") ? (
                      <Dice onRollComplete={handleRollComplete} />
                    ) : (
                      <div
                        style={{
                          padding: "16px",
                          color: "#ff9800",
                          fontSize: "14px",
                          textAlign: "center",
                        }}
                      >
                        <p>
                          {isMobile
                            ? "Dice already rolled."
                            : "Dice already rolled. Check console for details."}
                        </p>
                        {!isMobile && (
                          <>
                            <p
                              style={{
                                fontSize: "12px",
                                marginTop: "8px",
                                color: "#888",
                              }}
                            >
                              diceRoll:{" "}
                              {diceRoll
                                ? JSON.stringify(diceRoll)
                                : "undefined"}
                            </p>
                            {isNewTurn && (
                              <p
                                style={{
                                  fontSize: "12px",
                                  marginTop: "8px",
                                  color: "#4CAF50",
                                }}
                              >
                                (New turn detected - button should appear above)
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div
                    style={{
                      padding: "16px",
                      color: "#888",
                      fontSize: "14px",
                      textAlign: "center",
                    }}
                  >
                    {myPlayerIndex === -1 ? (
                      <>
                        <p style={{ color: "#ff9800", fontWeight: "bold" }}>
                          ⚠️ Player not selected
                        </p>
                        <p style={{ fontSize: "12px", marginTop: "4px" }}>
                          Auto-detecting player...
                        </p>
                      </>
                    ) : (
                      <>
                        <p>
                          Waiting for {currentPlayer.token} {currentPlayer.name}{" "}
                          to roll...
                        </p>
                        {!isMobile && (
                          <p
                            style={{
                              fontSize: "12px",
                              marginTop: "4px",
                              color: "#666",
                            }}
                          >
                            Debug: currentPlayerIndex={currentPlayerIndex},
                            myPlayerIndex={myPlayerIndex}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

          {/* Jail decision phase */}
          {(phase === "jail_decision" ||
            (phase === "rolling" && currentPlayer.inJail)) &&
            currentPlayer.inJail && (
              <div
                style={{
                  backgroundColor: "#333",
                  padding: "10px",
                  borderRadius: "8px",
                  flexShrink: 0,
                }}
              >
                <h3
                  style={{
                    marginBottom: "4px",
                    fontSize: "12px",
                    color: "#ff6b6b",
                  }}
                >
                  In Jail
                </h3>
                <p
                  style={{
                    fontSize: "11px",
                    marginBottom: "8px",
                    color: "#ccc",
                  }}
                >
                  Turn {currentPlayer.jailTurns + 1} of 3
                </p>

                {!currentPlayer.isAI && isMyTurn && (
                  <div
                    style={{
                      display: "flex",
                      gap: "6px",
                      justifyContent: "center",
                      flexWrap: "wrap",
                    }}
                  >
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
          {phase === "awaiting_tax_decision" &&
            awaitingTaxDecision &&
            isMyTurn && (
              <div
                style={{
                  backgroundColor: "#333",
                  padding: cardPadding,
                  borderRadius: "8px",
                }}
              >
                <h3 style={{ marginBottom: "8px", color: "#FFD700" }}>
                  💰 Income Tax
                </h3>
                <p
                  style={{
                    fontSize: "14px",
                    marginBottom: "16px",
                    color: "#ccc",
                  }}
                >
                  Choose your tax payment method:
                </p>

                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    justifyContent: "center",
                    flexDirection: "column",
                  }}
                >
                  <motion.button
                    onClick={() => chooseTaxOption(currentPlayerIndex, "flat")}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      padding: isMobile ? "14px 16px" : "16px 24px",
                      fontSize: buttonFontSize,
                      backgroundColor:
                        awaitingTaxDecision.flatAmount <=
                        awaitingTaxDecision.percentageAmount
                          ? "#4CAF50"
                          : "#555",
                      color: "#fff",
                      border:
                        awaitingTaxDecision.flatAmount <=
                        awaitingTaxDecision.percentageAmount
                          ? "2px solid #8BC34A"
                          : "2px solid transparent",
                      borderRadius: "8px",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>Flat Tax</span>
                    <span style={{ fontWeight: "bold" }}>
                      £{awaitingTaxDecision.flatAmount}
                    </span>
                  </motion.button>

                  <motion.button
                    onClick={() =>
                      chooseTaxOption(currentPlayerIndex, "percentage")
                    }
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      padding: isMobile ? "14px 16px" : "16px 24px",
                      fontSize: buttonFontSize,
                      backgroundColor:
                        awaitingTaxDecision.percentageAmount <
                        awaitingTaxDecision.flatAmount
                          ? "#4CAF50"
                          : "#555",
                      color: "#fff",
                      border:
                        awaitingTaxDecision.percentageAmount <
                        awaitingTaxDecision.flatAmount
                          ? "2px solid #8BC34A"
                          : "2px solid transparent",
                      borderRadius: "8px",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>10% of Net Worth</span>
                    <span style={{ fontWeight: "bold" }}>
                      £{awaitingTaxDecision.percentageAmount}
                    </span>
                  </motion.button>
                </div>

                <p
                  style={{
                    fontSize: "11px",
                    marginTop: "12px",
                    color: "rgba(255,255,255,0.5)",
                    textAlign: "center",
                  }}
                >
                  {awaitingTaxDecision.percentageAmount <
                  awaitingTaxDecision.flatAmount
                    ? "💡 10% is cheaper for you!"
                    : "💡 Flat tax is cheaper for you!"}
                </p>
              </div>
            )}

          {/* Rent Negotiation phase */}
          {phase === "awaiting_rent_negotiation" && pendingRentNegotiation && (
            <div
              style={{
                backgroundColor: "#333",
                padding: cardPadding,
                borderRadius: "8px",
                border: "2px solid #FF9800",
              }}
            >
              <h3 style={{ marginBottom: "12px", color: "#FF9800" }}>
                Rent Negotiation
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  marginBottom: "16px",
                  color: "#ccc",
                  lineHeight: "1.4",
                }}
              >
                {players[pendingRentNegotiation.debtorIndex]?.name} cannot
                afford £{pendingRentNegotiation.rentAmount} rent for{" "}
                {(spaces.find(
                  (s) => s.id === pendingRentNegotiation.propertyId
                ) as Property)?.name || "property"}.
                <br />
                They have £{pendingRentNegotiation.debtorCanAfford} available.
              </p>

              {/* Creditor (Owner) Decision Panel */}
              {myPlayerIndex === pendingRentNegotiation.creditorIndex ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <motion.button
                    onClick={() => createRentIOU(Math.floor(pendingRentNegotiation.debtorCanAfford))}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      padding: "12px",
                      backgroundColor: "#4CAF50",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "13px",
                    }}
                  >
                    Accept £{Math.floor(pendingRentNegotiation.debtorCanAfford)} + IOU for £
                    {Math.round(pendingRentNegotiation.rentAmount -
                      pendingRentNegotiation.debtorCanAfford)}
                  </motion.button>

                  <motion.button
                    onClick={() => demandImmediatePaymentOrProperty()}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      padding: "12px",
                      backgroundColor: "#f44336",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "13px",
                    }}
                  >
                    Demand Full Payment or Bankruptcy
                  </motion.button>

                  <motion.button
                    onClick={() => forgiveRent()}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      padding: "12px",
                      backgroundColor: "#555",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "13px",
                    }}
                  >
                    Forgive Debt Entirely
                  </motion.button>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "10px" }}>
                  <p style={{ color: "#FF9800", fontStyle: "italic" }}>
                    Waiting for {players[pendingRentNegotiation.creditorIndex]?.name} to decide...
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Bankruptcy Restructuring phase */}
          {phase === "awaiting_bankruptcy_decision" && pendingBankruptcy && (
            <div
              style={{
                backgroundColor: "#333",
                padding: cardPadding,
                borderRadius: "8px",
                border: "2px solid #FF6B6B",
              }}
            >
              <h3 style={{ marginBottom: "12px", color: "#FF6B6B" }}>
                Financial Distress
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  marginBottom: "16px",
                  color: "#ccc",
                  lineHeight: "1.4",
                }}
              >
                You owe £{pendingBankruptcy.debtAmount} and cannot afford it.
                You can choose to liquidate everything or enter Chapter 11 Restructuring.
              </p>

              {myPlayerIndex === pendingBankruptcy.playerIndex ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <motion.button
                    onClick={() => enterChapter11()}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      padding: "12px",
                      backgroundColor: "#2196F3",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "13px",
                    }}
                  >
                    Enter Chapter 11 Restructuring
                    <div style={{ fontSize: "10px", marginTop: "4px", opacity: 0.8 }}>
                      Keep properties, but 50% rent penalty and 5-turn debt target
                    </div>
                  </motion.button>

                  <motion.button
                    onClick={() => declineRestructuring()}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      padding: "12px",
                      backgroundColor: "#f44336",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "13px",
                    }}
                  >
                    Declare Full Bankruptcy
                    <div style={{ fontSize: "10px", marginTop: "4px", opacity: 0.8 }}>
                      Eliminate from game and transfer all assets
                    </div>
                  </motion.button>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "10px" }}>
                  <p style={{ color: "#FF6B6B", fontStyle: "italic" }}>
                    Waiting for {players[pendingBankruptcy.playerIndex]?.name} to decide...
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Buy decision phase */}
          {phase === "awaiting_buy_decision" &&
            currentSpace &&
            isProperty(currentSpace) && (
              <div
                style={{
                  backgroundColor: "#333",
                  padding: cardPadding,
                  borderRadius: "8px",
                }}
              >
                <h3 style={{ marginBottom: "8px", color: "#fff" }}>
                  {currentSpace.name}
                </h3>
                <p
                  style={{
                    fontSize: "16px",
                    marginBottom: "12px",
                    color: "#ccc",
                  }}
                >
                  Price: £{currentSpace.price}
                </p>

                {!currentPlayer.isAI && isMyTurn && (
                  <div
                    style={{
                      display: "flex",
                      gap: "12px",
                      justifyContent: "center",
                      flexDirection: isMobile ? "column" : "row",
                    }}
                  >
                    {currentPlayer.cash >= currentSpace.price ? (
                      <>
                        <motion.button
                          onClick={handleBuyProperty}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          style={{
                            padding: "12px 24px",
                            fontSize: buttonFontSize,
                            backgroundColor: "#4CAF50",
                            color: "#fff",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer",
                            width: isMobile ? "100%" : undefined,
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
                            fontSize: buttonFontSize,
                            backgroundColor: "#FF9800",
                            color: "#fff",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer",
                            width: isMobile ? "100%" : undefined,
                          }}
                        >
                          Auction
                        </motion.button>
                      </>
                    ) : (
                      <div style={{ textAlign: "center" }}>
                        <p
                          style={{
                            color: "#ff6b6b",
                            fontWeight: "bold",
                            marginBottom: "12px",
                          }}
                        >
                          Not enough cash!
                        </p>
                        <motion.button
                          onClick={handleDeclineProperty}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          style={{
                            padding: "12px 24px",
                            fontSize: buttonFontSize,
                            backgroundColor: "#FF9800",
                            color: "#fff",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer",
                            width: isMobile ? "100%" : undefined,
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
            <div
              style={{
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ marginBottom: "8px" }}>
                <DiceDisplay />
              </div>

              <div
                style={{
                  backgroundColor: "#333",
                  padding: isMobile ? "10px 12px" : "10px",
                  borderRadius: "8px",
                }}
              >
                <h3
                  style={{
                    marginBottom: "6px",
                    fontSize: "13px",
                    color: "#fff",
                  }}
                >
                  {currentSpace.name}
                </h3>

                {isProperty(currentSpace) && (
                  <div style={{ marginBottom: "8px" }}>
                    {currentSpace.owner !== undefined &&
                      currentSpace.owner !== currentPlayerIndex && (
                        <p style={{ color: "#ff6b6b", fontSize: "11px" }}>
                          Owned by{" "}
                          {players[currentSpace.owner]?.name ?? "Unknown"}
                          {currentSpace.mortgaged && " (Mortgaged)"}
                        </p>
                      )}
                    {currentSpace.owner === currentPlayerIndex && (
                      <p style={{ color: "#4CAF50", fontSize: "11px" }}>
                        You own this property!
                      </p>
                    )}
                  </div>
                )}

                {currentSpace.type === "tax" && (
                  <div>
                    <p
                      style={{
                        fontSize: "16px",
                        marginBottom: "12px",
                        color: "#ff6b6b",
                      }}
                    >
                      Paid £{currentSpace.name.includes("Income") ? 200 : 100}{" "}
                      tax automatically
                    </p>
                    {!currentPlayer.isAI && isMyTurn && (
                      <motion.button
                        onClick={handleEndTurn}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        style={{
                          padding: "12px 24px",
                          fontSize: buttonFontSize,
                          backgroundColor: "#2196F3",
                          color: "#fff",
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer",
                          width: "100%",
                        }}
                      >
                        End Turn
                      </motion.button>
                    )}
                  </div>
                )}

                {currentPlayer.inJail && (
                  <div style={{ padding: "12px" }}>
                    <p
                      style={{
                        color: "#ff6b6b",
                        fontSize: "18px",
                        fontWeight: "bold",
                        marginBottom: "12px",
                      }}
                    >
                      ⛓️ YOU ARE IN JAIL
                    </p>
                    <p style={{ color: "#ccc", fontSize: "14px", marginBottom: "16px" }}>
                      Your turn ends now. You will be able to attempt to leave on your next turn.
                    </p>
                    {!currentPlayer.isAI && isMyTurn && (
                      <motion.button
                        onClick={handleEndTurn}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        style={{
                          padding: "12px 24px",
                          fontSize: buttonFontSize,
                          backgroundColor: "#2196F3",
                          color: "#fff",
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer",
                          width: "100%",
                        }}
                      >
                        End Turn
                      </motion.button>
                    )}
                  </div>
                )}

                {(currentSpace.type === "chance" ||
                  currentSpace.type === "community_chest") &&
                  !lastCardDrawn && (
                    <div>
                      {!currentPlayer.isAI && isMyTurn && (
                        <motion.button
                          onClick={() =>
                            handleDrawCard(
                              currentSpace.type as "chance" | "community_chest",
                            )
                          }
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          style={{
                            padding: "8px 20px",
                            fontSize: "13px",
                            backgroundColor:
                              currentSpace.type === "chance"
                                ? "#FF8C00"
                                : "#4169E1",
                            color: "#fff",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                            width: "100%",
                          }}
                        >
                          Draw{" "}
                          {currentSpace.type === "chance"
                            ? "Chance"
                            : "Community Chest"}
                        </motion.button>
                      )}
                    </div>
                  )}
              </div>

              {diceRoll &&
                !currentPlayer.inJail &&
                !currentPlayer.isAI &&
                isMyTurn && (
                  <motion.button
                    onClick={handleEndTurn}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      marginTop: "8px",
                      padding: "10px 24px",
                      fontSize: "14px",
                      backgroundColor: diceRoll.isDoubles
                        ? "#4CAF50"
                        : "#2196F3",
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
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
