import React from "react"
import { motion } from "framer-motion"
import { useGameStore } from "../store/gameStore"
import { useLocalStore } from "../store/localStore"

interface PlayerSelectionModalProps {
  onPlayerSelected: (index: number) => void
}

export const PlayerSelectionModal: React.FC<PlayerSelectionModalProps> = ({
  onPlayerSelected,
}) => {
  const players = useGameStore((s) => s.players)
  const phase = useGameStore((s) => s.phase)
  const assignPlayer = useGameStore((s) => s.assignPlayer)
  const { clientId } = useLocalStore()

  const myPlayerIndex = React.useMemo(() => {
    return players.findIndex((p) => p.clientId === clientId)
  }, [players, clientId])

  if (phase === "setup" || myPlayerIndex !== -1) return null
export const PlayerSelectionModal = () => {
  const players = useGameStore((s) => s.players);
  const phase = useGameStore((s) => s.phase);
  const assignPlayer = useGameStore((s) => s.assignPlayer);
  const { clientId } = useLocalStore();

  const myPlayerIndex = React.useMemo(() => {
    return players.findIndex(p => p.clientId === clientId);
  }, [players, clientId]);

  if (phase === "setup" || myPlayerIndex !== -1) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          backgroundColor: "#1a1a2a",
          padding: "32px",
          borderRadius: "16px",
          width: "400px",
          textAlign: "center",
          color: "#fff",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <h2 style={{ marginBottom: "24px", color: "#4ECDC4" }}>Who are you?</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {players.map((player, index) => (
            <motion.button
              key={player.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onPlayerSelected(index)}
              onClick={() => assignPlayer(index, clientId)}
              disabled={player.bankrupt || player.isAI}
              style={{
                padding: "16px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: player.isAI
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(255,255,255,0.1)",
                backgroundColor: (player.isAI) ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.1)",
                color: "#fff",
                cursor: (player.isAI) ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                opacity: player.bankrupt ? 0.5 : 1,
                borderLeft:
                  player.clientId !== null && player.clientId !== clientId
                    ? "4px solid #FF9800"
                    : "4px solid transparent",
                borderLeft: (player.clientId !== undefined && player.clientId !== clientId) ? "4px solid #FF9800" : "4px solid transparent",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: player.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                }}
              >
                {player.token}
              </div>
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ fontWeight: "bold" }}>{player.name}</div>
                <div style={{ fontSize: "12px", color: "#ccc" }}>
                  {player.isAI
                    ? "AI Player"
                    : player.clientId
                    ? "Occupied"
                    : "Human Player"}
                </div>
              </div>
              {(player.isAI ||
                (player.clientId !== null && player.clientId !== clientId)) && (
                <span style={{ fontSize: "12px", color: "#FF9800" }}>
                  (Taken)
                </span>
                  {player.isAI ? "AI Player" : (player.clientId ? "Occupied" : "Human Player")}
                </div>
              </div>
              {(player.isAI || (player.clientId !== undefined && player.clientId !== clientId)) && (
                <span style={{ fontSize: "12px", color: "#FF9800" }}>(Taken)</span>
              )}
            </motion.button>
          ))}
        </div>

        <div style={{ marginTop: "24px", fontSize: "14px", color: "#666" }}>
          Select a human player to control.
        </div>
      </motion.div>
    </div>
  )
}
