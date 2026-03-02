import React from 'react'
import { motion } from 'framer-motion'
import { useGameStore } from '../store/gameStore'

interface PlayerSelectionModalProps {
  onPlayerSelected: (index: number) => void
}

export const PlayerSelectionModal: React.FC<PlayerSelectionModalProps> = ({
  onPlayerSelected,
}) => {
  const players = useGameStore(s => s.players)
  const phase = useGameStore(s => s.phase)
  const clientId = useGameStore(s => s.clientId)

  const myPlayerIndex = React.useMemo(() => {
    return players.findIndex(p => p.clientId === clientId)
  }, [players, clientId])

  const mySeat = myPlayerIndex === -1 ? null : players[myPlayerIndex]
  const canClaimCurrentSeat =
    mySeat !== undefined &&
    mySeat !== null &&
    mySeat.isAI &&
    mySeat.clientId === clientId

  if (phase === 'setup' || (myPlayerIndex !== -1 && !canClaimCurrentSeat))
    return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          backgroundColor: '#1a1a2a',
          padding: '32px',
          borderRadius: '16px',
          width: '400px',
          textAlign: 'center',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <h2 style={{ marginBottom: '24px', color: '#4ECDC4' }}>Who are you?</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {players.map((player, index) => {
            const isMe = player.clientId === clientId
            const isTakenByOtherHuman =
              player.clientId !== null &&
              !isMe &&
              !player.isAI &&
              player.isConnected
            const isOwnAISeat = player.isAI && player.clientId === clientId
            const canTakeOverAI = player.isAI && !player.isConnected
            const canClaimUnownedAI = player.isAI && player.clientId === null
            const disabled = player.bankrupt
              ? true
              : player.isAI
                ? player.isConnected && !isOwnAISeat && !canClaimUnownedAI
                : isTakenByOtherHuman
            const subtitle = player.isAI
              ? canTakeOverAI
                ? 'AI Player (Disconnected)'
                : isOwnAISeat
                  ? 'AI Player (Rejoin)'
                  : canClaimUnownedAI
                    ? 'AI Seat'
                    : 'AI Player'
              : isTakenByOtherHuman
                ? 'Taken'
                : isMe
                  ? 'You (Rejoin)'
                  : player.clientId && !player.isConnected
                    ? 'Disconnected'
                    : 'Human Player'

            return (
              <motion.button
                key={player.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  if (!disabled) {
                    console.log(
                      `[Identity] Selecting seat ${index} (${player.name})`,
                    )
                    onPlayerSelected(index)
                  }
                }}
                disabled={disabled}
                style={{
                  padding: '16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: isMe
                    ? 'rgba(78, 205, 196, 0.2)'
                    : player.isAI
                      ? 'rgba(255,255,255,0.05)'
                      : 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  opacity: player.bankrupt ? 0.5 : 1,
                  borderLeft: isTakenByOtherHuman
                    ? '4px solid #FF9800'
                    : isMe
                      ? '4px solid #4ECDC4'
                      : '4px solid transparent',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: player.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                  }}
                >
                  {player.token}
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontWeight: 'bold' }}>{player.name}</div>
                  <div style={{ fontSize: '12px', color: '#ccc' }}>
                    {subtitle}
                  </div>
                </div>
                {isTakenByOtherHuman && (
                  <span style={{ fontSize: '12px', color: '#FF9800' }}>
                    (Taken)
                  </span>
                )}
              </motion.button>
            )
          })}
        </div>

        <div style={{ marginTop: '24px', fontSize: '14px', color: '#666' }}>
          Select a seat to control.
        </div>
      </motion.div>
    </div>
  )
}
