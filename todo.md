# Ludomercatus – Gameplan (Difficulty‑Sorted)

This file is the actionable task list for Ludomercatus.  
It is derived from `updates.md` (code review & improvement plan) and is **sorted roughly by implementation difficulty**.

- **Tier 1** = small / low‑risk tasks.
- **Tier 2** = moderate tasks, likely touching multiple files.
- **Tier 3** = large refactors or feature epics.

Use checkboxes to track progress; add dates/links as you complete items.

---

## Tier 1 – Easy / Low‑Risk Tasks

### Meta & Documentation

- [x] **Code review summary in `updates.md`** – Document high‑level architecture and improvement plan.  
- [x] **Add Developer Guide to `README.md`** – How to run server, tests, and single vs multiplayer modes.
- [x] **Document WebSocket protocol** – Create `docs/protocol.md` describing message types (`STATE_UPDATE`, `ACTION`, `ROOM_*`), payloads, and expected phases.

### Scripts & Tooling Basics

- [x] **Add Bun scripts to `package.json`**
  - `"dev": "bun run index.ts"` (or the actual dev entry).
  - `"test": "bun test"` or Vitest wrapper.
  - `"lint": "eslint src --ext .ts,.tsx"` (once ESLint is configured).

### Rules & Core Mechanics (Verification Only)

- [x] **Verify rent logic** – Validated `rent.ts`. Fixed: mortgaged properties now return 0 rent. For:
  - Standard properties (monopoly multiplier, houses/hotel tiers).
  - Railroads (`base * 2^(n-1)`).
  - Utilities (4×/10× + card override).
- [x] **Verify jail rules** – “3 doubles -> Jail”, jail turn limits, 3 failed attempts => forced £50 payment, and “do not collect GO” flows.
- [x] **Verify bankruptcy & liquidation** – Asset transfer to players vs bank; auctions on bank bankruptcy; elimination rules.
- [x] **Verify housing scarcity enforcement** – Check `availableHouses`/`availableHotels` counters and all build/sell flows for correctness.
- [x] **Verify auction integrity** – Ensure minimum bid increments and “only active bidder can act” are enforced server‑side.

### UI / UX Small Enhancements

- [x] **Improve phase clarity copy** – Ensure each `GamePhase` has a short “What you can do now” message.
- [x] **Add simple property tooltips** – On hover/tap show owner name, current rent, mortgage status (reuse existing `PropertyDetailsModal` formatting).

### Testing Skeleton

- [x] **Wire up test runner** – Ensure `bun test` (or Vitest) is runnable with at least one passing smoke test.
- [x] **Create `tests/rules/` folder** – Add placeholder/spec files for rent, economics, and GameRoom tests.

---

## Tier 2 – Medium‑Size Tasks

### Architecture & State Management

- [x] **Narrow selectors in `useGameStore` consumers**
  - Replace broad `useGameStore((s) => s)` subscriptions with specific slices (spaces, diceRoll, phase, etc.).
  - Confirm no regressions in rerender behavior.
- [x] **Introduce derived selectors/helpers**
  - Encapsulate common derived data (net‑worth rankings, money in circulation, active player identity) instead of recomputing in components.

### Rules & Parity with `monopoly.md`

- [x] **Add unit tests for rent rules** – Cover all rent combinations and card overrides (`logic/rules/rent.ts`).
- [x] **Add unit tests for economics** – Inflation, net worth, Gini coefficient, tax calculations, and property pricing (`logic/rules/economics.ts`).
- [x] **Create parity checklist with `monopoly.md`** – Created comprehensive `docs/parity-checklist.md` mapping 13 spec sections to code + tests with status indicators.

### Economic Systems & Feedback

- [x] **Economy bar UI**
  - Show current GO salary, inflation trend indicator, and money in circulation (using `marketHistory` helpers).
  - Place unobtrusively near `BoardMarketStatus` or top HUD.
- [x] **Centralize economic event modifiers** – Exported `isEconomicEventActive`, `applyRentEventModifier`, `applyPriceEventModifier` from economics.ts. `rent.ts` now uses shared helpers. Added comprehensive `economicEvents.test.ts` with 18 tests.

### UI / UX & Accessibility

