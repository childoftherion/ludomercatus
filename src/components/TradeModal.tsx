import React from "react";
import { motion } from "framer-motion";
import { useGameStore } from "../store/gameStore";
import type { TradeState, Player, Space, Property, TradeOffer } from "../types/game";

interface Props {
  trade: TradeState;
  players: Player[];
  spaces: Space[];
}

export const TradeModal: React.FC<Props> = ({ trade, players, spaces }) => {
  const { 
    updateTradeOffer, 
    proposeTrade, 
    acceptTrade, 
    rejectTrade, 
    cancelTrade,
    getPlayerProperties
  } = useGameStore();
  
  const { offer, status } = trade;
  const fromPlayer = players[offer.fromPlayer]!;
  const toPlayer = players[offer.toPlayer]!;
  
  // Who is viewing the modal?
  const humanPlayerIndex = players.findIndex((p: Player) => !p.isAI);
  const isInitiator = humanPlayerIndex === offer.fromPlayer;
  const isReceiver = humanPlayerIndex === offer.toPlayer;
  
  const fromPlayerOwnedProps = getPlayerProperties(offer.fromPlayer).filter(p => p.houses === 0 && !p.hotel);
  const toPlayerOwnedProps = getPlayerProperties(offer.toPlayer).filter(p => p.houses === 0 && !p.hotel);

  const handleToggleProperty = (propId: number, side: "from" | "to") => {
    if (status !== "draft") return;
    
    const newOffer = { ...offer };
    if (side === "from") {
      newOffer.propertiesOffered = offer.propertiesOffered.includes(propId)
        ? offer.propertiesOffered.filter(id => id !== propId)
        : [...offer.propertiesOffered, propId];
    } else {
      newOffer.propertiesRequested = offer.propertiesRequested.includes(propId)
        ? offer.propertiesRequested.filter(id => id !== propId)
        : [...offer.propertiesRequested, propId];
    }
    updateTradeOffer(newOffer);
  };

  const handleCashChange = (amount: number, side: "from" | "to") => {
    if (status !== "draft") return;
    const newOffer = { ...offer };
    if (side === "from") newOffer.cashOffered = Math.max(0, Math.min(amount, fromPlayer.cash));
    else newOffer.cashRequested = Math.max(0, Math.min(amount, toPlayer.cash));
    updateTradeOffer(newOffer);
  };

  const getPropertyName = (id: number) => {
    return spaces.find(s => s.id === id)?.name ?? `Prop #${id}`;
  };

  const handlePropose = () => {
    // Safety check for gifting
    const isGift = 
      offer.cashRequested === 0 && 
      offer.propertiesRequested.length === 0 && 
      offer.jailCardsRequested === 0;

    if (isGift) {
      if (!confirm("⚠️ You are offering a gift (receiving nothing in return).\n\nAre you sure you want to proceed?")) {
        return;
      }
    }
    proposeTrade(offer);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, x: "-50%", y: "-50%" }}
      animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        backgroundColor: "rgba(10, 10, 20, 0.98)",
        padding: "32px",
        borderRadius: "20px",
        zIndex: 200,
        width: "800px",
        color: "#fff",
        boxShadow: "0 20px 50px rgba(0, 0, 0, 0.8)",
        border: "1px solid rgba(255,255,255,0.1)",
        maxHeight: "90%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <h2 style={{ margin: "0 0 24px 0", textAlign: "center", fontSize: "28px", color: "#4ECDC4" }}>
        {status === "draft" ? "Configure Trade" : "Trade Proposal"}
      </h2>
      
      <div style={{ display: "flex", gap: "32px", flex: 1, overflowY: "auto", marginBottom: "24px", padding: "4px" }}>
        {/* LEFT SIDE - FROM PLAYER */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ padding: "12px", borderRadius: "12px", background: fromPlayer.color + "22", borderLeft: `4px solid ${fromPlayer.color}` }}>
            <div style={{ fontWeight: "bold" }}>{fromPlayer.name} Offers:</div>
            <div style={{ fontSize: "12px", opacity: 0.7 }}>Cash: £{fromPlayer.cash.toLocaleString()}</div>
          </div>

          {status === "draft" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "12px", display: "block", marginBottom: "4px" }}>Cash to Offer:</label>
                <input 
                  type="number" 
                  value={offer.cashOffered}
                  onChange={(e) => handleCashChange(parseInt(e.target.value) || 0, "from")}
                  style={{ width: "100%", padding: "8px", background: "#222", border: "1px solid #444", color: "#fff", borderRadius: "4px" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "12px", display: "block", marginBottom: "4px" }}>Properties to Offer:</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "200px", overflowY: "auto", padding: "8px", background: "#111", borderRadius: "8px" }}>
                  {fromPlayerOwnedProps.map((prop: Property) => (
                    <div 
                      key={prop.id}
                      onClick={() => handleToggleProperty(prop.id, "from")}
                      style={{ 
                        padding: "6px 10px", 
                        fontSize: "12px", 
                        background: offer.propertiesOffered.includes(prop.id) ? "#2E8B57" : "#222",
                        borderRadius: "4px",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between"
                      }}
                    >
                      {prop.name}
                      {offer.propertiesOffered.includes(prop.id) && <span>✓</span>}
                    </div>
                  ))}
                  {fromPlayerOwnedProps.length === 0 && <div style={{ fontSize: "11px", opacity: 0.5, textAlign: "center" }}>No tradable properties</div>}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: "16px", background: "rgba(255,255,255,0.05)", borderRadius: "8px" }}>
              {offer.cashOffered > 0 && <p>£{offer.cashOffered.toLocaleString()}</p>}
              {offer.propertiesOffered.map(id => <p key={id}>• {getPropertyName(id)}</p>)}
              {offer.cashOffered === 0 && offer.propertiesOffered.length === 0 && <p style={{ fontStyle: "italic", opacity: 0.5 }}>Nothing</p>}
            </div>
          )}
        </div>

        {/* CENTER ARROW */}
        <div style={{ display: "flex", alignItems: "center", fontSize: "40px", color: "#444" }}>⇄</div>

        {/* RIGHT SIDE - TO PLAYER */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ padding: "12px", borderRadius: "12px", background: toPlayer.color + "22", borderRight: `4px solid ${toPlayer.color}`, textAlign: "right" }}>
            <div style={{ fontWeight: "bold" }}>{toPlayer.name} Gives:</div>
            <div style={{ fontSize: "12px", opacity: 0.7 }}>Cash: £{toPlayer.cash.toLocaleString()}</div>
          </div>

          {status === "draft" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "12px", display: "block", marginBottom: "4px" }}>Cash to Request:</label>
                <input 
                  type="number" 
                  value={offer.cashRequested}
                  onChange={(e) => handleCashChange(parseInt(e.target.value) || 0, "to")}
                  style={{ width: "100%", padding: "8px", background: "#222", border: "1px solid #444", color: "#fff", borderRadius: "4px" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "12px", display: "block", marginBottom: "4px" }}>Properties to Request:</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "200px", overflowY: "auto", padding: "8px", background: "#111", borderRadius: "8px" }}>
                  {toPlayerOwnedProps.map((prop: Property) => (
                    <div 
                      key={prop.id}
                      onClick={() => handleToggleProperty(prop.id, "to")}
                      style={{ 
                        padding: "6px 10px", 
                        fontSize: "12px", 
                        background: offer.propertiesRequested.includes(prop.id) ? "#2E8B57" : "#222",
                        borderRadius: "4px",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between"
                      }}
                    >
                      {prop.name}
                      {offer.propertiesRequested.includes(prop.id) && <span>✓</span>}
                    </div>
                  ))}
                  {toPlayerOwnedProps.length === 0 && <div style={{ fontSize: "11px", opacity: 0.5, textAlign: "center" }}>No tradable properties</div>}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: "16px", background: "rgba(255,255,255,0.05)", borderRadius: "8px" }}>
              {offer.cashRequested > 0 && <p>£{offer.cashRequested.toLocaleString()}</p>}
              {offer.propertiesRequested.map(id => <p key={id}>• {getPropertyName(id)}</p>)}
              {offer.cashRequested === 0 && offer.propertiesRequested.length === 0 && <p style={{ fontStyle: "italic", opacity: 0.5 }}>Nothing</p>}
            </div>
          )}
        </div>
      </div>

      {/* FOOTER ACTIONS */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "24px", display: "flex", justifyContent: "center", gap: "16px" }}>
        {status === "draft" && (
          <>
            <motion.button 
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={handlePropose}
              style={{ padding: "12px 40px", background: "#4CAF50", border: "none", color: "#fff", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
            >
              Propose Trade
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={cancelTrade}
              style={{ padding: "12px 40px", background: "#666", border: "none", color: "#fff", borderRadius: "8px", cursor: "pointer" }}
            >
              Cancel
            </motion.button>
          </>
        )}
        
        {status === "pending" && isReceiver && (
          <>
            <motion.button 
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={acceptTrade}
              style={{ padding: "12px 40px", background: "#4CAF50", border: "none", color: "#fff", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
            >
              Accept
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={rejectTrade}
              style={{ padding: "12px 40px", background: "#f44336", border: "none", color: "#fff", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
            >
              Reject
            </motion.button>
          </>
        )}

        {status === "pending" && isInitiator && (
          <div style={{ textAlign: "center" }}>
            <p style={{ marginBottom: "16px", color: "#FF9800" }}>Waiting for {toPlayer.name}'s response...</p>
            <motion.button 
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={cancelTrade}
              style={{ padding: "8px 24px", background: "#666", border: "none", color: "#fff", borderRadius: "8px", cursor: "pointer" }}
            >
              Retract Offer
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
  );
};
