import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "../store/gameStore";
import type { Property, Player } from "../types/game";

interface Props {
  debtor: Player;
  creditor: Player;
  property: Property;
  rentAmount: number;
  debtorCanAfford: number;
}

export const RentNegotiationModal: React.FC<Props> = ({
  debtor,
  creditor,
  property,
  rentAmount,
  debtorCanAfford,
}) => {
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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.3, rotateY: -180 }}
        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
        exit={{ opacity: 0, scale: 0.3, rotateY: 180 }}
        transition={{ type: "spring", stiffness: 200, damping: 20, duration: 0.6 }}
        style={{
          position: "fixed",
          top: "15%",
          left: "27.5%",
          transform: "translate(-50%, -50%)",
          width: "360px",
          maxWidth: "90vw",
          maxHeight: "80vh",
          overflowX: "hidden",
          overflowY: "auto",
          backgroundColor: "rgba(15, 15, 20, 0.98)",
          border: "2px solid #ef4444",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 4px rgba(255,255,255,0.2)",
          borderRadius: "16px",
          zIndex: 10000,
          pointerEvents: "auto",
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
            style={{
              padding: "10px 16px",
              backgroundColor: "rgba(34, 197, 94, 0.2)",
              border: "1px solid #22c55e",
              borderRadius: "8px",
              color: "#22c55e",
              cursor: "pointer",
              fontSize: "13px",
              transition: "all 0.2s",
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
            style={{
              padding: "10px 16px",
              backgroundColor: showPropertyTransfer ? "rgba(251, 191, 36, 0.3)" : "rgba(251, 191, 36, 0.2)",
              border: "1px solid #fbbf24",
              borderRadius: "8px",
              color: "#fbbf24",
              cursor: "pointer",
              fontSize: "13px",
              transition: "all 0.2s",
            }}
          >
            🏠 Demand Property
          </button>
          
          <button
            onClick={handleForceBankruptcy}
            style={{
              padding: "10px 16px",
              backgroundColor: "rgba(239, 68, 68, 0.2)",
              border: "1px solid #ef4444",
              borderRadius: "8px",
              color: "#ef4444",
              cursor: "pointer",
              fontSize: "13px",
              transition: "all 0.2s",
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
            onChange={(e) => setPartialPayment(Number(e.target.value))}
            style={{ width: "100%", marginBottom: "4px" }}
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
          style={{
            width: "100%",
            padding: "12px",
            backgroundColor: "#3b82f6",
            border: "none",
            borderRadius: "8px",
            color: "#fff",
            fontWeight: "bold",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          Create IOU for £{remainingDebt}
        </button>
      </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

