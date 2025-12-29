import React from "react";
import { motion } from "framer-motion";
import { useGameStore } from "../store/gameStore";
import type { AuctionState, Property, Player } from "../types/game";

interface Props {
  auction: AuctionState;
  property: Property;
  players: Player[];
}

export const AuctionModal: React.FC<Props> = ({ auction, property, players }) => {
  const [bidAmount, setBidAmount] = React.useState(auction.currentBid + 1);
  
  const activePlayer = players[auction.activePlayerIndex];
  const highestBidder = auction.highestBidder !== null 
    ? players[auction.highestBidder] 
    : null;

  const handleBid = () => {
    if (bidAmount > auction.currentBid && activePlayer && bidAmount <= activePlayer.cash) {
      useGameStore.getState().placeBid(auction.activePlayerIndex, bidAmount);
      setBidAmount(bidAmount + 10);
    }
  };

  const handlePass = () => {
    useGameStore.getState().passAuction(auction.activePlayerIndex);
  };

  // Quick bid buttons
  const quickBids = [
    auction.currentBid + 10,
    auction.currentBid + 50,
    auction.currentBid + 100,
  ].filter(b => b <= (activePlayer?.cash ?? 0));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, x: "-50%", y: "-50%" }}
      animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        backgroundColor: "rgba(0, 0, 0, 0.95)",
        padding: "32px",
        borderRadius: "12px",
        zIndex: 200,
        minWidth: "450px",
        color: "#fff",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
      }}
    >
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
        <p style={{ margin: "0 0 4px 0", color: "#ccc", fontSize: "14px" }}>Current Bid</p>
        <p style={{ margin: 0, fontSize: "32px", fontWeight: "bold", color: "#4CAF50" }}>
          £{auction.currentBid}
        </p>
        {highestBidder && (
          <p style={{ margin: "8px 0 0 0", color: "#ccc" }}>
            by <span style={{ color: highestBidder.color }}>{highestBidder.name}</span>
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
        </h3>
        <p style={{ margin: "0 0 16px 0", textAlign: "center", color: "#ccc" }}>
          Available: £{activePlayer?.cash ?? 0}
        </p>
        
        {/* Quick bid buttons */}
        {quickBids.length > 0 && (
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px", justifyContent: "center" }}>
            {quickBids.map((amount) => (
              <button
                key={amount}
                onClick={() => {
                  useGameStore.getState().placeBid(auction.activePlayerIndex, amount);
                  setBidAmount(amount + 10);
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
            min={auction.currentBid + 1}
            max={activePlayer?.cash ?? 0}
            value={bidAmount}
            onChange={(e) => setBidAmount(parseInt(e.target.value) || auction.currentBid + 1)}
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
            disabled={bidAmount <= auction.currentBid || bidAmount > (activePlayer?.cash ?? 0)}
            style={{
              padding: "8px 24px",
              backgroundColor: bidAmount > auction.currentBid && bidAmount <= (activePlayer?.cash ?? 0) 
                ? "#4CAF50" 
                : "#666",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: bidAmount > auction.currentBid ? "pointer" : "not-allowed",
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
    </motion.div>
  );
};
