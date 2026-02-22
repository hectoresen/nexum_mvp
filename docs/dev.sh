#!/bin/bash
# Development helper script

set -e

case "$1" in
  server)
    echo "🚀 Starting server..."
    cd server && cargo run
    ;;
  
  client)
    echo "🖥️  Starting client..."
    cd client && npm install && npm run tauri dev
    ;;
  
  build-server)
    echo "🔨 Building server (release)..."
    cd server && cargo build --release
    echo "✅ Server binary: server/target/release/voice-server"
    ;;
  
  build-client)
    echo "🔨 Building client..."
    cd client && npm install && npm run tauri build
    echo "✅ Client bundles in: client/src-tauri/target/release/bundle/"
    ;;
  
  clean)
    echo "🧹 Cleaning build artifacts..."
    rm -rf server/target
    rm -rf client/node_modules
    rm -rf client/dist
    rm -rf client/src-tauri/target
    echo "✅ Clean complete"
    ;;
  
  check)
    echo "🔍 Checking server code..."
    cd server && cargo check
    echo "🔍 Checking client code..."
    cd client && npm install && npm run build
    echo "✅ All checks passed"
    ;;
  
  *)
    echo "Voice MVP - Development Helper"
    echo ""
    echo "Usage: ./dev.sh [command]"
    echo ""
    echo "Commands:"
    echo "  server        - Run server (debug mode)"
    echo "  client        - Run client (dev mode)"
    echo "  build-server  - Build server (release)"
    echo "  build-client  - Build client"
    echo "  clean         - Remove all build artifacts"
    echo "  check         - Check code without running"
    echo ""
    ;;
esac
