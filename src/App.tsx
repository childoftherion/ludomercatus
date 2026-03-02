import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { audioManager } from './utils/audio'
import { useGameStore } from './store/gameStore'
import { Board } from './components/Board'
import { MultiplayerLobby } from './components/MultiplayerLobby'
import { ServerBrowser } from './components/ServerBrowser'
import { PlayerTokens } from './components/PlayerToken'
import PlayerSetup from './components/PlayerSetup'
import { AuctionModal } from './components/AuctionModal'
import { TradeModal } from './components/TradeModal'
import { RentNegotiationModal } from './components/RentNegotiationModal'
import { BankruptcyModal } from './components/BankruptcyModal'
import { GameLog } from './components/GameLog'
import { PlayerSelectionModal } from './components/PlayerSelectionModal'
import { CardDisplay } from './components/CardDisplay'
import { PropertyDetailsModal } from './components/PropertyDetailsModal'
import { UserPanel } from './components/UserPanel'
import type { Property } from './types/game'
import { BurgerMenu } from './components/BurgerMenu'
import { GamePanel } from './components/GamePanel'
import { isProperty } from './utils/helpers'
import { useIsMobile } from './utils/useIsMobile'

export default function App() {
  const isMobile = useIsMobile()
  const phase = useGameStore(s => s.phase)
  const currentPlayerIndex = useGameStore(s => s.currentPlayerIndex)
  const players = useGameStore(s => s.players)
  const storePassedGo = useGameStore(s => s.passedGo)
  const winner = useGameStore(s => s.winner)
  const spaces = useGameStore(s => s.spaces)
  const auction = useGameStore(s => s.auction)
  const trade = useGameStore(s => s.trade)
  const lastCardDrawn = useGameStore(s => s.lastCardDrawn)
  const connect = useGameStore(s => s.connect)
  const connected = useGameStore(s => s.connected)
  const inRoom = useGameStore(s => s.inRoom)
  const leaveRoom = useGameStore(s => s.leaveRoom)
  const currentGoSalary = useGameStore(s => s.currentGoSalary)
  const pendingRentNegotiation = useGameStore(s => s.pendingRentNegotiation)
  const pendingBankruptcy = useGameStore(s => s.pendingBankruptcy)
  const pendingForeclosure = useGameStore(s => s.pendingForeclosure)
  const pendingDebtService = useGameStore(s => s.pendingDebtService)
  const settings = useGameStore(s => s.settings)
  const updateSettings = useGameStore(s => s.updateSettings)
  const roomId = useGameStore(s => s.roomId)
  const joinRoom = useGameStore(s => s.joinRoom)
  const clientId = useGameStore(s => s.clientId)

  React.useEffect(() => {
    connect()
  }, [connect])

  // Hash-based routing
  React.useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '')
      if (hash.startsWith('/room/')) {
        const roomIdFromHash = hash.split('/')[2]
        if (roomIdFromHash && roomIdFromHash !== roomId) {
          joinRoom(roomIdFromHash)
        }
      }
    }

    window.addEventListener('hashchange', handleHashChange, false)
    handleHashChange() // Check on initial load

    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [joinRoom, roomId])

  // Update hash when room ID changes
  React.useEffect(() => {
    if (inRoom && roomId && window.location.hash !== `#/room/${roomId}`) {
      window.location.hash = `#/room/${roomId}`
    }
  }, [inRoom, roomId])

  // Enable body scrolling for setup screen
  React.useEffect(() => {
    if (phase === 'setup') {
      document.body.style.overflow = 'auto'
    } else {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = 'hidden'
    }
  }, [phase])

  const myPlayerIndex = React.useMemo(() => {
    const index = players.findIndex(p => p.clientId === clientId)
    console.log(
      `[Identity] My player index is ${index} for client ID ${clientId}`,
    )
    return index
  }, [players, clientId])

  // Auto-claim if exactly one reclaimable player (unclaimed human or disconnected AI)
  React.useEffect(() => {
    if (phase !== 'setup' && myPlayerIndex === -1) {
      const reclaimablePlayers = players
        .map((p, i) => ({ ...p, index: i }))
        .filter(
          p =>
            !p.bankrupt &&
            ((p.isAI && !p.isConnected) ||
              (!p.isAI && (p.clientId === null || !p.isConnected))),
        )
      if (reclaimablePlayers.length === 1 && reclaimablePlayers[0]) {
        const nextPlayer = reclaimablePlayers[0]
        if (nextPlayer) {
          console.log(`[Identity] Auto-claiming player ${nextPlayer.name}`)
          useGameStore.getState().assignPlayer(nextPlayer.index, clientId)
        }
      }
    }
  }, [players, phase, myPlayerIndex, clientId])

  // If our client ID is already bound to an AI-controlled seat, reclaim it automatically.
  React.useEffect(() => {
    if (phase === 'setup') return
    if (myPlayerIndex === -1) return

    const matchedSeat = players[myPlayerIndex]
    if (!matchedSeat || !matchedSeat.isAI) return

    if (!matchedSeat.clientId || matchedSeat.clientId !== clientId) return
    console.log(
      `[Identity] Reclaiming AI seat ${myPlayerIndex} (${matchedSeat.name}) for client ${clientId}`,
    )
    useGameStore.getState().assignPlayer(myPlayerIndex, clientId)
  }, [phase, myPlayerIndex, players, clientId])

  const currentPlayer =
    currentPlayerIndex >= 0 && currentPlayerIndex < players.length
      ? players[currentPlayerIndex]
      : null

  const isMyTurn = currentPlayerIndex === myPlayerIndex

  const currentSpace = currentPlayer ? spaces[currentPlayer.position] : null

  const [passedGo, setPassedGo] = React.useState(false)
  const [isRolling, setIsRolling] = React.useState(false)
  const [showCard, setShowCard] = React.useState(false)
  const [lastShownCardId, setLastShownCardId] = React.useState<number | null>(
    null,
  )
  const lastPlayerIndexRef = React.useRef<number | undefined>(undefined)
  const [isNewTurn, setIsNewTurn] = React.useState(false)
  const [isMuted, setIsMuted] = React.useState(false)
  const [selectedProperty, setSelectedProperty] =
    React.useState<Property | null>(null)
  const [showMobileLog, setShowMobileLog] = React.useState(false)

  // Auto-hide card after 8 seconds
  React.useEffect(() => {
    if (lastCardDrawn) {
      // Only show if this is a new card (different from last shown)
      if (lastCardDrawn.id !== lastShownCardId) {
        setShowCard(true)
        setLastShownCardId(lastCardDrawn.id)
        audioManager.playCardDraw()
        const timer = setTimeout(() => {
          setShowCard(false)
          // Mark as shown so it doesn't reappear
          setLastShownCardId(lastCardDrawn.id)
        }, 8000) // Show for 8 seconds (increased from 5 for better visibility)
        return () => clearTimeout(timer)
      }
    } else {
      setShowCard(false)
      setLastShownCardId(null)
    }
  }, [lastCardDrawn, lastShownCardId])

  // Track previous player index to detect player changes
  const prevPlayerIndexRef = React.useRef(currentPlayerIndex)

  // Clear card display when player changes (but NOT when phase changes during card display)
  React.useEffect(() => {
    // Only clear card display when player changes, not when phase changes
    // Phase changes can happen due to card effects (e.g., moving to property triggers awaiting_buy_decision)
    // We want to keep the card visible even if phase changes due to the card's effect
    if (prevPlayerIndexRef.current !== currentPlayerIndex) {
      setShowCard(false)
      prevPlayerIndexRef.current = currentPlayerIndex
    }
  }, [currentPlayerIndex, phase])
  const diceRoll = useGameStore(s => s.diceRoll)
  // Detect new turns and handle stale diceRoll
  React.useEffect(() => {
    const detectedNewTurn =
      lastPlayerIndexRef.current != null &&
      lastPlayerIndexRef.current !== currentPlayerIndex &&
      phase === 'rolling'

    // Detect "roll again after doubles" - same player, phase is rolling, but diceRoll might still exist
    const isRollAgainAfterDoubles =
      lastPlayerIndexRef.current === currentPlayerIndex &&
      phase === 'rolling' &&
      diceRoll?.isDoubles

    if (detectedNewTurn) {
      console.log('[App] New turn detected:', {
        previousPlayer: lastPlayerIndexRef.current,
        currentPlayer: currentPlayerIndex,
        diceRoll: diceRoll,
        phase: phase,
      })

      // Play turn start sound if it's the human player's turn
      if (currentPlayerIndex === myPlayerIndex) {
        audioManager.playTurnStart()
      }

      // If diceRoll exists on a new turn, it's stale (should have been cleared by server)
      if (diceRoll) {
        console.warn(
          '[App] Stale diceRoll detected on new turn! Server should have cleared it.',
          diceRoll,
        )
        setIsNewTurn(true) // Mark as new turn so we ignore stale diceRoll
      } else {
        setIsNewTurn(true) // Still a new turn, even if diceRoll is cleared
      }

      // Reset local rolling state
      setIsRolling(false)
    } else if (isRollAgainAfterDoubles) {
      // This is a roll-again situation after doubles
      console.log('[App] Roll again after doubles detected')
      setIsNewTurn(true) // Allow rolling again
      setIsRolling(false) // Make sure rolling state is cleared
    }

    lastPlayerIndexRef.current = currentPlayerIndex
  }, [phase, currentPlayerIndex, diceRoll, myPlayerIndex])

  // Clear isNewTurn flag when dice are actually rolled
  React.useEffect(() => {
    if (isRolling) {
      // When rolling starts, clear the new turn flag
      setIsNewTurn(false)
    }
  }, [isRolling])

  // Handle roll-again after doubles: detect when we should be able to roll again
  React.useEffect(() => {
    // After clicking "Roll Again" for doubles, server sets phase to "rolling" and clears diceRoll
    // But client might still have the old diceRoll. If phase is "rolling" and we have a diceRoll
    // but we're not rolling, this is likely a roll-again situation
    if (
      phase === 'rolling' &&
      diceRoll &&
      !isRolling &&
      isMyTurn &&
      currentPlayer &&
      !currentPlayer.inJail
    ) {
      // Wait a moment for state to sync from server
      const timer = setTimeout(() => {
        const currentState = useGameStore.getState()
        // If server cleared diceRoll, it should be undefined now
        // If it's still there, it might be stale - allow rolling anyway
        if (
          currentState.phase === 'rolling' &&
          currentState.currentPlayerIndex === currentPlayerIndex
        ) {
          console.log('[App] Roll-again after doubles: allowing roll')
          setIsNewTurn(true) // This will make the button show
        }
      }, 200) // Give server time to update state
      return () => clearTimeout(timer)
    }
  }, [phase, diceRoll, isRolling, isMyTurn, currentPlayer, currentPlayerIndex])

  // Debug logging for Roll Dice button visibility
  React.useEffect(() => {
    console.log(
      `[State Sync] myPlayerIndex: ${myPlayerIndex}, currentPlayerIndex: ${currentPlayerIndex}, isMyTurn: ${isMyTurn}`,
    )
    if (phase === 'rolling' && currentPlayer) {
      const rollDiceConditions = {
        phase: phase,
        currentPlayerIndex: currentPlayerIndex,
        myPlayerIndex: myPlayerIndex,
        isMyTurn: isMyTurn,
        currentPlayerName: currentPlayer.name,
        currentPlayerIsAI: currentPlayer.isAI,
        currentPlayerInJail: currentPlayer.inJail,
        diceRoll: diceRoll,
        isRolling: isRolling,
        shouldShowButton:
          phase === 'rolling' &&
          !currentPlayer.inJail &&
          !currentPlayer.isAI &&
          isMyTurn &&
          !diceRoll &&
          !isRolling,
        conditionBreakdown: {
          phaseIsRolling: phase === 'rolling',
          notInJail: !currentPlayer.inJail,
          notAI: !currentPlayer.isAI,
          isMyTurn: isMyTurn,
          noDiceRoll: !diceRoll,
          notRolling: !isRolling,
        },
      }
      console.log('[Roll Dice Debug]', rollDiceConditions)

      // If all conditions should be met but button isn't showing, log warning
      if (rollDiceConditions.shouldShowButton && !isMyTurn) {
        console.warn(
          '[Roll Dice Debug] Button should show but isMyTurn is false!',
          {
            currentPlayerIndex,
            myPlayerIndex,
            players: players.map((p, i) => ({
              index: i,
              name: p.name,
              isAI: p.isAI,
            })),
          },
        )
      }
    }
  }, [
    phase,
    currentPlayerIndex,
    myPlayerIndex,
    isMyTurn,
    currentPlayer,
    diceRoll,
    isRolling,
    players,
    currentPlayerIndex,
  ])

  React.useEffect(() => {
    if (storePassedGo) {
      setPassedGo(true)
      setTimeout(() => {
        setPassedGo(false)
      }, 2000)
    }
  }, [storePassedGo])
  // AI turn execution
  React.useEffect(() => {
    if (!connected) return // Wait for connection

    // Determine who the "current actor" is based on the phase
    let actorIndex = currentPlayerIndex
    if (phase === 'auction' && auction) {
      actorIndex = auction.activePlayerIndex
    } else if (
      phase === 'awaiting_foreclosure_decision' &&
      pendingForeclosure
    ) {
      actorIndex = pendingForeclosure.creditorIndex
    } else if (
      phase === 'awaiting_rent_negotiation' &&
      pendingRentNegotiation
    ) {
      actorIndex =
        pendingRentNegotiation.status === 'creditor_decision'
          ? pendingRentNegotiation.creditorIndex
          : pendingRentNegotiation.debtorIndex
    } else if (phase === 'awaiting_debt_service' && pendingDebtService) {
      actorIndex = pendingDebtService.playerIndex
    } else if (phase === 'awaiting_bankruptcy_decision' && pendingBankruptcy) {
      actorIndex = pendingBankruptcy.playerIndex
    }

    const actor = players[actorIndex]
    if (!actor || !actor.isAI || actor.bankrupt) return
    if (phase === 'setup' || phase === 'game_over') return
    if (myPlayerIndex === -1) return

    // Only one client should trigger AI turns to avoid duplicates on the server.
    // We'll pick the first human player in the game.
    const firstHumanIndex = players.findIndex(p => !p.isAI)
    if (firstHumanIndex === -1) return
    if (myPlayerIndex !== firstHumanIndex) return

    // Add delay for AI actions to be visible
    const aiDelay = setTimeout(() => {
      console.log(
        `[App] Triggering AI turn for actor ${actor.name} (index: ${actorIndex}, phase: ${phase})`,
      )
      useGameStore.getState().executeAITurn()
    }, 1200)

    return () => clearTimeout(aiDelay)
  }, [
    currentPlayerIndex,
    phase,
    auction?.activePlayerIndex,
    pendingForeclosure,
    pendingRentNegotiation,
    pendingBankruptcy,
    pendingDebtService,
    connected,
    diceRoll,
    myPlayerIndex,
    players,
  ])

  // AI auction bid execution - separate handler for auction phase
  // (We'll keep this as a secondary check, but the main AI turn execution above should handle it now)
  React.useEffect(() => {
    if (!connected) return
    if (phase !== 'auction' || !auction) return

    const activeBidder = players[auction.activePlayerIndex]
    if (!activeBidder || !activeBidder.isAI || activeBidder.bankrupt) return
    if (myPlayerIndex === -1) return

    // Only one client should trigger AI turns
    const firstHumanIndex = players.findIndex(p => !p.isAI)
    if (firstHumanIndex === -1) return
    if (myPlayerIndex !== firstHumanIndex) return

    const aiDelay = setTimeout(() => {
      console.log(
        `[App] Triggering AI auction bid for ${activeBidder.name} (player ${auction.activePlayerIndex})`,
      )
      useGameStore.getState().executeAITurn()
    }, 1200)

    return () => clearTimeout(aiDelay)
  }, [phase, auction?.activePlayerIndex, players, connected, myPlayerIndex])
  // AI trade response
  React.useEffect(() => {
    if (!connected) return
    if (phase === 'trading') {
      if (myPlayerIndex === -1) return

      // Handle initial trade proposals (AI is receiver)
      if (trade?.status === 'pending') {
        const receiver = players[trade.offer.toPlayer]
        if (receiver?.isAI) {
          const firstHumanIndex = players.findIndex(p => !p.isAI)
          if (firstHumanIndex === -1) return
          if (myPlayerIndex !== firstHumanIndex) return
          const aiDelay = setTimeout(() => {
            useGameStore.getState().executeAITradeResponse()
          }, 2000)
          return () => clearTimeout(aiDelay)
        }
      }
      // Handle counter-offers (AI is original initiator)
      if (trade?.status === 'counter_pending') {
        const originalInitiator = players[trade.offer.fromPlayer]
        if (originalInitiator?.isAI) {
          const firstHumanIndex = players.findIndex(p => !p.isAI)
          if (firstHumanIndex === -1) return
          if (myPlayerIndex !== firstHumanIndex) return
          const aiDelay = setTimeout(() => {
            useGameStore.getState().executeAITradeResponse()
          }, 2000)
          return () => clearTimeout(aiDelay)
        }
      }
    }
  }, [phase, trade?.status, connected, players, myPlayerIndex])
  // AI rent negotiation response
  React.useEffect(() => {
    if (!connected) return
    if (myPlayerIndex === -1) return
    if (phase === 'awaiting_rent_negotiation' && pendingRentNegotiation) {
      const creditor = players[pendingRentNegotiation.creditorIndex]
      if (creditor?.isAI && !creditor.bankrupt) {
        const firstHumanIndex = players.findIndex(p => !p.isAI)
        if (firstHumanIndex === -1) return
        if (myPlayerIndex !== firstHumanIndex) return
        const aiDelay = setTimeout(() => {
          useGameStore.getState().executeAITurn()
        }, 2000)
        return () => clearTimeout(aiDelay)
      }
    }
  }, [phase, pendingRentNegotiation, connected, players, myPlayerIndex])
  // AI bankruptcy decision
  React.useEffect(() => {
    if (!connected) return
    if (myPlayerIndex === -1) return
    if (phase === 'awaiting_bankruptcy_decision') {
      const pending = (useGameStore.getState() as any).pendingBankruptcy
      if (pending) {
        const bankruptPlayer = players[pending.playerIndex]
        if (bankruptPlayer?.isAI && !bankruptPlayer.bankrupt) {
          const firstHumanIndex = players.findIndex(p => !p.isAI)
          if (firstHumanIndex === -1) return
          if (myPlayerIndex !== firstHumanIndex) return
          const aiDelay = setTimeout(() => {
            useGameStore.getState().executeAITurn()
          }, 2000)
          return () => clearTimeout(aiDelay)
        }
      }
    }
  }, [phase, connected, players, myPlayerIndex])

  // AI foreclosure decision
  React.useEffect(() => {
    if (!connected) return
    if (phase === 'awaiting_foreclosure_decision' && pendingForeclosure) {
      const creditor = players[pendingForeclosure.creditorIndex]
      if (creditor?.isAI && !creditor.bankrupt) {
        // Only host triggers AI
        if (myPlayerIndex === -1) return
        const firstHumanIndex = players.findIndex(p => !p.isAI)
        if (firstHumanIndex === -1) return
        if (myPlayerIndex !== firstHumanIndex) return

        const aiDelay = setTimeout(() => {
          useGameStore.getState().executeAITurn()
        }, 2000)
        return () => clearTimeout(aiDelay)
      }
    }
  }, [phase, pendingForeclosure, connected, players, myPlayerIndex])

  const handleRollDice = () => {
    if (isRolling) return
    setIsRolling(true)
    audioManager.playDiceRoll()
  }
  const handleRollComplete = () => {
    const roll = useGameStore.getState().diceRoll

    // Keep showing dice for a moment after roll completes
    setTimeout(() => {
      setIsRolling(false)

      if (roll && currentPlayer && !currentPlayer.inJail) {
        // Move the player after a short delay
        setTimeout(() => {
          useGameStore.getState().movePlayer(currentPlayerIndex, roll.total)
          audioManager.playMove()
        }, 200)
      }
    }, 800)
  }
  const handleEndTurn = () => {
    const currentRoll = useGameStore.getState().diceRoll
    const isDoubles = currentRoll?.isDoubles

    useGameStore.getState().endTurn()

    // If it's doubles, endTurn will set phase back to "rolling" and clear diceRoll on server
    // Clear local state immediately to allow another roll
    if (isDoubles) {
      setIsRolling(false)
      // Set isNewTurn to allow rolling again (server will clear diceRoll, but client might not update immediately)
      setTimeout(() => {
        setIsNewTurn(true)
      }, 100)
    }
  }
  const handleBuyProperty = () => {
    if (!currentSpace || !isProperty(currentSpace)) return
    useGameStore.getState().buyProperty(currentSpace.id)
    audioManager.playPurchase()
  }
  const handleDeclineProperty = () => {
    if (!currentSpace) return
    useGameStore.getState().declineProperty(currentSpace.id)
  }
  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't handle shortcuts if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      // Only handle shortcuts when it's the player's turn (unless it's a global shortcut)
      const playerCanAct =
        isMyTurn && phase !== 'setup' && phase !== 'game_over'

      switch (e.key) {
        case ' ': // Spacebar - Roll dice
          if (playerCanAct && phase === 'rolling' && !diceRoll && !isRolling) {
            e.preventDefault()
            handleRollDice()
          }
          break
        case 'Enter': // Enter - Confirm action (buy property, end turn, etc.)
          if (playerCanAct) {
            e.preventDefault()
            if (
              phase === 'awaiting_buy_decision' &&
              currentSpace &&
              isProperty(currentSpace)
            ) {
              handleBuyProperty()
            } else if (phase === 'resolving_space' || phase === 'rolling') {
              handleEndTurn()
            }
          }
          break
        case 'Escape': // Escape - Cancel/decline or close modals
          e.preventDefault()
          // Close property details modal if open
          if (selectedProperty) {
            setSelectedProperty(null)
            return
          }
          // Handle game actions
          if (playerCanAct) {
            if (phase === 'awaiting_buy_decision' && currentSpace) {
              handleDeclineProperty()
            }
          }
          break
        case 'b': // B - Buy property
        case 'B':
          if (
            playerCanAct &&
            phase === 'awaiting_buy_decision' &&
            currentSpace &&
            isProperty(currentSpace)
          ) {
            e.preventDefault()
            handleBuyProperty()
          }
          break
        case 'd': // D - Decline property
        case 'D':
          if (
            playerCanAct &&
            phase === 'awaiting_buy_decision' &&
            currentSpace
          ) {
            e.preventDefault()
            handleDeclineProperty()
          }
          break
        case 'e': // E - End turn
        case 'E':
          if (
            playerCanAct &&
            (phase === 'resolving_space' || phase === 'rolling')
          ) {
            e.preventDefault()
            handleEndTurn()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [
    phase,
    diceRoll,
    isRolling,
    currentSpace,
    isMyTurn,
    currentPlayerIndex,
    myPlayerIndex,
    selectedProperty,
  ])
  const handleDrawCard = (cardType: 'chance' | 'community_chest') => {
    useGameStore.getState().drawCard(currentPlayerIndex, cardType)
    audioManager.playCardDraw()
  }
  const handleJailAction = (action: 'card' | 'pay' | 'roll') => {
    if (currentPlayer) {
      useGameStore.getState().getOutOfJail(currentPlayerIndex, action)
    }
  }

  if (!connected) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: '#1a1a2a',
          color: '#fff',
          fontSize: '24px',
        }}
      >
        Connecting to server...
      </div>
    )
  }

  if (!inRoom) {
    return <ServerBrowser />
  }
  // Winner screen
  if (winner !== null) {
    const winnerPlayer = players.find(p => p.id === winner)
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#2E8B57',
          fontSize: '32px',
          color: '#fff',
        }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          <h1>Game Over!</h1>
          <p>Player {winnerPlayer?.name ?? winner} Wins!</p>
          <button
            onClick={() => location.reload()}
            style={{
              padding: '16px 32px',
              fontSize: '18px',
              backgroundColor: '#4CAF50',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              marginTop: '24px',
            }}
          >
            Play Again
          </button>
        </motion.div>
      </div>
    )
  }
  // Setup screen
  if (phase === 'setup') {
    return <PlayerSetup />
  }
  // Lobby screen
  if (phase === 'lobby') {
    return <MultiplayerLobby />
  }
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: '#1a1a2a',
        position: 'relative',
        overflow: 'visible', // Changed to visible so UserPanel expanded content isn't clipped
      }}
    >
      {/* Burger Menu - Consolidated menu for game controls */}
      <BurgerMenu
        isMuted={isMuted}
        onToggleMute={() => {
          const newMuted = !isMuted
          setIsMuted(newMuted)
          audioManager.setMuted(newMuted)
          if (!newMuted) {
            audioManager.playSuccess()
          }
        }}
        onExit={leaveRoom}
        isMobile={isMobile}
        showLog={showMobileLog}
        onToggleLog={() => setShowMobileLog(!showMobileLog)}
        reducedMotion={settings.reducedMotion}
        onToggleReducedMotion={() => {
          updateSettings({ reducedMotion: !settings.reducedMotion })
        }}
      />
      {/* Chapter 11 Persistent Status Banner */}
      {(() => {
        const myPlayer = myPlayerIndex !== undefined && myPlayerIndex >= 0 ? players[myPlayerIndex] : null
        if (!myPlayer?.inChapter11) return null
        const progress = myPlayer.cash >= myPlayer.chapter11DebtTarget ? 100
          : Math.round((myPlayer.cash / Math.max(1, myPlayer.chapter11DebtTarget)) * 100)
        return (
          <div
            role="alert"
            aria-live="polite"
            style={{
              position: 'fixed',
              top: isMobile ? '52px' : '42px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(59, 130, 246, 0.95)',
              color: '#fff',
              padding: '6px 20px',
              borderRadius: '0 0 10px 10px',
              fontSize: '12px',
              fontWeight: 700,
              zIndex: 10001,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 2px 10px rgba(59, 130, 246, 0.4)',
              whiteSpace: 'nowrap',
            }}
          >
            <span>CHAPTER 11</span>
            <span style={{ opacity: 0.8 }}>|</span>
            <span>Debt: £{myPlayer.chapter11DebtTarget}</span>
            <span style={{ opacity: 0.8 }}>|</span>
            <span>Cash: £{myPlayer.cash}</span>
            <span style={{ opacity: 0.8 }}>|</span>
            <span>{myPlayer.chapter11TurnsRemaining} turns left</span>
            <span style={{ opacity: 0.8 }}>|</span>
            <div style={{ width: '60px', height: '6px', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                width: `${Math.min(100, progress)}%`,
                height: '100%',
                backgroundColor: progress >= 100 ? '#22c55e' : '#fbbf24',
                borderRadius: '3px',
                transition: 'width 0.3s',
              }} />
            </div>
            <span style={{ fontSize: '11px' }}>{progress}%</span>
          </div>
        )
      })()}

      {/* Left Side - Game Log (Fixed) - Expanded to fill screen */}
      {(!isMobile || showMobileLog) && (
        <div
          style={{
            position: 'fixed',
            top: isMobile ? '60px' : '48px', // Start below burger menu
            left: isMobile ? '10px' : '8px',
            right: isMobile ? '10px' : 'unset',
            width: isMobile ? 'unset' : '200px',
            height: isMobile ? 'calc(100vh - 150px)' : 'calc(100vh - 100px)', // Fill most of the screen height
            maxHeight: isMobile ? 'calc(100vh - 150px)' : 'calc(100vh - 100px)',
            zIndex: 1000, // Higher than board but lower than menu
          }}
        >
          <GameLog />
        </div>
      )}
      {/* Center - Board and Game Controls - MAXIMIZED - perfectly centered and expanded */}
      <div
        id="board-container-parent"
        style={{
          position: 'fixed',
          top: isMobile ? '60px' : '48px', // Start below burger menu
          left: isMobile ? '10px' : '220px', // Centered or right of GameLog
          right: isMobile ? '10px' : '320px', // Centered or left of right panel
          bottom: isMobile ? '80px' : '60px', // Above UserPanel - give more space
          overflow: 'visible', // Allow board and tokens to be visible
          zIndex: 1, // Low z-index so it's behind modals and UserPanel
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Game Board Container - responsive, perfectly centered and maximized */}
        <div
          id="board-container"
          style={{
            position: 'relative',
            // Fill parent container completely but maintain aspect ratio
            width: '100%',
            height: '100%',
            maxWidth: isMobile ? '100vw' : '800px', // Limit maximum width for better proportions
            maxHeight: isMobile ? '100vw' : '800px', // Maintain square aspect ratio
            minWidth: isMobile ? '300px' : '400px',
            minHeight: isMobile ? '300px' : '400px',
            overflow: 'visible', // Allow tokens to be visible
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Board
            onPropertyClick={property => {
              setSelectedProperty(property)
            }}
          />
          <PlayerTokens />

          {/* Card Display in Center of Screen */}
          {lastCardDrawn && showCard && (
            <div
              id="screen-center-card-container"
              style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '100vw',
                height: '100vh',
                pointerEvents: 'none',
                zIndex: 10000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CardDisplay
                card={lastCardDrawn}
                onClose={() => {
                  setShowCard(false)
                  // Mark this card as shown so it doesn't reappear
                  setLastShownCardId(lastCardDrawn.id)
                }}
              />
            </div>
          )}
          {/* Property Details Modal in Center of Screen */}
          {selectedProperty && (
            <div
              id="screen-center-property-container"
              style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '100vw',
                height: '100vh',
                pointerEvents: 'none',
                zIndex: 10000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PropertyDetailsModal
                property={selectedProperty}
                ownerName={
                  selectedProperty.owner !== undefined
                    ? players[selectedProperty.owner]?.name
                    : undefined
                }
                onClose={() => setSelectedProperty(null)}
              />
            </div>
          )}
          {/* Passed GO notification */}
          <AnimatePresence>
            {passedGo && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5, y: 50, x: '-50%' }}
                animate={{ opacity: 1, scale: 1, y: 0, x: '-50%' }}
                exit={{ opacity: 0, scale: 0.5, y: -50, x: '-50%' }}
                style={{
                  position: 'absolute',
                  bottom: '20px',
                  left: '50%',
                  backgroundColor: '#4CAF50',
                  padding: '16px 32px',
                  borderRadius: '8px',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
                  zIndex: 150,
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '24px',
                }}
              >
                Passed GO! +£{currentGoSalary}
                {currentGoSalary > 200 && (
                  <span
                    style={{
                      fontSize: '14px',
                      marginLeft: '8px',
                      color: '#FFD700',
                    }}
                  >
                    (Inflation!)
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      {/* Connection Status Indicator */}
      {!connected && inRoom && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          style={{
            position: 'fixed',
            top: '60px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(239, 68, 68, 0.95)',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        >
          <span>⚠️</span>
          <span>Disconnected. Reconnecting...</span>
        </motion.div>
      )}
      {/* All Modals - Rendered outside board container for proper fixed positioning */}
      {/* Auction Modal */}
      <AnimatePresence>
        {phase === 'auction' && <AuctionModal />}
      </AnimatePresence>
      {/* Trade Modal - Only visible to players involved in the trade */}
      <AnimatePresence>{phase === 'trading' && <TradeModal />}</AnimatePresence>
      {/* Rent Negotiation Modal */}
      <AnimatePresence>
        {phase === 'awaiting_rent_negotiation' && <RentNegotiationModal />}
      </AnimatePresence>

      {/* Bankruptcy Decision Modal */}
      <AnimatePresence>
        {phase === 'awaiting_bankruptcy_decision' && <BankruptcyModal />}
      </AnimatePresence>
      <GamePanel
        isRolling={isRolling}
        isNewTurn={isNewTurn}
        handleRollDice={handleRollDice}
        handleRollComplete={handleRollComplete}
        handleEndTurn={handleEndTurn}
        handleBuyProperty={handleBuyProperty}
        handleDeclineProperty={handleDeclineProperty}
        handleJailAction={handleJailAction}
        handleDrawCard={handleDrawCard}
        myPlayerIndex={myPlayerIndex}
      />

      <PlayerSelectionModal
        onPlayerSelected={index => {
          useGameStore.getState().assignPlayer(index, clientId)
        }}
      />

      {/* Bottom - User Panel (All Players) - Rendered LAST to ensure it's on top */}
      <UserPanel myPlayerIndex={myPlayerIndex ?? -1} />
    </div>
  )
}
