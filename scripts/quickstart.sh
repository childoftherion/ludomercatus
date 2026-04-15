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

# Common Git for Windows install locations (Git Bash session may not have them until we add).
append_git_to_path() {
  local d
  for d in \
    "/c/Program Files/Git/cmd" \
    "/c/Program Files/Git/bin" \
    "/c/Program Files (x86)/Git/cmd" \
    "/c/Program Files (x86)/Git/bin"; do
    if [[ -d "$d" ]]; then
      case ":$PATH:" in *":$d:"*) ;; *) export PATH="$d:$PATH" ;; esac
    fi
  done
  if [[ -n "${PROGRAMFILES:-}" ]]; then
    d="${PROGRAMFILES//\\//}/Git/cmd"
    [[ -d "$d" ]] && case ":$PATH:" in *":$d:"*) ;; *) export PATH="$d:$PATH" ;; esac
  fi
}

ensure_git() {
  append_git_to_path
  if command -v git >/dev/null 2>&1; then
    echo "Found Git: $(command -v git) ($(git --version 2>/dev/null | head -1))"
    return 0
  fi

  echo "Git not found. Attempting to install Git..." >&2
  local os
  os="$(uname -s 2>/dev/null || echo unknown)"

  case "$os" in
    MINGW* | MSYS* | CYGWIN*)
      if ! command -v powershell.exe >/dev/null 2>&1; then
        echo "Error: PowerShell is required to install Git on Windows. Install from: https://git-scm.com/download/win" >&2
        exit 1
      fi
      powershell.exe -NoProfile -ExecutionPolicy Bypass -Command '
        $ErrorActionPreference = "Stop"
        if (Get-Command git -ErrorAction SilentlyContinue) { exit 0 }
        if (Get-Command winget -ErrorAction SilentlyContinue) {
          winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements
        } elseif (Get-Command choco -ErrorAction SilentlyContinue) {
          choco install git.install -y
        } else {
          Write-Error "Install Git for Windows from https://git-scm.com/download/win (winget or Chocolatey not found)."
          exit 1
        }
      ' || {
        echo "Error: Git installation failed. Install manually: https://git-scm.com/download/win" >&2
        exit 1
      }
      append_git_to_path
      ;;
    Darwin)
      if command -v brew >/dev/null 2>&1; then
        brew install git
      else
        echo "Error: Git is not installed and Homebrew was not found." >&2
        echo "Install Git: https://git-scm.com/download/mac" >&2
        echo "Or install Homebrew (https://brew.sh), then run this script again." >&2
        exit 1
      fi
      ;;
    Linux)
      if command -v apt-get >/dev/null 2>&1; then
        export DEBIAN_FRONTEND=noninteractive
        sudo apt-get update -qq
        sudo apt-get install -y -qq git
      elif command -v dnf >/dev/null 2>&1; then
        sudo dnf install -y git
      elif command -v yum >/dev/null 2>&1; then
        sudo yum install -y git
      elif command -v zypper >/dev/null 2>&1; then
        sudo zypper install -y git
      elif command -v pacman >/dev/null 2>&1; then
        sudo pacman -S --noconfirm git
      elif command -v apk >/dev/null 2>&1; then
        sudo apk add --no-cache git
      else
        echo "Error: Could not detect a package manager to install git." >&2
        echo "Install git using your distribution's package manager, then run this script again." >&2
        echo "https://git-scm.com/download/linux" >&2
        exit 1
      fi
      ;;
    *)
      echo "Error: Unsupported OS for automatic Git install. Install Git from https://git-scm.com/downloads" >&2
      exit 1
      ;;
  esac

  append_git_to_path
  if ! command -v git >/dev/null 2>&1; then
    echo "Error: Git was installed but is not on PATH in this shell." >&2
    echo "Close this terminal, open a new one, and run this script again." >&2
    echo "https://git-scm.com/downloads" >&2
    exit 1
  fi

  echo "Git is ready: $(command -v git) ($(git --version | head -1))"
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

ensure_git
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
