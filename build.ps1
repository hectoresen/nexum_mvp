# Build Script - Voice MVP Unified
# Compila servidor CLI + cliente con servidor integrado

param(
    [switch]$Release,
    [switch]$ServerOnly,
    [switch]$ClientOnly,
    [switch]$Bundle
)

$ErrorActionPreference = "Stop"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Voice MVP - Unified Build Script" -ForegroundColor Cyan
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
            Write-Host "   Portable: client/src-tauri/target/release/voice-mvp.exe" -ForegroundColor Gray
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
