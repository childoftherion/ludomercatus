# Ludomercatus quick start for Windows (PowerShell)
# Clones or updates the repo on your Desktop, then runs bun install and bun run dev.

$ErrorActionPreference = "Stop"

$RepoUrl = if ($env:LUDOMERCATUS_REPO_URL) { $env:LUDOMERCATUS_REPO_URL } else { "https://github.com/childoftherion/ludomercatus.git" }
$Desktop = [Environment]::GetFolderPath("Desktop")
$Target = if ($env:LUDOMERCATUS_TARGET) { $env:LUDOMERCATUS_TARGET } else { Join-Path $Desktop "ludomercatus" }

function Update-PathFromEnvironment {
    $machine = [Environment]::GetEnvironmentVariable("Path", "Machine")
    $user = [Environment]::GetEnvironmentVariable("Path", "User")
    $segments = @($machine, $user | Where-Object { $_ })
    if ($segments.Count -gt 0) {
        $env:PATH = ($segments -join ";")
    }
    $gitCandidates = @((Join-Path $env:ProgramFiles "Git\cmd"))
    if (${env:ProgramFiles(x86)}) {
        $gitCandidates += (Join-Path ${env:ProgramFiles(x86)} "Git\cmd")
    }
    foreach ($gitDir in $gitCandidates) {
        if (Test-Path (Join-Path $gitDir "git.exe")) {
            if ($env:PATH -notlike "*$gitDir*") {
                $env:PATH = "$gitDir;$env:PATH"
            }
            break
        }
    }
}

function Ensure-Git {
    Update-PathFromEnvironment
    if (Get-Command git -ErrorAction SilentlyContinue) {
        Write-Host "Found Git: $((Get-Command git).Source) ($(git --version))"
        return
    }

    Write-Host "Git not found. Attempting to install Git for Windows..." -ForegroundColor Cyan

    if (Get-Command winget -ErrorAction SilentlyContinue) {
        winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements
    } elseif (Get-Command choco -ErrorAction SilentlyContinue) {
        choco install git.install -y
    } else {
        Write-Error @"
Could not install Git automatically (winget and Chocolatey were not found).
Install Git from: https://git-scm.com/download/win
Then open a new PowerShell window and run this script again.
"@
        exit 1
    }

    Update-PathFromEnvironment

    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        Write-Error @"
Git was installed but is not on PATH in this session.
Open a new PowerShell window and run this script again, or add Git\cmd to your PATH:
  $(Join-Path $env:ProgramFiles 'Git\cmd')
https://git-scm.com/download/win
"@
        exit 1
    }

    Write-Host "Git is ready: $((Get-Command git).Source) ($(git --version))"
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

Ensure-Git
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