- [x] **Economic indicators panel**
  - GO inflation, housing scarcity pool (houses/hotels remaining), and market status (Recession/Bull/Bear/Crash).
- [x] **Property value feedback icons**
  - 📈/📉 on property tiles when `valueMultiplier` ≠ 1.0 (already implemented in `Board` with `property.valueMultiplier`).
- [x] **Property details improvements** – `PropertyDetailsModal` now shows enhanced insurance status (with coverage round), uninsured risk warning, ARIA dialog role, and already showed market/base price + value multiplier.
- [x] **Reduced‑motion setting** – Added `reducedMotion` to `GameSettings`, toggle in BurgerMenu, wired in App.tsx.
- [x] **Accessibility audit** – Added ARIA `role="dialog"` + `aria-label` to all modals (PropertyDetails, Auction, Bankruptcy, RentNegotiation), `role="status"` to current player indicator, `aria-label` to Roll Dice button, `role="region"` to Board, `aria-live="polite"` to Chapter 11 banner.

### Multiplayer & Networking

- [x] **Implement PING/PONG heartbeats** – Client sends `PING` every 15s in `gameStore.ts`, server replies with `PONG` in `index.ts`. Interval cleared on disconnect.
- [x] **Surface connection status per player** – Already implemented in `UserPanel.tsx` with green/red dots and “(OFFLINE)” labels.
- [x] **Room lifecycle cleanup** – `GameManager.ts` now has `deleteRoom`, `touchRoom`, and auto-cleanup of idle rooms (10 min timeout). Server touches rooms on actions.

### AI & Game Flow

- [x] **AI strategy tuning** – Wired up unused `buildingThreshold` (replaces hardcoded 500) and `tradeAcceptanceThreshold` (replaces hardcoded 0.95) from `getDifficultyModifiers`.
- [x] **AI building performance** – Verified multi-build loop with even building. Fixed: AI now checks `availableHouses`/`availableHotels` before attempting builds.
- [x] **Reduce AI trade spam**
  - Strengthen `tradeHistory` usage with per‑pair cooldown and hard caps on repeat proposals of the same deal.
- [x] **Clarify Chapter 11 communication** – Added persistent Chapter 11 banner in `App.tsx` showing debt target, cash, turns remaining, and progress bar. Uses `aria-live="polite"` for accessibility.

### Testing & Stability

- [x] **Expand `GameRoom` tests** – Added `tests/server/GameRoom.test.ts` with 24 tests covering setup, turn progression, jail, auctions, property buying, building (even + scarcity), mortgage/unmortgage, and settings.
- [x] **Integration scenario: basic 2-player game** – Added `tests/integration/basic2Player.test.ts` with 8 tests: full turn cycle, property purchase + rent, housing scarcity, multi-turn cycling, mortgage/unmortgage, and lifecycle.

---

## Tier 3 – Large Refactors & Feature Epics

### Server & Architecture

- [ ] **Refactor `GameRoom` into domain modules**
  - `server/actions/core.ts` – roll/move/space resolution, jail, GO, bankruptcy.
  - `server/actions/auction.ts` – auction lifecycle and bidding rules.
  - `server/actions/trade.ts` – trade offers, counter‑offers, acceptance/rejection.
  - `server/actions/economy.ts` – inflation, events, GO salary, jackpot.
  - `server/actions/debt.ts` – loans, IOUs, Chapter 11, foreclosure.
  - `server/actions/multiplayer.ts` – room, join/leave, reconnection.
- [ ] **Introduce pure state transitions**
  - Encapsulate action handling as pure functions `(state, action) => newState` to ease testing and replay from logs.

### Debt, IOUs, and Chapter 11

- [ ] **Extract dedicated debt module**
  - Implement `applyInterest`, `createIOU`, `settleIOU`, `enterChapter11`, `tickDebtOnGo`, and foreclosure flows in one place.
- [ ] **Debt invariants helper**
  - Add `validateDebtInvariants(state)` and invoke in tests (and optionally debug builds) to ensure:
    - IOU `roundsRemaining` ≥ 0 and consistent with `turn`.
    - `totalDebt` matches sum of loans/IOUs.
    - No orphaned IOUs (referencing missing players).
