import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "../store/gameStore";
import { useLocalStore } from "../store/localStore";
import type { GameSettings } from "../types/game";
import { DEFAULT_GAME_SETTINGS } from "../types/game";

const TOKENS = ["🚗", "🚙", "🚕", "🏎", "🚁", "✈️", "⛵", "🎭"];
const AI_NAMES = ["Bot Alpha", "Bot Beta", "Bot Gamma", "Bot Delta", "Bot Epsilon", "Bot Zeta", "Bot Eta"];

type GameMode = "select" | "single" | "multiplayer";

const PlayerSetup = () => {
  const [gameMode, setGameMode] = React.useState<GameMode>("select");
  
  // Game settings
  const [gameSettings, setGameSettings] = React.useState<GameSettings>({
    ...DEFAULT_GAME_SETTINGS,
  });
  const [showAdvancedSettings, setShowAdvancedSettings] = React.useState(false);
  
  // Refs for container sizing (must be at top level for React Hooks rules)
  const singlePlayerContainerRef = React.useRef<HTMLDivElement>(null);
  const selectContainerRef = React.useRef<HTMLDivElement>(null);
  const multiplayerContainerRef = React.useRef<HTMLDivElement>(null);
  
  // #region agent log
  React.useEffect(() => {
    const containerRef = gameMode === "single" ? singlePlayerContainerRef : 
                        gameMode === "multiplayer" ? multiplayerContainerRef : 
                        selectContainerRef;
    if (containerRef.current) {
      const el = containerRef.current;
      const viewport = { width: window.innerWidth, height: window.innerHeight };
      const rect = el.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(el);
      const bodyStyle = window.getComputedStyle(document.body);
      const logData = {
        location: 'PlayerSetup.tsx:442',
        message: 'Setup container sizing check',
        data: {
          gameMode,
          viewport,
          rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
          computedStyle: { overflowY: computedStyle.overflowY, overflowX: computedStyle.overflowX, height: computedStyle.height },
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
          needsScrollbar: el.scrollHeight > el.clientHeight,
          bodyOverflow: bodyStyle.overflow
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'scrollbar-fix-v1',
        hypothesisId: 'A'
      };
      fetch('http://127.0.0.1:7242/ingest/624eb4a4-a4cd-4fc4-9b95-f587dccf83e6', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData)
      }).catch(() => {});
    }
  }, [gameMode]);
  // #endregion
  
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

    // Apply game settings first
    useGameStore.getState().updateSettings(gameSettings);
    useGameStore.getState().initGame(names, tokens, isAIFlags);
    
    // Set the human player as player 0 in single-player mode
    useLocalStore.getState().setMyPlayerIndex(0);
    console.log("[PlayerSetup] Single-player game started, set myPlayerIndex to 0", {
      playerName: names[0],
      totalPlayers: names.length,
      myPlayerIndex: useLocalStore.getState().myPlayerIndex,
    });
  };

  const startMultiplayerGame = () => {
    if (humanTokens.some(t => !t)) return;
    if (mpAiTokens.some(t => !t)) return;

    const names = [...humanNames, ...mpAiTokens.map((_, i) => AI_NAMES[i] ?? `Bot ${i + 1}`)];
    const tokens = [...humanTokens, ...mpAiTokens];
    const isAIFlags = [...humanTokens.map(() => false), ...mpAiTokens.map(() => true)];

    // Apply game settings first
    useGameStore.getState().updateSettings(gameSettings);
    useGameStore.getState().initGame(names, tokens, isAIFlags);
  };

  // Game Settings Panel Component
  const GameSettingsPanel = () => (
    <div
      style={{
        marginBottom: "24px",
        padding: "20px",
        backgroundColor: "#f0f4f8",
        borderRadius: "12px",
        border: "2px solid #6366F1",
      }}
    >
      <div 
        onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
        style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between",
          cursor: "pointer",
          marginBottom: showAdvancedSettings ? "16px" : 0,
        }}
      >
        <h3 style={{ margin: 0, color: "#6366F1", display: "flex", alignItems: "center", gap: "8px" }}>
          <span>⚙️</span> Game Settings
        </h3>
        <span style={{ fontSize: "20px", color: "#6366F1" }}>
          {showAdvancedSettings ? "▼" : "▶"}
        </span>
      </div>
      
      <AnimatePresence>
        {showAdvancedSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: "hidden" }}
          >
            {/* Privacy Settings */}
            <div style={{ marginBottom: "16px" }}>
              <h4 style={{ fontSize: "12px", color: "#666", marginBottom: "8px", textTransform: "uppercase" }}>
                🔒 Privacy (Economic Realism)
              </h4>
              
              <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={gameSettings.hideOpponentWealth}
                  onChange={(e) => setGameSettings(s => ({ ...s, hideOpponentWealth: e.target.checked }))}
                  style={{ width: "18px", height: "18px" }}
                />
                <span style={{ fontSize: "14px" }}>
                  Hide opponent's cash & net worth
                </span>
              </label>
              
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={gameSettings.hideOpponentProperties}
                  onChange={(e) => setGameSettings(s => ({ ...s, hideOpponentProperties: e.target.checked }))}
                  style={{ width: "18px", height: "18px" }}
                />
                <span style={{ fontSize: "14px" }}>
                  Hide opponent's property details
                </span>
              </label>
              
              <p style={{ fontSize: "11px", color: "#888", marginTop: "8px", marginBottom: 0 }}>
                💡 Like real markets, you won't know competitors' exact financial positions!
              </p>
            </div>

            {/* Economic Features */}
            <div style={{ marginBottom: "16px" }}>
              <h4 style={{ fontSize: "12px", color: "#666", marginBottom: "8px", textTransform: "uppercase" }}>
                📈 Economic Features
              </h4>
              
              <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={gameSettings.enableHousingScarcity}
                  onChange={(e) => setGameSettings(s => ({ ...s, enableHousingScarcity: e.target.checked }))}
                  style={{ width: "18px", height: "18px" }}
                />
                <span style={{ fontSize: "14px" }}>
                  🏠 Housing scarcity (32 houses, 12 hotels max)
                </span>
              </label>
              
              <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={gameSettings.enableInflation}
                  onChange={(e) => setGameSettings(s => ({ ...s, enableInflation: e.target.checked }))}
                  style={{ width: "18px", height: "18px" }}
                />
                <span style={{ fontSize: "14px" }}>
                  💹 Inflation (GO salary increases over time)
                </span>
              </label>
              
              <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={gameSettings.enableProgressiveTax}
                  onChange={(e) => setGameSettings(s => ({ ...s, enableProgressiveTax: e.target.checked }))}
                  style={{ width: "18px", height: "18px" }}
                />
                <span style={{ fontSize: "14px" }}>
                  💰 Progressive tax (choose 10% or flat £200)
                </span>
              </label>
              
              <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={gameSettings.enableBankLoans}
                  onChange={(e) => setGameSettings(s => ({ ...s, enableBankLoans: e.target.checked }))}
                  style={{ width: "18px", height: "18px" }}
                />
                <span style={{ fontSize: "14px" }}>
                  🏦 Bank loans ({Math.round(gameSettings.loanInterestRate * 100)}% interest/turn)
                </span>
              </label>
              
              <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={gameSettings.enableEconomicEvents}
                  onChange={(e) => setGameSettings(s => ({ ...s, enableEconomicEvents: e.target.checked }))}
                  style={{ width: "18px", height: "18px" }}
                />
                <span style={{ fontSize: "14px" }}>
                  📊 Economic events (Free Parking triggers market events)
                </span>
              </label>
              
              <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={gameSettings.enableRentNegotiation}
                  onChange={(e) => setGameSettings(s => ({ ...s, enableRentNegotiation: e.target.checked }))}
                  style={{ width: "18px", height: "18px" }}
                />
                <span style={{ fontSize: "14px" }}>
                  🤝 Rent negotiation (IOUs, payment plans, property transfers)
                </span>
              </label>
              
              <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={gameSettings.enablePropertyInsurance}
                  onChange={(e) => setGameSettings(s => ({ ...s, enablePropertyInsurance: e.target.checked }))}
                  style={{ width: "18px", height: "18px" }}
                />
                <span style={{ fontSize: "14px" }}>
                  🛡️ Property insurance (protects against repair cards)
                </span>
              </label>
              
              <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={gameSettings.enablePropertyValueFluctuation}
                  onChange={(e) => setGameSettings(s => ({ ...s, enablePropertyValueFluctuation: e.target.checked }))}
                  style={{ width: "18px", height: "18px" }}
                />
                <span style={{ fontSize: "14px" }}>
                  📈 Property value fluctuation (development affects property values)
                </span>
              </label>
              
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={gameSettings.enableBankruptcyRestructuring}
                  onChange={(e) => setGameSettings(s => ({ ...s, enableBankruptcyRestructuring: e.target.checked }))}
                  style={{ width: "18px", height: "18px" }}
                />
                <span style={{ fontSize: "14px" }}>
                  📋 Chapter 11 restructuring (avoid instant elimination)
                </span>
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  // Game mode selection screen
  if (gameMode === "select") {
    return (
      <div
        ref={selectContainerRef}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          height: "100vh", // Fixed height instead of minHeight to enable scrolling
          backgroundColor: "#1a1a2a",
          padding: "40px",
          gap: "24px",
          overflowY: "auto", // Enable vertical scrolling
          overflowX: "hidden", // Prevent horizontal scrolling
          width: "100%",
          boxSizing: "border-box", // Include padding in height calculation
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
            Ludomercatus
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
        ref={singlePlayerContainerRef}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          height: "100vh", // Fixed height instead of minHeight to enable scrolling
          backgroundColor: "#1a1a2a",
          padding: "40px",
          gap: "24px",
          overflowY: "auto", // Enable vertical scrolling
          overflowX: "hidden", // Prevent horizontal scrolling
          width: "100%",
          boxSizing: "border-box", // Include padding in height calculation
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

          {/* Game Settings */}
          <GameSettingsPanel />

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
        ref={multiplayerContainerRef}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          height: "100vh", // Fixed height instead of minHeight to enable scrolling
          backgroundColor: "#1a1a2a",
          padding: "40px",
          gap: "24px",
          overflowY: "auto", // Enable vertical scrolling
          overflowX: "hidden", // Prevent horizontal scrolling
          width: "100%",
          boxSizing: "border-box", // Include padding in height calculation
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

          {/* Game Settings */}
          <GameSettingsPanel />

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
