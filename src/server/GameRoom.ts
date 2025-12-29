import type { GameState, Player, Property, Space, Card, DiceRoll, TradeOffer, GameLogEntry, ColorGroup } from "../types/game";
import { boardSpaces } from "../data/board";
import { createChanceDeck, createCommunityChestDeck } from "../data/cards";
import { calculateRent } from "../logic/rules/rent";
import { hasMonopoly, getPlayerProperties } from "../logic/rules/monopoly";
import { executeAITurn, executeAITradeResponse, type GameActions } from "../logic/ai";

const PLAYER_COLORS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F"];

const isProperty = (space: Space): space is Property => {
  return space.type === "property" || space.type === "railroad" || space.type === "utility";
};

const shuffleDeck = <T extends { id: number }>(deck: readonly T[]): T[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j]!;
    shuffled[j] = temp!;
  }
  return shuffled;
};

const createPlayer = (
  id: number,
  name: string,
  token: string,
  color: string,
  isAI: boolean = false
): Player => ({
  id,
  name,
  token,
  color,
  cash: 1500,
  position: 0,
  properties: [],
  inJail: false,
  jailTurns: 0,
  jailFreeCards: 0,
  bankrupt: false,
  isAI,
  lastTradeTurn: -10,
});

export class GameRoom implements GameActions {
  public state: GameState;
  private logIdCounter = 0;
  private listeners = new Set<(state: GameState) => void>();

  constructor(initialPhase: "setup" | "lobby" = "setup") {
    this.state = {
      players: [],
      currentPlayerIndex: 0,
      spaces: boardSpaces as Space[],
      chanceDeck: shuffleDeck(createChanceDeck()),
      communityChestDeck: shuffleDeck(createCommunityChestDeck()),
      diceRoll: undefined,
      consecutiveDoubles: 0,
      phase: initialPhase,
      passedGo: false,
      auction: undefined,
      trade: undefined,
      lastCardDrawn: undefined,
      gameLog: [],
      turn: 1,
    };
  }

  public subscribe(listener: (state: GameState) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(listener => listener(this.state));
  }

