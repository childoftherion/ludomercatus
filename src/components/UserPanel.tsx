import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { PlayerPropertiesPanel } from "./PlayerProperties"
import { useGameStore } from "../store/gameStore"
import { useLocalStore } from "../store/localStore"
import { calculateNetWorth } from "../logic/rules/economics"
import { useIsMobile } from "../utils/useIsMobile"

interface UserPanelProps {
  myPlayerIndex: number
}

export const UserPanel: React.FC<UserPanelProps> = ({ myPlayerIndex }) => {
  const isMobile = useIsMobile()
  const players = useGameStore((s) => s.players)
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex)
  const settings = useGameStore((s) => s.settings)
  
  const [expandedPlayerIndex, setExpandedPlayerIndex] = useState<number | null>(
    null
  )
  const [activeTab, setActiveTab] = useState<"properties" | "financials">("properties")
  
  // Memoize net worth for each player to prevent recalculation on every render
  const netWorths = React.useMemo(() => {
    const state = useGameStore.getState();
    return players.map((_, index) => calculateNetWorth(state, index));
  }, [players]);

  // Filter out bankrupt players for layout calculation
  const activePlayers = players.filter((p, i) => p && !p.bankrupt)
  const playerCount = activePlayers.length

  if (!players || players.length === 0) return null

  return (
    <div
      style={{
        position: "fixed",
        bottom: "calc(8px + env(safe-area-inset-bottom))",
        left: "8px",
        right: "8px",
        zIndex: 20000,
        display: "flex",
        flexDirection: "row",
        gap: isMobile ? "4px" : "8px",
        justifyContent: "space-evenly", // Distribute players evenly across the bottom
        alignItems: "flex-end",
        overflowY: "visible",
        overflowX: isMobile ? "auto" : "visible",
        paddingBottom: "2px",
        isolation: "isolate",
      }}
    >
      {players.map((player, index) => {
        if (!player || player.bankrupt) return null

        const isExpanded = expandedPlayerIndex === index
        const isCurrentPlayer = currentPlayerIndex === index
        const isYou = myPlayerIndex === index
        const shouldHideCash = settings?.hideOpponentWealth && !isYou && !player.bankrupt;
        const shouldHideProperties = settings?.hideOpponentProperties && !isYou && !player.bankrupt;

        return (
          <motion.div
            key={player.id}
            className="player-panel"
            initial={false}
            animate={{
              flex: isMobile ? "0 0 auto" : `1 1 0%`, 
              width: isMobile ? "100px" : "0px", 
              minWidth: isMobile ? "80px" : "120px",
              maxWidth: "none", 
              height: isMobile ? "40px" : "45px", // Fixed height for the collapsed header
              zIndex: isExpanded ? 20001 : 20000,
            }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            style={{
              position: "relative",
              zIndex: isExpanded ? 20001 : 20000,
            }}
          >
            <div
              onMouseEnter={isMobile ? undefined : () => setExpandedPlayerIndex(index)}
              onMouseLeave={isMobile ? undefined : () => setExpandedPlayerIndex(null)}
              onClick={() => {
                if (isMobile) {
                  setExpandedPlayerIndex(isExpanded ? null : index)
                }
              }}
              style={{
                background: "rgba(30, 30, 30, 0.95)",
                borderRadius: "10px",
                border: isCurrentPlayer
                  ? `3px solid ${player.color}`
                  : "2px solid transparent",
                boxShadow: isCurrentPlayer
                  ? `0 0 20px ${player.color}40, 0 4px 20px rgba(0,0,0,0.3)`
                  : "0 4px 20px rgba(0,0,0,0.3)",
                transition: "border-color 0.3s",
                position: "relative",
                zIndex: isExpanded ? 20001 : 20000, // Ensure expanded content is on top
                overflow: "visible", // Allow expanded content to overflow
              }}
            >
              {/* Minimized Header - Always Visible */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: isMobile ? "4px" : "6px", // Scaled down for 100% zoom
                  padding: isMobile ? "4px 6px" : "6px 9px", // Scaled down for 100% zoom
                  cursor: "pointer",
                  minHeight: "30px", // Scaled down for 100% zoom
                  borderBottom: isExpanded
                    ? "1px solid rgba(255,255,255,0.1)"
                    : "none",
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
                    flexShrink: 0,
                    fontWeight: "bold",
                    position: "relative",
                  }}
                >
                  {player.token}
                  {!player.isAI && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: "-2px",
                        right: "-2px",
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        backgroundColor: player.isConnected ? "#4CAF50" : "#FF5252",
                        border: "2px solid rgba(30, 30, 30, 1)",
                      }}
                    />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      color: "#fff",
                      fontWeight: 600,
                      fontSize: "13px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {player.name}
                    {player.isAI && (
                      <span
                        style={{
                          color: "#FF9800",
                          marginLeft: "6px",
                          fontSize: "11px",
                        }}
                      >
                        (AI)
                      </span>
                    )}
                    {!player.isConnected && !player.isAI && (
                      <span
                        style={{
                          color: "#FF5252",
                          marginLeft: "6px",
                          fontSize: "11px",
                        }}
                      >
                        (OFFLINE)
                      </span>
                    )}
                  </div>
                  {!isExpanded && (
                    <>
                      {!shouldHideCash ? (
                        <>
                          <div
                            style={{
                              color: "#4ECDC4",
                              fontSize: "12px",
                              fontWeight: 600,
                              marginTop: "4px",
                            }}
                          >
                            £{player.cash.toLocaleString()}
                          </div>
                          {/* Only show Net Worth if properties are also visible to prevent calculating property value */}
                          {!shouldHideProperties && (
                            <div
                              style={{
                                color: "#22c55e",
                                fontSize: "11px",
                                fontWeight: 500,
                                marginTop: "2px",
                              }}
                            >
                              Net: £{netWorths[index]?.toLocaleString()}
                            </div>
                          )}
                        </>
                      ) : (
                        <div
                          style={{
                            color: "rgba(255,255,255,0.4)",
                            fontSize: "11px",
                            fontStyle: "italic",
                            marginTop: "4px",
                          }}
                        >
                          Wealth Hidden
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Expanded Content - Shown on Hover/Click - Now expands UPWARDS */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0, scale: 0.95 }}
                    animate={{ height: "auto", opacity: 1, scale: 1 }}
                    exit={{ height: 0, opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    style={{ 
                      position: "absolute",
                      bottom: "calc(100% + 10px)", // Position it above the header with a gap
                      left: 0,
                      right: 0,
                      zIndex: 20002, // Stack above the header
                      backgroundColor: "rgba(30, 30, 30, 0.98)", // Solider background for readability
                      borderRadius: "10px",
                      boxShadow: "0 -8px 32px rgba(0,0,0,0.5)", // Upward shadow
                      overflow: "visible", 
                      border: `1px solid ${player.color}60`, // Subtle border with player color
                    }}
                  >
                    <div style={{ 
                      padding: "4px", 
                      position: "relative", 
                      zIndex: 20002,
                      maxHeight: "70vh", // Prevent it from going off the top of the screen
                      overflowY: "auto", // Allow scrolling within the properties if too many
                      display: "flex",
                      flexDirection: "column",
                    }}>
                      {/* Tab Switcher */}
                      {!shouldHideProperties && (
                        <div style={{ 
                          display: "flex", 
                          borderBottom: "1px solid rgba(255,255,255,0.1)",
                          marginBottom: "4px"
                        }}>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setActiveTab("properties"); }}
                            style={{
                              flex: 1,
                              padding: "8px",
                              background: activeTab === "properties" ? "rgba(255,255,255,0.1)" : "transparent",
                              border: "none",
                              color: activeTab === "properties" ? player.color : "#888",
                              fontSize: "12px",
                              fontWeight: "bold",
                              cursor: "pointer",
                              position: "relative",
                            }}
                          >
                            Properties
                            {activeTab === "properties" && (
                              <motion.div 
                                layoutId={`activeTab-${player.id}`}
                                style={{ 
                                  position: "absolute", 
                                  bottom: 0, 
                                  left: 0, 
                                  right: 0, 
                                  height: "2px", 
                                  backgroundColor: player.color 
                                }}
                              />
                            )}
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setActiveTab("financials"); }}
                            style={{
                              flex: 1,
                              padding: "8px",
                              background: activeTab === "financials" ? "rgba(255,255,255,0.1)" : "transparent",
                              border: "none",
                              color: activeTab === "financials" ? player.color : "#888",
                              fontSize: "12px",
                              fontWeight: "bold",
                              cursor: "pointer",
                              position: "relative",
                            }}
                          >
                            Financials
                            {activeTab === "financials" && (
                              <motion.div 
                                layoutId={`activeTab-${player.id}`}
                                style={{ 
                                  position: "absolute", 
                                  bottom: 0, 
                                  left: 0, 
                                  right: 0, 
                                  height: "2px", 
                                  backgroundColor: player.color 
                                }}
                              />
                            )}
                          </button>
                        </div>
                      )}

                      {/* Check privacy settings for properties panel as well */}
                      {!shouldHideProperties ? (
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.15 }}
                          >
                            {activeTab === "properties" ? (
                              <PlayerPropertiesPanel playerIndex={index} myPlayerIndex={myPlayerIndex} />
                            ) : (
                              <div style={{ padding: "10px", color: "#fff" }}>
                                <div style={{ fontSize: "13px", fontWeight: "bold", marginBottom: "10px", color: player.color }}>
                                  Loans & Liabilities
                                </div>
                                
                                {/* Loans Section */}
                                <div style={{ marginBottom: "15px" }}>
                                  <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", marginBottom: "5px", textTransform: "uppercase" }}>
                                    Active Loans ({player.bankLoans?.length || 0})
                                  </div>
                                  {player.bankLoans && player.bankLoans.length > 0 ? (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                      {player.bankLoans.map(loan => (
                                        <div key={loan.id} style={{ 
                                           background: "rgba(255,255,255,0.05)", 
                                           padding: "8px", 
                                           borderRadius: "6px",
                                           fontSize: "11px",
                                           borderLeft: "3px solid #FF6B6B"
                                         }}>
                                           <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                             <span style={{ fontWeight: "bold" }}>£{loan.amount.toLocaleString()} Loan</span>
                                             <span style={{ color: "rgba(255,255,255,0.4)" }}>Owed: £{loan.totalOwed.toLocaleString()}</span>
                                           </div>
                                           <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)" }}>
                                             Taken on Turn {loan.turnTaken} | Rate: {(loan.interestRate * 100).toFixed(0)}%
                                           </div>
                                         </div>
                                       ))}
                                     </div>
                                   ) : (
                                     <div style={{ fontSize: "11px", opacity: 0.4, fontStyle: "italic", padding: "10px", textAlign: "center", background: "rgba(0,0,0,0.2)", borderRadius: "6px" }}>
                                       No active bank loans
                                     </div>
                                   )}
                                 </div>
 
                                 {/* IOUs Section */}
                                 <div style={{ marginBottom: "15px" }}>
                                   <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", marginBottom: "5px", textTransform: "uppercase" }}>
                                     IOUs Payable ({player.iousPayable?.length || 0})
                                   </div>
                                   {player.iousPayable && player.iousPayable.length > 0 ? (
                                     <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                       {player.iousPayable.map(iou => {
                                         const creditor = players.find(p => p.id === iou.creditorId);
                                         return (
                                           <div key={iou.id} style={{ 
                                             background: "rgba(255,255,255,0.05)", 
                                             padding: "8px", 
                                             borderRadius: "6px",
                                             fontSize: "11px",
                                             borderLeft: "3px solid #FFA500"
                                           }}>
                                             <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                               <span style={{ fontWeight: "bold" }}>£{iou.currentAmount.toLocaleString()} IOU</span>
                                               <span style={{ color: creditor?.color || "#fff" }}>To: {creditor?.name || "Unknown"}</span>
                                             </div>
                                             <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)" }}>
                                               Original: £{iou.originalAmount.toLocaleString()} | Rate: {(iou.interestRate * 100).toFixed(0)}%
                                             </div>
                                           </div>
                                         );
                                       })}
                                     </div>
                                   ) : (
                                     <div style={{ fontSize: "11px", opacity: 0.4, fontStyle: "italic", padding: "10px", textAlign: "center", background: "rgba(0,0,0,0.2)", borderRadius: "6px" }}>
                                       No outstanding IOUs
                                     </div>
                                   )}
                                </div>

                                {/* Chapter 11 Status */}
                                {player.inChapter11 && (
                                  <div style={{ 
                                    padding: "10px", 
                                    borderRadius: "8px", 
                                    background: "rgba(255, 107, 107, 0.1)", 
                                    border: "1px solid #FF6B6B",
                                    marginTop: "10px"
                                  }}>
                                    <div style={{ fontSize: "12px", fontWeight: "bold", color: "#FF6B6B", marginBottom: "4px" }}>
                                      ⚠️ CHAPTER 11 RESTRUCTURING
                                    </div>
                                    <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.7)" }}>
                                      Debt Target: £{player.chapter11DebtTarget.toLocaleString()}
                                    </div>
                                    <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.7)" }}>
                                      Turns Left: {player.chapter11TurnsRemaining}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </motion.div>
                        </AnimatePresence>
                      ) : (
                         <div style={{ 
                           padding: "16px", 
                           textAlign: "center", 
                           color: "rgba(255,255,255,0.6)",
                           fontSize: "13px",
                           background: "rgba(0,0,0,0.2)",
                           borderRadius: "0 0 10px 10px"
                         }}>
                           <div style={{ fontSize: "24px", marginBottom: "4px" }}>🔒</div>
                           <div style={{ fontWeight: "bold", color: "#fff" }}>
                             {player.properties.length} Properties
                           </div>
                           <div style={{ fontSize: "11px", marginTop: "2px", opacity: 0.7 }}>
                             Details Hidden
                           </div>
                         </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
