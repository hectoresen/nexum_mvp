# Build Script - Nexum Unified
# Compila servidor CLI + cliente con servidor integrado
#
# Usage:
#   .\build.ps1                  # Dev build (server + frontend check)
#   .\build.ps1 -Release         # Release build
#   .\build.ps1 -Bundle          # Compile server + copy exe + create installer
#   .\build.ps1 -ServerOnly      # Only compile server
#   .\build.ps1 -ServerOnly -Release
#   .\build.ps1 -ClientOnly -Bundle  # Only rebuild client (server already compiled)

param(
    [switch]$Release,
    [switch]$ServerOnly,
    [switch]$ClientOnly,
    [switch]$Bundle
)

$ErrorActionPreference = "Stop"
$env:PATH += ";$env:USERPROFILE\.cargo\bin"

$buildMode = if ($Release) { "release" } else { "debug" }

Write-Host "======================================" -ForegroundColor Cyan
Write-Host " Nexum - Unified Build Script" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# ====================================
# 1. Build Server
# ====================================

if (-not $ClientOnly) {
    Write-Host "[1/3] Building Server ($buildMode)..." -ForegroundColor Yellow

    Push-Location server
    try {
        if ($Release) {
            cargo build --release
        } else {
            cargo build
        }
        if ($LASTEXITCODE -ne 0) { throw "Server build failed" }
        Write-Host " OK  Server built: server\target\$buildMode\voice-server.exe" -ForegroundColor Green
    }
    finally {
        Pop-Location
    }
    Write-Host ""
}

# ====================================
# 2. Copy server binary to client resources
# ====================================

if (-not $ClientOnly -and -not $ServerOnly) {
    Write-Host "[2/3] Copying server binary to client resources..." -ForegroundColor Yellow

    $src = "server\target\$buildMode\voice-server.exe"
    $dst = "client\src-tauri\resources\voice-server.exe"

    if (-not (Test-Path $src)) {
        Write-Host " ERR Server binary not found at $src" -ForegroundColor Red
        Write-Host "     Run: .\build.ps1 -ServerOnly -Release" -ForegroundColor Yellow
        exit 1
    }

    New-Item -ItemType Directory -Force -Path "client\src-tauri\resources" | Out-Null
    Copy-Item $src $dst -Force
    Write-Host " OK  Copied to $dst" -ForegroundColor Green
    Write-Host ""
}

# ====================================
# 3. Build Client
# ====================================

if (-not $ServerOnly) {
    Push-Location client
    try {
        if (-not (Test-Path "node_modules")) {
            Write-Host "[3/3] Installing npm dependencies..." -ForegroundColor Yellow
            npm install
            if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
            Write-Host ""
        }

        if ($Bundle) {
            Write-Host "[3/3] Creating installer bundle (this may take a while)..." -ForegroundColor Yellow
            npm run tauri build
            if ($LASTEXITCODE -ne 0) { throw "Tauri build failed" }

            Write-Host ""
            Write-Host " OK  Installer created:" -ForegroundColor Green
            $msiPath = "src-tauri\target\release\bundle\msi"
            $nsisPath = "src-tauri\target\release\bundle\nsis"
            if (Test-Path $msiPath) {
                $f = Get-ChildItem $msiPath -Filter "*.msi" | Select-Object -First 1
                if ($f) { Write-Host "      MSI:  client\$msiPath\$($f.Name)" -ForegroundColor Gray }
            }
            if (Test-Path $nsisPath) {
                $f = Get-ChildItem $nsisPath -Filter "*-setup.exe" | Select-Object -First 1
                if ($f) { Write-Host "      NSIS: client\$nsisPath\$($f.Name)" -ForegroundColor Gray }
            }
        }
        else {
            Write-Host "[3/3] Building frontend (dev)..." -ForegroundColor Yellow
            npm run build
            if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }
            Write-Host " OK  Frontend built. Run 'npm run tauri dev' to test." -ForegroundColor Green
        }
    }
    catch {
        Write-Host " ERR Client build failed: $_" -ForegroundColor Red
        exit 1
    }
    finally {
        Pop-Location
    }
    Write-Host ""
}

# ====================================
# Summary
# ====================================

Write-Host "======================================" -ForegroundColor Cyan
Write-Host " Build Complete!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
if (-not $ClientOnly) {
    Write-Host "  Server:    server\target\$buildMode\voice-server.exe" -ForegroundColor White
}
if (-not $ServerOnly -and $Bundle) {
    Write-Host "  Installer: client\src-tauri\target\release\bundle\" -ForegroundColor White
}
Write-Host ""
