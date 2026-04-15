# Ludomercatus

**Ludomercatus** is a browser-based, Monopoly-style board game themed around Oregon. The client is a React + TypeScript UI; **all authoritative game logic runs on a Bun HTTP + WebSocket server** so single-player, hot-seat, and multi-tab / multi-device sessions stay consistent.

---

## Quick start (clone to Desktop and run)

Use this when you want a **fresh copy on your Desktop** with one command. You need **[Git](https://git-scm.com/downloads)** on your `PATH`.

**Bun** is detected automatically: if `bun` is missing, the scripts run the [official Bun installers](https://bun.sh/docs/installation) (`curl … | bash` on macOS/Linux, **`irm https://bun.sh/install.ps1 | iex`** on Windows—including when you use **Git Bash**, which invokes PowerShell for that step). On Unix, **`curl`** or **`wget`** is required for the Bun install script.

The scripts live in this repository under [`scripts/quickstart.sh`](scripts/quickstart.sh) and [`scripts/quickstart.ps1`](scripts/quickstart.ps1). They detect the OS, resolve your **Desktop** folder, **`git clone`** [https://github.com/childoftherion/ludomercatus](https://github.com/childoftherion/ludomercatus) into `Desktop/ludomercatus` (or **`git pull`** if that folder already exists from a previous run), then run **`bun install`** and **`bun run dev`**. Open **http://localhost:3000** when the server starts.

### macOS, Linux, or Windows (Git Bash)

In **Terminal** (macOS/Linux) or **Git Bash** (Windows), paste:

```bash
curl -fsSL https://raw.githubusercontent.com/childoftherion/ludomercatus/main/scripts/quickstart.sh | bash
```

If you prefer `wget`:

```bash
wget -qO- https://raw.githubusercontent.com/childoftherion/ludomercatus/main/scripts/quickstart.sh | bash
```

### Windows (PowerShell)

Open **PowerShell** (not Command Prompt). If script execution from the internet is blocked, allow scripts for your user once:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Then run:

```powershell
irm https://raw.githubusercontent.com/childoftherion/ludomercatus/main/scripts/quickstart.ps1 | iex
```

(`irm` is an alias for `Invoke-RestMethod`; it downloads the script and `iex` runs it.)

To use a custom folder under PowerShell before `irm ... | iex`:

```powershell
$env:LUDOMERCATUS_TARGET = "$HOME\Code\ludomercatus"
irm https://raw.githubusercontent.com/childoftherion/ludomercatus/main/scripts/quickstart.ps1 | iex
```

### Overrides (optional)

| Variable | Effect |
|----------|--------|
| `LUDOMERCATUS_TARGET` | Full path to the clone directory (default: `Desktop/ludomercatus`) |
| `LUDOMERCATUS_REPO_URL` | Git remote URL (default: `https://github.com/childoftherion/ludomercatus.git`) |

Example (bash—the variables must be visible to the shell that runs the downloaded script):

```bash
export LUDOMERCATUS_TARGET="$HOME/Code/ludomercatus"
curl -fsSL https://raw.githubusercontent.com/childoftherion/ludomercatus/main/scripts/quickstart.sh | bash
```

If you **already cloned** the repo yourself, skip the one-liners and use [Installation](#installation) and [Running the game](#running-the-game) below.

---

## What you get

- **Classic loop**: roll, move, buy or auction properties, pay rent, build houses and hotels, Chance and Community Chest, jail, GO salary, bankruptcy, and win conditions.
- **Economic realism**: progressive income tax choices, inflation-style GO salary growth, **housing scarcity** (limited houses/hotels), and **economic events** that shift the market.
- **Advanced systems**: rent negotiation (including IOUs and payment plans), **property insurance** (repairs and some market protection), **Chapter 11–style restructuring**, **debt service and foreclosure** flows, and **difficulty-tuned AI** opponents.
- **Trading**: draft offers, continuous counter-offers (roles swap on the main offer), accept/reject/cancel with server-side validation (e.g. no trading properties that still have buildings).
- **Multiplayer model**: rooms with WebSocket sync; create/join rooms from the lobby, or use the default room for quick local play.

---

## Requirements

- **[Bun](https://bun.sh)** (recent 1.x). The project is built and run with Bun only—no separate Vite/Webpack dev server.

---

## Installation

From the `ludomercatus` directory:

```bash
bun install
```

---

## Running the game

The server listens on **port 3000** and serves the bundled UI at **`http://localhost:3000`**. WebSocket traffic uses **`/ws`** (the client appends your stable `clientId` query parameter).

### Production-style run (no file watcher)

```bash
bun run dev
```

This runs the `dev` script in `package.json`, which executes `bun run index.ts`.

### Recommended: development with hot reload

When you are changing **`index.ts`**, **`src/server/*`**, or other server-side code, use Bun’s hot reloader so the process restarts on save:

```bash
bun --hot run dev
```

**What this does:** `bun --hot` watches the entry graph and reloads the server when dependencies change; `run dev` still resolves to `bun run index.ts` via `package.json`. Use this for day-to-day work so you are not manually restarting after every edit to `GameRoom.ts` or the WebSocket handler.

---

## How play is wired (high level)

1. **HTTP**: `GET /` returns `index.html`, which loads the React app (bundled by Bun from the HTML import in `index.ts`).
2. **WebSocket**: the client opens `ws://<host>/ws?clientId=...`. Messages include room lifecycle (`CREATE_ROOM`, `JOIN_ROOM`, `LIST_ROOMS`), heartbeats (`PING` / `PONG`), and game **`ACTION`** payloads `{ type: "ACTION", action: "<methodName>", payload: [...] }`.
3. **Server**: `index.ts` resolves the room, calls **`GameRoom.authorizeAction(clientId, action, payload)`**, and on success invokes the matching **`GameRoom`** method. State updates are broadcast to subscribers for that room.
4. **Client**: `src/store/gameStore.ts` mirrors server state from `STATE_UPDATE` messages and sends actions over the socket; optimistic UI is limited—**the server is the source of truth**.

---

## Project layout

```text
ludomercatus/
  index.ts                 # Bun.serve: routes, WebSocket, ACTION dispatch
  index.html               # App shell (imported by Bun for bundling)
  package.json
  NEEDS.md                 # Roadmap / issues / testing checklist
  AGENTS.md                  # Contributor & agent guidelines
  scripts/
    quickstart.sh            # Desktop clone + bun install + dev (Unix / Git Bash)
    quickstart.ps1           # Same for Windows PowerShell
  src/
    App.tsx                  # Main UI shell, modals, AI triggers
    style.css
    components/              # Board, dice, modals, lobby, panels, …
    data/
      board.ts               # 40 spaces, Oregon-themed names
      cards.ts                 # Chance & Community Chest
    logic/
      ai/index.ts            # AI decisions (turns, auctions, trades, …)
      rules/                 # Rent, monopoly, economics helpers
      derivedData.ts
    server/
      GameManager.ts         # Room registry, idle cleanup
      GameRoom.ts            # Core rules, state mutations, authorization
      GameRoom.test.ts
    store/
      gameStore.ts           # Zustand + WebSocket client
      localStore.ts          # Persistent clientId (and related local state)
    types/
      game.ts                # GameState, phases, trades, IOUs, …
    utils/                   # Audio, validation, helpers, hooks
  tests/                     # Additional rule/unit tests (Bun discovers these too)
```

---

## Multiplayer and rooms

- Create a room from the lobby (single- or multi-player mode as offered by the UI), or join by room id.
- Each browser profile gets a **stable `clientId`** (see `localStore.ts`) so reconnecting and seat assignment map correctly.
- **AI seats** can be configured in the lobby; the host client typically drives **`executeAITurn`** / **`executeAITradeResponse`** through the same action channel (see `AGENTS.md` and `App.tsx` for the intended flow).

---

## Scripts

| Command             | Purpose                                                |
| ------------------- | ------------------------------------------------------ |
| `bun install`       | Install dependencies                                   |
| `bun run dev`       | Run server + app on port 3000                          |
| `bun --hot run dev` | Same as above with **hot reload** for faster iteration |
| `bun test`          | Run all tests (`src/**/*.test.ts`, `tests/**`, etc.)   |
| `bun run lint`      | ESLint on `src` (`*.ts`, `*.tsx`)                      |
| `bunx tsc --noEmit` | Typecheck without emitting JS (strict project)         |

---

## Testing

```bash
bun test
```

Tests include server-side game rules (`GameRoom.test.ts`), economics helpers under `tests/rules/`, and any other `*.test.ts` files Bun discovers.

---

## Linting

```bash
bun run lint
```

Requires ESLint configuration compatible with the TypeScript + React setup (see `package.json`).

---

## Documentation map

| File                    | Role                                                           |
| ----------------------- | -------------------------------------------------------------- |
| `README.md` (this file) | How to run, develop, and navigate the repo                     |
| `AGENTS.md`             | TypeScript/React/Zustand conventions, structure, test commands |
| `CLAUDE.md`             | Additional assistant-oriented project notes                    |

---

[Bun](https://bun.sh) is used as the runtime and bundler.
