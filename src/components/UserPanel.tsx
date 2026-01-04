import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { PlayerPropertiesPanel } from "./PlayerProperties"
import { useGameStore } from "../store/gameStore"
import { useLocalStore } from "../store/localStore"
import { calculateNetWorth } from "../logic/rules/economics"

export const UserPanel: React.FC = () => {
  const { players, currentPlayerIndex, settings, spaces } = useGameStore()
  const { myPlayerIndex } = useLocalStore()
  const [expandedPlayerIndex, setExpandedPlayerIndex] = useState<number | null>(
    null
  )
  
  // Calculate net worth for each player
  const getNetWorth = (playerIndex: number) => {
    const state = useGameStore.getState()
    return calculateNetWorth(state, playerIndex)
  }

  if (!players || players.length === 0) return null

  // Filter out bankrupt players for layout calculation
  const activePlayers = players.filter((p, i) => p && !p.bankrupt)
  const playerCount = activePlayers.length

  return (
    <div
      style={{
        position: "fixed",
        bottom: "8px",
        left: "8px",
        right: "8px",
        zIndex: 20000,
        display: "flex",
        flexDirection: "row",
        gap: "8px",
        justifyContent: "space-evenly", // Distribute players evenly across the bottom
        alignItems: "flex-end",
        overflowY: "visible",
        overflowX: "visible",
        paddingBottom: "2px",
        isolation: "isolate",
      }}
    >
      {players.map((player, index) => {
        if (!player || player.bankrupt) return null

        const isExpanded = expandedPlayerIndex === index
        const isCurrentPlayer = currentPlayerIndex === index
        const isYou = myPlayerIndex === index
        // Hide cash if hideOpponentWealth is enabled (hides cash & net worth) or hideOpponentProperties is enabled
        const shouldHideCash =
          (settings?.hideOpponentWealth || settings?.hideOpponentProperties) &&
          !isYou &&
          !player.bankrupt

        return (
          <motion.div
            key={player.id}
            className="player-panel"
            initial={false}
            animate={{
              flex: isExpanded ? "0 0 240px" : "1 1 0", // Equal flex distribution when not expanded, fixed when expanded
              width: isExpanded ? "240px" : undefined, // Fixed width when expanded, undefined when not (let flex handle it)
              minWidth: isExpanded ? "240px" : "140px", // Increased minimum width for better visibility
              maxWidth: isExpanded ? "240px" : "none", // No max width when not expanded, let flex distribute equally
              height: isExpanded ? "auto" : "auto", // Allow height to adjust
              zIndex: isExpanded ? 20001 : 20000,
            }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            style={{
              position: "relative",
              zIndex: isExpanded ? 20001 : 20000,
            }}
          >
            <div
              onMouseEnter={() => setExpandedPlayerIndex(index)}
              onMouseLeave={() => setExpandedPlayerIndex(null)}
              style={{
                background: "rgba(30, 30, 30, 0.95)",
                borderRadius: "10px",
                border: isCurrentPlayer
                  ? `3px solid ${player.color}`
                  : "2px solid transparent",
                boxShadow: isCurrentPlayer
                  ? `0 0 20px ${player.color}40, 0 4px 20px rgba(0,0,0,0.3)`
                  : "0 4px 20px rgba(0,0,0,0.3)",
                // boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
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
                  gap: "6px", // Scaled down for 100% zoom
                  padding: "6px 9px", // Scaled down for 100% zoom
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
                  }}
                >
                  {player.token}
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
                  </div>
                  {!isExpanded && !shouldHideCash && (
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
                      <div
                        style={{
                          color: "#22c55e",
                          fontSize: "11px",
                          fontWeight: 500,
                          marginTop: "2px",
                        }}
                      >
                        Net: £{getNetWorth(index).toLocaleString()}
                      </div>
                    </>
                  )}
                  {!isExpanded && shouldHideCash && (
                    <div
                      style={{
                        color: "rgba(255,255,255,0.4)",
                        fontSize: "11px",
                        fontStyle: "italic",
                        marginTop: "4px",
                      }}
                    >
                      ???
                    </div>
                  )}
                </div>
              </div>

              {/* Expanded Content - Shown on Hover */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ 
                      overflow: "visible", // Changed to visible so content can show above
                      position: "relative",
                      zIndex: 20002, // Even higher z-index for expanded content
                    }}
                  >
                    <div style={{ padding: "0", position: "relative", zIndex: 20002 }}>
                      <PlayerPropertiesPanel playerIndex={index} />
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
