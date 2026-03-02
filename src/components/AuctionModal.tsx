import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../store/gameStore'
import { getCurrentPropertyPrice } from '../logic/rules/economics'
import { audioManager } from '../utils/audio'
import type { AuctionState, Property, Player } from '../types/game'

export const AuctionModal: React.FC = () => {
  const auction = useGameStore(s => s.auction)
  const activeEconomicEvents = useGameStore(s => s.activeEconomicEvents)
  const players = useGameStore(s => s.players)
  const spaces = useGameStore(s => s.spaces)
  const clientId = useGameStore(s => s.clientId)

  const myPlayerIndex = React.useMemo(() => {
    return players.findIndex(p => p.clientId === clientId)
  }, [players, clientId])

  const [bidAmount, setBidAmount] = React.useState(0)
  const modalRef = React.useRef<HTMLDivElement>(null)
  const [position, setPosition] = React.useState({ x: 0, y: 0 })

  const property = auction
    ? (spaces.find(s => s.id === auction.propertyId) as Property)
    : null

  const currentPrice = property
    ? getCurrentPropertyPrice(useGameStore.getState(), property)
    : 0

  // Calculate minimum bid: 10% increment or £10, whichever is higher
  const minIncrement = auction
    ? Math.max(10, Math.floor(auction.currentBid * 0.1))
    : 0
  const minimumBid = auction
    ? auction.currentBid === 0
      ? Math.max(10, Math.floor((property ? currentPrice : 100) * 0.1)) // Opening bid: 10% of property value
      : auction.currentBid + minIncrement
    : 0

  // Update bid amount when minimum changes
  React.useEffect(() => {
    if (auction && bidAmount < minimumBid) {
      setBidAmount(minimumBid)
    }
  }, [minimumBid, auction, bidAmount])

  const activePlayer = auction ? players[auction.activePlayerIndex] : null
  const highestBidder =
    auction && auction.highestBidder !== null
      ? players[auction.highestBidder]
      : null

  // Only allow human player to bid for themselves
  const isMyTurn =
    auction && activePlayer
      ? auction.activePlayerIndex === myPlayerIndex
      : false
  const canBid =
    isMyTurn && activePlayer && !activePlayer.isAI && !activePlayer.bankrupt

  const handleBid = () => {
    if (!canBid || !auction) {
      console.warn(
        '[AuctionModal] Attempted to bid for non-human player or not your turn',
      )
      return
    }
    if (
      activePlayer &&
      bidAmount >= minimumBid &&
      bidAmount <= activePlayer.cash
    ) {
      useGameStore.getState().placeBid(auction.activePlayerIndex, bidAmount)
      audioManager.playBid()
    }
  }

  const handlePass = () => {
    if (!canBid || !auction) {
      console.warn(
        '[AuctionModal] Attempted to pass for non-human player or not your turn',
      )
      return
    }
    useGameStore.getState().passAuction(auction.activePlayerIndex)
  }

  // Quick bid buttons based on minimum bid
  const quickBids = activePlayer
    ? [
        minimumBid,
        minimumBid + Math.max(10, Math.floor(minimumBid * 0.25)),
        minimumBid + Math.max(20, Math.floor(minimumBid * 0.5)),
      ].filter(b => b <= activePlayer.cash)
    : []

  React.useEffect(() => {
    const updatePosition = () => {
      if (modalRef.current) {
        requestAnimationFrame(() => {
          if (modalRef.current) {
            const rect = modalRef.current.getBoundingClientRect()
            const isMobile = window.innerWidth < 768

            if (isMobile) {
              const modalX = (window.innerWidth - rect.width) / 2
              const modalY = (window.innerHeight - rect.height) / 2
              setPosition({ x: Math.max(8, modalX), y: Math.max(8, modalY) })
            } else {
              const modalAreaWidth = 320
              const modalAreaTop = 12
              const rightMargin = 12
              const modalX = window.innerWidth - modalAreaWidth - rightMargin
              const modalY = modalAreaTop
              const maxY = window.innerHeight - rect.height - 20
              const adjustedY = Math.min(modalY, maxY)
              setPosition({ x: modalX, y: adjustedY })
            }
          }
        })
      }
    }

    // Update position after render and on resize - use multiple attempts to catch different render phases
    const timer1 = setTimeout(updatePosition, 0)
    const timer2 = setTimeout(updatePosition, 50)
    const timer3 = setTimeout(updatePosition, 200)
    window.addEventListener('resize', updatePosition)
    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
      window.removeEventListener('resize', updatePosition)
    }
  }, [])

  if (!auction || !property) return null

  return (
    <AnimatePresence>
      <motion.div
        role="dialog"
        aria-label={`Auction for ${property?.name ?? 'property'}`}
        ref={modalRef}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: window.innerWidth < 768 ? 'calc(100% - 16px)' : '320px',
          maxWidth: '440px',
          maxHeight: 'calc(100vh - 24px)',
          overflowY: 'auto',
          backgroundColor: 'rgba(10, 10, 20, 0.95)',
          color: 'white',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.1)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: '20px' }}>
          <h2 style={{ margin: '0 0 16px 0', textAlign: 'center' }}>Auction</h2>

          {/* Property info */}
          <div
            style={{
              backgroundColor: '#333',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '16px',
              textAlign: 'center',
            }}
          >
            <h3 style={{ margin: '0 0 8px 0' }}>
              {property?.name ?? 'Property'}
            </h3>
            <p style={{ margin: 0, color: '#ccc' }}>
              Market Price: £{currentPrice}
            </p>
          </div>

          {/* Current bid info */}
          <div
            style={{
              backgroundColor: '#1a472a',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '16px',
              textAlign: 'center',
            }}
          >
            <p style={{ margin: '0 0 4px 0', color: '#ccc', fontSize: '14px' }}>
              {auction.currentBid === 0 ? 'Opening Bid' : 'Current Bid'}
            </p>
            <p
              style={{
                margin: 0,
                fontSize: '32px',
                fontWeight: 'bold',
                color: '#4CAF50',
              }}
            >
              {auction.currentBid === 0
                ? `£${minimumBid}+`
                : `£${auction.currentBid}`}
            </p>
            {highestBidder && (
              <p style={{ margin: '8px 0 0 0', color: '#ccc' }}>
                by{' '}
                <span style={{ color: highestBidder.color }}>
                  {highestBidder.name}
                </span>
              </p>
            )}
            {auction.currentBid > 0 && (
              <p
                style={{ margin: '4px 0 0 0', color: '#888', fontSize: '12px' }}
              >
                Min next bid: £{minimumBid} (+{minIncrement})
              </p>
            )}
          </div>

          {/* Active bidder panel */}
          <div
            style={{
              backgroundColor: '#444',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '16px',
            }}
          >
            <h3
              style={{
                margin: '0 0 12px 0',
                color: activePlayer?.color,
                textAlign: 'center',
              }}
            >
              {activePlayer?.name}'s Turn to Bid
              {activePlayer?.isAI && (
                <span
                  style={{
                    fontSize: '14px',
                    color: '#FF9800',
                    marginLeft: '8px',
                  }}
                >
                  (AI)
                </span>
              )}
            </h3>
            <p
              style={{
                margin: '0 0 16px 0',
                textAlign: 'center',
                color: '#ccc',
              }}
            >
              Available: £{activePlayer?.cash ?? 0}
            </p>

            {/* Only show bid/pass controls if it's the human player's turn */}
            {canBid ? (
              <>
                {/* Quick bid buttons */}
                {quickBids.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      marginBottom: '12px',
                      justifyContent: 'center',
                    }}
                  >
                    {quickBids.map(amount => (
                      <button
                        key={amount}
                        onClick={() => {
                          useGameStore
                            .getState()
                            .placeBid(auction.activePlayerIndex, amount)
                          setBidAmount(amount + 10)
                          audioManager.playBid()
                        }}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#4CAF50',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                        }}
                      >
                        £{amount}
                      </button>
                    ))}
                  </div>
                )}

                {/* Custom bid */}
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    justifyContent: 'center',
                  }}
                >
                  <input
                    type="number"
                    min={minimumBid}
                    max={activePlayer?.cash ?? 0}
                    value={bidAmount}
                    onChange={e =>
                      setBidAmount(
                        Math.max(
                          minimumBid,
                          parseInt(e.target.value) || minimumBid,
                        ),
                      )
                    }
                    style={{
                      padding: '8px',
                      width: '100px',
                      borderRadius: '4px',
                      border: 'none',
                      textAlign: 'center',
                      fontSize: '16px',
                    }}
                  />
                  <button
                    onClick={handleBid}
                    disabled={
                      bidAmount < minimumBid ||
                      bidAmount > (activePlayer?.cash ?? 0)
                    }
                    style={{
                      padding: '8px 24px',
                      backgroundColor:
                        bidAmount >= minimumBid &&
                        bidAmount <= (activePlayer?.cash ?? 0)
                          ? '#4CAF50'
                          : '#666',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor:
                        bidAmount >= minimumBid ? 'pointer' : 'not-allowed',
                      fontWeight: 'bold',
                    }}
                  >
                    Bid
                  </button>
                  <button
                    onClick={handlePass}
                    style={{
                      padding: '8px 24px',
                      backgroundColor: '#f44336',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    Pass
                  </button>
                </div>
              </>
            ) : (
              <div
                style={{ textAlign: 'center', color: '#888', padding: '16px' }}
              >
                {activePlayer?.isAI ? (
                  <p style={{ margin: 0 }}>AI is thinking...</p>
                ) : (
                  <p style={{ margin: 0 }}>
                    Waiting for {activePlayer?.name} to bid...
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Bidders status */}
          <div style={{ fontSize: '14px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#ccc' }}>Bidders</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {players.map((p, i) => {
                const hasPassed = auction.passedPlayers.includes(i)
                const isActive = i === auction.activePlayerIndex
                const isBankrupt = p.bankrupt

                return (
                  <div
                    key={p.id}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '16px',
                      backgroundColor: isActive
                        ? '#4CAF50'
                        : hasPassed || isBankrupt
                          ? '#333'
                          : '#555',
                      opacity: hasPassed || isBankrupt ? 0.5 : 1,
                      color: isActive ? '#fff' : p.color,
                      fontSize: '12px',
                    }}
                  >
                    {p.name} {hasPassed && '(Passed)'}{' '}
                    {isBankrupt && '(Bankrupt)'}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
