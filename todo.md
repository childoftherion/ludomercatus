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

