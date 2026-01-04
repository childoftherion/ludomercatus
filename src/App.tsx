import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { audioManager } from "./utils/audio";
import { useGameStore } from "./store/gameStore";
import { Board } from "./components/Board";
import { MultiplayerLobby } from "./components/MultiplayerLobby";
import { ServerBrowser } from "./components/ServerBrowser";
import { PlayerTokens } from "./components/PlayerToken";
import PlayerSetup from "./components/PlayerSetup";
import { AuctionModal } from "./components/AuctionModal";
import { TradeModal } from "./components/TradeModal";
import { RentNegotiationModal } from "./components/RentNegotiationModal";
import { BankruptcyModal } from "./components/BankruptcyModal";
import { Dice, DiceDisplay } from "./components/Dice";
import { GameLog } from "./components/GameLog";
import { PlayerPropertiesPanel } from "./components/PlayerProperties";
import { PlayerSelectionModal } from "./components/PlayerSelectionModal";
import { CardDisplay } from "./components/CardDisplay";
import { PropertyDetailsModal } from "./components/PropertyDetailsModal";
import { DraggableModal } from "./components/DraggableModal";
import { UserPanel } from "./components/UserPanel";
import { useLocalStore } from "./store/localStore";
import type { Property } from "./types/game";

// Burger Menu Component - Consolidated menu for game controls
const BurgerMenu = ({ isMuted, onToggleMute, onExit }: { isMuted: boolean; onToggleMute: () => void; onExit: () => void }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div style={{ position: "fixed", top: "8px", right: "8px", zIndex: 10000 }}>
      {/* Burger Menu Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: "rgba(30, 30, 30, 0.95)",
          color: "white",
          border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: "6px",
          width: "32px",
          height: "32px",
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "4px",
          padding: "6px",
          transition: "all 0.2s ease",
        }}
        title="Menu"
      >
        <motion.span
          style={{
            width: "18px",
            height: "2px",
            background: "white",
            borderRadius: "1px",
            display: "block",
          }}
          animate={{
            rotate: isOpen ? 45 : 0,
            y: isOpen ? 6 : 0,
          }}
          transition={{ duration: 0.2 }}
        />
        <motion.span
          style={{
            width: "18px",
            height: "2px",
            background: "white",
            borderRadius: "1px",
            display: "block",
          }}
          animate={{
            opacity: isOpen ? 0 : 1,
          }}
          transition={{ duration: 0.2 }}
        />
        <motion.span
          style={{
            width: "18px",
            height: "2px",
            background: "white",
            borderRadius: "1px",
            display: "block",
          }}
          animate={{
            rotate: isOpen ? -45 : 0,
            y: isOpen ? -6 : 0,
          }}
          transition={{ duration: 0.2 }}
        />
      </motion.button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "absolute",
              top: "40px",
              right: 0,
              background: "rgba(30, 30, 30, 0.98)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "8px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
              minWidth: "160px",
              overflow: "hidden",
              zIndex: 10001,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mute/Unmute Option */}
            <motion.button
              whileHover={{ background: "rgba(255,255,255,0.1)" }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                onToggleMute();
              }}
              style={{
                width: "100%",
                padding: "12px 16px",
                background: "transparent",
                border: "none",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "14px",
                textAlign: "left",
                borderBottom: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <span style={{ fontSize: "18px" }}>{isMuted ? "🔇" : "🔊"}</span>
              <span>{isMuted ? "Unmute Sound" : "Mute Sound"}</span>
            </motion.button>

            {/* Exit Game Option */}
            <motion.button
              whileHover={{ background: "rgba(255, 71, 87, 0.2)" }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                onExit();
                setIsOpen(false);
              }}
              style={{
                width: "100%",
                padding: "12px 16px",
                background: "transparent",
                border: "none",
                color: "#FF4757",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "14px",
                textAlign: "left",
                fontWeight: "500",
              }}
            >
              <span style={{ fontSize: "18px" }}>✕</span>
              <span>Exit Game</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop to close menu when clicking outside */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            background: "transparent",
          }}
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

const isProperty = (space: { type: string }): space is Property => {
  return space.type === "property" || space.type === "railroad" || space.type === "utility";
};

