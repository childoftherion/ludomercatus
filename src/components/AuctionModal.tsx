import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "../store/gameStore";
import { audioManager } from "../utils/audio";
import type { AuctionState, Property, Player } from "../types/game";

interface Props {
  auction: AuctionState;
  property: Property;
  players: Player[];
  myPlayerIndex: number;
}

export const AuctionModal: React.FC<Props> = ({ auction, property, players, myPlayerIndex }) => {
  
  // Calculate minimum bid: 10% increment or £10, whichever is higher
  const minIncrement = Math.max(10, Math.floor(auction.currentBid * 0.1));
  const minimumBid = auction.currentBid === 0 
    ? Math.max(10, Math.floor((property?.price ?? 100) * 0.1)) // Opening bid: 10% of property value
    : auction.currentBid + minIncrement;
  
  const [bidAmount, setBidAmount] = React.useState(minimumBid);
  
  // Update bid amount when minimum changes
  React.useEffect(() => {
    setBidAmount(minimumBid);
  }, [minimumBid]);
  
  const activePlayer = players[auction.activePlayerIndex];
  const highestBidder = auction.highestBidder !== null 
    ? players[auction.highestBidder] 
    : null;

  // Only allow human player to bid for themselves
  const isMyTurn = auction.activePlayerIndex === myPlayerIndex;
  const canBid = isMyTurn && activePlayer && !activePlayer.isAI && !activePlayer.bankrupt;

  const handleBid = () => {
    if (!canBid) {
      console.warn("[AuctionModal] Attempted to bid for non-human player or not your turn");
      return;
    }
    if (bidAmount >= minimumBid && activePlayer && bidAmount <= activePlayer.cash) {
      useGameStore.getState().placeBid(auction.activePlayerIndex, bidAmount);
      audioManager.playBid();
    }
  };

  const handlePass = () => {
    if (!canBid) {
      console.warn("[AuctionModal] Attempted to pass for non-human player or not your turn");
      return;
    }
    useGameStore.getState().passAuction(auction.activePlayerIndex);
  };

  // Quick bid buttons based on minimum bid
  const quickBids = [
    minimumBid,
    minimumBid + Math.max(10, Math.floor(minimumBid * 0.25)),
    minimumBid + Math.max(20, Math.floor(minimumBid * 0.5)),
  ].filter(b => b <= (activePlayer?.cash ?? 0));

  // Use ref to measure actual modal size and center properly
  const modalRef = React.useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  
  React.useEffect(() => {
    const updatePosition = () => {
      if (modalRef.current) {
        // Use requestAnimationFrame to ensure DOM is fully rendered
        requestAnimationFrame(() => {
          if (modalRef.current) {
            const rect = modalRef.current.getBoundingClientRect();
            // Position modal on the right side (where GameLog used to be)
            // Modals should be positioned at top: 12px, right: 12px, width: 320px
            const modalAreaWidth = 320;
            const modalAreaTop = 12;
            const rightMargin = 12;
            const spacing = 20; // Space for multiple modals if needed
            // Position on the right side
            const modalX = window.innerWidth - modalAreaWidth - rightMargin;
            // Position at top of modal area
            const modalY = modalAreaTop;
            // Ensure modal doesn't extend below viewport
            const maxY = window.innerHeight - rect.height - 20; // 20px margin from bottom
            const adjustedY = Math.min(modalY, maxY);
            setPosition({ x: modalX, y: adjustedY });
          }
        });
      }
    };
    
    // Update position after render and on resize - use multiple attempts to catch different render phases
    const timer1 = setTimeout(updatePosition, 0);
    const timer2 = setTimeout(updatePosition, 50);
    const timer3 = setTimeout(updatePosition, 200);
    window.addEventListener('resize', updatePosition);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      window.removeEventListener('resize', updatePosition);
    };
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        ref={modalRef}
        data-auction-modal
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        style={{
          position: "fixed",
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: "400px", // Scaled down for 100% zoom (was 420px)
          maxWidth: "320px", // Match modal area width
          maxHeight: "calc(100vh - 24px)", // Full height minus margins
          overflowY: "auto",
          overflowX: "hidden", // Prevent horizontal scrollbars
          color: "#fff",
          backgroundColor: "rgba(0, 0, 0, 0.95)",
          borderRadius: "16px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
          border: "1px solid rgba(255,255,255,0.1)",
          zIndex: 300,
        }}
      >
        <div style={{ padding: "20px" }}>
      <h2 style={{ margin: "0 0 16px 0", textAlign: "center" }}>Auction</h2>
      
      {/* Property info */}
      <div style={{ 
        backgroundColor: "#333", 
        padding: "16px", 
        borderRadius: "8px",
        marginBottom: "16px",
        textAlign: "center",
      }}>
        <h3 style={{ margin: "0 0 8px 0" }}>{property?.name ?? "Property"}</h3>
        <p style={{ margin: 0, color: "#ccc" }}>Market Price: £{property?.price ?? 0}</p>
      </div>
      
      {/* Current bid info */}
      <div style={{ 
        backgroundColor: "#1a472a", 
        padding: "16px", 
        borderRadius: "8px",
        marginBottom: "16px",
        textAlign: "center",
      }}>
        <p style={{ margin: "0 0 4px 0", color: "#ccc", fontSize: "14px" }}>
          {auction.currentBid === 0 ? "Opening Bid" : "Current Bid"}
        </p>
        <p style={{ margin: 0, fontSize: "32px", fontWeight: "bold", color: "#4CAF50" }}>
          {auction.currentBid === 0 ? `£${minimumBid}+` : `£${auction.currentBid}`}
        </p>
        {highestBidder && (
          <p style={{ margin: "8px 0 0 0", color: "#ccc" }}>
            by <span style={{ color: highestBidder.color }}>{highestBidder.name}</span>
          </p>
        )}
        {auction.currentBid > 0 && (
          <p style={{ margin: "4px 0 0 0", color: "#888", fontSize: "12px" }}>
            Min next bid: £{minimumBid} (+{minIncrement})
          </p>
        )}
      </div>

      {/* Active bidder panel */}
      <div style={{ 
        backgroundColor: "#444", 
        padding: "16px", 
        borderRadius: "8px",
        marginBottom: "16px",
      }}>
        <h3 style={{ 
          margin: "0 0 12px 0", 
          color: activePlayer?.color,
          textAlign: "center",
        }}>
          {activePlayer?.name}'s Turn to Bid
          {activePlayer?.isAI && <span style={{ fontSize: "14px", color: "#FF9800", marginLeft: "8px" }}>(AI)</span>}
        </h3>
        <p style={{ margin: "0 0 16px 0", textAlign: "center", color: "#ccc" }}>
          Available: £{activePlayer?.cash ?? 0}
        </p>
        
        {/* Only show bid/pass controls if it's the human player's turn */}
        {canBid ? (
          <>
            {/* Quick bid buttons */}
            {quickBids.length > 0 && (
              <div style={{ display: "flex", gap: "8px", marginBottom: "12px", justifyContent: "center" }}>
                {quickBids.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => {
                      useGameStore.getState().placeBid(auction.activePlayerIndex, amount);
                      setBidAmount(amount + 10);
                      audioManager.playBid();
                    }}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#4CAF50",
                      color: "#fff",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    £{amount}
                  </button>
                ))}
              </div>
            )}
            
            {/* Custom bid */}
            <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
              <input
                type="number"
                min={minimumBid}
                max={activePlayer?.cash ?? 0}
                value={bidAmount}
                onChange={(e) => setBidAmount(Math.max(minimumBid, parseInt(e.target.value) || minimumBid))}
                style={{ 
                  padding: "8px", 
                  width: "100px",
                  borderRadius: "4px",
                  border: "none",
                  textAlign: "center",
                  fontSize: "16px",
                }}
              />
              <button
                onClick={handleBid}
                disabled={bidAmount < minimumBid || bidAmount > (activePlayer?.cash ?? 0)}
                style={{
                  padding: "8px 24px",
                  backgroundColor: bidAmount >= minimumBid && bidAmount <= (activePlayer?.cash ?? 0) 
                    ? "#4CAF50" 
                    : "#666",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: bidAmount >= minimumBid ? "pointer" : "not-allowed",
                  fontWeight: "bold",
                }}
              >
                Bid
              </button>
              <button
                onClick={handlePass}
                style={{
                  padding: "8px 24px",
                  backgroundColor: "#f44336",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                Pass
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", color: "#888", padding: "16px" }}>
            {activePlayer?.isAI ? (
              <p style={{ margin: 0 }}>AI is thinking...</p>
            ) : (
              <p style={{ margin: 0 }}>Waiting for {activePlayer?.name} to bid...</p>
            )}
          </div>
        )}
      </div>

      {/* Bidders status */}
      <div style={{ fontSize: "14px" }}>
        <h4 style={{ margin: "0 0 8px 0", color: "#ccc" }}>Bidders</h4>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {players.map((p, i) => {
            const hasPassed = auction.passedPlayers.includes(i);
            const isActive = i === auction.activePlayerIndex;
            const isBankrupt = p.bankrupt;
            
            return (
              <div 
                key={p.id} 
                style={{ 
                  padding: "4px 12px",
                  borderRadius: "16px",
                  backgroundColor: isActive ? "#4CAF50" : hasPassed || isBankrupt ? "#333" : "#555",
                  opacity: hasPassed || isBankrupt ? 0.5 : 1,
                  color: isActive ? "#fff" : p.color,
                  fontSize: "12px",
                }}
              >
                {p.name} {hasPassed && "(Passed)"} {isBankrupt && "(Bankrupt)"}
              </div>
            );
          })}
        </div>
        </div>
      </div>
      </motion.div>
    </AnimatePresence>
  );
};
