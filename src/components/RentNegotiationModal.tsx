import React, { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "../store/gameStore";
import type { Property, Player } from "../types/game";

interface Props {
  debtor: Player;
  creditor: Player;
  property: Property;
  rentAmount: number;
  debtorCanAfford: number;
  myPlayerIndex: number;
}

export const RentNegotiationModal: React.FC<Props> = ({
  debtor,
  creditor,
  property,
  rentAmount,
  debtorCanAfford,
  myPlayerIndex,
}) => {
  const isCreditor = myPlayerIndex === creditor.id;
  const isDebtor = myPlayerIndex === debtor.id;
  const [partialPayment, setPartialPayment] = React.useState(debtorCanAfford);
  const [selectedPropertyId, setSelectedPropertyId] = React.useState<number | undefined>(undefined);
  const [showPropertyTransfer, setShowPropertyTransfer] = React.useState(false);
  
  const spaces = useGameStore((s) => s.spaces);
  const debtorProperties = spaces.filter(
    (s) => s.type === "property" || s.type === "railroad" || s.type === "utility"
  ).filter((s) => (s as Property).owner === debtor.id) as Property[];
  
  const remainingDebt = rentAmount - partialPayment;
  
  const handleForgive = () => {
    useGameStore.getState().forgiveRent();
  };
  
  const handleCreateIOU = () => {
    useGameStore.getState().createRentIOU(partialPayment);
  };
  
  const handleDemandProperty = () => {
    useGameStore.getState().demandImmediatePaymentOrProperty(selectedPropertyId);
  };
  
  const handleForceBankruptcy = () => {
    useGameStore.getState().demandImmediatePaymentOrProperty(undefined);
  };

  // Use ref to measure actual modal size and center properly
  const modalRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const updatePosition = () => {
      if (modalRef.current) {
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
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        style={{
          position: "fixed",
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: "360px",
          maxWidth: "320px",
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
          {debtor.name} Cannot Afford Rent
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
          {creditor.name}'s Options (Creditor)
        </h3>
        
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={handleForgive}
            disabled={!isCreditor}
            style={{
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
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(34, 197, 94, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(34, 197, 94, 0.2)";
            }}
          >
            🤝 Forgive Rent
          </button>
          
          <button
            onClick={() => setShowPropertyTransfer(!showPropertyTransfer)}
            disabled={!isCreditor}
            style={{
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
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.2)";
            }}
          >
            ⚠️ Force Bankruptcy
          </button>
        </div>
        
        {/* Property Transfer Selection */}
        {showPropertyTransfer && debtorProperties.length > 0 && (
          <div style={{ marginTop: "16px" }}>
            <label style={{ color: "#aaa", fontSize: "12px", display: "block", marginBottom: "8px" }}>
              Select property to accept as payment:
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
                  {prop.name} (Value: £{prop.mortgaged ? prop.mortgageValue : prop.price})
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
                Accept {debtorProperties.find(p => p.id === selectedPropertyId)?.name} as Payment
              </button>
            )}
          </div>
        )}
        
        {showPropertyTransfer && debtorProperties.length === 0 && (
          <div style={{ marginTop: "12px", color: "#888", fontSize: "13px", fontStyle: "italic" }}>
            {debtor.name} has no properties to transfer.
          </div>
        )}
      </div>
      
      {/* IOU Section */}
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
          Create IOU (Payment Plan)
        </h3>
        
        <div style={{ marginBottom: "12px" }}>
          <label style={{ color: "#aaa", fontSize: "12px", display: "block", marginBottom: "6px" }}>
            Pay now (£0 - £{debtorCanAfford}):
          </label>
          <input
            type="range"
            min={0}
            max={debtorCanAfford}
            value={partialPayment}
            disabled={!isDebtor}
            onChange={(e) => setPartialPayment(Number(e.target.value))}
            style={{ 
              width: "100%", 
              marginBottom: "4px",
              cursor: isDebtor ? "pointer" : "not-allowed",
              opacity: isDebtor ? 1 : 0.5,
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
            <span style={{ color: "#22c55e" }}>Pay Now: £{partialPayment}</span>
            <span style={{ color: "#ef4444" }}>IOU: £{remainingDebt}</span>
          </div>
        </div>
        
        <div style={{ 
          backgroundColor: "rgba(0, 0, 0, 0.3)", 
          padding: "10px", 
          borderRadius: "6px",
          marginBottom: "12px",
          fontSize: "12px",
          color: "#888"
        }}>
          ⚠️ IOUs accrue 5% interest per turn. {debtor.name} will owe this to {creditor.name}.
        </div>
        
        <button
          onClick={handleCreateIOU}
          disabled={!isDebtor}
          style={{
            width: "100%",
            padding: "12px",
            backgroundColor: isDebtor ? "#3b82f6" : "#444",
            border: "none",
            borderRadius: "8px",
            color: isDebtor ? "#fff" : "#888",
            fontWeight: "bold",
            cursor: isDebtor ? "pointer" : "not-allowed",
            fontSize: "14px",
            opacity: isDebtor ? 1 : 0.5,
          }}
        >
          {isDebtor ? `Create IOU for £${remainingDebt}` : `Waiting for ${debtor.name}...`}
        </button>
      </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

