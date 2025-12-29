import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "../store/gameStore";

const TOKENS = ["🚗", "🚙", "🚕", "🏎", "🚁", "✈️", "⛵", "🎭"];
const AI_NAMES = ["Bot Alpha", "Bot Beta", "Bot Gamma", "Bot Delta", "Bot Epsilon", "Bot Zeta", "Bot Eta"];

type GameMode = "select" | "single" | "multiplayer";

const PlayerSetup = () => {
  const [gameMode, setGameMode] = React.useState<GameMode>("select");
  
  // Single player state
  const [playerName, setPlayerName] = React.useState("");
  const [playerToken, setPlayerToken] = React.useState("");
  const [aiCount, setAiCount] = React.useState(1);
  const [aiTokens, setAiTokens] = React.useState<string[]>([""]);

  // Multiplayer state
  const [humanCount, setHumanCount] = React.useState(2);
  const [humanNames, setHumanNames] = React.useState<string[]>(["Player 1", "Player 2"]);
  const [humanTokens, setHumanTokens] = React.useState<string[]>(["", ""]);
  
  // AI state for multiplayer
  const [mpAiCount, setMpAiCount] = React.useState(0);
  const [mpAiTokens, setMpAiTokens] = React.useState<string[]>([]);

  // Single Player Handlers
  const handleAiCountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const count = parseInt(e.target.value);
    setAiCount(count);
    setAiTokens(Array.from({ length: count }, () => ""));
  };

  const handleAiTokenSelect = (index: number, token: string) => {
    setAiTokens((prev) => {
      const updated = [...prev];
      updated[index] = token;
      return updated;
    });
  };

  // Multiplayer Handlers
  const handleHumanCountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const count = parseInt(e.target.value);
    setHumanCount(count);
    setHumanNames(prev => {
      const next = [...prev];
      while (next.length < count) next.push(`Player ${next.length + 1}`);
      return next.slice(0, count);
    });
    setHumanTokens(prev => {
      const next = [...prev];
      while (next.length < count) next.push("");
      return next.slice(0, count);
    });
  };

  const handleMpAiCountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const count = parseInt(e.target.value);
    setMpAiCount(count);
    setMpAiTokens(Array.from({ length: count }, () => ""));
  };

  const handleHumanNameChange = (index: number, name: string) => {
    setHumanNames(prev => {
      const next = [...prev];
      next[index] = name;
      return next;
    });
  };

  const handleHumanTokenSelect = (index: number, token: string) => {
    setHumanTokens(prev => {
      const next = [...prev];
      next[index] = token;
      return next;
    });
  };

  const handleMpAiTokenSelect = (index: number, token: string) => {
    setMpAiTokens(prev => {
      const next = [...prev];
      next[index] = token;
      return next;
    });
  };

  const getAvailableTokens = (excludeIndex?: number) => {
    const usedTokens = new Set<string>();
    if (playerToken) usedTokens.add(playerToken);
    aiTokens.forEach((t, i) => {
      if (t && i !== excludeIndex) usedTokens.add(t);
    });
    return TOKENS.filter((t) => !usedTokens.has(t));
  };

  const getMultiplayerAvailableTokens = (type: "human" | "ai", index: number) => {
    const used = new Set<string>();
    humanTokens.forEach((t, i) => { if (type === "human" && i === index) return; if (t) used.add(t); });
    mpAiTokens.forEach((t, i) => { if (type === "ai" && i === index) return; if (t) used.add(t); });
    return TOKENS.filter(t => !used.has(t));
  };

  const startSinglePlayerGame = () => {
    if (!playerToken) return;
    if (aiTokens.some((t) => !t)) return;

    const names = [playerName || "You", ...aiTokens.map((_, i) => AI_NAMES[i] ?? `Bot ${i + 1}`)];
    const tokens = [playerToken, ...aiTokens];
    const isAIFlags = [false, ...aiTokens.map(() => true)];

    useGameStore.getState().initGame(names, tokens, isAIFlags);
  };

  const startMultiplayerGame = () => {
    if (humanTokens.some(t => !t)) return;
    if (mpAiTokens.some(t => !t)) return;

    const names = [...humanNames, ...mpAiTokens.map((_, i) => AI_NAMES[i] ?? `Bot ${i + 1}`)];
    const tokens = [...humanTokens, ...mpAiTokens];
    const isAIFlags = [...humanTokens.map(() => false), ...mpAiTokens.map(() => true)];

    useGameStore.getState().initGame(names, tokens, isAIFlags);
  };

  // Game mode selection screen
  if (gameMode === "select") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          backgroundColor: "#1a1a2a",
          padding: "40px",
          gap: "24px",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            borderRadius: "16px",
            padding: "48px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
            textAlign: "center",
            maxWidth: "500px",
          }}
        >
          <h1
            style={{
              fontSize: "42px",
              color: "#2E8B57",
              marginBottom: "8px",
              fontWeight: 700,
            }}
          >
            Monopoly
          </h1>
          <p style={{ color: "#666", marginBottom: "32px", fontSize: "16px" }}>
            Choose your game mode
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <motion.button
              onClick={() => setGameMode("single")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                padding: "20px 40px",
                fontSize: "18px",
                fontWeight: 600,
                backgroundColor: "#2E8B57",
                color: "#fff",
                border: "none",
                borderRadius: "12px",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(46, 139, 87, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
              }}
            >
              <span style={{ fontSize: "24px" }}>🎮</span>
              Single Player
            </motion.button>

            <motion.button
              onClick={() => setGameMode("multiplayer")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                padding: "20px 40px",
                fontSize: "18px",
                fontWeight: 600,
                backgroundColor: "#4169E1",
                color: "#fff",
                border: "none",
                borderRadius: "12px",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(65, 105, 225, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
              }}
            >
              <span style={{ fontSize: "24px" }}>👥</span>
              Multiplayer
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Single player setup
  if (gameMode === "single") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          backgroundColor: "#1a1a2a",
          padding: "40px",
          gap: "24px",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            borderRadius: "16px",
            padding: "40px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
            textAlign: "center",
            maxWidth: "550px",
            width: "100%",
          }}
        >
          <button
            onClick={() => setGameMode("select")}
            style={{
              position: "absolute",
              top: "16px",
              left: "16px",
              background: "none",
              border: "none",
              fontSize: "24px",
              cursor: "pointer",
              padding: "8px",
            }}
          >
            ←
          </button>

          <h1
            style={{
              fontSize: "28px",
              color: "#2E8B57",
              marginBottom: "24px",
            }}
          >
            Single Player Setup
          </h1>

          {/* Your setup */}
          <div
            style={{
              marginBottom: "24px",
              padding: "20px",
              backgroundColor: "#e8f5e9",
              borderRadius: "12px",
              border: "2px solid #2E8B57",
            }}
          >
            <h3 style={{ marginBottom: "12px", color: "#2E8B57" }}>Your Player</h3>
            
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "4px",
                  fontWeight: "bold",
                  fontSize: "14px",
                  textAlign: "left",
                }}
              >
                Name (optional):
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="You"
                style={{
                  width: "100%",
                  padding: "10px",
                  fontSize: "14px",
                  borderRadius: "8px",
                  border: "1px solid #ccc",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "bold",
                  fontSize: "14px",
                  textAlign: "left",
                }}
              >
                Choose your token:
              </label>
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  flexWrap: "wrap",
                  justifyContent: "center",
                }}
              >
                {TOKENS.map((token) => {
                  const isUsedByAI = aiTokens.includes(token);
                  return (
                    <motion.button
                      key={token}
                      onClick={() => !isUsedByAI && setPlayerToken(token)}
                      whileHover={{ scale: isUsedByAI ? 1 : 1.1 }}
                      whileTap={{ scale: isUsedByAI ? 1 : 0.95 }}
                      style={{
                        fontSize: "28px",
                        padding: "10px",
                        borderRadius: "8px",
                        border: playerToken === token ? "3px solid #2E8B57" : "2px solid #ddd",
                        backgroundColor: playerToken === token ? "#c8e6c9" : isUsedByAI ? "#f5f5f5" : "#fff",
                        cursor: isUsedByAI ? "not-allowed" : "pointer",
                        opacity: isUsedByAI ? 0.4 : 1,
                      }}
                    >
                      {token}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* AI Opponents */}
          <div
            style={{
              marginBottom: "24px",
              padding: "20px",
              backgroundColor: "#fff3e0",
              borderRadius: "12px",
              border: "2px solid #FF9800",
            }}
          >
            <h3 style={{ marginBottom: "12px", color: "#E65100" }}>AI Opponents</h3>
            
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "4px",
                  fontWeight: "bold",
                  fontSize: "14px",
                }}
              >
                Number of AI players:
              </label>
              <select
                value={aiCount}
                onChange={handleAiCountChange}
                style={{
                  padding: "10px 16px",
                  fontSize: "16px",
                  borderRadius: "8px",
                  border: "2px solid #ddd",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              >
                {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                  <option key={num} value={num}>
                    {num} AI Opponent{num > 1 ? "s" : ""}
                  </option>
                ))}
              </select>
            </div>

            <AnimatePresence>
              {Array.from({ length: aiCount }).map((_, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{
                    marginBottom: "12px",
                    padding: "12px",
                    backgroundColor: "#fff",
                    borderRadius: "8px",
                    border: "1px solid #ddd",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <span style={{ fontWeight: "bold", fontSize: "14px", minWidth: "80px" }}>
                      {AI_NAMES[index] ?? `Bot ${index + 1}`}:
                    </span>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {TOKENS.map((token) => {
                        const isUsedByPlayer = playerToken === token;
                        const isUsedByOtherAI = aiTokens.some((t, i) => t === token && i !== index);
                        const isDisabled = isUsedByPlayer || isUsedByOtherAI;
                        return (
                          <motion.button
                            key={token}
                            onClick={() => !isDisabled && handleAiTokenSelect(index, token)}
                            whileHover={{ scale: isDisabled ? 1 : 1.1 }}
                            whileTap={{ scale: isDisabled ? 1 : 0.95 }}
                            style={{
                              fontSize: "20px",
                              padding: "6px",
                              borderRadius: "6px",
                              border: aiTokens[index] === token ? "2px solid #FF9800" : "1px solid #ddd",
                              backgroundColor: aiTokens[index] === token ? "#ffe0b2" : isDisabled ? "#f5f5f5" : "#fff",
                              cursor: isDisabled ? "not-allowed" : "pointer",
                              opacity: isDisabled ? 0.3 : 1,
                            }}
                          >
                            {token}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <motion.button
            onClick={startSinglePlayerGame}
            disabled={!playerToken || aiTokens.some((t) => !t)}
            whileHover={{ scale: playerToken && aiTokens.every((t) => t) ? 1.05 : 1 }}
            whileTap={{ scale: playerToken && aiTokens.every((t) => t) ? 0.95 : 1 }}
            style={{
              padding: "16px 48px",
              fontSize: "20px",
              fontWeight: "bold",
              backgroundColor: playerToken && aiTokens.every((t) => t) ? "#2E8B57" : "#ccc",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: playerToken && aiTokens.every((t) => t) ? "pointer" : "not-allowed",
              boxShadow: "0 4px 12px rgba(46, 139, 87, 0.4)",
            }}
          >
            Start Game
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // Multiplayer setup
  if (gameMode === "multiplayer") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          backgroundColor: "#1a1a2a",
          padding: "40px",
          gap: "24px",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            borderRadius: "16px",
            padding: "40px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
            textAlign: "center",
            maxWidth: "650px",
            width: "100%",
            maxHeight: "90vh",
            overflowY: "auto",
          }}
        >
          <button
            onClick={() => setGameMode("select")}
            style={{
              position: "absolute",
              top: "16px",
              left: "16px",
              background: "none",
              border: "none",
              fontSize: "24px",
              cursor: "pointer",
              padding: "8px",
            }}
          >
            ←
          </button>

          <h1
            style={{
              fontSize: "28px",
              color: "#4169E1",
              marginBottom: "24px",
            }}
          >
            Multiplayer Setup
          </h1>

          {/* Human Players */}
          <div
            style={{
              marginBottom: "24px",
              padding: "20px",
              backgroundColor: "#e8f0fe",
              borderRadius: "12px",
              border: "2px solid #4169E1",
            }}
          >
            <h3 style={{ marginBottom: "12px", color: "#4169E1" }}>Human Players</h3>
            
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>
                Number of Human Players:
              </label>
              <select
                value={humanCount}
                onChange={handleHumanCountChange}
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }}
              >
                {[2, 3, 4].map(num => (
                  <option key={num} value={num}>{num} Players</option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {Array.from({ length: humanCount }).map((_, index) => (
                <div key={index} style={{ padding: "12px", background: "#fff", borderRadius: "8px", border: "1px solid #ccc" }}>
                  <div style={{ marginBottom: "8px" }}>
                    <label style={{ fontSize: "12px", fontWeight: "bold" }}>Player {index + 1} Name:</label>
                    <input
                      type="text"
                      value={humanNames[index]}
                      onChange={(e) => handleHumanNameChange(index, e.target.value)}
                      style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #ddd", marginTop: "4px" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: "bold", display: "block", marginBottom: "4px" }}>Token:</label>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {getMultiplayerAvailableTokens("human", index).map(token => (
                        <button
                          key={token}
                          onClick={() => handleHumanTokenSelect(index, token)}
                          style={{
                            fontSize: "20px",
                            padding: "6px",
                            borderRadius: "6px",
                            border: humanTokens[index] === token ? "2px solid #4169E1" : "1px solid #ddd",
                            backgroundColor: humanTokens[index] === token ? "#e8f0fe" : "#fff",
                            cursor: "pointer",
                          }}
                        >
                          {token}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Opponents */}
          <div
            style={{
              marginBottom: "24px",
              padding: "20px",
              backgroundColor: "#fff3e0",
              borderRadius: "12px",
              border: "2px solid #FF9800",
            }}
          >
            <h3 style={{ marginBottom: "12px", color: "#E65100" }}>Add AI Opponents (Optional)</h3>
            
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>
                Number of AI Bots:
              </label>
              <select
                value={mpAiCount}
                onChange={handleMpAiCountChange}
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }}
              >
                {[0, 1, 2, 3, 4, 5, 6].map(num => (
                  <option key={num} value={num}>{num} Bots</option>
                ))}
              </select>
            </div>

            <AnimatePresence>
              {Array.from({ length: mpAiCount }).map((_, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ marginBottom: "12px", padding: "12px", backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #ddd" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontWeight: "bold", fontSize: "14px", minWidth: "80px" }}>
                      {AI_NAMES[index] ?? `Bot ${index + 1}`}:
                    </span>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {getMultiplayerAvailableTokens("ai", index).map(token => (
                        <button
                          key={token}
                          onClick={() => handleMpAiTokenSelect(index, token)}
                          style={{
                            fontSize: "20px",
                            padding: "6px",
                            borderRadius: "6px",
                            border: mpAiTokens[index] === token ? "2px solid #FF9800" : "1px solid #ddd",
                            backgroundColor: mpAiTokens[index] === token ? "#ffe0b2" : "#fff",
                            cursor: "pointer",
                          }}
                        >
                          {token}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <motion.button
            onClick={startMultiplayerGame}
            disabled={humanTokens.some(t => !t) || mpAiTokens.some(t => !t)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              padding: "16px 48px",
              fontSize: "20px",
              fontWeight: "bold",
              backgroundColor: "#4169E1",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: (humanTokens.some(t => !t) || mpAiTokens.some(t => !t)) ? "not-allowed" : "pointer",
              boxShadow: "0 4px 12px rgba(65, 105, 225, 0.4)",
              opacity: (humanTokens.some(t => !t) || mpAiTokens.some(t => !t)) ? 0.5 : 1,
            }}
          >
            Start Multiplayer Game
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return null;
};

export default PlayerSetup;
