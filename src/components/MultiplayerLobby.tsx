import React from 'react'
import { motion } from 'framer-motion'
import { useGameStore } from '../store/gameStore'

const TOKENS = ['🚗', '🚙', '🚕', '🏎', '🚁', '✈️', '⛵', '🎭']

export const MultiplayerLobby = () => {
  const players = useGameStore(s => s.players)
  const addPlayer = useGameStore(s => s.addPlayer)
  const startGame = useGameStore(s => s.startGame)
  const leaveRoom = useGameStore(s => s.leaveRoom)
  const clientId = useGameStore(s => s.clientId)

  // Helper: detect ZELDA easter egg players (always remain as AI/spectator) — strictly case-sensitive
  const isZeldaPlayer = (p: { originalName?: string | undefined }) =>
    p.originalName === 'ZELDA'

  const myPlayer = React.useMemo(
    () => players.find(p => p.clientId === clientId && !isZeldaPlayer(p)),
    [players, clientId],
  )

  const [name, setName] = React.useState('')
  const [token, setToken] = React.useState('')

  // Check if the entered name is exactly "ZELDA" (for visual feedback) — strictly case-sensitive
  const isEnteringZelda = name.trim() === 'ZELDA'

  const handleJoin = () => {
    if (name && token) {
      addPlayer(name, token, clientId)
    }
  }

  const isHost = players.length > 0 && players[0]!.clientId === clientId

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#1a1a2a',
        padding: '40px',
        gap: '24px',
        color: '#fff',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '40px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          textAlign: 'center',
          maxWidth: '600px',
          width: '100%',
        }}
      >
        <button
          onClick={leaveRoom}
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            background: 'none',
            border: 'none',
            fontSize: '24px',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          ← Leave
        </button>

        <h1
          style={{ fontSize: '32px', color: '#4ECDC4', marginBottom: '24px' }}
        >
          Game Lobby
        </h1>

        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ marginBottom: '16px' }}>Players ({players.length}/8)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {players.length === 0 ? (
              <div style={{ fontStyle: 'italic', color: '#aaa' }}>
                Waiting for players...
              </div>
            ) : (
              players.map(p => (
                <div
                  key={p.id}
                  style={{
                    padding: '12px',
                    background: isZeldaPlayer(p) ? 'rgba(78, 205, 196, 0.1)' : 'rgba(0,0,0,0.2)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    border: isZeldaPlayer(p) ? '1px solid rgba(78, 205, 196, 0.3)' : 'none',
                  }}
                >
                  <span style={{ fontSize: '24px' }}>{p.token}</span>
                  <span style={{ fontWeight: 'bold' }}>{p.name}</span>
                  {p.clientId === clientId && !isZeldaPlayer(p) && (
                    <span style={{ color: '#4ECDC4' }}>(You)</span>
                  )}
                  {isZeldaPlayer(p) && (
                    <span style={{ color: '#FFD700', fontSize: '12px' }}>🤖 AI Bot</span>
                  )}
                  {p.id === 0 && (
                    <span style={{ color: '#FFD700' }}>👑 Host</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {!myPlayer ? (
          <div
            style={{
              borderTop: '1px solid rgba(255,255,255,0.1)',
              paddingTop: '24px',
            }}
          >
            <h3 style={{ marginBottom: '16px' }}>Join Game</h3>
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              <input
                type="text"
                placeholder="Your Name"
                value={name}
                onChange={e => setName(e.target.value)}
                style={{ padding: '12px', borderRadius: '8px', border: 'none' }}
              />

              {isEnteringZelda && (
                <div
                  style={{
                    padding: '10px 14px',
                    backgroundColor: 'rgba(78, 205, 196, 0.15)',
                    border: '1px solid rgba(78, 205, 196, 0.4)',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: '#4ECDC4',
                  }}
                >
                  🤖 <strong>Spectator Mode!</strong> Joining as "ZELDA" will create an AI bot named "Player Bot". You'll watch the bots play instead of playing yourself.
                </div>
              )}

              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    textAlign: 'left',
                  }}
                >
                  Choose Token:
                </label>
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                  }}
                >
                  {TOKENS.map(t => (
                    <button
                      key={t}
                      onClick={() => setToken(t)}
                      style={{
                        fontSize: '24px',
                        padding: '8px',
                        borderRadius: '8px',
                        border:
                          token === t
                            ? '2px solid #4ECDC4'
                            : '1px solid transparent',
                        backgroundColor:
                          token === t
                            ? 'rgba(78, 205, 196, 0.2)'
                            : 'rgba(255,255,255,0.1)',
                        cursor: 'pointer',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleJoin}
                disabled={!name || !token}
                style={{
                  padding: '16px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  backgroundColor: name && token ? '#4169E1' : '#666',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: name && token ? 'pointer' : 'not-allowed',
                  marginTop: '16px',
                }}
              >
                Join Game
              </motion.button>
            </div>
          </div>
        ) : (
          <div>
            {isHost ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={startGame}
                disabled={players.length < 2}
                style={{
                  padding: '16px 48px',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  backgroundColor: players.length >= 2 ? '#4CAF50' : '#666',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: players.length >= 2 ? 'pointer' : 'not-allowed',
                }}
              >
                Start Game
              </motion.button>
            ) : (
              <div style={{ color: '#aaa' }}>Waiting for host to start...</div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  )
}
