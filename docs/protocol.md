# Ludomercatus WebSocket Protocol

This document describes the high‑level WebSocket protocol between the browser client and the Ludomercatus game server.

The client connects to:

- `ws(s)://<host>/ws?clientId=<uuid>`

where `clientId` is a unique identifier stored locally on the client (see `localStore` usage).

---

## Message Envelope

All messages are JSON objects with a top‑level `type` field.

### From Client → Server

#### 1. Room & Lobby Messages

- **LIST_ROOMS**
  - **Shape:**
    - `{ "type": "LIST_ROOMS" }`
  - **Description:** Request a list of currently active rooms.

- **CREATE_ROOM**
  - **Shape:**
    - `{ "type": "CREATE_ROOM", "mode": "single" | "multi" }`
  - **Description:** Ask the server to create a new room in single‑player or multiplayer (“lobby”) mode.

- **JOIN_ROOM**
  - **Shape:**
    - `{ "type": "JOIN_ROOM", "roomId": "<room-id>" }`
  - **Description:** Join an existing room by its ID.

- **(Optional) LEAVE_ROOM**
  - **Shape (server‑side convention):**
    - `{ "type": "LEAVE_ROOM" }`
  - **Description:** The client intends to leave the current room. (Actual implementation may be implicit via socket close.)

#### 2. Game Actions

Game actions are sent through a generic `ACTION` envelope. The actual action name and parameters are handled on the server by `GameRoom`.

- **ACTION**
  - **Shape:**
    - `{ "type": "ACTION", "action": "<actionName>", "payload": [ /* arguments */ ] }`
  - **Examples:**
    - `{"type":"ACTION","action":"addPlayer","payload":["Alice","car","<clientId>",true]}`
    - `{"type":"ACTION","action":"rollDice","payload":[]}`
    - `{"type":"ACTION","action":"buyProperty","payload":[propertyId]}`
    - `{"type":"ACTION","action":"startGame","payload":[]}`
    - `{"type":"ACTION","action":"executeAITurn","payload":[]}`
  - **Valid `action` values** (from `gameStore` wiring, not exhaustive):
    - Core: `initGame`, `rollDice`, `movePlayer`, `buyProperty`, `declineProperty`, `payRent`, `payTax`,
      `endTurn`, `goToJail`, `getOutOfJail`, `drawCard`, `checkBankruptcy`, `declareBankruptcy`, `checkWinCondition`
    - Building & mortgages: `buildHouse`, `buildHotel`, `sellHouse`, `sellHotel`, `mortgageProperty`, `unmortgageProperty`
    - Auctions: `startAuction`, `placeBid`, `passAuction`, `endAuction`
    - Trade: `startTrade`, `updateTradeOffer`, `proposeTrade`, `acceptTrade`, `rejectTrade`, `cancelTrade`,
      `counterOffer`, `acceptCounterOffer`
    - AI: `executeAITurn`, `executeAITradeResponse`
    - Tax & settings: `chooseTaxOption`, `updateSettings`
    - Loans & IOUs: `takeLoan`, `repayLoan`, `getMaxLoanAmount`,
      `forgiveRent`, `offerPaymentPlan`, `acceptPaymentPlan`, `rejectPaymentPlan`,
      `createRentIOU`, `payIOU`, `demandImmediatePaymentOrProperty`
    - Insurance / value: `buyPropertyInsurance`, `getInsuranceCost`,
      `appreciateColorGroup`, `depreciateColorGroup`
    - Bankruptcy / foreclosure: `enterChapter11`, `declineRestructuring`,
      `payDebtService`, `handleForeclosureDecision`
    - Lobby helpers: `addPlayer`, `updatePlayer`, `assignPlayer`, `startGame`

> The server is responsible for authorizing whether the sending `clientId` is allowed to perform the requested `action` in the current game phase.

#### 3. Heartbeats (Recommended)

To improve robustness, we recommend (or may later implement) explicit heartbeat messages:

- **PING**
  - **Shape:**
    - `{ "type": "PING" }`
  - **Description:** Sent periodically by the client so the server can detect stale connections.

The server should respond with a corresponding `PONG` (see below).

---

## From Server → Client

#### 1. State & Rooms

- **STATE_UPDATE**
  - **Shape:**
    - `{ "type": "STATE_UPDATE", "state": <GameState> }`
  - **Description:** Authoritative game state for the current room. Clients should treat this as the single source of truth and overwrite local state accordingly.

- **ROOM_LIST**
  - **Shape:**
    - `{ "type": "ROOM_LIST", "rooms": [ { "id": "<room-id>", "players": <number> }, ... ] }`
  - **Description:** Response to `LIST_ROOMS`, listing rooms and approximate player counts.

- **ROOM_CREATED**
  - **Shape:**
    - `{ "type": "ROOM_CREATED", "roomId": "<room-id>" }`
  - **Description:** Server acknowledgment that a room was created (clients typically auto‑join this room).

#### 2. Heartbeats

- **PONG**
  - **Shape:**
    - `{ "type": "PONG" }`
  - **Description:** Response to a client `PING`. Optionally includes timing/debug info if needed.

---

## Action → Phase Expectations (High‑Level)

The server enforces which actions are valid in which `GamePhase` (see `GameState.phase`):

- `rolling`:
  - Valid: `rollDice`, `getOutOfJail` (when in jail), some AI actions.
- `moving`:
  - Valid: `movePlayer` (usually driven by server/AI).
- `resolving_space`:
  - Valid: resolution of landed space; typically ends with `endTurn`.
- `awaiting_buy_decision`:
  - Valid: `buyProperty`, `declineProperty`.
- `auction`:
  - Valid: `placeBid`, `passAuction`, `endAuction` (once only one active bidder remains).
- `jail_decision`:
  - Valid: `getOutOfJail` with `"pay" | "card" | "roll"`.
- `trading`:
  - Valid: trade lifecycle actions.
- `awaiting_tax_decision`:
  - Valid: `chooseTaxOption`.
- `awaiting_rent_negotiation`, `awaiting_bankruptcy_decision`, `awaiting_debt_service`, `awaiting_foreclosure_decision`:
  - Valid: corresponding IOU / restructuring / foreclosure actions.

Clients should avoid sending actions that are not valid for the current phase; the server should still validate and reject/ignore invalid transitions defensively.

---

## Notes & Future Enhancements

- This document is intentionally high‑level; the exact `GameState` and action payload types are defined in `src/types/game.ts`.
- When adding new actions:
  - Extend the action union in `GameRoom` and `useGameStore`.
  - Update this document with the new `action` name, payload shape, and phase expectations.

