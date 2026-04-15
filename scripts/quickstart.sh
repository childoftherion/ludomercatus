#!/usr/bin/env bash
# Ludomercatus quick start: clone (or update) on Desktop, install deps, run dev server.
# See README.md for one-liner usage from GitHub.

set -euo pipefail

REPO_URL="${LUDOMERCATUS_REPO_URL:-https://github.com/childoftherion/ludomercatus.git}"
TARGET_NAME="ludomercatus"

detect_desktop() {
  local os
  os="$(uname -s 2>/dev/null || echo unknown)"
  case "$os" in
    Darwin)
      echo "${HOME}/Desktop"
      ;;
    Linux)
      echo "${XDG_DESKTOP_DIR:-$HOME/Desktop}"
      ;;
    MINGW* | MSYS* | CYGWIN*)
      # Git Bash / MSYS2: USERPROFILE is like C:\Users\name
      if [[ -n "${USERPROFILE:-}" ]]; then
        echo "${USERPROFILE//\\//}/Desktop"
      else
        echo "${HOME}/Desktop"
      fi
      ;;
    *)
      echo "${HOME}/Desktop"
      ;;
  esac
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: '$1' is not installed or not on PATH." >&2
    echo "Install it from: $2" >&2
    exit 1
  fi
}

# Ensure ~/.bun/bin (and Windows Git Bash paths) are on PATH for this session.
append_bun_to_path() {
  export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
  case ":$PATH:" in
    *":$BUN_INSTALL/bin:"*) ;;
    *) export PATH="$BUN_INSTALL/bin:$PATH" ;;
  esac
  if [[ -n "${USERPROFILE:-}" ]]; then
    local win_bun="${USERPROFILE//\\//}/.bun/bin"
    if [[ -d "$win_bun" ]]; then
      case ":$PATH:" in
        *":$win_bun:"*) ;;
        *) export PATH="$win_bun:$PATH" ;;
      esac
    fi
  fi
}

ensure_bun() {
  append_bun_to_path
  if command -v bun >/dev/null 2>&1; then
    echo "Found Bun: $(command -v bun) ($(bun --version 2>/dev/null || echo "?"))"
    return 0
  fi

  local os
  os="$(uname -s 2>/dev/null || echo unknown)"
  echo "Bun not found. Installing Bun (official installer)..." >&2

  case "$os" in
    MINGW* | MSYS* | CYGWIN*)
      if ! command -v powershell.exe >/dev/null 2>&1; then
        echo "Error: PowerShell is required to install Bun on Windows. Install Bun manually: https://bun.sh/docs/installation" >&2
        exit 1
      fi
      powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "irm https://bun.sh/install.ps1 | iex"
      ;;
    *)
      if command -v curl >/dev/null 2>&1; then
        curl -fsSL https://bun.sh/install | bash
      elif command -v wget >/dev/null 2>&1; then
        wget -qO- https://bun.sh/install | bash
      else
        echo "Error: Need curl or wget to install Bun. Install Bun manually: https://bun.sh/docs/installation" >&2
        exit 1
      fi
      ;;
  esac

  append_bun_to_path

  if ! command -v bun >/dev/null 2>&1; then
    echo "Error: Bun was installed but is not on PATH in this shell." >&2
    echo "Open a new terminal and run this script again, or add ~/.bun/bin (and on Windows, %USERPROFILE%\\.bun\\bin) to PATH." >&2
    echo "https://bun.sh/docs/installation" >&2
    exit 1
  fi

  echo "Bun is ready: $(command -v bun) ($(bun --version))"
}

DESKTOP="$(detect_desktop)"
TARGET="${LUDOMERCATUS_TARGET:-$DESKTOP/$TARGET_NAME}"

echo "Ludomercatus quick start"
echo "  Desktop: $DESKTOP"
echo "  Target:  $TARGET"
echo ""

require_cmd git "https://git-scm.com/downloads"
ensure_bun

mkdir -p "$DESKTOP"

if [[ -d "$TARGET" ]]; then
  if [[ -d "$TARGET/.git" ]]; then
    echo "Updating existing clone..."
    git -C "$TARGET" pull --ff-only || {
      echo "Warning: git pull failed; continuing with current tree." >&2
    }
  else
    echo "Error: directory exists but is not a git repository: $TARGET" >&2
    echo "Remove or rename it, then run this script again." >&2
    exit 1
  fi
else
  echo "Cloning repository..."
  git clone "$REPO_URL" "$TARGET"
fi

cd "$TARGET"

echo ""
echo "Installing dependencies (bun install)..."
bun install

echo ""
echo "Starting dev server (bun run dev)..."
echo "Open http://localhost:3000 in your browser."
echo ""

exec bun run dev