- [ ] **Integration scenario: Chapter 11 + IOUs**
  - Full game snippet that exercises:
    - Player entering Chapter 11.
    - Paying via reduced rent share and/or asset liquidation.
    - Possible foreclosure/asset transfer.

### AI System

- [ ] **Modularize AI into strategy files**
  - Extract logic from `logic/ai/index.ts` into:
    - `ai/turn.ts`, `ai/auction.ts`, `ai/trade.ts`, `ai/debt.ts`, `ai/rentNegotiation.ts`.
  - Introduce `AIContext` (difficulty, netWorth, cashReserve, threatLevel, etc.) shared by all strategies.
- [ ] **Deterministic AI behavior**
  - Seed any random decisions from a known RNG so AI behavior can be replayed precisely in tests and logs.
- [ ] **Advanced AI behavior tuning**
  - Make endgame aggression and leverage decisions sensitive to relative standing (e.g. Gini + rankings).

### Multiplayer & Security

- [ ] **Server‑side action authorization**
  - Validate that only the correct `clientId` can perform actions for the active player/phase.
  - Reject and log invalid attempts (e.g. wrong player trying to roll or bid).
- [ ] **Robust reconnect and host handoff**
  - Ensure AI driving is consistently assigned to the “host” human.
  - On host disconnect, transfer responsibility seamlessly to the next human player.

### Testing & CI

- [ ] **Full rules test suite**
  - Comprehensive coverage of rent, jail, auctions, bankruptcy, houses/hotels, taxes, and economic events.
- [ ] **Stress tests for multiplayer**
  - Simulate concurrent joins/leaves, repeated auctions, and rapid actions over WebSocket.
- [ ] **CI pipeline**
  - Run tests and lint on push/PR.
  - Optionally add basic smoke e2e (single‑player game start) before merge.

---

## Known Bugs & Edge Cases (High Priority)

Track bugs separately from feature work; tackle them as they surface during implementation and testing.

1. **Jail transition UX**
   - `goToJail` was ending turn inline in earlier versions; current flow now pauses on `resolving_space` for transition visibility.
2. **Chapter 11 debt messaging**
   - Make sure the final subtraction of `chapter11DebtTarget` from player cash is clearly shown in logs/UI.
3. **AI trade spam**
   - Strengthen protections so AI does not repeatedly propose the same obviously bad trade.
4. **Stale `diceRoll`**
   - Ensure `diceRoll` is always cleared at the start of a new turn; guard against UI glitches from stale values.

---

## Immediate Tasks (Working Set)

Use this section as the short‑term focus list; pull items from the tiers above.

1. **Rules verification**
   - [x] Verify rent, jail, bankruptcy, housing scarcity, and auction logic against `monopoly.md`.
2. **AI & bugs**
   - [x] Investigate and fix AI trade spam using `tradeHistory` and better thresholds.
3. **Tests**
   - [x] Add at least one new `rent.ts` and `economics.ts` unit test.

# Ludomercatus - Codebase Analysis & Roadmap

This document outlines a comprehensive analysis of the current Ludomercatus codebase and a roadmap for implementing a complete Monopoly-like experience.

## Codebase Analysis

### Current State
The project is a React + TypeScript web application using Zustand for state management and Bun as the runtime/bundler. It implements the core mechanics of a property trading game.

**Key Components:**
- **Store:** `gameStore.ts` handles the central game logic (state machine, actions).
- **Types:** `types/game.ts` defines the data structures (Player, Property, GameState, etc.).
- **Data:** `board.ts` and `cards.ts` contain the static game data.
- **UI:** React components for the Board, Player Setup, Modals (Auction, Trade, etc.).
- **Server:** A WebSocket server (`server/GameRoom.ts`) manages multiplayer synchronization.

### Missing / Incomplete Features (Gap Analysis)
Compared to a standard "Monopoly" game, the following areas need attention:

1.  **Game Loop Refinement:**
    -   End-game conditions (bankruptcy of all but one player) need robust testing.
    -   Turn phases (especially complex interactions like doubles, jail, etc.) need verification.

