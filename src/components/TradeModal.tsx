import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "../store/gameStore";
import { useLocalStore } from "../store/localStore";
import type { TradeState, Player, Space, Property, TradeOffer } from "../types/game";

interface Props {
  trade: TradeState;
  players: Player[];
  spaces: Space[];
}

export const TradeModal: React.FC<Props> = ({ trade, players, spaces }) => {
  const { myPlayerIndex } = useLocalStore();
  
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
  const { 
    updateTradeOffer, 
    proposeTrade, 
    acceptTrade, 
    rejectTrade, 
    cancelTrade,
    counterOffer,
    acceptCounterOffer,
    getPlayerProperties
  } = useGameStore();
  
  const { offer, status, counterOffer: counterOfferData, counterOfferMadeBy } = trade;
  const fromPlayer = players[offer.fromPlayer]!;
  const toPlayer = players[offer.toPlayer]!;
  
  // Who is viewing the modal?
  const isInitiator = myPlayerIndex === offer.fromPlayer;
  const isReceiver = myPlayerIndex === offer.toPlayer;
  
  // Check if counter-offer has been made
  const hasCounterOffer = status === "counter_pending" && counterOfferData !== undefined;
  const canMakeCounterOffer = status === "pending" && isReceiver && counterOfferMadeBy !== myPlayerIndex;
  
  const fromPlayerOwnedProps = getPlayerProperties(offer.fromPlayer).filter(p => p.houses === 0 && !p.hotel);
  const toPlayerOwnedProps = getPlayerProperties(offer.toPlayer).filter(p => p.houses === 0 && !p.hotel);
  
  // State for counter-offer creation
  const [isCreatingCounterOffer, setIsCreatingCounterOffer] = React.useState(false);
  const [counterOfferDraft, setCounterOfferDraft] = React.useState<TradeOffer | null>(null);

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

  const handleStartCounterOffer = () => {
    // Initialize counter-offer draft with reversed roles
    const newCounterOffer: TradeOffer = {
      fromPlayer: offer.toPlayer, // Receiver becomes initiator
      toPlayer: offer.fromPlayer, // Original initiator becomes receiver
      cashOffered: 0,
      propertiesOffered: [],
      jailCardsOffered: 0,
      cashRequested: 0,
      propertiesRequested: [],
      jailCardsRequested: 0,
    };
    setCounterOfferDraft(newCounterOffer);
    setIsCreatingCounterOffer(true);
  };

  const handleCancelCounterOffer = () => {
    setIsCreatingCounterOffer(false);
    setCounterOfferDraft(null);
  };

  const handleProposeCounterOffer = () => {
    if (!counterOfferDraft) return;
    
    // Safety check for gifting
    const isGift = 
      counterOfferDraft.cashRequested === 0 && 
      counterOfferDraft.propertiesRequested.length === 0 && 
      counterOfferDraft.jailCardsRequested === 0;

    if (isGift) {
      if (!confirm("⚠️ You are offering a gift (receiving nothing in return).\n\nAre you sure you want to proceed?")) {
        return;
      }
    }
    
    counterOffer(counterOfferDraft);
    setIsCreatingCounterOffer(false);
    setCounterOfferDraft(null);
  };

  const handleCounterOfferCashChange = (amount: number, side: "from" | "to") => {
    if (!counterOfferDraft) return;
    const newCounterOffer = { ...counterOfferDraft };
    if (side === "from") {
      newCounterOffer.cashOffered = Math.max(0, Math.min(amount, toPlayer.cash));
    } else {
      newCounterOffer.cashRequested = Math.max(0, Math.min(amount, fromPlayer.cash));
    }
    setCounterOfferDraft(newCounterOffer);
  };

  const handleCounterOfferToggleProperty = (propId: number, side: "from" | "to") => {
    if (!counterOfferDraft) return;
    const newCounterOffer = { ...counterOfferDraft };
    if (side === "from") {
      newCounterOffer.propertiesOffered = counterOfferDraft.propertiesOffered.includes(propId)
        ? counterOfferDraft.propertiesOffered.filter(id => id !== propId)
        : [...counterOfferDraft.propertiesOffered, propId];
    } else {
      newCounterOffer.propertiesRequested = counterOfferDraft.propertiesRequested.includes(propId)
        ? counterOfferDraft.propertiesRequested.filter(id => id !== propId)
        : [...counterOfferDraft.propertiesRequested, propId];
    }
    setCounterOfferDraft(newCounterOffer);
  };

  return (
    <AnimatePresence>
      <motion.div
        ref={modalRef}
        data-trade-modal
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        style={{
          position: "fixed",
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: "440px", // Scaled down for 100% zoom (was 580px)
          maxWidth: "320px", // Match modal area width
          maxHeight: "calc(100vh - 24px)", // Full height minus margins
          overflowY: "auto",
          overflowX: "hidden", // Prevent horizontal scrollbars
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "rgba(10, 10, 20, 0.98)",
          borderRadius: "16px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
          border: "1px solid rgba(255,255,255,0.1)",
          zIndex: 300,
        }}
      >
      <div style={{ padding: "12px", display: "flex", flexDirection: "column", flex: 1, overflowY: "auto" }}>
      <h2 style={{ margin: "0 0 8px 0", textAlign: "center", fontSize: "18px", color: "#4ECDC4" }}>
        {status === "draft" ? "Configure Trade" : 
         hasCounterOffer ? "Counter-Offer Proposal" : 
         "Trade Proposal"}
      </h2>
      
      {hasCounterOffer && (
        <div style={{ 
          padding: "8px", 
          background: "rgba(255, 193, 7, 0.2)", 
          borderRadius: "6px", 
          marginBottom: "8px",
          border: "1px solid rgba(255, 193, 7, 0.5)",
          textAlign: "center",
          fontSize: "12px"
        }}>
          {toPlayer.name} has made a counter-offer. Review and respond.
        </div>
      )}
      
      <div style={{ display: "flex", gap: "12px", flex: 1, overflowY: "auto", marginBottom: "8px", padding: "2px" }}>
        {/* LEFT SIDE - FROM PLAYER */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ padding: "8px", borderRadius: "8px", background: fromPlayer.color + "22", borderLeft: `3px solid ${fromPlayer.color}` }}>
            <div style={{ fontWeight: "bold", fontSize: "13px" }}>{fromPlayer.name} Offers:</div>
            <div style={{ fontSize: "11px", opacity: 0.7 }}>Cash: £{fromPlayer.cash.toLocaleString()}</div>
          </div>

          {status === "draft" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div>
                <label style={{ fontSize: "11px", display: "block", marginBottom: "2px" }}>Cash to Offer:</label>
                <input 
                  type="number" 
                  value={offer.cashOffered}
                  onChange={(e) => handleCashChange(parseInt(e.target.value) || 0, "from")}
                  style={{ width: "100%", padding: "6px", background: "#222", border: "1px solid #444", color: "#fff", borderRadius: "4px", fontSize: "12px" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "11px", display: "block", marginBottom: "2px" }}>Properties to Offer:</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px", maxHeight: "120px", overflowY: "auto", padding: "4px", background: "#111", borderRadius: "4px" }}>
                  {fromPlayerOwnedProps.map((prop: Property) => (
                    <div 
                      key={prop.id}
                      onClick={() => handleToggleProperty(prop.id, "from")}
                      style={{ 
                        padding: "4px 8px", 
                        fontSize: "11px", 
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
        <div style={{ display: "flex", alignItems: "center", fontSize: "28px", color: "#444" }}>⇄</div>

        {/* RIGHT SIDE - TO PLAYER */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ padding: "8px", borderRadius: "8px", background: toPlayer.color + "22", borderRight: `3px solid ${toPlayer.color}`, textAlign: "right" }}>
            <div style={{ fontWeight: "bold", fontSize: "13px" }}>{toPlayer.name} Gives:</div>
            <div style={{ fontSize: "11px", opacity: 0.7 }}>Cash: £{toPlayer.cash.toLocaleString()}</div>
          </div>

          {status === "draft" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div>
                <label style={{ fontSize: "11px", display: "block", marginBottom: "2px" }}>Cash to Request:</label>
                <input 
                  type="number" 
                  value={offer.cashRequested}
                  onChange={(e) => handleCashChange(parseInt(e.target.value) || 0, "to")}
                  style={{ width: "100%", padding: "6px", background: "#222", border: "1px solid #444", color: "#fff", borderRadius: "4px", fontSize: "12px" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "11px", display: "block", marginBottom: "2px" }}>Properties to Request:</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px", maxHeight: "120px", overflowY: "auto", padding: "4px", background: "#111", borderRadius: "4px" }}>
                  {toPlayerOwnedProps.map((prop: Property) => (
                    <div 
                      key={prop.id}
                      onClick={() => handleToggleProperty(prop.id, "to")}
                      style={{ 
                        padding: "4px 8px", 
                        fontSize: "11px", 
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
            <div style={{ padding: "10px", background: "rgba(255,255,255,0.05)", borderRadius: "6px", fontSize: "12px" }}>
              {offer.cashRequested > 0 && <p style={{ margin: "2px 0", fontSize: "12px" }}>£{offer.cashRequested.toLocaleString()}</p>}
              {offer.propertiesRequested.map(id => <p key={id} style={{ margin: "2px 0", fontSize: "12px" }}>• {getPropertyName(id)}</p>)}
              {offer.cashRequested === 0 && offer.propertiesRequested.length === 0 && <p style={{ fontStyle: "italic", opacity: 0.5, fontSize: "12px", margin: "2px 0" }}>Nothing</p>}
            </div>
          )}
        </div>
      </div>

      {/* FOOTER ACTIONS */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "8px", display: "flex", justifyContent: "center", gap: "8px", flexWrap: "wrap" }}>
        {status === "draft" && (
          <>
            <motion.button 
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={handlePropose}
              style={{ padding: "8px 20px", background: "#4CAF50", border: "none", color: "#fff", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "13px" }}
            >
              Propose Trade
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={cancelTrade}
              style={{ padding: "8px 20px", background: "#666", border: "none", color: "#fff", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}
            >
              Cancel
            </motion.button>
          </>
        )}
        
        {status === "pending" && isReceiver && !isCreatingCounterOffer && (
          <>
            <motion.button 
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={acceptTrade}
              style={{ padding: "8px 20px", background: "#4CAF50", border: "none", color: "#fff", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "13px" }}
            >
              Accept
            </motion.button>
            {canMakeCounterOffer && (
              <motion.button 
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={handleStartCounterOffer}
                style={{ padding: "8px 20px", background: "#FF9800", border: "none", color: "#fff", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "13px" }}
              >
                Counter-Offer
              </motion.button>
            )}
            <motion.button 
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={rejectTrade}
              style={{ padding: "8px 20px", background: "#f44336", border: "none", color: "#fff", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "13px" }}
            >
              Reject
            </motion.button>
          </>
        )}
        
        {/* Counter-offer creation UI */}
        {isCreatingCounterOffer && counterOfferDraft && (
          <div style={{ width: "100%" }}>
            <div style={{ marginBottom: "8px", padding: "8px", background: "rgba(255, 193, 7, 0.1)", borderRadius: "6px" }}>
              <h3 style={{ margin: "0 0 6px 0", fontSize: "13px", color: "#FFC107" }}>Create Counter-Offer</h3>
              <p style={{ margin: "0 0 6px 0", fontSize: "10px", opacity: 0.8 }}>
                You are now proposing a trade where {toPlayer.name} (you) offers something to {fromPlayer.name}
              </p>
              
              <div style={{ display: "flex", gap: "8px", marginBottom: "6px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "10px", display: "block", marginBottom: "2px" }}>You Offer (Cash):</label>
                  <input 
                    type="number" 
                    value={counterOfferDraft.cashOffered}
                    onChange={(e) => handleCounterOfferCashChange(parseInt(e.target.value) || 0, "from")}
                    style={{ width: "100%", padding: "4px", background: "#222", border: "1px solid #444", color: "#fff", borderRadius: "4px", fontSize: "11px" }}
                    max={toPlayer.cash}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "10px", display: "block", marginBottom: "2px" }}>You Request (Cash):</label>
                  <input 
                    type="number" 
                    value={counterOfferDraft.cashRequested}
                    onChange={(e) => handleCounterOfferCashChange(parseInt(e.target.value) || 0, "to")}
                    style={{ width: "100%", padding: "4px", background: "#222", border: "1px solid #444", color: "#fff", borderRadius: "4px", fontSize: "11px" }}
                    max={fromPlayer.cash}
                  />
                </div>
              </div>
              
              <div style={{ display: "flex", gap: "8px", marginBottom: "6px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "10px", display: "block", marginBottom: "2px" }}>You Offer (Properties):</label>
                  <div style={{ maxHeight: "80px", overflowY: "auto", padding: "4px", background: "#111", borderRadius: "4px" }}>
                    {toPlayerOwnedProps.map((prop: Property) => (
                      <div 
                        key={prop.id}
                        onClick={() => handleCounterOfferToggleProperty(prop.id, "from")}
                        style={{ 
                          padding: "3px 6px", 
                          fontSize: "10px", 
                          background: counterOfferDraft.propertiesOffered.includes(prop.id) ? "#2E8B57" : "#222",
                          borderRadius: "4px",
                          cursor: "pointer",
                          marginBottom: "4px"
                        }}
                      >
                        {prop.name} {counterOfferDraft.propertiesOffered.includes(prop.id) && "✓"}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "10px", display: "block", marginBottom: "2px" }}>You Request (Properties):</label>
                  <div style={{ maxHeight: "80px", overflowY: "auto", padding: "4px", background: "#111", borderRadius: "4px" }}>
                    {fromPlayerOwnedProps.map((prop: Property) => (
                      <div 
                        key={prop.id}
                        onClick={() => handleCounterOfferToggleProperty(prop.id, "to")}
                        style={{ 
                          padding: "3px 6px", 
                          fontSize: "10px", 
                          background: counterOfferDraft.propertiesRequested.includes(prop.id) ? "#2E8B57" : "#222",
                          borderRadius: "4px",
                          cursor: "pointer",
                          marginBottom: "4px"
                        }}
                      >
                        {prop.name} {counterOfferDraft.propertiesRequested.includes(prop.id) && "✓"}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
              <motion.button 
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={handleProposeCounterOffer}
                style={{ padding: "8px 20px", background: "#FF9800", border: "none", color: "#fff", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "13px" }}
              >
                Propose Counter-Offer
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={handleCancelCounterOffer}
                style={{ padding: "8px 20px", background: "#666", border: "none", color: "#fff", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}
              >
                Cancel
              </motion.button>
            </div>
          </div>
        )}
        
        {/* Counter-offer display and response */}
        {hasCounterOffer && counterOfferData && (
          <>
            {isInitiator ? (
              <>
                <div style={{ marginBottom: "8px", padding: "8px", background: "rgba(255, 193, 7, 0.1)", borderRadius: "6px" }}>
                  <h3 style={{ margin: "0 0 6px 0", fontSize: "12px", color: "#FFC107" }}>Counter-Offer Details:</h3>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "10px", marginBottom: "3px", fontWeight: "bold" }}>{toPlayer.name} Offers:</div>
                      {counterOfferData.cashOffered > 0 && <div style={{ fontSize: "11px" }}>£{counterOfferData.cashOffered.toLocaleString()}</div>}
                      {counterOfferData.propertiesOffered.map(id => (
                        <div key={id} style={{ fontSize: "11px" }}>• {getPropertyName(id)}</div>
                      ))}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "10px", marginBottom: "3px", fontWeight: "bold" }}>You Give:</div>
                      {counterOfferData.cashRequested > 0 && <div style={{ fontSize: "11px" }}>£{counterOfferData.cashRequested.toLocaleString()}</div>}
                      {counterOfferData.propertiesRequested.map(id => (
                        <div key={id} style={{ fontSize: "11px" }}>• {getPropertyName(id)}</div>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
                  <motion.button 
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={acceptCounterOffer}
                    style={{ padding: "8px 20px", background: "#4CAF50", border: "none", color: "#fff", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "13px" }}
                  >
                    Accept Counter-Offer
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={rejectTrade}
                    style={{ padding: "8px 20px", background: "#f44336", border: "none", color: "#fff", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "13px" }}
                  >
                    Reject Counter-Offer
                  </motion.button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "16px" }}>
                <p style={{ color: "#FF9800" }}>Waiting for {fromPlayer.name} to respond to your counter-offer...</p>
                <motion.button 
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={rejectTrade}
                  style={{ padding: "8px 24px", background: "#666", border: "none", color: "#fff", borderRadius: "8px", cursor: "pointer", marginTop: "12px" }}
                >
                  Cancel Counter-Offer
                </motion.button>
              </div>
            )}
          </>
        )}

        {status === "pending" && isInitiator && (
          <div style={{ textAlign: "center" }}>
            <p style={{ marginBottom: "8px", color: "#FF9800", fontSize: "12px" }}>Waiting for {toPlayer.name}'s response...</p>
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
      </div>
      </motion.div>
    </AnimatePresence>
  );
};
