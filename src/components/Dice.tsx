import React from "react";
import { motion } from "framer-motion";
import { useGameStore } from "../store/gameStore";

interface DiceProps {
  onRollComplete?: () => void;
  autoRoll?: boolean;
}

export const Dice: React.FC<DiceProps> = ({ onRollComplete, autoRoll = true }) => {
  const [rolling, setRolling] = React.useState(false);
  const [displayDie1, setDisplayDie1] = React.useState(1);
  const [displayDie2, setDisplayDie2] = React.useState(1);
  const [finalRoll, setFinalRoll] = React.useState<{ die1: number; die2: number; total: number; isDoubles: boolean } | null>(null);

  // Auto-roll on mount if autoRoll is true
  React.useEffect(() => {
    if (autoRoll && !rolling && !finalRoll) {
      startRoll();
    }
  }, []);

  // Animate through random values during roll
  React.useEffect(() => {
    if (rolling) {
      const interval = setInterval(() => {
        setDisplayDie1(Math.floor(Math.random() * 6) + 1);
        setDisplayDie2(Math.floor(Math.random() * 6) + 1);
      }, 80);
      
      return () => clearInterval(interval);
    }
  }, [rolling]);

  const startRoll = () => {
    setRolling(true);
    setFinalRoll(null);
    
    // Roll after animation
    setTimeout(() => {
      const roll = useGameStore.getState().rollDice();
      setDisplayDie1(roll.die1);
      setDisplayDie2(roll.die2);
      setFinalRoll(roll);
      setRolling(false);
      
      // Small delay before completing
      setTimeout(() => {
        onRollComplete?.();
      }, 500);
    }, 800);
  };

  const dieFaces: Record<number, string> = {
    1: "⚀",
    2: "⚁",
    3: "⚂",
    4: "⚃",
    5: "⚄",
    6: "⚅",
  };

  const renderDie = (value: number, index: number) => (
    <motion.div
      key={index}
      animate={{
        rotateX: rolling ? [0, 360, 720, 1080] : 0,
        rotateY: rolling ? [0, 180, 360, 540] : 0,
        scale: rolling ? [1, 1.1, 1, 1.1, 1] : 1,
      }}
      transition={{
        duration: 0.8,
        ease: "easeOut",
      }}
      style={{
        width: "70px",
        height: "70px",
        backgroundColor: "#fff",
        border: "3px solid #333",
        borderRadius: "12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "52px",
        boxShadow: rolling 
          ? "0 8px 20px rgba(0,0,0,0.4)" 
          : "0 4px 12px rgba(0,0,0,0.2)",
        transformStyle: "preserve-3d",
      }}
    >
      {dieFaces[value] || value}
    </motion.div>
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "16px",
      }}
    >
      <div style={{ display: "flex", gap: "16px" }}>
        {renderDie(displayDie1, 0)}
        {renderDie(displayDie2, 1)}
      </div>
      
      {finalRoll && !rolling && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            fontSize: "20px",
            fontWeight: "bold",
            color: finalRoll.isDoubles ? "#4CAF50" : "#fff",
            marginTop: "8px",
          }}
        >
          {finalRoll.isDoubles 
            ? `Doubles! ${finalRoll.total}` 
            : `Rolled: ${finalRoll.die1} + ${finalRoll.die2} = ${finalRoll.total}`}
        </motion.div>
      )}
      
      {rolling && (
        <div style={{ color: "#ccc", fontSize: "14px" }}>
          Rolling...
        </div>
      )}
    </div>
  );
};

// Compact dice display for showing last roll
export const DiceDisplay: React.FC = () => {
  const diceRoll = useGameStore((s) => s.diceRoll);
  
  if (!diceRoll) return null;

  const dieFaces: Record<number, string> = {
    1: "⚀", 2: "⚁", 3: "⚂", 4: "⚃", 5: "⚄", 6: "⚅",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        display: "flex",
        gap: "8px",
        alignItems: "center",
        justifyContent: "center",
        padding: "8px 16px",
        backgroundColor: "rgba(0,0,0,0.3)",
        borderRadius: "8px",
      }}
    >
      <span style={{ fontSize: "32px" }}>{dieFaces[diceRoll.die1]}</span>
      <span style={{ fontSize: "32px" }}>{dieFaces[diceRoll.die2]}</span>
      <span style={{ 
        fontSize: "16px", 
        fontWeight: "bold",
        color: diceRoll.isDoubles ? "#4CAF50" : "#fff",
        marginLeft: "8px",
      }}>
        = {diceRoll.total}
        {diceRoll.isDoubles && " (Doubles!)"}
      </span>
    </motion.div>
  );
};
