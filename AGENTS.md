# Ludomercatus Game - Agent Guidelines

## Project Overview

A browser-based Ludomercatus game built with React, TypeScript, Zustand for state management, and Framer Motion for animations. Uses Bun as the runtime and bundler.

## Build & Run Commands

```bash
# Install dependencies
bun install

# Run development server with hot reload
bun --hot ./index.ts

# Run production server
bun ./index.ts

# Type check (no emit, uses bundler mode)
bunx tsc --noEmit
```

## Testing

```bash
# Run all tests
bun test

# Run a single test file
bun test <filename>

# Run tests matching a pattern
bun test --grep "pattern"

# Example test structure:
# import { test, expect } from "bun:test";
# test("description", () => { expect(1).toBe(1); });
```

Note: Test files should use `.test.ts` or `.test.tsx` extension.

## Project Structure

```
src/
  App.tsx              # Main application component with game logic
  style.css            # Global styles
  components/
    Board.tsx          # Game board rendering
    Dice.tsx           # Dice component with animations
    PlayerSetup.tsx    # Player selection/setup screen
    PlayerToken.tsx    # Player token rendering on board
  data/
    board.ts           # Board space definitions (40 spaces)
    cards.ts           # Chance and Community Chest cards
  store/
    gameStore.ts       # Zustand store with all game state and actions
  types/
    game.ts            # TypeScript type definitions
index.ts               # Bun server entry point
index.html             # HTML entry with React mount point
```

## Code Style Guidelines

### TypeScript Configuration

- **Strict mode enabled** - All strict checks are on
- **noUncheckedIndexedAccess** - Array access may return undefined
- **noFallthroughCasesInSwitch** - Switch cases must break/return
- **noImplicitOverride** - Must use `override` keyword
- **verbatimModuleSyntax** - Use `import type` for type-only imports

### Imports

```typescript
// Use type imports for type-only imports
import type { GameState, Player, Property } from "../types/game"

// Regular imports for values
import { create } from "zustand"
import { motion, AnimatePresence } from "framer-motion"
import { useGameStore } from "../store/gameStore"
```

### Naming Conventions

- **Components**: PascalCase (`Board`, `PlayerToken`, `PlayerSetup`)
- **Functions/Variables**: camelCase (`handleRollDice`, `currentPlayer`)
- **Types/Interfaces**: PascalCase (`GameState`, `Property`, `DiceRoll`)
- **Type aliases**: PascalCase (`SpaceType`, `ColorGroup`, `GamePhase`)
- **Constants**: SCREAMING_SNAKE_CASE for module-level (`SPACE_SIZE`, `PLAYER_COLORS`)
- **Files**: PascalCase for components (`Board.tsx`), camelCase for others (`gameStore.ts`)

### React Patterns

```typescript
// Functional components with explicit return types not required
export default function App() { ... }
export const Board = () => { ... }

// Use hooks at component top level
const { phase, players } = useGameStore();
const [state, setState] = React.useState(initialValue);

// Event handlers as arrow functions
const handleClick = () => { ... };

// Inline styles preferred over CSS classes for dynamic styling
style={{ backgroundColor: color, padding: "16px" }}
```

### Zustand Store Pattern

```typescript
// Store type combines state and actions
type GameStore = GameState & {
  initGame: (playerNames: string[], tokens: string[]) => void;
  rollDice: () => DiceRoll;
  // ... other actions
};

// Create store with set/get pattern
export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  players: [],
  phase: "setup",

  // Actions that modify state
  initGame: (playerNames, tokens) => {
    set({ players: [...], phase: "rolling" });
  },

  // Actions that need current state
  movePlayer: (playerIndex, steps) => {
    const state = get();
    // ... logic
    set({ players: updatedPlayers });
  },
}));
```

### Type Definitions

```typescript
// Union types for enums
export type SpaceType = "go" | "property" | "railroad" | "utility" | "tax"
export type GamePhase = "setup" | "rolling" | "moving" | "game_over"

// Interfaces for object shapes
export interface Player {
  id: number
  name: string
  cash: number
  // ...
}

// Type guards for narrowing
const isProperty = (space: Space): space is Property => {
  return space.type === "property" || space.type === "railroad"
}
```

### Error Handling

- Use early returns for validation: `if (!player) return;`
- Non-null assertions with `!` only when guaranteed by logic
- Handle undefined from array access due to `noUncheckedIndexedAccess`

```typescript
const player = state.players[playerIndex]
if (!player || player.bankrupt) return // Guard against undefined

// After guard, safe to use
player.cash += 200
```

### Animation Patterns (Framer Motion)

```typescript
<motion.div
  initial={{ opacity: 0, y: -20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0 }}
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  transition={{ type: "spring", stiffness: 300 }}
>
```

## Bun-Specific Guidelines

- Use `Bun.serve()` for HTTP server (see `index.ts`)
- HTML imports work directly: `import indexHtml from "./index.html"`
- No need for Vite/Webpack - Bun bundles automatically
- Environment variables loaded automatically (no dotenv needed)
- Prefer `Bun.file()` over `node:fs` for file operations

## Key Game Logic Locations

- **Game flow**: `src/store/gameStore.ts` - all state mutations
- **Board data**: `src/data/board.ts` - 40 space definitions
- **Card effects**: `src/data/cards.ts` - Chance/Community Chest actions
- **Types**: `src/types/game.ts` - all TypeScript interfaces

## Common Patterns

### Creating Game Objects

```typescript
// Factory functions for creating objects
const createPlayer = (
  id: number,
  name: string,
  token: string,
  color: string
): Player => ({
  id,
  name,
  token,
  color,
  cash: 1500,
  position: 0,
  properties: [],
  inJail: false,
  // ...
})
```

### Array Immutability

```typescript
// Always create new arrays/objects when updating state
set({
  players: state.players.map((p, i) =>
    i === playerIndex ? { ...p, cash: p.cash + 200 } : p
  ),
})
```
