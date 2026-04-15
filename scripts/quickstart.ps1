# Ludomercatus quick start for Windows (PowerShell)
# Clones or updates the repo on your Desktop, then runs bun install and bun run dev.

$ErrorActionPreference = "Stop"

$RepoUrl = if ($env:LUDOMERCATUS_REPO_URL) { $env:LUDOMERCATUS_REPO_URL } else { "https://github.com/childoftherion/ludomercatus.git" }
$Desktop = [Environment]::GetFolderPath("Desktop")
$Target = if ($env:LUDOMERCATUS_TARGET) { $env:LUDOMERCATUS_TARGET } else { Join-Path $Desktop "ludomercatus" }

function Require-Cmd {
    param([string]$Name, [string]$HelpUrl)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        Write-Error "Missing '$Name'. Install from: $HelpUrl"
        exit 1
    }
}

function Add-BunToPath {
    $BunBin = Join-Path $env:USERPROFILE ".bun\bin"
    if (Test-Path $BunBin) {
        if ($env:PATH -notlike "*$BunBin*") {
            $env:PATH = "$BunBin;$env:PATH"
        }
    }
}

function Ensure-Bun {
    Add-BunToPath
    $existing = Get-Command bun -ErrorAction SilentlyContinue
    if ($existing) {
        $ver = & bun --version 2>$null
        Write-Host "Found Bun: $($existing.Source) ($ver)"
        return
    }

    Write-Host "Bun not found. Installing Bun (official installer)..." -ForegroundColor Cyan
    irm https://bun.sh/install.ps1 | iex
    Add-BunToPath

    if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
        Write-Error @"
Bun was installed but is not on PATH in this session.
Open a new PowerShell window and run this script again, or add this folder to your user PATH:
  $(Join-Path $env:USERPROFILE '.bun\bin')
See: https://bun.sh/docs/installation
"@
        exit 1
    }

    $ver = & bun --version 2>$null
    Write-Host "Bun is ready: $((Get-Command bun).Source) ($ver)"
}

Write-Host "Ludomercatus quick start"
Write-Host "  Desktop: $Desktop"
Write-Host "  Target:  $Target"
Write-Host ""

Require-Cmd "git" "https://git-scm.com/download/win"
Ensure-Bun

if (Test-Path $Target) {
    $gitDir = Join-Path $Target ".git"
    if (Test-Path $gitDir) {
        Write-Host "Updating existing clone..."
        Push-Location $Target
        git pull --ff-only
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "git pull failed; continuing with current tree."
        }
        Pop-Location
    } else {
        Write-Error "Directory exists but is not a git repository: $Target`nRemove or rename it, then run this script again."
        exit 1
    }
} else {
    Write-Host "Cloning repository..."
    git clone $RepoUrl $Target
}

Set-Location $Target

Write-Host ""
Write-Host "Installing dependencies (bun install)..."
& bun install

Write-Host ""
Write-Host "Starting dev server (bun run dev)..."
Write-Host "Open http://localhost:3000 in your browser."
Write-Host ""

& bun run dev
