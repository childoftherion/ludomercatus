import React, { useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useGameStore } from "../store/gameStore"
import { useIsMobile } from "../utils/useIsMobile"
import { calculateGiniCoefficient } from "../logic/rules/economics"

export const MarketPanel: React.FC = () => {
  const isMobile = useIsMobile()
  
  const currentGoSalary = useGameStore(s => s.currentGoSalary)
  const availableHouses = useGameStore(s => s.availableHouses)
  const availableHotels = useGameStore(s => s.availableHotels)
  const activeEconomicEvents = useGameStore(s => s.activeEconomicEvents)
  const settings = useGameStore(s => s.settings)
  const roundsCompleted = useGameStore(s => s.roundsCompleted)
  const marketHistory = useGameStore(s => s.marketHistory)
  const players = useGameStore(s => s.players)
  const spaces = useGameStore(s => s.spaces)

  if (!settings) return null

  const currentGini = useMemo(() => {
    // We only need players and spaces for Gini
    return calculateGiniCoefficient({ players, spaces } as any)
  }, [players, spaces])
  
  const housePoolPercent = (availableHouses / 32) * 100
  const hotelPoolPercent = (availableHotels / 12) * 100

  // Trend indicators
  const giniTrend = useMemo(() => {
    if (marketHistory.length < 1) return null
    const prevGini = marketHistory[marketHistory.length - 1]!.gini
    if (currentGini > prevGini + 0.01) return "📈"
    if (currentGini < prevGini - 0.01) return "📉"
    return null
  }, [currentGini, marketHistory])

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      style={{
        position: "fixed",
        top: isMobile ? "48px" : "120px",
        left: "8px",
        zIndex: 100,
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        borderRadius: "8px",
        padding: "10px",
        color: "#fff",
        fontSize: "12px",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
        width: isMobile ? "auto" : "160px",
        pointerEvents: "auto",
      }}
    >
      <div style={{ marginBottom: "8px", fontWeight: "bold", color: "#ff9800", display: "flex", alignItems: "center", gap: "4px" }}>
        📊 MARKET STATUS
      </div>

      <div style={{ marginBottom: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
          <span>GO Salary</span>
          <span style={{ color: "#4CAF50", fontWeight: "bold" }}>£{currentGoSalary}</span>
        </div>
        <div style={{ fontSize: "10px", color: "#aaa" }}>
          Round {roundsCompleted} {currentGoSalary > 200 ? "(Inflation applied)" : ""}
        </div>
      </div>

      <div style={{ marginBottom: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
          <span>Wealth Gap</span>
          <span style={{ 
            color: currentGini > 0.6 ? "#ff6b6b" : currentGini > 0.4 ? "#f7dc6f" : "#4caf50", 
            fontWeight: "bold" 
          }}>
            {(currentGini * 100).toFixed(0)}% {giniTrend}
          </span>
        </div>
        <div style={{ fontSize: "10px", color: "#aaa" }}>
          Gini Index: {currentGini.toFixed(2)}
        </div>
      </div>

      {marketHistory.length > 0 && !isMobile && (
        <div style={{ marginBottom: "12px", marginTop: "8px" }}>
          <div style={{ fontSize: "10px", color: "#888", marginBottom: "4px" }}>HISTORICAL TRENDS</div>
          <div style={{ 
            height: "30px", 
            display: "flex", 
            alignItems: "flex-end", 
            gap: "2px",
            backgroundColor: "rgba(255,255,255,0.05)",
            borderRadius: "4px",
            padding: "4px"
          }}>
            {marketHistory.slice(-10).map((entry, i) => (
              <div 
                key={i} 
                title={`Round ${entry.round}: Gini ${(entry.gini * 100).toFixed(1)}%`}
                style={{
                  flex: 1,
                  height: `${entry.gini * 100}%`,
                  backgroundColor: "#45B7D1",
                  borderRadius: "1px 1px 0 0",
                  minWidth: "4px"
                }}
              />
            ))}
          </div>
        </div>
      )}

      {settings.enableHousingScarcity && (
        <div style={{ marginBottom: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <span>🏠 Houses</span>
            <span style={{ color: availableHouses <= 5 ? "#ff6b6b" : "#fff" }}>{availableHouses}/32</span>
          </div>
          <div style={{ width: "100%", height: "4px", backgroundColor: "#333", borderRadius: "2px", overflow: "hidden" }}>
            <div style={{ width: `${housePoolPercent}%`, height: "100%", backgroundColor: availableHouses <= 5 ? "#ff6b6b" : "#4CAF50" }} />
          </div>
          
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", marginBottom: "4px" }}>
            <span>🏨 Hotels</span>
            <span style={{ color: availableHotels <= 2 ? "#ff6b6b" : "#fff" }}>{availableHotels}/12</span>
          </div>
          <div style={{ width: "100%", height: "4px", backgroundColor: "#333", borderRadius: "2px", overflow: "hidden" }}>
            <div style={{ width: `${hotelPoolPercent}%`, height: "100%", backgroundColor: availableHotels <= 2 ? "#ff6b6b" : "#F7DC6F" }} />
          </div>
        </div>
      )}

      {activeEconomicEvents.length > 0 && (
        <div style={{ marginTop: "10px", borderTop: "1px solid #444", paddingTop: "8px" }}>
          <div style={{ fontWeight: "bold", fontSize: "10px", marginBottom: "4px", color: "#8b5cf6" }}>ACTIVE EVENTS</div>
          {activeEconomicEvents.map(event => (
            <div key={event.type} style={{ fontSize: "10px", color: "#ddd", display: "flex", flexDirection: "column", marginBottom: "6px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#F7DC6F" }}>
                ✨ {event.type.replace("_", " ").toUpperCase()}
              </div>
              <div style={{ fontSize: "9px", color: "#aaa", paddingLeft: "14px" }}>
                {event.turnsRemaining} turns left
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