export default function App() {
  const { 
    phase, 
    diceRoll, 
    currentPlayerIndex, 
    players, 
    passedGo: storePassedGo, 
    winner,
    spaces,
    auction,
    trade,
    lastCardDrawn,
    connect,
    connected,
    inRoom,
    leaveRoom,
    currentGoSalary,
    awaitingTaxDecision,
    chooseTaxOption,
    pendingRentNegotiation,
    settings,
  } = useGameStore();
  const { myPlayerIndex, setMyPlayerIndex } = useLocalStore();
  
  React.useEffect(() => {
    connect();
  }, []);

  // Enable body scrolling for setup screen
  React.useEffect(() => {
    if (phase === "setup") {
      document.body.style.overflow = "auto";
    } else {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "hidden";
    };
  }, [phase]);

  // Auto-detect human player if myPlayerIndex is not set (fallback for games started before fix)
  React.useEffect(() => {
    if (players.length > 0 && phase !== "setup" && phase !== "lobby") {
      // If myPlayerIndex is null, find the first human player
      if (myPlayerIndex === null) {
        const humanPlayer = players.findIndex(p => !p.isAI && !p.bankrupt);
        if (humanPlayer !== -1) {
          console.log("[App] Auto-detecting human player:", humanPlayer, players[humanPlayer]?.name);
          setMyPlayerIndex(humanPlayer);
        }
      }
      // If myPlayerIndex is set but points to an AI or bankrupt player, fix it
      else if (myPlayerIndex !== null) {
        const myPlayer = players[myPlayerIndex];
        if (!myPlayer || myPlayer.isAI || myPlayer.bankrupt) {
          console.warn("[App] myPlayerIndex points to invalid player, re-detecting...", {
            myPlayerIndex,
            player: myPlayer,
          });
          const humanPlayer = players.findIndex(p => !p.isAI && !p.bankrupt);
          if (humanPlayer !== -1) {
            console.log("[App] Re-setting myPlayerIndex to:", humanPlayer, players[humanPlayer]?.name);
            setMyPlayerIndex(humanPlayer);
          }
        }
      }
    }
  }, [players, phase, myPlayerIndex, setMyPlayerIndex]);

  const currentPlayer = currentPlayerIndex !== undefined && currentPlayerIndex < players.length 
    ? players[currentPlayerIndex] 
    : null;
  
  const isMyTurn = currentPlayerIndex === myPlayerIndex;
  
  const currentSpace = currentPlayer ? spaces[currentPlayer.position] : null;

  const [passedGo, setPassedGo] = React.useState(false);
  const [isRolling, setIsRolling] = React.useState(false);
  const [showCard, setShowCard] = React.useState(false);
  const [lastShownCardId, setLastShownCardId] = React.useState<number | null>(null);
  const lastPlayerIndexRef = React.useRef<number | undefined>(undefined);
  const [isNewTurn, setIsNewTurn] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(false);
  const [selectedProperty, setSelectedProperty] = React.useState<Property | null>(null);

  // Auto-hide card after 8 seconds
  React.useEffect(() => {
    if (lastCardDrawn) {
      // Only show if this is a new card (different from last shown)
      if (lastCardDrawn.id !== lastShownCardId) {
        setShowCard(true);
        setLastShownCardId(lastCardDrawn.id);
        audioManager.playCardDraw();
        const timer = setTimeout(() => {
          setShowCard(false);
          // Mark as shown so it doesn't reappear
          setLastShownCardId(lastCardDrawn.id);
        }, 8000); // Show for 8 seconds (increased from 5 for better visibility)
        return () => clearTimeout(timer);
      }
    } else {
      setShowCard(false);
      setLastShownCardId(null);
    }
  }, [lastCardDrawn, lastShownCardId]);

  // Track previous player index to detect player changes
  const prevPlayerIndexRef = React.useRef(currentPlayerIndex);
  
  // Clear card display when player changes (but NOT when phase changes during card display)
  React.useEffect(() => {
    // Only clear card display when player changes, not when phase changes
    // Phase changes can happen due to card effects (e.g., moving to property triggers awaiting_buy_decision)
    // We want to keep the card visible even if phase changes due to the card's effect
    if (prevPlayerIndexRef.current !== currentPlayerIndex) {
      setShowCard(false);
      prevPlayerIndexRef.current = currentPlayerIndex;
    }
  }, [currentPlayerIndex, phase]);

  // Detect new turns and handle stale diceRoll
  React.useEffect(() => {
    const detectedNewTurn = lastPlayerIndexRef.current !== undefined && 
                             lastPlayerIndexRef.current !== currentPlayerIndex &&
                             phase === "rolling";
    
    // Detect "roll again after doubles" - same player, phase is rolling, but diceRoll might still exist
    const isRollAgainAfterDoubles = lastPlayerIndexRef.current === currentPlayerIndex &&
                                     phase === "rolling" &&
                                     diceRoll?.isDoubles;
    
    if (detectedNewTurn) {
      console.log("[App] New turn detected:", {
        previousPlayer: lastPlayerIndexRef.current,
        currentPlayer: currentPlayerIndex,
        diceRoll: diceRoll,
        phase: phase,
      });
      
      // Play turn start sound if it's the human player's turn
      if (currentPlayerIndex === myPlayerIndex) {
        audioManager.playTurnStart();
      }
      
      // If diceRoll exists on a new turn, it's stale (should have been cleared by server)
      if (diceRoll) {
        console.warn("[App] Stale diceRoll detected on new turn! Server should have cleared it.", diceRoll);
        setIsNewTurn(true); // Mark as new turn so we ignore stale diceRoll
      } else {
        setIsNewTurn(true); // Still a new turn, even if diceRoll is cleared
      }
      
      // Reset local rolling state
      setIsRolling(false);
    } else if (isRollAgainAfterDoubles) {
      // This is a roll-again situation after doubles
      console.log("[App] Roll again after doubles detected");
      setIsNewTurn(true); // Allow rolling again
      setIsRolling(false); // Make sure rolling state is cleared
    }
    
    lastPlayerIndexRef.current = currentPlayerIndex;
  }, [phase, currentPlayerIndex, diceRoll, myPlayerIndex]);

  // Clear isNewTurn flag when dice are actually rolled
  React.useEffect(() => {
    if (isRolling) {
      // When rolling starts, clear the new turn flag
      setIsNewTurn(false);
    }
  }, [isRolling]);
  
  // Handle roll-again after doubles: detect when we should be able to roll again
  React.useEffect(() => {
    // After clicking "Roll Again" for doubles, server sets phase to "rolling" and clears diceRoll
    // But client might still have the old diceRoll. If phase is "rolling" and we have a diceRoll
    // but we're not rolling, this is likely a roll-again situation
    if (phase === "rolling" && diceRoll && !isRolling && isMyTurn && currentPlayer && !currentPlayer.inJail) {
      // Wait a moment for state to sync from server
      const timer = setTimeout(() => {
        const currentState = useGameStore.getState();
        // If server cleared diceRoll, it should be undefined now
        // If it's still there, it might be stale - allow rolling anyway
        if (currentState.phase === "rolling" && 
            currentState.currentPlayerIndex === currentPlayerIndex) {
          console.log("[App] Roll-again after doubles: allowing roll");
          setIsNewTurn(true); // This will make the button show
        }
      }, 200); // Give server time to update state
      return () => clearTimeout(timer);
    }
  }, [phase, diceRoll, isRolling, isMyTurn, currentPlayer, currentPlayerIndex]);

  // Debug logging for Roll Dice button visibility
  React.useEffect(() => {
    if (phase === "rolling" && currentPlayer) {
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
        shouldShowButton: phase === "rolling" && !currentPlayer.inJail && !currentPlayer.isAI && isMyTurn && !diceRoll && !isRolling,
        conditionBreakdown: {
          phaseIsRolling: phase === "rolling",
          notInJail: !currentPlayer.inJail,
          notAI: !currentPlayer.isAI,
          isMyTurn: isMyTurn,
          noDiceRoll: !diceRoll,
          notRolling: !isRolling,
        },
      };
      console.log("[Roll Dice Debug]", rollDiceConditions);
      
      // If all conditions should be met but button isn't showing, log warning
      if (rollDiceConditions.shouldShowButton && !isMyTurn) {
        console.warn("[Roll Dice Debug] Button should show but isMyTurn is false!", {
          currentPlayerIndex,
          myPlayerIndex,
          players: players.map((p, i) => ({ index: i, name: p.name, isAI: p.isAI })),
        });
      }
    }
  }, [phase, currentPlayerIndex, myPlayerIndex, isMyTurn, currentPlayer, diceRoll, isRolling, players]);

  React.useEffect(() => {
    if (storePassedGo) {
      setPassedGo(true);
      setTimeout(() => {
        setPassedGo(false);
      }, 2000);
    }
  }, [storePassedGo]);

  // AI turn execution
  React.useEffect(() => {
    if (!connected) return; // Wait for connection
    if (!currentPlayer || !currentPlayer.isAI || currentPlayer.bankrupt) return;
    if (phase === "setup" || phase === "game_over") return;

    // Add delay for AI actions to be visible
    const aiDelay = setTimeout(() => {
      useGameStore.getState().executeAITurn();
    }, 1200);

    return () => clearTimeout(aiDelay);
  }, [currentPlayer, phase, auction?.activePlayerIndex, connected]);

  // AI auction bid execution - separate handler for auction phase
  React.useEffect(() => {
    if (!connected) return;
    if (phase !== "auction" || !auction) return;
    
    const activeBidder = players[auction.activePlayerIndex];
    if (!activeBidder || !activeBidder.isAI || activeBidder.bankrupt) return;
    
    // Add delay for AI actions to be visible
    const aiDelay = setTimeout(() => {
      console.log(`[App] Triggering AI auction bid for ${activeBidder.name} (player ${auction.activePlayerIndex})`);
      useGameStore.getState().executeAITurn();
    }, 1200);

    return () => clearTimeout(aiDelay);
  }, [phase, auction?.activePlayerIndex, players, connected]);

  // AI trade response
  React.useEffect(() => {
    if (!connected) return;
    if (phase === "trading") {
      // Handle initial trade proposals (AI is receiver)
      if (trade?.status === "pending") {
        const receiver = players[trade.offer.toPlayer];
        if (receiver?.isAI) {
          const aiDelay = setTimeout(() => {
            useGameStore.getState().executeAITradeResponse();
          }, 2000);
          return () => clearTimeout(aiDelay);
        }
      }
      // Handle counter-offers (AI is original initiator)
      if (trade?.status === "counter_pending") {
        const originalInitiator = players[trade.offer.fromPlayer];
        if (originalInitiator?.isAI) {
          const aiDelay = setTimeout(() => {
            useGameStore.getState().executeAITradeResponse();
          }, 2000);
          return () => clearTimeout(aiDelay);
        }
      }
    }
  }, [phase, trade?.status, connected, players]);

  // AI rent negotiation response
  React.useEffect(() => {
    if (!connected) return;
    if (phase === "awaiting_rent_negotiation" && pendingRentNegotiation) {
      const creditor = players[pendingRentNegotiation.creditorIndex];
      if (creditor?.isAI && !creditor.bankrupt) {
        const aiDelay = setTimeout(() => {
          useGameStore.getState().executeAITurn();
        }, 2000);
        return () => clearTimeout(aiDelay);
      }
    }
  }, [phase, pendingRentNegotiation, connected, players]);

  // AI bankruptcy decision
  React.useEffect(() => {
    if (!connected) return;
    if (phase === "awaiting_bankruptcy_decision") {
      const pending = (useGameStore.getState() as any).pendingBankruptcy;
      if (pending) {
        const bankruptPlayer = players[pending.playerIndex];
        if (bankruptPlayer?.isAI && !bankruptPlayer.bankrupt) {
          const aiDelay = setTimeout(() => {
            useGameStore.getState().executeAITurn();
          }, 2000);
          return () => clearTimeout(aiDelay);
        }
      }
    }
  }, [phase, connected, players]);

  const handleRollDice = () => {
    if (isRolling) return;
    setIsRolling(true);
    audioManager.playDiceRoll();
  };

  const handleRollComplete = () => {
    const roll = useGameStore.getState().diceRoll;
    
    // Keep showing dice for a moment after roll completes
    setTimeout(() => {
      setIsRolling(false);
      
      if (roll && currentPlayer && !currentPlayer.inJail) {
        // Move the player after a short delay
        setTimeout(() => {
          useGameStore.getState().movePlayer(currentPlayerIndex, roll.total);
          audioManager.playMove();
        }, 200);
      }
    }, 800);
  };

  const handleEndTurn = () => {
    const currentRoll = useGameStore.getState().diceRoll;
    const isDoubles = currentRoll?.isDoubles;
    
    useGameStore.getState().endTurn();
    
    // If it's doubles, endTurn will set phase back to "rolling" and clear diceRoll on server
    // Clear local state immediately to allow another roll
    if (isDoubles) {
      setIsRolling(false);
      // Set isNewTurn to allow rolling again (server will clear diceRoll, but client might not update immediately)
      setTimeout(() => {
        setIsNewTurn(true);
      }, 100);
    }
  };

  const handleBuyProperty = () => {
    if (!currentSpace || !isProperty(currentSpace)) return;
    useGameStore.getState().buyProperty(currentSpace.id);
    audioManager.playPurchase();
  };

  const handleDeclineProperty = () => {
    if (!currentSpace) return;
    useGameStore.getState().declineProperty(currentSpace.id);
  };

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't handle shortcuts if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Only handle shortcuts when it's the player's turn (unless it's a global shortcut)
      const playerCanAct = isMyTurn && phase !== "setup" && phase !== "game_over";

      switch (e.key) {
        case " ": // Spacebar - Roll dice
          if (playerCanAct && phase === "rolling" && !diceRoll && !isRolling) {
            e.preventDefault();
            handleRollDice();
          }
          break;
        case "Enter": // Enter - Confirm action (buy property, end turn, etc.)
          if (playerCanAct) {
            e.preventDefault();
            if (phase === "awaiting_buy_decision" && currentSpace && isProperty(currentSpace)) {
              handleBuyProperty();
            } else if (phase === "resolving_space" || phase === "rolling") {
              handleEndTurn();
            }
          }
          break;
        case "Escape": // Escape - Cancel/decline or close modals
          e.preventDefault();
          // Close property details modal if open
          if (selectedProperty) {
            setSelectedProperty(null);
            return;
          }
          // Handle game actions
          if (playerCanAct) {
            if (phase === "awaiting_buy_decision" && currentSpace) {
              handleDeclineProperty();
            }
          }
          break;
        case "b": // B - Buy property
        case "B":
          if (playerCanAct && phase === "awaiting_buy_decision" && currentSpace && isProperty(currentSpace)) {
            e.preventDefault();
            handleBuyProperty();
          }
          break;
        case "d": // D - Decline property
        case "D":
          if (playerCanAct && phase === "awaiting_buy_decision" && currentSpace) {
            e.preventDefault();
            handleDeclineProperty();
          }
          break;
        case "e": // E - End turn
        case "E":
          if (playerCanAct && (phase === "resolving_space" || phase === "rolling")) {
            e.preventDefault();
            handleEndTurn();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [phase, diceRoll, isRolling, currentSpace, isMyTurn, currentPlayerIndex, myPlayerIndex, selectedProperty]);

  const handlePayTax = () => {
    if (!currentSpace || currentSpace.type !== "tax" || !currentPlayer) return;
    const amount = currentSpace.name.includes("Income") ? 200 : 100;
    useGameStore.getState().payTax(currentPlayerIndex, amount);
    audioManager.playMoney();
  };

  const handleDrawCard = (cardType: "chance" | "community_chest") => {
    useGameStore.getState().drawCard(currentPlayerIndex, cardType);
    audioManager.playCardDraw();
  };

  const handleJailAction = (action: "card" | "pay" | "roll") => {
    if (currentPlayer) {
      useGameStore.getState().getOutOfJail(currentPlayerIndex, action);
    }
  };

  if (!connected) {
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        height: "100vh", 
        background: "#1a1a2a", 
        color: "#fff",
        fontSize: "24px"
      }}>
        Connecting to server...
      </div>
    );
  }

  if (!inRoom) {
    return <ServerBrowser />;
  }

  // Winner screen
  if (winner !== undefined) {
    const winnerPlayer = players.find(p => p.id === winner);
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          backgroundColor: "#2E8B57",
          fontSize: "32px",
          color: "#fff",
        }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
        >
          <h1>Game Over!</h1>
          <p>Player {winnerPlayer?.name ?? winner} Wins!</p>
          <button
            onClick={() => location.reload()}
            style={{
              padding: "16px 32px",
              fontSize: "18px",
              backgroundColor: "#4CAF50",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              marginTop: "24px",
            }}
          >
            Play Again
          </button>
        </motion.div>
      </div>
    );
  }

  // Setup screen
  if (phase === "setup") {
    return <PlayerSetup />;
  }

  // Lobby screen
  if (phase === "lobby") {
    return <MultiplayerLobby />;
  }

  // Get other players (for compact display)
  const otherPlayers = players.filter((_, i) => i !== currentPlayerIndex);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: "#1a1a2a",
        position: "relative",
        overflow: "visible", // Changed to visible so UserPanel expanded content isn't clipped
      }}
    >
      {/* Burger Menu - Consolidated menu for game controls */}
      <BurgerMenu 
        isMuted={isMuted}
        onToggleMute={() => {
          const newMuted = !isMuted;
          setIsMuted(newMuted);
          audioManager.setMuted(newMuted);
          if (!newMuted) {
            audioManager.playSuccess();
          }
        }}
        onExit={leaveRoom}
      />

      {/* Left Side - Game Log (Fixed) - Expanded to fill screen */}
      <div
        style={{
          position: "fixed",
          top: "48px", // Start below burger menu
          left: "8px",
          width: "200px",
          height: "calc(100vh - 100px)", // Fill most of the screen height
          maxHeight: "calc(100vh - 100px)",
          zIndex: 100,
        }}
      >
        <GameLog />
      </div>

      {/* Center - Board and Game Controls - MAXIMIZED - perfectly centered and expanded */}
      <div
        id="board-container-parent"
        style={{
          position: "fixed",
          top: "48px", // Start below burger menu
          left: "220px", // Right of GameLog (200px + 8px margin + 12px spacing) - better centering
          right: "320px", // Left of right panel (300px + 8px margin + 12px spacing) - better centering
          bottom: "60px", // Above UserPanel - give more space
          overflow: "visible", // Allow board and tokens to be visible
          zIndex: 1, // Low z-index so it's behind modals and UserPanel
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Game Board Container - responsive, perfectly centered and maximized */}
        <div 
          id="board-container"
          style={{ 
            position: "relative", 
            // Fill parent container completely but maintain aspect ratio
            width: "100%",
            height: "100%",
            maxWidth: "800px", // Limit maximum width for better proportions
            maxHeight: "800px", // Limit maximum height for better proportions
            minWidth: "400px",
            minHeight: "400px",
            overflow: "visible", // Allow tokens to be visible
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Board onPropertyClick={(property) => {
            setSelectedProperty(property);
          }} />
          <PlayerTokens />
          
          {/* Card Display in Center of Screen */}
          {lastCardDrawn && showCard && (
            <div
              id="screen-center-card-container"
              style={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "100vw",
                height: "100vh",
                pointerEvents: "none",
                zIndex: 10000,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CardDisplay 
                card={lastCardDrawn} 
                onClose={() => {
                  setShowCard(false);
                  // Mark this card as shown so it doesn't reappear
                  setLastShownCardId(lastCardDrawn.id);
                }}
              />
            </div>
          )}

          {/* Property Details Modal in Center of Screen */}
          {selectedProperty && (
            <div
              id="screen-center-property-container"
              style={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "100vw",
                height: "100vh",
                pointerEvents: "none",
                zIndex: 10000,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <PropertyDetailsModal
                property={selectedProperty}
                ownerName={selectedProperty.owner !== undefined ? players[selectedProperty.owner]?.name : undefined}
                onClose={() => setSelectedProperty(null)}
              />
            </div>
          )}

          {/* Passed GO notification */}
          <AnimatePresence>
            {passedGo && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5, y: 50, x: "-50%" }}
                animate={{ opacity: 1, scale: 1, y: 0, x: "-50%" }}
                exit={{ opacity: 0, scale: 0.5, y: -50, x: "-50%" }}
                style={{
                  position: "absolute",
                  bottom: "20px",
                  left: "50%",
                  backgroundColor: "#4CAF50",
                  padding: "16px 32px",
                  borderRadius: "8px",
                  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
                  zIndex: 150,
                  color: "#fff",
                  fontWeight: "bold",
                  fontSize: "24px",
                }}
              >
                Passed GO! +£{currentGoSalary}
                {currentGoSalary > 200 && (
                  <span style={{ fontSize: "14px", marginLeft: "8px", color: "#FFD700" }}>
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
            position: "fixed",
            top: "60px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "rgba(239, 68, 68, 0.95)",
            color: "#fff",
            padding: "12px 24px",
            borderRadius: "8px",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "14px",
            fontWeight: "bold",
          }}
        >
          <span>⚠️</span>
          <span>Disconnected. Reconnecting...</span>
        </motion.div>
      )}

      {/* All Modals - Rendered outside board container for proper fixed positioning */}
      {/* Auction Modal */}
      <AnimatePresence>
        {phase === "auction" && auction && (
          <AuctionModal 
            auction={auction}
            property={spaces.find(s => s.id === auction.propertyId) as Property}
            players={players}
          />
        )}
      </AnimatePresence>

      {/* Trade Modal */}
      <AnimatePresence>
        {phase === "trading" && trade && (
          <TradeModal
            trade={trade}
            players={players}
            spaces={spaces}
          />
        )}
      </AnimatePresence>

      {/* Rent Negotiation Modal - Phase 3 - Centered like Chance Cards */}
      {phase === "awaiting_rent_negotiation" && pendingRentNegotiation && (() => {
        const debtor = players[pendingRentNegotiation.debtorIndex];
        const creditor = players[pendingRentNegotiation.creditorIndex];
        if (!debtor || !creditor) return null;
        return (
          <div
            id="screen-center-rent-negotiation-container"
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "100vw",
              height: "100vh",
              pointerEvents: "none",
              zIndex: 10000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <RentNegotiationModal
              debtor={debtor}
              creditor={creditor}
              property={spaces.find(s => s.id === pendingRentNegotiation.propertyId) as Property}
              rentAmount={pendingRentNegotiation.rentAmount}
              debtorCanAfford={pendingRentNegotiation.debtorCanAfford}
            />
          </div>
        );
      })()}

      {/* Bankruptcy Modal - Phase 3 */}
      <AnimatePresence>
        {phase === "awaiting_bankruptcy_decision" && (useGameStore.getState() as any).pendingBankruptcy && (() => {
          const pending = (useGameStore.getState() as any).pendingBankruptcy;
          const bankruptPlayer = players[pending.playerIndex];
          const creditorPlayer = pending.creditorIndex !== undefined ? players[pending.creditorIndex] : undefined;
          return bankruptPlayer ? (
            <BankruptcyModal
              player={bankruptPlayer}
              debtAmount={pending.debtAmount}
              creditor={creditorPlayer}
              chapter11Turns={settings?.chapter11Turns ?? 5}
            />
          ) : null;
        })()}
      </AnimatePresence>

      {/* Main game panel - Compact, positioned at top right */}
      {currentPlayer && phase !== "auction" && phase !== "trading" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              style={{
                position: "fixed",
                top: "48px", // Start below burger menu
                right: "8px",
                width: "300px",
                maxWidth: "300px",
                height: "calc(100vh - 100px)", // Fill most of the screen height
                maxHeight: "calc(100vh - 100px)",
                textAlign: "center",
                color: "#fff",
                zIndex: 300,
                backgroundColor: "rgba(0, 0, 0, 0.95)",
                borderRadius: "12px",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.5)",
                border: "1px solid rgba(255,255,255,0.1)",
                overflowY: "auto",
                overflowX: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ padding: "12px", display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden", gap: "8px" }}> {/* Reduced padding, use flex for better fit */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "8px", flexShrink: 0 }}> {/* Reduced gap and margin */}
                <div
                  style={{
                    width: "24px", // Reduced size
                    height: "24px",
                    borderRadius: "50%",
                    backgroundColor: currentPlayer.color,
                    border: "2px solid #fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px", // Reduced font size
                  }}
                >
                  {currentPlayer.token}
                </div>
                <h2 style={{ margin: 0, fontSize: "16px" }}> {/* Reduced font size for better fit */}
                  {currentPlayer.name}'s Turn
                  {currentPlayer.isAI && <span style={{ fontSize: "11px", color: "#FF9800", marginLeft: "6px" }}>(AI)</span>}
                </h2>
              </div>
              
              <p style={{ fontSize: "12px", marginBottom: "6px", color: "#ccc", flexShrink: 0 }}> {/* Reduced font size and margin */}
                Cash: £{currentPlayer.cash}
              </p>
              
              {/* AI Thinking Indicator */}
              {currentPlayer.isAI && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    padding: "8px", // Reduced padding
                    fontSize: "12px", // Reduced font size
                    color: "#FF9800",
                    fontWeight: "bold",
                    flexShrink: 0,
                  }}
                >
                  <motion.span
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    AI is thinking...
                  </motion.span>
                </motion.div>
              )}

              {/* Rolling phase - not in jail */}
              {phase === "rolling" && !currentPlayer.inJail && !currentPlayer.isAI && (
                <div style={{ flexShrink: 0 }}>
                  {isMyTurn ? (
                    <>
                      {/* Show Roll Dice button if:
                          - No diceRoll exists, OR
                          - It's a new turn (stale diceRoll), OR  
                          - Phase is rolling and we're ready to roll (not currently rolling)
                          Note: After doubles, server clears diceRoll, but client might still have it briefly */}
                      {(!diceRoll || isNewTurn) && !isRolling ? (
                        <motion.button
                          onClick={handleRollDice}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          style={{
                            padding: "10px 24px", // Further reduced padding
                            fontSize: "14px", // Reduced font size
                            backgroundColor: "#4CAF50",
                            color: "#fff",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontWeight: "bold",
                            width: "100%", // Full width for better appearance
                          }}
                        >
                          Roll Dice
                        </motion.button>
                      ) : isRolling ? (
                        <Dice onRollComplete={handleRollComplete} />
                      ) : (
                        <div style={{ padding: "16px", color: "#ff9800", fontSize: "14px", textAlign: "center" }}>
                          <p>Dice already rolled. Check console for details.</p>
                          <p style={{ fontSize: "12px", marginTop: "8px", color: "#888" }}>
                            diceRoll: {diceRoll ? JSON.stringify(diceRoll) : "undefined"}
                          </p>
                          {isNewTurn && (
                            <p style={{ fontSize: "12px", marginTop: "8px", color: "#4CAF50" }}>
                              (New turn detected - button should appear above)
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ padding: "16px", color: "#888", fontSize: "14px", textAlign: "center" }}>
                      {myPlayerIndex === null ? (
                        <>
                          <p style={{ color: "#ff9800", fontWeight: "bold" }}>⚠️ Player not selected</p>
                          <p style={{ fontSize: "12px", marginTop: "4px" }}>Auto-detecting player...</p>
                        </>
                      ) : (
                        <>
                          <p>Waiting for {currentPlayer.name} to roll...</p>
                          <p style={{ fontSize: "12px", marginTop: "4px", color: "#666" }}>
                            Debug: currentPlayerIndex={currentPlayerIndex}, myPlayerIndex={myPlayerIndex}
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Jail decision phase */}
              {(phase === "jail_decision" || (phase === "rolling" && currentPlayer.inJail)) && currentPlayer.inJail && (
                <div style={{ backgroundColor: "#333", padding: "10px", borderRadius: "8px", flexShrink: 0 }}> {/* Reduced padding */}
                  <h3 style={{ marginBottom: "4px", fontSize: "12px", color: "#ff6b6b" }}>In Jail</h3> {/* Reduced margin and font size */}
                  <p style={{ fontSize: "11px", marginBottom: "8px", color: "#ccc" }}> {/* Reduced font size and margin */}
                    Turn {currentPlayer.jailTurns + 1} of 3
                  </p>
                  
                  {/* Hide interactive buttons for AI */}
                  {!currentPlayer.isAI && isMyTurn && (
                    <div style={{ display: "flex", gap: "6px", justifyContent: "center", flexWrap: "wrap" }}>
                      {currentPlayer.jailFreeCards > 0 && (
                        <motion.button
                          onClick={() => handleJailAction("card")}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          style={{
                            padding: "8px 16px",
                            fontSize: "12px",
                            backgroundColor: "#9C27B0",
                            color: "#fff",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                          }}
                        >
                          Use Card ({currentPlayer.jailFreeCards})
                        </motion.button>
                      )}
                      {currentPlayer.cash >= 50 && (
                        <motion.button
                          onClick={() => handleJailAction("pay")}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          style={{
                            padding: "8px 16px",
                            fontSize: "12px",
                            backgroundColor: "#2196F3",
                            color: "#fff",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                          }}
                        >
                          Pay £50
                        </motion.button>
                      )}
                      <motion.button
                        onClick={() => handleJailAction("roll")}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        style={{
                          padding: "8px 16px",
                          fontSize: "12px",
                          backgroundColor: "#4CAF50",
                          color: "#fff",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                        }}
                      >
                        Roll for Doubles
                      </motion.button>
                    </div>
                  )}
                </div>
              )}

              {/* Tax decision phase - Progressive Income Tax */}
              {phase === "awaiting_tax_decision" && awaitingTaxDecision && isMyTurn && (
                <div style={{ backgroundColor: "#333", padding: "16px", borderRadius: "8px" }}>
                  <h3 style={{ marginBottom: "8px", color: "#FFD700" }}>💰 Income Tax</h3>
                  <p style={{ fontSize: "14px", marginBottom: "16px", color: "#ccc" }}>
                    Choose your tax payment method:
                  </p>
                  
                  <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexDirection: "column" }}>
                    <motion.button
                      onClick={() => chooseTaxOption(currentPlayerIndex, "flat")}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      style={{
                        padding: "16px 24px",
                        fontSize: "16px",
                        backgroundColor: awaitingTaxDecision.flatAmount <= awaitingTaxDecision.percentageAmount ? "#4CAF50" : "#555",
                        color: "#fff",
                        border: awaitingTaxDecision.flatAmount <= awaitingTaxDecision.percentageAmount ? "2px solid #8BC34A" : "2px solid transparent",
                        borderRadius: "8px",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span>Flat Tax</span>
                      <span style={{ fontWeight: "bold" }}>£{awaitingTaxDecision.flatAmount}</span>
                    </motion.button>
                    
                    <motion.button
                      onClick={() => chooseTaxOption(currentPlayerIndex, "percentage")}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      style={{
                        padding: "16px 24px",
                        fontSize: "16px",
                        backgroundColor: awaitingTaxDecision.percentageAmount < awaitingTaxDecision.flatAmount ? "#4CAF50" : "#555",
                        color: "#fff",
                        border: awaitingTaxDecision.percentageAmount < awaitingTaxDecision.flatAmount ? "2px solid #8BC34A" : "2px solid transparent",
                        borderRadius: "8px",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span>10% of Net Worth</span>
                      <span style={{ fontWeight: "bold" }}>£{awaitingTaxDecision.percentageAmount}</span>
                    </motion.button>
                  </div>
                  
                  <p style={{ fontSize: "11px", marginTop: "12px", color: "rgba(255,255,255,0.5)", textAlign: "center" }}>
                    {awaitingTaxDecision.percentageAmount < awaitingTaxDecision.flatAmount 
                      ? "💡 10% is cheaper for you!" 
                      : "💡 Flat tax is cheaper for you!"}
                  </p>
                </div>
              )}

              {/* Buy decision phase */}
              {phase === "awaiting_buy_decision" && currentSpace && isProperty(currentSpace) && (
                <div style={{ backgroundColor: "#333", padding: "16px", borderRadius: "8px" }}>
                  <h3 style={{ marginBottom: "8px", color: "#fff" }}>{currentSpace.name}</h3>
                  <p style={{ fontSize: "16px", marginBottom: "12px", color: "#ccc" }}>
                    Price: £{currentSpace.price}
                  </p>
                  
                  {/* Hide interactive buttons for AI */}
                  {!currentPlayer.isAI && isMyTurn && (
                    <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                      {currentPlayer.cash >= currentSpace.price ? (
                        <>
                          <motion.button
                            onClick={handleBuyProperty}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            style={{
                              padding: "12px 24px",
                              fontSize: "16px",
                              backgroundColor: "#4CAF50",
                              color: "#fff",
                              border: "none",
                              borderRadius: "8px",
                              cursor: "pointer",
                            }}
                          >
                            Buy for £{currentSpace.price}
                          </motion.button>
                          <motion.button
                            onClick={handleDeclineProperty}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            style={{
                              padding: "12px 24px",
                              fontSize: "16px",
                              backgroundColor: "#FF9800",
                              color: "#fff",
                              border: "none",
                              borderRadius: "8px",
                              cursor: "pointer",
                            }}
                          >
                            Auction
                          </motion.button>
                        </>
                      ) : (
                        <div style={{ textAlign: "center" }}>
                          <p style={{ color: "#ff6b6b", fontWeight: "bold", marginBottom: "12px" }}>
                            Not enough cash!
                          </p>
                          <motion.button
                            onClick={handleDeclineProperty}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            style={{
                              padding: "12px 24px",
                              fontSize: "16px",
                              backgroundColor: "#FF9800",
                              color: "#fff",
                              border: "none",
                              borderRadius: "8px",
                              cursor: "pointer",
                            }}
                          >
                            Go to Auction
                          </motion.button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Resolving space phase */}
              {phase === "resolving_space" && currentSpace && (
                <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ marginBottom: "8px" }}>
                    <DiceDisplay />
                  </div>
                  
                  <div style={{ backgroundColor: "#333", padding: "10px", borderRadius: "8px" }}>
                    <h3 style={{ marginBottom: "6px", fontSize: "13px", color: "#fff" }}>{currentSpace.name}</h3>
                    
                    {/* Property display */}
                    {isProperty(currentSpace) && (
                      <div style={{ marginBottom: "8px" }}>
                        {currentSpace.owner !== undefined && currentSpace.owner !== currentPlayerIndex && (
                          <p style={{ color: "#ff6b6b", fontSize: "11px" }}>
                            Owned by {players[currentSpace.owner]?.name ?? "Unknown"}
                            {currentSpace.mortgaged && " (Mortgaged)"}
                          </p>
                        )}
                        {currentSpace.owner === currentPlayerIndex && (
                          <p style={{ color: "#4CAF50", fontSize: "11px" }}>You own this property!</p>
                        )}
                      </div>
                    )}

                    {/* Tax payment */}
                    {currentSpace.type === "tax" && (
                      <div>
                        <p style={{ fontSize: "16px", marginBottom: "12px", color: "#ff6b6b" }}>
                          Paid £{currentSpace.name.includes("Income") ? 200 : 100} tax automatically
                        </p>
                        {!currentPlayer.isAI && isMyTurn && (
                          <motion.button
                            onClick={handleEndTurn}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            style={{
                              padding: "12px 24px",
                              fontSize: "16px",
                              backgroundColor: "#2196F3",
                              color: "#fff",
                              border: "none",
                              borderRadius: "8px",
                              cursor: "pointer",
                            }}
                          >
                            End Turn
                          </motion.button>
                        )}
                      </div>
                    )}

                    {/* Card spaces */}
                    {(currentSpace.type === "chance" || currentSpace.type === "community_chest") && !lastCardDrawn && (
                      <div>
                        {!currentPlayer.isAI && isMyTurn && (
                          <motion.button
                            onClick={() => handleDrawCard(currentSpace.type as "chance" | "community_chest")}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            style={{
                              padding: "8px 20px",
                              fontSize: "13px",
                              backgroundColor: currentSpace.type === "chance" ? "#FF8C00" : "#4169E1",
                              color: "#fff",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                              width: "100%",
                            }}
                          >
                            Draw {currentSpace.type === "chance" ? "Chance" : "Community Chest"}
                          </motion.button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* End turn button */}
                  {diceRoll && !currentPlayer.inJail && !currentPlayer.isAI && isMyTurn && (
                    <motion.button
                      onClick={handleEndTurn}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      style={{
                        marginTop: "8px",
                        padding: "10px 24px",
                        fontSize: "14px",
                        backgroundColor: diceRoll.isDoubles ? "#4CAF50" : "#2196F3",
                        color: "#fff",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontWeight: "bold",
                        width: "100%",
                        flexShrink: 0,
                      }}
                    >
                      {diceRoll.isDoubles ? "Roll Again (Doubles!)" : "End Turn"}
                    </motion.button>
                  )}
                </div>
              )}
              </div>
            </motion.div>
          )}

      <PlayerSelectionModal />

      {/* Bottom - User Panel (All Players) - Rendered LAST to ensure it's on top */}
      <UserPanel />
    </div>
  );
}
