import React, { useMemo } from "react"
import { motion } from "framer-motion"
import { useGameStore } from "../store/gameStore"
import { calculateGiniCoefficient } from "../logic/rules/economics"

interface BoardMarketStatusProps {
  centerSize: number
}

export const BoardMarketStatus: React.FC<BoardMarketStatusProps> = ({ centerSize }) => {
  const currentGoSalary = useGameStore(s => s.currentGoSalary)
  const availableHouses = useGameStore(s => s.availableHouses)
  const availableHotels = useGameStore(s => s.availableHotels)
  const marketHistory = useGameStore(s => s.marketHistory)
  const players = useGameStore(s => s.players)
  const spaces = useGameStore(s => s.spaces)

  const activeEconomicEvents = useGameStore(s => s.activeEconomicEvents)

  const currentGini = useMemo(() => {
    return calculateGiniCoefficient({ players, spaces } as any)
  }, [players, spaces])
  
  // Trend indicators
  const giniTrend = useMemo(() => {
    if (marketHistory.length < 1) return null
    const prevGini = marketHistory[marketHistory.length - 1]?.gini ?? currentGini
    if (currentGini > prevGini + 0.01) return "📈"
    if (currentGini < prevGini - 0.01) return "📉"
    return null
  }, [currentGini, marketHistory])

  // Scale fonts based on centerSize but with better limits - smaller for redesigned UI
  const fontSize = Math.max(10, Math.min(20, Math.floor(centerSize * 0.035)))
  const titleFontSize = Math.max(12, Math.min(24, Math.floor(centerSize * 0.04)))
  const iconSize = Math.max(16, Math.min(32, Math.floor(centerSize * 0.045)))

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        position: "absolute",
        top: "8px",
        left: "8px",
        width: `${Math.min(380, centerSize * 0.5)}px`,
        backgroundColor: "rgba(255, 255, 255, 0.98)",
        borderRadius: "10px",
        padding: "12px 16px",
        border: "2px solid #2E8B57",
        boxShadow: "0 6px 18px rgba(0,0,0,0.15)",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        pointerEvents: "none",
      }}
    >
      <div style={{ 
        fontWeight: "900", 
        color: "#2E8B57", 
        fontSize: `${titleFontSize}px`,
        display: "flex", 
        alignItems: "center", 
        gap: "8px",
        borderBottom: "2px solid rgba(46, 139, 87, 0.2)",
        paddingBottom: "6px",
        marginBottom: "2px",
        letterSpacing: "0.5px"
      }}>
        <span style={{ fontSize: `${iconSize}px` }}>📊</span> MARKET STATUS
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: `${fontSize}px`, color: "#444", fontWeight: "700" }}>GO SALARY</span>
        <span style={{ fontSize: `${fontSize * 1.1}px`, fontWeight: "900", color: "#2E8B57" }}>£{currentGoSalary}</span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: `${fontSize}px`, color: "#444", fontWeight: "700" }}>GINI</span>
        <span style={{ 
          fontSize: `${fontSize * 1.1}px`, 
          fontWeight: "900",
          color: currentGini > 0.6 ? "#d32f2f" : currentGini > 0.4 ? "#fbc02d" : "#388e3c", 
          display: "flex",
          alignItems: "center",
          gap: "4px"
        }}>
          {(currentGini * 100).toFixed(0)}% {giniTrend}
        </span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: `${fontSize}px`, color: "#444", fontWeight: "700" }}>PROPERTIES</span>
        <span style={{ fontSize: `${fontSize * 1.0}px`, fontWeight: "900", color: "#1976d2" }}>
          🏠{availableHouses} / 🏨{availableHotels}
        </span>
      </div>

      {/* Market Events Section */}
      {activeEconomicEvents.length > 0 && (
        <div style={{ 
          marginTop: "4px",
          padding: "6px 8px",
          backgroundColor: "rgba(255, 0, 0, 0.05)",
          borderRadius: "6px",
          border: "1px solid rgba(255, 0, 0, 0.1)",
        }}>
          <div style={{ 
            fontSize: `${Math.floor(fontSize * 0.85)}px`, 
            fontWeight: "bold", 
            color: "#d32f2f",
            marginBottom: "4px",
            display: "flex",
            alignItems: "center",
            gap: "4px"
          }}>
            ⚠️ ACTIVE EVENTS:
          </div>
          {activeEconomicEvents.map((event, idx) => (
            <div key={idx} style={{ 
              fontSize: `${Math.floor(fontSize * 0.8)}px`,
              color: "#333",
              marginBottom: idx === activeEconomicEvents.length - 1 ? 0 : "4px",
              lineHeight: 1.2
            }}>
              <span style={{ fontWeight: "bold", color: "#d32f2f" }}>{event.type.replace(/_/g, " ").toUpperCase()}</span>: {event.description} ({event.turnsRemaining} turns)
            </div>
          ))}
        </div>
      )}

      <div style={{ 
        fontSize: `${Math.floor(fontSize * 0.65)}px`, 
        color: "#666", 
        textAlign: "right",
        marginTop: "4px",
        fontStyle: "italic",
        borderTop: "1px solid rgba(0,0,0,0.1)",
        paddingTop: "4px"
      }}>
        Real-time economic indicators
      </div>
    </motion.div>

  )
}
