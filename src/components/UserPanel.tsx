import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { PlayerPropertiesPanel } from "./PlayerProperties"
import { useGameStore } from "../store/gameStore"
import { useLocalStore } from "../store/localStore"

export const UserPanel: React.FC = () => {
  const { players, currentPlayerIndex, settings } = useGameStore()
  const { myPlayerIndex } = useLocalStore()
  const [expandedPlayerIndex, setExpandedPlayerIndex] = useState<number | null>(
    null
  )

  if (!players || players.length === 0) return null

  return (
    <div
      style={{
        position: "fixed",
        bottom: "8px", // Minimal bottom spacing
        left: "8px", // Reduced from 12px - tighter spacing
        right: "8px", // Reduced from 12px - tighter spacing
        zIndex: 20000, // Very high z-index to ensure it's always on top of everything
        display: "flex",
        flexDirection: "row",
        gap: "6px", // Reduced from 8px - more compact
        justifyContent: "flex-start",
        alignItems: "flex-end",
        overflowY: "visible", // Allow expanded content to show
        overflowX: "auto",
        paddingBottom: "2px", // Reduced padding
        isolation: "isolate", // Create new stacking context to ensure proper z-index behavior
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
              width: isExpanded ? "200px" : "100px",
              height: isExpanded ? "auto" : "36px",
              zIndex: isExpanded ? 20001 : 20000,
            }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            style={{
              position: "relative",
              zIndex: isExpanded ? 20001 : 20000, // Ensure z-index is applied
            }}
          >
            <div
              onMouseEnter={() => setExpandedPlayerIndex(index)}
              onMouseLeave={() => setExpandedPlayerIndex(null)}
              style={{
                background: "rgba(30, 30, 30, 0.95)",
                borderRadius: "10px",
                border: isCurrentPlayer
                  ? `2px solid ${player.color}`
                  : "2px solid transparent",
                boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
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
                    width: "18px", // Scaled down for 100% zoom
                    height: "18px", // Scaled down for 100% zoom
                    borderRadius: "50%",
                    background: player.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px", // Scaled down for 100% zoom
                    flexShrink: 0,
                  }}
                >
                  {player.token}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      color: "#fff",
                      fontWeight: 600,
                      fontSize: "12px",
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
                          marginLeft: "4px",
                          fontSize: "10px",
                        }}
                      >
                        (AI)
                      </span>
                    )}
                  </div>
                  {!isExpanded && !shouldHideCash && (
                    <div
                      style={{
                        color: "#4ECDC4",
                        fontSize: "11px",
                        fontWeight: 600,
                        marginTop: "2px",
                      }}
                    >
                      £{player.cash.toLocaleString()}
                    </div>
                  )}
                  {!isExpanded && shouldHideCash && (
                    <div
                      style={{
                        color: "rgba(255,255,255,0.4)",
                        fontSize: "10px",
                        fontStyle: "italic",
                        marginTop: "2px",
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
