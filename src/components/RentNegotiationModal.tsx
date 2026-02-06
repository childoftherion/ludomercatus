import React, { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "../store/gameStore";
import { getCurrentPropertyPrice } from "../logic/rules/economics";
import type { Property, Player } from "../types/game";

export const RentNegotiationModal: React.FC = () => {
  const gameState = useGameStore(s => s);
  const pendingRentNegotiation = useGameStore(s => s.pendingRentNegotiation);
  const players = useGameStore(s => s.players);
  const spaces = useGameStore(s => s.spaces);
  const clientId = useGameStore(s => s.clientId);
  const settings = useGameStore((s) => s.settings);
  
  const myPlayerIndex = React.useMemo(() => {
    return players.findIndex(p => p.clientId === clientId);
  }, [players, clientId]);

  const [partialPayment, setPartialPayment] = React.useState(0);
  const [selectedPropertyId, setSelectedPropertyId] = React.useState<number | undefined>(undefined);
  const [showPropertyTransfer, setShowPropertyTransfer] = React.useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  // Sync partialPayment when negotiation changes
  React.useEffect(() => {
    if (pendingRentNegotiation) {
      setPartialPayment(pendingRentNegotiation.debtorCanAfford);
    }
  }, [pendingRentNegotiation]);

  useEffect(() => {
    const updatePosition = () => {
      if (modalRef.current) {
        requestAnimationFrame(() => {
          if (modalRef.current) {
            const rect = modalRef.current.getBoundingClientRect();
            const isMobile = window.innerWidth < 768;
            
            if (isMobile) {
              const modalX = (window.innerWidth - rect.width) / 2;
              const modalY = (window.innerHeight - rect.height) / 2;
              setPosition({ x: Math.max(8, modalX), y: Math.max(8, modalY) });
            } else {
              const modalAreaWidth = 320;
              const modalAreaTop = 12;
              const rightMargin = 12;
              const modalX = window.innerWidth - modalAreaWidth - rightMargin;
              const modalY = modalAreaTop;
              const maxY = window.innerHeight - rect.height - 20;
              const adjustedY = Math.min(modalY, maxY);
              setPosition({ x: modalX, y: adjustedY });
            }
          }
        });
      }
    };

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

  if (!pendingRentNegotiation) return null;

  const { debtorIndex, creditorIndex, propertyId, rentAmount, debtorCanAfford, status, proposedIOU } = pendingRentNegotiation;
  const debtor = players[debtorIndex];
  const creditor = players[creditorIndex];
  const property = spaces.find(s => s.id === propertyId) as Property;

  if (!debtor || !creditor || !property) return null;

  const isCreditor = myPlayerIndex === creditorIndex;
  const isDebtor = myPlayerIndex === debtorIndex;
  
  const iouInterestRate = settings?.iouInterestRate ?? 0.05;
  const interestPercent = (iouInterestRate * 100).toFixed(0);

  const debtorProperties = spaces.filter(
    (s) => s.type === "property" || s.type === "railroad" || s.type === "utility"
  ).filter((s) => (s as Property).owner === debtor.id) as Property[];
  
  const remainingDebt = Math.round(rentAmount - partialPayment);
  
  const handleForgive = () => {
    useGameStore.getState().forgiveRent();
  };
  
  const handleOfferPaymentPlan = () => {
    // Round partial payment to ensure integer currency
    useGameStore.getState().offerPaymentPlan(Math.floor(partialPayment), iouInterestRate);
  };

  const handleAcceptPaymentPlan = () => {
    useGameStore.getState().acceptPaymentPlan();
  };

  const handleRejectPaymentPlan = () => {
    useGameStore.getState().rejectPaymentPlan();
  };
   
  const handleDemandProperty = () => {
    useGameStore.getState().demandImmediatePaymentOrProperty(selectedPropertyId);
  };
   
  const handleForceBankruptcy = () => {
    useGameStore.getState().demandImmediatePaymentOrProperty(undefined);
  };

  return (
    <AnimatePresence>
      <motion.div
        ref={modalRef}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        style={{
          position: "fixed",
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: window.innerWidth < 768 ? "calc(100% - 16px)" : "320px",
          maxWidth: "440px",
          maxHeight: "calc(100vh - 24px)",
          overflowX: "hidden",
          overflowY: "auto",
          backgroundColor: "rgba(15, 15, 20, 0.98)",
          border: "2px solid #ef4444",
          boxShadow: "0 0 40px rgba(239, 68, 68, 0.3)",
          borderRadius: "16px",
          zIndex: 500,
        }}
      >
        <div style={{ padding: "20px" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "16px" }}>
        <div style={{ 
          fontSize: "12px", 
          color: "#ef4444", 
          textTransform: "uppercase",
          letterSpacing: "1px",
          marginBottom: "6px"
        }}>
          💰 Rent Negotiation
        </div>
        <h2 style={{ 
          fontSize: "20px", 
          color: "#fff",
          margin: 0,
        }}>
          {status === "creditor_decision" 
            ? `${creditor.name}'s Turn to Decide` 
            : `${debtor.name}'s Turn to Respond`}
        </h2>
      </div>
      
      {/* Debt Summary */}
      <div style={{
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        padding: "16px",
        borderRadius: "8px",
        marginBottom: "20px",
        border: "1px solid rgba(239, 68, 68, 0.3)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <span style={{ color: "#aaa" }}>Property:</span>
          <span style={{ color: "#fff", fontWeight: "bold" }}>{property.name}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <span style={{ color: "#aaa" }}>Rent Owed:</span>
          <span style={{ color: "#ef4444", fontWeight: "bold" }}>£{rentAmount}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <span style={{ color: "#aaa" }}>{debtor.name}'s Cash:</span>
          <span style={{ color: "#fbbf24", fontWeight: "bold" }}>£{debtorCanAfford}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#aaa" }}>Shortfall:</span>
          <span style={{ color: "#ef4444", fontWeight: "bold" }}>£{rentAmount - debtorCanAfford}</span>
        </div>
      </div>
      
      {/* Creditor Section */}
      {status === "creditor_decision" && (
        <div style={{ 
          backgroundColor: "rgba(34, 197, 94, 0.1)", 
          padding: "16px", 
          borderRadius: "8px",
          marginBottom: "20px",
          border: "1px solid rgba(34, 197, 94, 0.3)"
        }}>
          <h3 style={{ 
            color: "#22c55e", 
            margin: "0 0 12px 0",
            fontSize: "14px",
            textTransform: "uppercase",
            letterSpacing: "1px"
          }}>
            {creditor.name}'s Decision
          </h3>
          
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
            <button
              onClick={handleForgive}
              disabled={!isCreditor}
              style={{
                flex: 1,
                padding: "10px 16px",
                backgroundColor: "rgba(34, 197, 94, 0.2)",
                border: "1px solid #22c55e",
                borderRadius: "8px",
                color: "#22c55e",
                cursor: isCreditor ? "pointer" : "not-allowed",
                fontSize: "13px",
                transition: "all 0.2s",
                opacity: isCreditor ? 1 : 0.5,
              }}
            >
              🤝 Forgive Rent
            </button>
            
            <button
              onClick={() => setShowPropertyTransfer(!showPropertyTransfer)}
              disabled={!isCreditor}
              style={{
                flex: 1,
                padding: "10px 16px",
                backgroundColor: showPropertyTransfer ? "rgba(251, 191, 36, 0.3)" : "rgba(251, 191, 36, 0.2)",
                border: "1px solid #fbbf24",
                borderRadius: "8px",
                color: "#fbbf24",
                cursor: isCreditor ? "pointer" : "not-allowed",
                fontSize: "13px",
                transition: "all 0.2s",
                opacity: isCreditor ? 1 : 0.5,
              }}
            >
              🏠 Demand Property
            </button>
            
            <button
              onClick={handleForceBankruptcy}
              disabled={!isCreditor}
              style={{
                flex: 1,
                padding: "10px 16px",
                backgroundColor: "rgba(239, 68, 68, 0.2)",
                border: "1px solid #ef4444",
                borderRadius: "8px",
                color: "#ef4444",
                cursor: isCreditor ? "pointer" : "not-allowed",
                fontSize: "13px",
                transition: "all 0.2s",
                opacity: isCreditor ? 1 : 0.5,
              }}
            >
              ⚠️ Force Bankruptcy
            </button>
          </div>
          
          {/* Property Transfer Selection */}
          {showPropertyTransfer && (
            <div style={{ marginBottom: "16px" }}>
              {debtorProperties.length > 0 ? (
                <>
                  <label style={{ color: "#aaa", fontSize: "12px", display: "block", marginBottom: "8px" }}>
                    Select property to seize:
                  </label>
                  <select
                    value={selectedPropertyId ?? ""}
                    onChange={(e) => setSelectedPropertyId(e.target.value ? Number(e.target.value) : undefined)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      backgroundColor: "rgba(0, 0, 0, 0.5)",
                      border: "1px solid #555",
                      borderRadius: "6px",
                      color: "#fff",
                      fontSize: "14px",
                      marginBottom: "10px",
                    }}
                  >
                    <option value="">-- Select Property --</option>
                    {debtorProperties.map((prop) => (
                      <option key={prop.id} value={prop.id}>
                        {prop.name} (Value: £{prop.mortgaged ? prop.mortgageValue : getCurrentPropertyPrice(gameState, prop)})
                      </option>
                    ))}
                  </select>
                  {selectedPropertyId !== undefined && (
                    <button
                      onClick={handleDemandProperty}
                      style={{
                        width: "100%",
                        padding: "10px",
                        backgroundColor: "#fbbf24",
                        border: "none",
                        borderRadius: "6px",
                        color: "#000",
                        fontWeight: "bold",
                        cursor: "pointer",
                      }}
                    >
                      Seize {debtorProperties.find(p => p.id === selectedPropertyId)?.name}
                    </button>
                  )}
                </>
              ) : (
                <div style={{ color: "#888", fontSize: "13px", fontStyle: "italic" }}>
                  {debtor.name} has no properties to seize.
                </div>
              )}
            </div>
          )}

          {/* IOU Section for Creditor */}
          <div style={{ 
            backgroundColor: "rgba(59, 130, 246, 0.1)", 
            padding: "16px", 
            borderRadius: "8px",
            border: "1px solid rgba(59, 130, 246, 0.3)"
          }}>
            <h4 style={{ color: "#3b82f6", margin: "0 0 12px 0", fontSize: "13px" }}>Offer Payment Plan</h4>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ color: "#aaa", fontSize: "12px", display: "block", marginBottom: "6px" }}>
                Down payment (£0 - £{debtorCanAfford}):
              </label>
              <input
                type="range"
                min={0}
                max={debtorCanAfford}
                value={partialPayment}
                disabled={!isCreditor}
                onChange={(e) => setPartialPayment(Number(e.target.value))}
                style={{ width: "100%", marginBottom: "4px" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                <span style={{ color: "#22c55e" }}>Cash: £{partialPayment}</span>
                <span style={{ color: "#ef4444" }}>Debt: £{remainingDebt}</span>
              </div>
            </div>
            <div style={{ 
              backgroundColor: "rgba(0, 0, 0, 0.3)", 
              padding: "10px", 
              borderRadius: "6px",
              marginBottom: "12px",
              fontSize: "12px",
              color: "#ccc"
            }}>
              <div>Interest: {interestPercent}% per turn</div>
              <div style={{ color: "#fbbf24" }}>Due next turn: £{Math.ceil(remainingDebt * (1 + iouInterestRate))}</div>
            </div>
            <button
              onClick={handleOfferPaymentPlan}
              disabled={!isCreditor}
              style={{
                width: "100%",
                padding: "12px",
                backgroundColor: "#3b82f6",
                border: "none",
                borderRadius: "8px",
                color: "#fff",
                fontWeight: "bold",
                cursor: isCreditor ? "pointer" : "not-allowed",
              }}
            >
              Offer Plan
            </button>
          </div>
        </div>
      )}
      
      {/* Debtor Section (Accept/Reject) */}
      {status === "debtor_decision" && proposedIOU && (
        <div style={{ 
          backgroundColor: "rgba(59, 130, 246, 0.1)", 
          padding: "16px", 
          borderRadius: "8px",
          border: "1px solid rgba(59, 130, 246, 0.3)"
        }}>
          <h3 style={{ 
            color: "#3b82f6", 
            margin: "0 0 12px 0",
            fontSize: "14px",
            textTransform: "uppercase",
            letterSpacing: "1px"
          }}>
            {debtor.name}'s Response
          </h3>
          
          <div style={{ 
            backgroundColor: "rgba(0, 0, 0, 0.3)", 
            padding: "12px", 
            borderRadius: "6px",
            marginBottom: "16px",
            fontSize: "13px",
            color: "#ccc",
            border: "1px solid rgba(59, 130, 246, 0.2)"
          }}>
            <div style={{ fontWeight: "bold", color: "#3b82f6", marginBottom: "8px" }}>PROPOSED TERMS</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <span>Down Payment:</span>
              <span style={{ color: "#22c55e" }}>£{proposedIOU.partialPayment}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <span>IOU Principal:</span>
              <span style={{ color: "#ef4444" }}>£{rentAmount - proposedIOU.partialPayment}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <span>Interest Rate:</span>
              <span>{(proposedIOU.interestRate * 100).toFixed(0)}% / turn</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #333", marginTop: "8px", paddingTop: "8px" }}>
              <span>Total due next turn:</span>
              <span style={{ color: "#fbbf24" }}>£{Math.ceil((rentAmount - proposedIOU.partialPayment) * (1 + proposedIOU.interestRate))}</span>
            </div>
          </div>
          
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={handleAcceptPaymentPlan}
              disabled={!isDebtor}
              style={{
                flex: 1,
                padding: "12px",
                backgroundColor: "#22c55e",
                border: "none",
                borderRadius: "8px",
                color: "#fff",
                fontWeight: "bold",
                cursor: isDebtor ? "pointer" : "not-allowed",
              }}
            >
              Accept
            </button>
            <button
              onClick={handleRejectPaymentPlan}
              disabled={!isDebtor}
              style={{
                flex: 1,
                padding: "12px",
                backgroundColor: "#ef4444",
                border: "none",
                borderRadius: "8px",
                color: "#fff",
                fontWeight: "bold",
                cursor: isDebtor ? "pointer" : "not-allowed",
              }}
            >
              Reject
            </button>
          </div>
        </div>
      )}

      {/* Waiting Message */}
      {((status === "creditor_decision" && !isCreditor) || (status === "debtor_decision" && !isDebtor)) && (
        <div style={{ 
          textAlign: "center", 
          marginTop: "12px", 
          color: "#888", 
          fontSize: "12px",
          fontStyle: "italic" 
        }}>
          Waiting for {status === "creditor_decision" ? creditor.name : debtor.name} to decide...
        </div>
      )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