2.  **UI/UX Improvements:**
    -   **Visual Polish:** The UI is functional but could be more immersive.
    -   **Animations:** More animations for dice rolls, token movement, and money transfers.
    -   **Responsiveness:** Ensure mobile compatibility is fully optimized.

3.  **Advanced Rules:**
    -   **Housing Scarcity:** Implemented in state but needs verification in UI (can't build if no houses left).
    -   **Mortgaging logic:** Ensure rent is not collected on mortgaged properties.
    -   **Unmortgaging:** verify 10% interest calculation.

4.  **Multiplayer Robustness:**
    -   Reconnection logic.
    -   Handling player disconnects during critical phases (auctions, trades).

5.  **Code Quality:**
    -   The codebase is generally well-structured.
    -   Need to ensure consistent error handling.
    -   More unit tests for complex logic (trade validation, bankruptcy resolution).

## Roadmap

### Phase 1: Core Mechanics Verification & Fixes
- [ ] **Verify Rent Logic:** Ensure rent calculations are correct for all property types (Standard, Railroad, Utility) and modifiers (Monopoly, Houses, Hotels).
- [ ] **Verify Jail Rules:** Check "3 doubles = Jail", "3 turns in Jail", and "Get out of Jail" mechanics.
- [ ] **Verify Bankruptcy & Liquidation:** Ensure assets (cash, properties, jail cards) are properly transferred to creditors.
- [ ] **Housing Scarcity Enforcement:** Verify that global building limits (32 houses, 12 hotels) are strictly enforced in both logic and UI.
- [ ] **Auction Integrity:** Verify minimum bid increments and "Security" check (only active bidder can act).

## Phase 2: UI/UX & Economic Feedback
- [ ] **Economic Indicators:** Add UI markers for Inflation (GO salary), Housing Scarcity (remaining pool), and Market Status (Bull/Bear).
- [ ] **Property Value Feedback:** Show 📈/📉 indicators on property cards when Value Fluctuation is active.
- [ ] **Financial Dashboard:** Create a "Loans & Debt" tab for players to manage Bank Loans and IOUs.
- [ ] **Chapter 11 UI:** Add a dedicated modal for restructuring decisions and a persistent status tracker (Debt Target vs Turns Remaining).
- [ ] **Rent Negotiation UI:** Improve the flow for offering IOUs or demanding properties when a player cannot afford rent.

## Phase 3: AI & Advanced Features
- [ ] **AI Strategy Tuning:** Verify difficulty-based modifiers (ROI thresholds, auction aggressiveness) for Easy/Medium/Hard AI.
- [ ] **AI Performance:** Optimize AI building logic to handle multiple developments per turn if cash allows (while maintaining visual feedback).
- [ ] **Property Insurance:** Add a "Buy Insurance" button to developed properties and show "Insured" status.
- [ ] **Tax Choice UI:** Ensure the optimal tax calculation (10% vs 200) is clearly presented to the player.

## Phase 4: Stability & Testing
- [ ] **Unit Tests:** Add comprehensive tests for `rent.ts`, `economics.ts`, and `GameRoom.ts` (especially Chapter 11 logic).
- [ ] **Integration Tests:** Test full game scenarios: Market Crash -> Banking Crisis -> Multiple Bankruptcies.
- [ ] **Sync Verification:** Ensure all Phase 2/3 features (Insurance, IOUs, Loans) are correctly broadcasted in multiplayer.

## Identified Bugs & Edge Cases
1.  **Jail Transition:** `goToJail` calls `endTurn` immediately, which may cause a jarring UI jump before movement animations finish.
2.  **Chapter 11 Debt:** Verify that subtracting the `chapter11DebtTarget` from player cash upon success is clearly communicated.
3.  **AI Trade Spam:** Ensure AI doesn't repeatedly propose the same rejected trade (partially addressed by `tradeHistory` but needs verification).
4.  **Stale Dice Roll:** Ensure `diceRoll` state is cleared when a new turn begins to prevent UI glitches.

## Immediate Tasks (Next Steps)
1.  **Review `monopoly.ts`:** Check rent calculation logic.
2.  **Review `gameStore.ts`:** Check turn management and phase transitions.
3.  **Run Tests:** Execute existing tests to identify immediate breakages.

