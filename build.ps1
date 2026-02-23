# Build Script - Nexum Unified
# Compila servidor CLI + cliente con servidor integrado
#
# Usage:
#   .\build.ps1                  # Dev build (server + frontend check)
#   .\build.ps1 -Release         # Release build
#   .\build.ps1 -Bundle          # Create installer (requires -Release server first)
#   .\build.ps1 -ServerOnly      # Only compile server
#   .\build.ps1 -ServerOnly -Release

param(
    [switch]$Release,
    [switch]$ServerOnly,
    [switch]$ClientOnly,
    [switch]$Bundle
)

$ErrorActionPreference = "Stop"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Nexum - Unified Build Script" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Configurar PATH de Cargo
$env:PATH += ";$env:USERPROFILE\.cargo\bin"

$buildMode = if ($Release) { "release" } else { "debug" }

# ====================================
# 1. Build Server
# ====================================

if (-not $ClientOnly) {
    Write-Host "📦 Building Server ($buildMode mode)..." -ForegroundColor Yellow
    Write-Host ""
    
    Push-Location server
    
    try {
        if ($Release) {
            cargo build --release
        } else {
            cargo build
        }
        
        if ($LASTEXITCODE -ne 0) {
            throw "Server build failed"
        }
        
        $serverBinary = "target\$buildMode\voice-server.exe"
        Write-Host "✅ Server built: server\$serverBinary" -ForegroundColor Green
        Write-Host ""
    }
    finally {
        Pop-Location
    }
}

# ====================================
# 2. Build Client
# ====================================

if (-not $ServerOnly) {
    Write-Host "📦 Building Client..." -ForegroundColor Yellow
    Write-Host ""
    
    Push-Location client
    
    try {
        # Instalar dependencias si es necesario
        if (-not (Test-Path "node_modules")) {
            Write-Host "📥 Installing npm dependencies..." -ForegroundColor Cyan
            npm install
            if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
            Write-Host ""
        }

        # Verificar servidor si se va a hacer bundle
        if ($Bundle) {
            $serverExe = "..\server\target\release\voice-server.exe"
            if (-not (Test-Path $serverExe)) {
                Write-Host "❌ Server binary not found for bundling." -ForegroundColor Red
                Write-Host "   Run: .\build.ps1 -ServerOnly -Release" -ForegroundColor Yellow
                throw "Server binary required for bundle"
            }
            
            Write-Host "📦 Creating installer bundle (this may take a while)..." -ForegroundColor Cyan
            npm run tauri build
            if ($LASTEXITCODE -ne 0) { throw "Tauri build failed" }
            
            Write-Host ""
            Write-Host "✅ Installer created:" -ForegroundColor Green
            
            $msiPath = "src-tauri\target\release\bundle\msi"
            $nsisPath = "src-tauri\target\release\bundle\nsis"
            
            if (Test-Path $msiPath) {
                $msiFile = Get-ChildItem $msiPath -Filter "*.msi" | Select-Object -First 1
                Write-Host "   MSI:  client\$msiPath\$($msiFile.Name)" -ForegroundColor Gray
            }
            if (Test-Path $nsisPath) {
                $exeFile = Get-ChildItem $nsisPath -Filter "*-setup.exe" | Select-Object -First 1
                Write-Host "   NSIS: client\$nsisPath\$($exeFile.Name)" -ForegroundColor Gray
            }
        }
        else {
            Write-Host "🔨 Building frontend..." -ForegroundColor Cyan
            npm run build
            if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }
            
            Write-Host "✅ Frontend built. Run 'npm run tauri dev' to test." -ForegroundColor Green
        }
        
        Write-Host ""
    }
    catch {
        Write-Host "❌ Client build failed: $_" -ForegroundColor Red
        exit 1
    }
    finally {
        Pop-Location
    }
}

# ====================================
# Summary
# ====================================

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Build Complete!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

