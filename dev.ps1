# Nexum - Development Launch Script for Windows
# Launches server and client in separate terminals

Write-Host "🚀 Launching Nexum Development Environment..." -ForegroundColor Cyan
Write-Host ""

# Check if Rust is installed
if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
    # Try adding cargo to PATH
    $env:PATH += ";$env:USERPROFILE\.cargo\bin"
    
    if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
        Write-Host "❌ Rust/Cargo not found. Install from https://rustup.rs" -ForegroundColor Red
        exit 1
    }
}

# Check if Node.js is installed
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js not found. Install from https://nodejs.org" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Prerequisites OK" -ForegroundColor Green
Write-Host ""

# Launch server in new terminal
Write-Host "📡 Starting server..." -ForegroundColor Yellow
$serverPath = Join-Path $PSScriptRoot "server"
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$serverPath'; Write-Host '🔧 Nexum Server' -ForegroundColor Cyan; cargo run"

# Wait a bit for server to start
Start-Sleep -Seconds 2

# Launch client in new terminal
Write-Host "💻 Starting client..." -ForegroundColor Yellow
$clientPath = Join-Path $PSScriptRoot "client"
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$clientPath'; Write-Host '🎨 Nexum Client' -ForegroundColor Cyan; `$env:PATH += ';$env:USERPROFILE\.cargo\bin'; npm run tauri dev"

Write-Host ""
Write-Host "✨ Development environment launched!" -ForegroundColor Green
Write-Host ""
Write-Host "Two terminals opened:" -ForegroundColor Cyan
Write-Host "  1. Server (Rust) on localhost:8080" -ForegroundColor White
Write-Host "  2. Client (Tauri) - app window will open" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C in each terminal to stop." -ForegroundColor Gray
