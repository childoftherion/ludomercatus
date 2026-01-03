import React, { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "../store/gameStore";
import type { Player, Property } from "../types/game";

interface Props {
  player: Player;
  debtAmount: number;
  creditor?: Player;
  chapter11Turns: number;
}

export const BankruptcyModal: React.FC<Props> = ({
  player,
  debtAmount,
  creditor,
  chapter11Turns,
}) => {
  const spaces = useGameStore((s) => s.spaces);
  const enterChapter11 = useGameStore((s) => s.enterChapter11);
  const declineRestructuring = useGameStore((s) => s.declineRestructuring);
  
  // Calculate player's assets
  const playerProperties = spaces.filter(
    (s): s is Property => 
      (s.type === "property" || s.type === "railroad" || s.type === "utility") &&
      (s as Property).owner === player.id
  );
  
  const totalAssetValue = playerProperties.reduce((sum, prop) => {
    if (prop.mortgaged) return sum + prop.mortgageValue;
    return sum + prop.price + (prop.houses * (prop.buildingCost ?? 0));
  }, 0);

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
          width: "360px", // Scaled down for 100% zoom (was 480px)
          maxWidth: "320px", // Match modal area width
          maxHeight: "calc(100vh - 24px)", // Full height minus margins
          overflowX: "hidden", // Prevent horizontal scrollbars
          overflowY: "auto",
          backgroundColor: "rgba(15, 15, 20, 0.98)",
          border: "2px solid #ef4444",
          boxShadow: "0 0 60px rgba(239, 68, 68, 0.4)",
          borderRadius: "16px",
          zIndex: 300,
        }}
      >
        <div style={{ padding: "20px" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "16px" }}>
        <div style={{ 
          fontSize: "36px", 
          marginBottom: "6px"
        }}>
          ⚠️
        </div>
        <h2 style={{ 
          fontSize: "22px", 
          color: "#ef4444",
          margin: 0,
          textTransform: "uppercase",
          letterSpacing: "1px"
        }}>
          Bankruptcy Warning
        </h2>
        <div style={{ 
          fontSize: "12px", 
          color: "#888",
          marginTop: "6px"
        }}>
          {player.name} cannot pay their debts
        </div>
      </div>
      
      {/* Debt Summary */}
      <div style={{
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        padding: "20px",
        borderRadius: "12px",
        marginBottom: "24px",
        border: "1px solid rgba(239, 68, 68, 0.3)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
          <span style={{ color: "#aaa", fontSize: "14px" }}>Debt Owed:</span>
          <span style={{ color: "#ef4444", fontWeight: "bold", fontSize: "18px" }}>£{debtAmount}</span>
        </div>
        {creditor && (
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ color: "#aaa", fontSize: "14px" }}>Creditor:</span>
            <span style={{ color: "#fff", fontWeight: "bold" }}>{creditor.name}</span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
          <span style={{ color: "#aaa", fontSize: "14px" }}>Current Cash:</span>
          <span style={{ color: "#fbbf24", fontWeight: "bold" }}>£{player.cash}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#aaa", fontSize: "14px" }}>Total Asset Value:</span>
          <span style={{ color: "#22c55e", fontWeight: "bold" }}>£{totalAssetValue}</span>
        </div>
      </div>
      
      {/* Options */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Chapter 11 Option */}
        <div style={{
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          padding: "20px",
          borderRadius: "12px",
          border: "1px solid rgba(59, 130, 246, 0.3)"
        }}>
          <h3 style={{ 
            color: "#3b82f6", 
            margin: "0 0 12px 0",
            fontSize: "16px",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            📋 Chapter 11 Restructuring
          </h3>
          <ul style={{ 
            margin: "0 0 16px 0", 
            paddingLeft: "20px",
            color: "#aaa",
            fontSize: "13px",
            lineHeight: "1.8"
          }}>
            <li>You have <strong style={{ color: "#3b82f6" }}>{chapter11Turns} turns</strong> to raise £{debtAmount}</li>
            <li>Keep your properties and continue playing</li>
            <li>Collect rent normally to rebuild your finances</li>
            <li>If you fail to pay off debt, you will be liquidated</li>
          </ul>
          <button
            onClick={() => enterChapter11()}
            style={{
              width: "100%",
              padding: "14px",
              backgroundColor: "#3b82f6",
              border: "none",
              borderRadius: "8px",
              color: "#fff",
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "15px",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#2563eb";
              e.currentTarget.style.transform = "scale(1.02)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#3b82f6";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            Enter Chapter 11 Restructuring
          </button>
        </div>
        
        {/* Full Bankruptcy Option */}
        <div style={{
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          padding: "20px",
          borderRadius: "12px",
          border: "1px solid rgba(239, 68, 68, 0.3)"
        }}>
          <h3 style={{ 
            color: "#ef4444", 
            margin: "0 0 12px 0",
            fontSize: "16px",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            💀 Declare Full Bankruptcy
          </h3>
          <ul style={{ 
            margin: "0 0 16px 0", 
            paddingLeft: "20px",
            color: "#aaa",
            fontSize: "13px",
            lineHeight: "1.8"
          }}>
            <li>All your properties go to {creditor?.name ?? "the bank"}</li>
            <li>You are eliminated from the game</li>
            <li>This action cannot be undone</li>
          </ul>
          <button
            onClick={() => {
              console.log("[BankruptcyModal] Declaring bankruptcy via declineRestructuring");
              declineRestructuring();
            }}
            style={{
              width: "100%",
              padding: "14px",
              backgroundColor: "rgba(239, 68, 68, 0.2)",
              border: "1px solid #ef4444",
              borderRadius: "8px",
              color: "#ef4444",
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "15px",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.2)";
            }}
          >
            Declare Bankruptcy
          </button>
        </div>
      </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

