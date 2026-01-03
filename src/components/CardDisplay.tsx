import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Card } from "../types/game";

interface CardDisplayProps {
  card: Card | null;
  onClose?: () => void;
}

export const CardDisplay: React.FC<CardDisplayProps> = ({ card, onClose }) => {
  if (!card) return null;

  const isChance = card.type === "chance";
  const cardColor = isChance ? "#FF8C00" : "#4169E1";
  const cardIcon = isChance ? "❓" : "📦";
  const cardTitle = isChance ? "CHANCE" : "COMMUNITY CHEST";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.3, rotateY: -180 }}
        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
        exit={{ opacity: 0, scale: 0.3, rotateY: 180 }}
        transition={{ type: "spring", stiffness: 200, damping: 20, duration: 0.6 }}
        style={{
          position: "fixed",
          top: "20%",
          left: "30%",
          transform: "translate(-50%, -50%)",
          width: "280px",
          maxWidth: "90vw",
          aspectRatio: "5/7",
          backgroundColor: cardColor,
          borderRadius: "12px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 4px rgba(255,255,255,0.2)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px",
          color: "#fff",
          border: "3px solid rgba(255,255,255,0.3)",
          zIndex: 10000,
          cursor: onClose ? "pointer" : "default",
          pointerEvents: "auto",
          // Ensure card is always on top
          isolation: "isolate",
        }}
        onClick={onClose}
        whileHover={onClose ? { scale: 1.05 } : {}}
      >
        {/* Card Header */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
        }}>
          <div style={{
            fontSize: "48px",
            marginBottom: "8px",
            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
          }}>
            {cardIcon}
          </div>
          <h3 style={{
            margin: 0,
            fontSize: "18px",
            fontWeight: "900",
            letterSpacing: "2px",
            textShadow: "0 2px 4px rgba(0,0,0,0.3)",
            textAlign: "center",
          }}>
            {cardTitle}
          </h3>
        </div>

        {/* Card Content */}
        <div style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          padding: "16px 0",
        }}>
          <p style={{
            margin: 0,
            fontSize: "16px",
            fontWeight: "600",
            textAlign: "center",
            lineHeight: 1.4,
            textShadow: "0 1px 2px rgba(0,0,0,0.2)",
          }}>
            {card.text}
          </p>
        </div>

        {/* Card Footer */}
        <div style={{
          fontSize: "12px",
          opacity: 0.9,
          textAlign: "center",
        }}>
          {onClose && "Click to close"}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

