import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "./store/gameStore";
import { Board } from "./components/Board";
import { PlayerTokens } from "./components/PlayerToken";
import PlayerSetup from "./components/PlayerSetup";
import { AuctionModal } from "./components/AuctionModal";
import { TradeModal } from "./components/TradeModal";
import { Dice, DiceDisplay } from "./components/Dice";
import { GameLog } from "./components/GameLog";
import { PlayerPropertiesPanel } from "./components/PlayerProperties";
import type { Property } from "./types/game";

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
  } = useGameStore();
  
  React.useEffect(() => {
    connect();
  }, []);

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
  
  const currentPlayer = currentPlayerIndex !== undefined && currentPlayerIndex < players.length 
    ? players[currentPlayerIndex] 
    : null;
  
  const currentSpace = currentPlayer ? spaces[currentPlayer.position] : null;

  const [passedGo, setPassedGo] = React.useState(false);
  const [isRolling, setIsRolling] = React.useState(false);

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
    if (!currentPlayer || !currentPlayer.isAI || currentPlayer.bankrupt) return;
    if (phase === "setup" || phase === "game_over") return;

    // Add delay for AI actions to be visible
    const aiDelay = setTimeout(() => {
      useGameStore.getState().executeAITurn();
    }, 1200);

    return () => clearTimeout(aiDelay);
  }, [currentPlayer, phase, auction?.activePlayerIndex]);

  // AI trade response
  React.useEffect(() => {
    if (phase === "trading" && trade?.status === "pending") {
      const receiver = players[trade.offer.toPlayer];
      if (receiver?.isAI) {
        const aiDelay = setTimeout(() => {
          useGameStore.getState().executeAITradeResponse();
        }, 2000);
        return () => clearTimeout(aiDelay);
      }
    }
  }, [phase, trade?.status]);

  const handleRollDice = () => {
    if (isRolling) return;
    setIsRolling(true);
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
        }, 200);
      }
    }, 800);
  };

  const handleEndTurn = () => {
    useGameStore.getState().endTurn();
  };

  const handleBuyProperty = () => {
    if (!currentSpace || !isProperty(currentSpace)) return;
    useGameStore.getState().buyProperty(currentSpace.id);
  };

  const handleDeclineProperty = () => {
    if (!currentSpace) return;
    useGameStore.getState().declineProperty(currentSpace.id);
  };

  const handlePayTax = () => {
    if (!currentSpace || currentSpace.type !== "tax" || !currentPlayer) return;
    const amount = currentSpace.name.includes("Income") ? 200 : 100;
    useGameStore.getState().payTax(currentPlayerIndex, amount);
  };

  const handleDrawCard = (cardType: "chance" | "community_chest") => {
    useGameStore.getState().drawCard(currentPlayerIndex, cardType);
  };

  const handleJailAction = (action: "card" | "pay" | "roll") => {
    if (currentPlayer) {
      useGameStore.getState().getOutOfJail(currentPlayerIndex, action);
    }
  };

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

  // Split players into left and right side panels
  const leftPlayers = players.filter((_, i) => i % 2 === 0);
  const rightPlayers = players.filter((_, i) => i % 2 === 1);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap: "24px",
        minHeight: "100vh",
        backgroundColor: "#1a1a2a",
        padding: "20px",
      }}
    >
      {/* Left Side Panel - Players 1 & 3 */}
      <div
        style={{
          width: "280px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          paddingTop: "40px",
        }}
      >
        {leftPlayers.map((player) => (
          <PlayerPropertiesPanel key={player.id} playerIndex={player.id} />
        ))}
      </div>

      {/* Center - Board and Game Controls */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Game Board Container - relative positioning for tokens */}
        <div style={{ position: "relative", width: "964px", height: "964px", margin: "20px 0" }}>
          <Board />
          <PlayerTokens />
          
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

          {/* Main game panel - Absolute positioned in center */}
          {currentPlayer && phase !== "auction" && phase !== "trading" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                backgroundColor: "rgba(0, 0, 0, 0.95)",
                padding: "24px",
                borderRadius: "16px",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
                zIndex: 100,
                width: "400px",
                textAlign: "center",
                color: "#fff",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginBottom: "16px" }}>
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor: currentPlayer.color,
                    border: "3px solid #fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "18px",
                  }}
                >
                  {currentPlayer.token}
                </div>
                <h2 style={{ margin: 0 }}>
                  {currentPlayer.name}'s Turn
                  {currentPlayer.isAI && <span style={{ fontSize: "14px", color: "#FF9800", marginLeft: "8px" }}>(AI)</span>}
                </h2>
              </div>
              
              <p style={{ fontSize: "18px", marginBottom: "16px", color: "#ccc" }}>
                Cash: £{currentPlayer.cash}
              </p>
              
              {/* AI Thinking Indicator */}
              {currentPlayer.isAI && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    padding: "16px",
                    fontSize: "18px",
                    color: "#FF9800",
                    fontWeight: "bold",
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
                <div>
                  {!diceRoll && !isRolling && (
                    <motion.button
                      onClick={handleRollDice}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      style={{
                        padding: "16px 48px",
                        fontSize: "20px",
                        backgroundColor: "#4CAF50",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "bold",
                      }}
                    >
                      Roll Dice
                    </motion.button>
                  )}
                  {isRolling && (
                    <Dice onRollComplete={handleRollComplete} />
                  )}
                </div>
              )}

              {/* Jail decision phase */}
              {(phase === "jail_decision" || (phase === "rolling" && currentPlayer.inJail)) && currentPlayer.inJail && (
                <div style={{ backgroundColor: "#333", padding: "16px", borderRadius: "8px" }}>
                  <h3 style={{ marginBottom: "8px", color: "#ff6b6b" }}>In Jail</h3>
                  <p style={{ fontSize: "14px", marginBottom: "12px", color: "#ccc" }}>
                    Turn {currentPlayer.jailTurns + 1} of 3
                  </p>
                  
                  {/* Hide interactive buttons for AI */}
                  {!currentPlayer.isAI && (
                    <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
                      {currentPlayer.jailFreeCards > 0 && (
                        <motion.button
                          onClick={() => handleJailAction("card")}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          style={{
                            padding: "12px 20px",
                            fontSize: "14px",
                            backgroundColor: "#9C27B0",
                            color: "#fff",
                            border: "none",
                            borderRadius: "8px",
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
                            padding: "12px 20px",
                            fontSize: "14px",
                            backgroundColor: "#2196F3",
                            color: "#fff",
                            border: "none",
                            borderRadius: "8px",
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
                          padding: "12px 20px",
                          fontSize: "14px",
                          backgroundColor: "#4CAF50",
                          color: "#fff",
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer",
                        }}
                      >
                        Roll for Doubles
                      </motion.button>
                    </div>
                  )}
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
                  {!currentPlayer.isAI && (
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
                <div>
                  <div style={{ marginBottom: "16px" }}>
                    <DiceDisplay />
                  </div>
                  
                  <div style={{ backgroundColor: "#333", padding: "16px", borderRadius: "8px" }}>
                    <h3 style={{ marginBottom: "8px", color: "#fff" }}>{currentSpace.name}</h3>
                    
                    {/* Property display */}
                    {isProperty(currentSpace) && (
                      <div style={{ marginBottom: "12px" }}>
                        {currentSpace.owner !== undefined && currentSpace.owner !== currentPlayerIndex && (
                          <p style={{ color: "#ff6b6b" }}>
                            Owned by {players[currentSpace.owner]?.name ?? "Unknown"}
                            {currentSpace.mortgaged && " (Mortgaged - No Rent)"}
                          </p>
                        )}
                        {currentSpace.owner === currentPlayerIndex && (
                          <p style={{ color: "#4CAF50" }}>You own this property!</p>
                        )}
                      </div>
                    )}

                    {/* Tax payment */}
                    {currentSpace.type === "tax" && (
                      <div>
                        <p style={{ fontSize: "16px", marginBottom: "12px", color: "#ff6b6b" }}>
                          Paid £{currentSpace.name.includes("Income") ? 200 : 100} tax automatically
                        </p>
                        {!currentPlayer.isAI && (
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
                        {!currentPlayer.isAI && (
                          <motion.button
                            onClick={() => handleDrawCard(currentSpace.type as "chance" | "community_chest")}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            style={{
                              padding: "12px 24px",
                              fontSize: "16px",
                              backgroundColor: currentSpace.type === "chance" ? "#FF8C00" : "#4169E1",
                              color: "#fff",
                              border: "none",
                              borderRadius: "8px",
                              cursor: "pointer",
                            }}
                          >
                            Draw {currentSpace.type === "chance" ? "Chance" : "Community Chest"}
                          </motion.button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* End turn button */}
                  {diceRoll && !currentPlayer.inJail && !currentPlayer.isAI && (
                    <motion.button
                      onClick={handleEndTurn}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      style={{
                        marginTop: "16px",
                        padding: "14px 32px",
                        fontSize: "16px",
                        backgroundColor: diceRoll.isDoubles ? "#4CAF50" : "#2196F3",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "bold",
                      }}
                    >
                      {diceRoll.isDoubles ? "Roll Again (Doubles!)" : "End Turn"}
                    </motion.button>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Last drawn card display */}
          <AnimatePresence>
            {lastCardDrawn && (
              <motion.div
                initial={{ opacity: 0, y: -50, x: "-50%" }}
                animate={{ opacity: 1, y: 0, x: "-50%" }}
                exit={{ opacity: 0, y: -50, x: "-50%" }}
                style={{
                  position: "absolute",
                  top: "20px",
                  left: "50%",
                  backgroundColor: lastCardDrawn.type === "chance" ? "#FF8C00" : "#4169E1",
                  padding: "16px 24px",
                  borderRadius: "8px",
                  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
                  zIndex: 150,
                  color: "#fff",
                  textAlign: "center",
                  width: "400px",
                }}
              >
                <h4 style={{ margin: "0 0 8px 0" }}>
                  {lastCardDrawn.type === "chance" ? "Chance" : "Community Chest"}
                </h4>
                <p style={{ margin: 0 }}>{lastCardDrawn.text}</p>
              </motion.div>
            )}
          </AnimatePresence>

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
                Passed GO! +£200
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right Side Panel - Players 2 & 4 + Game Log */}
      <div
        style={{
          width: "280px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          paddingTop: "40px",
        }}
      >
        {rightPlayers.map((player) => (
          <PlayerPropertiesPanel key={player.id} playerIndex={player.id} />
        ))}
        <GameLog />
      </div>
    </div>
  );
}
