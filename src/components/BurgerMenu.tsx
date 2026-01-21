import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface BurgerMenuProps {
  isMuted: boolean;
  onToggleMute: () => void;
  onExit: () => void;
  isMobile?: boolean;
  showLog?: boolean;
  onToggleLog?: () => void;
}

export const BurgerMenu: React.FC<BurgerMenuProps> = ({ 
  isMuted, 
  onToggleMute, 
  onExit, 
  isMobile, 
  showLog, 
  onToggleLog 
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div
      style={{
        position: "fixed",
        top: "calc(8px + env(safe-area-inset-top))",
        right: "8px",
        zIndex: 10000,
      }}
    >
      {/* Burger Menu Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: "rgba(30, 30, 30, 0.95)",
          color: "white",
          border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: "6px",
          width: isMobile ? "40px" : "32px",
          height: isMobile ? "40px" : "32px",
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "4px",
          padding: "6px",
          transition: "all 0.2s ease",
        }}
        title="Menu"
      >
        <motion.span
          style={{
            width: isMobile ? "24px" : "18px",
            height: "2px",
            background: "white",
            borderRadius: "1px",
            display: "block",
          }}
          animate={{
            rotate: isOpen ? 45 : 0,
            y: isOpen ? (isMobile ? 8 : 6) : 0,
          }}
          transition={{ duration: 0.2 }}
        />
        <motion.span
          style={{
            width: isMobile ? "24px" : "18px",
            height: "2px",
            background: "white",
            borderRadius: "1px",
            display: "block",
          }}
          animate={{
            opacity: isOpen ? 0 : 1,
          }}
          transition={{ duration: 0.2 }}
        />
        <motion.span
          style={{
            width: isMobile ? "24px" : "18px",
            height: "2px",
            background: "white",
            borderRadius: "1px",
            display: "block",
          }}
          animate={{
            rotate: isOpen ? -45 : 0,
            y: isOpen ? (isMobile ? -8 : -6) : 0,
          }}
          transition={{ duration: 0.2 }}
        />
      </motion.button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "absolute",
              top: isMobile ? "48px" : "40px",
              right: 0,
              background: "rgba(30, 30, 30, 0.98)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "8px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
              minWidth: isMobile ? "200px" : "160px",
              overflow: "hidden",
              zIndex: 10001,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Game Log Toggle (Mobile Only) */}
            {isMobile && onToggleLog && (
              <motion.button
                whileHover={{ background: "rgba(255,255,255,0.1)" }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  onToggleLog();
                  setIsOpen(false);
                }}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: "transparent",
                  border: "none",
                  color: "white",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  fontSize: "14px",
                  textAlign: "left",
                  borderBottom: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <span style={{ fontSize: "18px" }}>📜</span>
                <span>{showLog ? "Hide Game Log" : "Show Game Log"}</span>
              </motion.button>
            )}

            {/* Mute/Unmute Option */}
            <motion.button
              whileHover={{ background: "rgba(255,255,255,0.1)" }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                onToggleMute();
              }}
              style={{
                width: "100%",
                padding: "12px 16px",
                background: "transparent",
                border: "none",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "14px",
                textAlign: "left",
                borderBottom: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <span style={{ fontSize: "18px" }}>{isMuted ? "🔇" : "🔊"}</span>
              <span>{isMuted ? "Unmute Sound" : "Mute Sound"}</span>
            </motion.button>

            {/* Exit Game Option */}
            <motion.button
              whileHover={{ background: "rgba(255, 71, 87, 0.2)" }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                onExit();
                setIsOpen(false);
              }}
              style={{
                width: "100%",
                padding: "12px 16px",
                background: "transparent",
                border: "none",
                color: "#FF4757",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "14px",
                textAlign: "left",
                fontWeight: "500",
              }}
            >
              <span style={{ fontSize: "18px" }}>✕</span>
              <span>Exit Game</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop to close menu when clicking outside */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            background: "transparent",
          }}
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};