if (-not $ClientOnly) {
    Write-Host "🖥️  Server: server\target\$buildMode\voice-server.exe" -ForegroundColor White
}
if (-not $ServerOnly -and $Bundle) {
    Write-Host "📦 Installer: client\src-tauri\target\release\bundle\" -ForegroundColor White
}
Write-Host ""


$ErrorActionPreference = "Stop"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Nexum - Unified Build Script" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Configurar PATH de Cargo
$env:PATH += ";$env:USERPROFILE\.cargo\bin"

$buildMode = if ($Release) { "release" } else { "debug" }
$buildFlag = if ($Release) { "--release" } else { "" }

# ====================================
# 1. Build Server
# ====================================

if (-not $ClientOnly) {
    Write-Host "📦 Building Server ($buildMode mode)..." -ForegroundColor Yellow
    Write-Host ""
    
    Push-Location server
    
    try {
        if ($Release) {
            cargo build --release
        } else {
            cargo build
        }
        
        if ($LASTEXITCODE -ne 0) {
            throw "Server build failed"
        }
        
        Write-Host "✅ Server built successfully" -ForegroundColor Green
        Write-Host "   Location: server/target/$buildMode/voice-server.exe" -ForegroundColor Gray
        Write-Host ""
    }
    finally {
        Pop-Location
    }
}

# ====================================
# 2. Build Client
# ====================================

if (-not $ServerOnly) {
    Write-Host "📦 Building Client ($buildMode mode)..." -ForegroundColor Yellow
    Write-Host ""
    
    Push-Location client
    
    try {
        # Verificar que el servidor existe
        $serverPath = "..\server\target\$buildMode\voice-server.exe"
        if (-not (Test-Path $serverPath)) {
            Write-Host "⚠️  Warning: Server binary not found at $serverPath" -ForegroundColor Yellow
            Write-Host "   Client will be built without bundled server" -ForegroundColor Yellow
            Write-Host ""
        }
        
        # Instalar dependencias si es necesario
        if (-not (Test-Path "node_modules")) {
            Write-Host "📥 Installing dependencies..." -ForegroundColor Cyan
            npm install
            Write-Host ""
        }
        
        # Build del cliente
        if ($Bundle) {
            Write-Host "📦 Creating installer bundle..." -ForegroundColor Cyan
            npm run tauri build
            
            Write-Host ""
            Write-Host "✅ Client built and bundled successfully" -ForegroundColor Green
            Write-Host "   Installer: client/src-tauri/target/release/bundle/msi/" -ForegroundColor Gray
            Write-Host "   Portable: client/src-tauri/target/release/nexum.exe" -ForegroundColor Gray
        }
        else {
            Write-Host "🔨 Building client for development..." -ForegroundColor Cyan
            npm run build
            
            Write-Host ""
            Write-Host "✅ Client built successfully" -ForegroundColor Green
            Write-Host "   You can now run: npm run tauri dev" -ForegroundColor Gray
        }
        
        Write-Host ""
    }
    catch {
        Write-Host "❌ Client build failed: $_" -ForegroundColor Red
        exit 1
    }
    finally {
        Pop-Location
    }
}

# ====================================
# Summary
# ====================================

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Build Complete!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

if (-not $ClientOnly) {
    Write-Host "🖥️  Server: server/target/$buildMode/voice-server.exe" -ForegroundColor White
}

if (-not $ServerOnly) {
    if ($Bundle) {
        Write-Host "📦 Installer: client/src-tauri/target/release/bundle/msi/" -ForegroundColor White
    } else {
        Write-Host "🖼️  Client: Use 'npm run tauri dev' in client/ folder" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan

if ($Bundle) {
    Write-Host "  - Install using the .msi in client/src-tauri/target/release/bundle/msi/"
    Write-Host "  - Both client and server will be installed together"
}
else {
    Write-Host "  - Test server: cd server && .\target\$buildMode\voice-server.exe"
    Write-Host "  - Test client: cd client && npm run tauri dev"
}

Write-Host ""