  // --- State Updates ---
  // Helper to replicate Zustand's partial update behavior
  private setState(partial: Partial<GameState>) {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  // --- Lobby Actions ---

  public addPlayer(name: string, token: string, clientId: string) {
    if (this.state.phase !== "lobby") return;
    
    const existingIndex = this.state.players.findIndex(p => p.clientId === clientId);
    if (existingIndex !== -1) {
      this.updatePlayer(existingIndex, name, token);
      return;
    }

    const index = this.state.players.length;
    if (index >= 8) return;

    const newPlayer = createPlayer(
      index,
      name,
      token,
      PLAYER_COLORS[index] ?? "#999999",
      false
    );
    newPlayer.clientId = clientId;

    this.setState({
      players: [...this.state.players, newPlayer]
    });
    this.addLogEntry(`${name} joined the lobby!`, "system");
  }

  public updatePlayer(index: number, name: string, token: string) {
    this.setState({
      players: this.state.players.map((p, i) => 
        i === index ? { ...p, name, token } : p
      )
    });
  }

  public startGame() {
    if (this.state.players.length < 2) return;
    this.setState({ phase: "rolling" });
    this.addLogEntry("Game Started!", "system");
  }

  // --- GameActions Implementation ---

  public initGame(playerNames: string[], tokens: string[], isAIFlags: boolean[] = []) {
    const players = playerNames.map((name, index) =>
      createPlayer(
        index, 
        name, 
        tokens[index] ?? name, 
        PLAYER_COLORS[index] ?? "#999999",
        isAIFlags[index] ?? false
      )
    );

    this.setState({
      players,
      currentPlayerIndex: 0,
      spaces: boardSpaces as Space[],
      chanceDeck: shuffleDeck(createChanceDeck()),
      communityChestDeck: shuffleDeck(createCommunityChestDeck()),
      phase: "rolling",
      diceRoll: undefined,
      consecutiveDoubles: 0,
      passedGo: false,
      auction: undefined,
      trade: undefined,
      lastCardDrawn: undefined,
      gameLog: [],
      turn: 1,
    });

    this.addLogEntry(`Game started with ${players.length} players!`, "system");
  }

  public rollDice() {
    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    const total = die1 + die2;
    const isDoubles = die1 === die2;

    const roll: DiceRoll = { die1, die2, total, isDoubles };

    this.setState({ diceRoll: roll, lastDiceRoll: roll });

    const player = this.state.players[this.state.currentPlayerIndex];
    if (player) {
      const doublesText = isDoubles ? " (Doubles!)" : "";
      this.addLogEntry(`${player.name} rolled ${die1} + ${die2} = ${total}${doublesText}`, "roll", this.state.currentPlayerIndex);
    }

    return roll;
  }

  public movePlayer(playerIndex: number, steps: number) {
    const player = this.state.players[playerIndex];
    if (!player || player.inJail || player.bankrupt) return;

    const oldPosition = player.position;
    const newPosition = (oldPosition + steps) % 40;
    const passedGo = newPosition < oldPosition && steps > 0;

    this.setState({
      players: this.state.players.map((p, i) =>
        i === playerIndex
          ? { 
              ...p, 
              position: newPosition, 
              cash: p.cash + (passedGo ? 200 : 0) 
            }
          : p
      ),
      passedGo,
      phase: "resolving_space",
    });
    
    const space = this.state.spaces[newPosition];
    const goBonus = passedGo ? " (collected £200 passing GO)" : "";
    if (space) {
      this.addLogEntry(`${player.name} moved to ${space.name}${goBonus}`, "move", playerIndex);
    }
    
    this.resolveSpace(playerIndex);
  }

  public resolveSpace(playerIndex: number) {
    const player = this.state.players[playerIndex];
    if (!player) return;

    const space = this.state.spaces[player.position];
    if (!space) return;

    switch (space.type) {
      case "property":
      case "railroad":
      case "utility": {
        const property = space as Property;
        if (property.owner === undefined) {
          this.setState({ phase: "awaiting_buy_decision" });
        } else if (property.owner !== playerIndex && !property.mortgaged) {
          const diceTotal = this.state.diceRoll?.total ?? 7;
          this.payRent(playerIndex, property.id, diceTotal);
        }
        break;
      }
      
      case "chance":
      case "community_chest":
        this.drawCard(playerIndex, space.type);
        break;
        
      case "tax": {
        const amount = space.name.includes("Income") ? 200 : 100;
        this.payTax(playerIndex, amount);
        break;
      }
        
      case "go_to_jail":
        this.goToJail(playerIndex);
        break;
    }
  }

  public buyProperty(propertyId: number) {
    const playerIndex = this.state.currentPlayerIndex;
    const player = this.state.players[playerIndex];
    const property = this.state.spaces.find((s) => s.id === propertyId) as Property;

    if (!player || !property || property.owner !== undefined || player.cash < property.price) return;

    this.setState({
      spaces: this.state.spaces.map((s) =>
        s.id === propertyId ? { ...(s as Property), owner: playerIndex } : s
      ),
      players: this.state.players.map((p, i) =>
        i === playerIndex
          ? {
              ...p,
              cash: p.cash - property.price,
              properties: [...p.properties, property.id],
            }
          : p
      ),
      phase: "resolving_space",
    });

    this.addLogEntry(`${player.name} bought ${property.name} for £${property.price}`, "buy", playerIndex);
  }

  public declineProperty(propertyId: number) {
    this.startAuction(propertyId);
  }

  public payRent(playerIndex: number, propertyId: number, diceTotal: number) {
    const payer = this.state.players[playerIndex];
    const property = this.state.spaces.find((s) => s.id === propertyId) as Property;
    
    if (!payer || !property) return;

    const rent = calculateRent(this.state, property, diceTotal);

    if (rent <= 0) return;

    if (payer.cash >= rent) {
      this.setState({
        players: this.state.players.map((p, i) => {
          if (i === playerIndex) return { ...p, cash: p.cash - rent };
          if (i === property.owner) return { ...p, cash: p.cash + rent };
          return p;
        }),
      });

      const owner = this.state.players[property.owner!];
      this.addLogEntry(`${payer.name} paid £${rent} rent to ${owner?.name}`, "rent", playerIndex);
    } else {
      this.declareBankruptcy(playerIndex, property.owner);
    }
  }

  public payTax(playerIndex: number, amount: number) {
    const player = this.state.players[playerIndex];
    if (!player) return;

    if (player.cash >= amount) {
      this.setState({
        players: this.state.players.map((p, i) =>
          i === playerIndex ? { ...p, cash: p.cash - amount } : p
        ),
      });
      this.addLogEntry(`${player.name} paid £${amount} in taxes`, "tax", playerIndex);
    } else {
      this.declareBankruptcy(playerIndex);
    }
  }

  public endTurn() {
    const roll = this.state.diceRoll;
    const currentPlayer = this.state.players[this.state.currentPlayerIndex];

    if (roll?.isDoubles && !currentPlayer?.inJail && !currentPlayer?.bankrupt) {
      if (this.state.consecutiveDoubles >= 2) {
        this.goToJail(this.state.currentPlayerIndex);
        return;
      }
      this.setState({
        phase: "rolling",
        diceRoll: undefined,
        consecutiveDoubles: this.state.consecutiveDoubles + 1,
        lastCardDrawn: undefined,
      });
      return;
    }

    let nextPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length;
    let loopCount = 0;
    while (this.state.players[nextPlayerIndex]?.bankrupt && loopCount < this.state.players.length) {
      nextPlayerIndex = (nextPlayerIndex + 1) % this.state.players.length;
      loopCount++;
    }

    const nextPlayer = this.state.players[nextPlayerIndex];
    this.setState({
      currentPlayerIndex: nextPlayerIndex,
      phase: nextPlayer?.inJail ? "jail_decision" : "rolling",
      diceRoll: undefined,
      consecutiveDoubles: 0,
      passedGo: false,
      lastCardDrawn: undefined,
      turn: this.state.turn + 1,
    });
  }

  public goToJail(playerIndex: number) {
    const player = this.state.players[playerIndex];
    
    this.setState({
      players: this.state.players.map((p, i) =>
        i === playerIndex
          ? { ...p, position: 10, inJail: true, jailTurns: 0 }
          : p
      ),
      consecutiveDoubles: 0,
      diceRoll: undefined,
    });

    if (player) {
      this.addLogEntry(`${player.name} went to Jail!`, "jail", playerIndex);
    }

    // In server mode, we probably don't want setTimeout logic INSIDE the logic class if we can avoid it.
    // The client should probably handle the "delay" before calling endTurn, or the server handles it.
    // For now, let's keep it sync.
    // Actually, in the store it had setTimeout.
    // Here, if we change state immediately, the client will see "Jail" then immediately "Next Turn".
    // That's jarring.
    // BUT, the server shouldn't block.
    // We can rely on the AI/Client to trigger 'endTurn' after jail?
    // No, 'goToJail' is often called automatically by landing on space.
    // So we must end turn.
    // Let's just end turn immediately here. The client animation might be skipped.
    // We can emit an event "PLAYER_JAILED" and let the client wait?
    // For simplicity V1, let's just end turn.
    // Wait, the client needs time to see "Go To Jail".
    // I will NOT call endTurn here. I will let the client (or AI controller) call it?
    // No, 'resolveSpace' calls 'goToJail'.
    // If I don't call endTurn, the game hangs in "resolving_space" or similar?
    // 'goToJail' didn't set a phase in the store!
    // It relied on `setTimeout(() => get().endTurn(), 1500)`.
    
    // I will emulate this by not changing phase, but expecting a "endTurn" call.
    // But who calls it?
    // If I am a player and I land on "Go To Jail", I go to jail.
    // The UI shows "You went to jail".
    // Does the UI show an "End Turn" button?
    // Currently UI shows "End Turn" if `diceRoll` exists.
    // But `goToJail` clears `diceRoll`!
    
    // So the user is stuck if I clear `diceRoll`.
    // I should probably NOT clear `diceRoll` immediately if I want them to click "End Turn"?
    // Or I should set a phase "jailed_animating"?
    
    // Let's just assume for now I won't auto-end-turn on server.
    // I'll leave diceRoll? No, standard rules say turn ends.
    // I'll rely on the client to handle the animation and then maybe the server sends "turn changed" later?
    // No, server state is truth.
    
    // Compromise: I will NOT call endTurn. I will set phase to 'resolving_space' (or keep it).
    // And I will leave diceRoll undefined? No.
    // I will simply call this.endTurn(). The client will snap. That's fine for v1.
    this.endTurn(); 
  }

  public getOutOfJail(playerIndex: number, method: "roll" | "pay" | "card") {
    const player = this.state.players[playerIndex];
    if (!player) return;

    if (method === "pay") {
      if (player.cash >= 50) {
        this.setState({
          players: this.state.players.map((p, i) =>
            i === playerIndex
              ? { ...p, cash: p.cash - 50, inJail: false, jailTurns: 0 }
              : p
          ),
          phase: "rolling",
        });
      }
    } else if (method === "card") {
      if (player.jailFreeCards > 0) {
        this.setState({
          players: this.state.players.map((p, i) =>
            i === playerIndex
              ? { ...p, jailFreeCards: p.jailFreeCards - 1, inJail: false, jailTurns: 0 }
              : p
          ),
          phase: "rolling",
        });
      }
    } else if (method === "roll") {
      const roll = this.rollDice();
      if (roll.isDoubles) {
        this.setState({
          players: this.state.players.map((p, i) =>
            i === playerIndex ? { ...p, inJail: false, jailTurns: 0 } : p
          ),
          consecutiveDoubles: 0,
        });
        this.movePlayer(playerIndex, roll.total);
      } else {
        const newJailTurns = player.jailTurns + 1;
        if (newJailTurns >= 3) {
          this.setState({
            players: this.state.players.map((p, i) =>
              i === playerIndex ? { ...p, cash: p.cash - 50, inJail: false, jailTurns: 0 } : p
            ),
          });
          this.movePlayer(playerIndex, roll.total);
        } else {
          this.setState({
            players: this.state.players.map((p, i) =>
              i === playerIndex ? { ...p, jailTurns: newJailTurns } : p
            ),
          });
          this.endTurn();
        }
      }
    }
  }

  // ... (Implementing other methods similarly, standard logic) ...
  // To save space, I'll implement the rest quickly.

  public buildHouse(propertyId: number) {
    const playerIndex = this.state.currentPlayerIndex;
    const player = this.state.players[playerIndex];
    if (!player) return;
    const property = this.state.spaces.find(s => s.id === propertyId) as Property;
    if (!property || property.owner !== playerIndex || property.houses >= 4 || !property.buildingCost || player.cash < property.buildingCost || !property.colorGroup) return;

    if (!hasMonopoly(this.state, playerIndex, property.colorGroup)) return;

    const groupProperties = this.state.spaces.filter((s): s is Property => isProperty(s) && s.colorGroup === property.colorGroup);
    const minHouses = Math.min(...groupProperties.map(p => p.houses));
    if (property.houses > minHouses) return;

    this.setState({
      spaces: this.state.spaces.map(s => s.id === propertyId ? { ...s, houses: (s as Property).houses + 1 } : s),
      players: this.state.players.map((p, i) => i === playerIndex ? { ...p, cash: p.cash - property.buildingCost! } : p)
    });
    this.addLogEntry(`${player.name} built a house on ${property.name}`, "system", playerIndex);
  }

  public buildHotel(propertyId: number) {
    const playerIndex = this.state.currentPlayerIndex;
    const player = this.state.players[playerIndex];
    if (!player) return;
    const property = this.state.spaces.find(s => s.id === propertyId) as Property;
    if (!property || property.owner !== playerIndex || property.houses !== 4 || !property.buildingCost || player.cash < property.buildingCost || !property.colorGroup) return;

    const groupProperties = this.state.spaces.filter((s): s is Property => isProperty(s) && s.colorGroup === property.colorGroup);
    if (!groupProperties.every(p => p.houses === 4 || p.hotel)) return;

    this.setState({
      spaces: this.state.spaces.map(s => s.id === propertyId ? { ...s, houses: 0, hotel: true } : s),
      players: this.state.players.map((p, i) => i === playerIndex ? { ...p, cash: p.cash - property.buildingCost! } : p)
    });
    this.addLogEntry(`${player.name} built a hotel on ${property.name}`, "system", playerIndex);
  }

  public sellHouse(propertyId: number) {
    const playerIndex = this.state.currentPlayerIndex;
    const player = this.state.players[playerIndex];
    if (!player) return;
    const property = this.state.spaces.find(s => s.id === propertyId) as Property;
    if (!property || property.owner !== playerIndex || property.houses <= 0) return;

    const sellValue = Math.floor((property.buildingCost ?? 0) / 2);
    this.setState({
      spaces: this.state.spaces.map(s => s.id === propertyId ? { ...s, houses: (s as Property).houses - 1 } : s),
      players: this.state.players.map((p, i) => i === playerIndex ? { ...p, cash: p.cash + sellValue } : p)
    });
    this.addLogEntry(`${player.name} sold a house on ${property.name}`, "system", playerIndex);
  }

  public sellHotel(propertyId: number) {
    const playerIndex = this.state.currentPlayerIndex;
    const player = this.state.players[playerIndex];
    if (!player) return;
    const property = this.state.spaces.find(s => s.id === propertyId) as Property;
    if (!property || property.owner !== playerIndex || !property.hotel) return;

    const sellValue = Math.floor((property.buildingCost ?? 0) / 2);
    this.setState({
      spaces: this.state.spaces.map(s => s.id === propertyId ? { ...s, houses: 4, hotel: false } : s),
      players: this.state.players.map((p, i) => i === playerIndex ? { ...p, cash: p.cash + sellValue } : p)
    });
    this.addLogEntry(`${player.name} sold a hotel on ${property.name}`, "system", playerIndex);
  }

  public mortgageProperty(propertyId: number) {
    const space = this.state.spaces.find(s => s.id === propertyId) as Property;
    if (!space || space.owner === undefined || space.mortgaged || space.houses > 0 || space.hotel) return;

    this.setState({
      spaces: this.state.spaces.map(s => s.id === propertyId ? { ...s, mortgaged: true } : s),
      players: this.state.players.map((p, i) => i === space.owner ? { ...p, cash: p.cash + space.mortgageValue } : p)
    });
    const owner = this.state.players[space.owner];
    if (owner) this.addLogEntry(`${owner.name} mortgaged ${space.name}`, "system", space.owner);
  }

  public unmortgageProperty(propertyId: number) {
    const space = this.state.spaces.find(s => s.id === propertyId) as Property;
    if (!space || space.owner === undefined || !space.mortgaged) return;

    const unmortgageCost = Math.floor(space.mortgageValue * 1.1);
    const player = this.state.players[space.owner];
    if (!player || player.cash < unmortgageCost) return;

    this.setState({
      spaces: this.state.spaces.map(s => s.id === propertyId ? { ...s, mortgaged: false } : s),
      players: this.state.players.map((p, i) => i === space.owner ? { ...p, cash: p.cash - unmortgageCost } : p)
    });
    this.addLogEntry(`${player.name} unmortgaged ${space.name}`, "system", space.owner);
  }

  public addLogEntry(message: string, type: GameLogEntry["type"], playerIndex?: number) {
    const entry: GameLogEntry = { id: ++this.logIdCounter, timestamp: Date.now(), playerIndex, message, type };
    this.setState({ gameLog: [...this.state.gameLog.slice(-49), entry] });
  }

  public drawCard(playerIndex: number, type: "chance" | "community_chest") {
    const deck = type === "chance" ? this.state.chanceDeck : this.state.communityChestDeck;
    const card = deck[0];
    const player = this.state.players[playerIndex];
    if (!card || !player) return;

    this.addLogEntry(`${player.name} drew ${type === "chance" ? "Chance" : "Community Chest"}: "${card.text}"`, "card", playerIndex);
    this.applyCardEffect(card, playerIndex);

    const updatedDeck = [...deck.slice(1), card];
    if (type === "chance") this.setState({ chanceDeck: updatedDeck });
    else this.setState({ communityChestDeck: updatedDeck });
  }

  public applyCardEffect(card: Card, playerIndex: number) {
    const effect = card.getEffect(this.state, playerIndex);
    const player = this.state.players[playerIndex];
    if (!player) return;

    let newPlayers = [...this.state.players];
    let cashChange = effect.cashChange ?? 0;
    let newPosition = player.position;

    if (effect.jailFreeCard) {
      newPlayers = newPlayers.map((p, i) => i === playerIndex ? { ...p, jailFreeCards: p.jailFreeCards + 1 } : p);
    }

    if (effect.positionChange !== undefined) {
      if (effect.positionChange === "jail") {
        this.goToJail(playerIndex);
        return;
      } else {
        newPosition = effect.positionChange;
        if (effect.passGoBonus) cashChange += 200;
      }
    }

    if (effect.collectFromEach) {
      const amount = effect.collectFromEach;
      newPlayers = newPlayers.map((p, i) => {
        if (i === playerIndex) return p;
        if (!p.bankrupt) {
          const payment = Math.min(p.cash, amount);
          cashChange += payment;
          return { ...p, cash: p.cash - payment };
        }
        return p;
      });
    }

    if (effect.payToEach) {
      const amount = effect.payToEach;
      newPlayers = newPlayers.map((p, i) => {
        if (i === playerIndex) return p;
        if (!p.bankrupt) {
          cashChange -= amount;
          return { ...p, cash: p.cash + amount };
        }
        return p;
      });
    }

    if (effect.perHouseCost || effect.perHotelCost) {
      const playerProperties = getPlayerProperties(this.state, playerIndex);
      let totalCost = 0;
      playerProperties.forEach(prop => {
        if (prop.hotel) totalCost += effect.perHotelCost ?? 0;
        else totalCost += prop.houses * (effect.perHouseCost ?? 0);
      });
      cashChange -= totalCost;
    }

    this.setState({
      players: newPlayers.map((p, i) => i === playerIndex ? { ...p, position: newPosition, cash: p.cash + cashChange } : p),
      lastCardDrawn: card,
    });

    if (effect.triggerSpaceResolution) this.resolveSpace(playerIndex);
  }

  public checkBankruptcy(playerIndex: number) {
    const player = this.state.players[playerIndex];
    if (player && player.cash < 0) this.declareBankruptcy(playerIndex);
  }

  public declareBankruptcy(playerIndex: number, creditorIndex?: number) {
    const player = this.state.players[playerIndex];
    if (!player) return;

    const playerPropertyIds = player.properties;

    this.setState({
      players: this.state.players.map((p, i) => {
        if (i === playerIndex) return { ...p, bankrupt: true, cash: 0, properties: [] };
        if (i === creditorIndex && creditorIndex !== undefined) {
          return { 
            ...p, 
            cash: p.cash + Math.max(0, player.cash),
            properties: [...p.properties, ...playerPropertyIds],
            jailFreeCards: p.jailFreeCards + player.jailFreeCards
          };
        }
        return p;
      }),
      spaces: this.state.spaces.map(s => (isProperty(s) && s.owner === playerIndex) ? { ...s, owner: creditorIndex, houses: 0, hotel: false, mortgaged: false } : s)
    });
    this.addLogEntry(`${player.name} went bankrupt!`, "bankrupt", playerIndex);
    
    this.checkWinCondition();

    if (this.state.currentPlayerIndex === playerIndex) {
      this.endTurn();
    }
  }

  public checkWinCondition() {
    const activePlayers = this.state.players.filter(p => !p.bankrupt);
    if (activePlayers.length === 1) {
      this.setState({ winner: activePlayers[0]!.id, phase: "game_over" });
    }
  }

  public startAuction(propertyId: number) {
    let startingBidder = this.state.currentPlayerIndex;
    this.setState({
      auction: { propertyId, currentBid: 0, highestBidder: null, activePlayerIndex: startingBidder, passedPlayers: [] },
      phase: "auction"
    });
    const prop = this.state.spaces.find(s => s.id === propertyId);
    this.addLogEntry(`Auction started for ${prop?.name}!`, "auction");
  }

  public placeBid(playerIndex: number, amount: number) {
    if (!this.state.auction || amount <= this.state.auction.currentBid) return;
    this.setState({ auction: { ...this.state.auction, currentBid: amount, highestBidder: playerIndex, activePlayerIndex: (playerIndex + 1) % this.state.players.length } });
  }

  public passAuction(playerIndex: number) {
    if (!this.state.auction) return;
    const passed = [...this.state.auction.passedPlayers, playerIndex];
    const activePlayers = this.state.players.filter((p, i) => !p.bankrupt && !passed.includes(i));
    
    if (activePlayers.length <= 1) this.endAuction();
    else this.setState({ auction: { ...this.state.auction, passedPlayers: passed, activePlayerIndex: (playerIndex + 1) % this.state.players.length } });
  }

  public endAuction() {
    const auction = this.state.auction;
    if (!auction) return;
    if (auction.highestBidder !== null) {
      const winner = this.state.players[auction.highestBidder]!;
      this.setState({
        spaces: this.state.spaces.map(s => s.id === auction.propertyId ? { ...s, owner: auction.highestBidder } : s),
        players: this.state.players.map((p, i) => i === auction.highestBidder ? { ...p, cash: p.cash - auction.currentBid, properties: [...p.properties, auction.propertyId] } : p),
        auction: undefined, phase: "resolving_space"
      });
      this.addLogEntry(`${winner.name} won auction for £${auction.currentBid}`, "auction");
    } else {
      this.setState({ auction: undefined, phase: "resolving_space" });
    }
  }

  public startTrade(fromPlayer: number, toPlayer: number) {
    this.setState({ 
      trade: { offer: { fromPlayer, toPlayer, cashOffered: 0, propertiesOffered: [], jailCardsOffered: 0, cashRequested: 0, propertiesRequested: [], jailCardsRequested: 0 }, status: "draft" }, 
      phase: "trading",
      previousPhase: this.state.phase, 
    });
  }

  public updateTradeOffer(offer: TradeOffer) {
    this.setState({ trade: this.state.trade ? { ...this.state.trade, offer } : undefined });
  }

  public proposeTrade(offer: TradeOffer) {
    this.setState({ trade: { offer, status: "pending" }, phase: "trading" });
  }

  public acceptTrade() {
    const trade = this.state.trade;
    if (!trade) return;
    const { offer } = trade;
    this.setState({
      players: this.state.players.map((p, i) => {
        if (i === offer.fromPlayer) {
          return {
            ...p,
            cash: p.cash - offer.cashOffered + offer.cashRequested,
            jailFreeCards: p.jailFreeCards - offer.jailCardsOffered + offer.jailCardsRequested,
            properties: [
              ...p.properties.filter(id => !offer.propertiesOffered.includes(id)),
              ...offer.propertiesRequested,
            ],
          };
        }
        if (i === offer.toPlayer) {
          return {
            ...p,
            cash: p.cash - offer.cashRequested + offer.cashOffered,
            jailFreeCards: p.jailFreeCards - offer.jailCardsRequested + offer.jailCardsOffered,
            properties: [
              ...p.properties.filter(id => !offer.propertiesRequested.includes(id)),
              ...offer.propertiesOffered,
            ],
          };
        }
        return p;
      }),
      spaces: this.state.spaces.map(s => {
        if (!isProperty(s)) return s;
        if (offer.propertiesOffered.includes(s.id)) return { ...s, owner: offer.toPlayer };
        if (offer.propertiesRequested.includes(s.id)) return { ...s, owner: offer.fromPlayer };
        return s;
      }),
      trade: undefined, 
      phase: this.state.previousPhase ?? "resolving_space", 
      previousPhase: undefined,
    });
    this.addLogEntry(`Trade completed!`, "trade");
  }

  public rejectTrade() {
    const trade = this.state.trade;
    if (trade) {
      const initiator = this.state.players[trade.offer.fromPlayer];
      if (initiator && initiator.isAI) {
        const newHistory = { ...(initiator.tradeHistory || {}) };
        trade.offer.propertiesRequested.forEach(propId => {
          const key = `${trade.offer.toPlayer}-${propId}`;
          const current = newHistory[key] || { attempts: 0, lastOffer: 0 };
          newHistory[key] = {
            attempts: current.attempts + 1,
            lastOffer: trade.offer.cashOffered
          };
        });
        this.setState({
          players: this.state.players.map((p, i) => 
            i === trade.offer.fromPlayer ? { ...p, tradeHistory: newHistory } : p
          )
        });
      }
    }

    this.setState({ 
      trade: undefined, 
      phase: this.state.previousPhase ?? "resolving_space",
      previousPhase: undefined,
    });
  }

  public cancelTrade() {
    this.setState({ 
      trade: undefined, 
      phase: this.state.previousPhase ?? "resolving_space",
      previousPhase: undefined,
    });
  }

  public executeAITurn() {
    executeAITurn(this.state, this);
  }

  public executeAITradeResponse() {
    executeAITradeResponse(this.state, this);
  }
}
