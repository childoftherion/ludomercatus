# Ludomercatus

Ludomercatus is a digital, Monopoly‑style economic board game implemented as a React + TypeScript application with a Bun‑powered WebSocket server.

---

## Installation

To install dependencies:

```bash
bun install
```

---

## Developer Guide

### Running the game (single player / local)

From the project root:

```bash
bun run index.ts
```

or using the script:

```bash
bun run dev
```

Then open the printed URL (typically `http://localhost:3000` or similar, depending on your Bun HTTP setup) in a browser.

### Multiplayer & rooms

- The Bun server also hosts a WebSocket endpoint at `/ws`.
- The lobby UI allows you to:
  - Create a room (single‑player or multi‑player).
  - Join an existing room by ID or via the server browser.
  - Start the game once players are configured.

You can open multiple browser windows/tabs (or devices) pointing to the same room ID to simulate multiple human players; AI players can be added from the lobby.

### Running tests

Unit and integration tests are run with Bun’s built‑in test runner:

```bash
bun test
```

This will execute tests under `tests/` (and any other Bun‑discovered test files).

### Linting and formatting

Once ESLint is configured, you can run:

```bash
bun run lint
```

to lint the TypeScript/React source (`src/**/*.ts` / `src/**/*.tsx`).  
Prettier/ESLint configuration files should live alongside the project (e.g. `.eslintrc.*`, `.prettierrc`).

---

## Project Notes

This project was created using `bun init` in bun v1.3.5.  
[Bun](https://bun.com) is a fast all‑in‑one JavaScript runtime.

