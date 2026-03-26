# Nexum - Quick Start Guide

**Desarrollo y testing del proyecto Nexum**

---

## 🎯 Current Development Phase

**Phase 0.5 - Client-Server Integration**

We're currently integrating the CLI server with the client for a unified experience. See [CLIENT_SERVER_INTEGRATION.md](CLIENT_SERVER_INTEGRATION.md) for details.

**Status:**

- ✅ Server CLI with interactive setup
- ✅ Client application working
- 🚧 Integration in progress (server detection, control from client)
- 📋 Unified installer planned

---

## 🚀 Quick Start Options

### Option 1: Using Build Script (Recommended)

```powershell
# Build both server and client
.\build.ps1 -Release

# Or for development (faster builds)
.\build.ps1

# Build only server
.\build.ps1 -ServerOnly -Release

# Build only client
.\build.ps1 -ClientOnly

# Create installer bundle
.\build.ps1 -Release -Bundle
```

### Option 2: Manual Build (Development)

```powershell
# Terminal 1 - Build and run server
cd server
cargo run --release

# Terminal 2 - Build and run client
cd client
npm run tauri dev
```

---

## 📋 Development Workflow

### First Time Setup

```powershell
# 1. Clone repository
git clone <repo-url>
cd nexum

# 2. Install Rust (if not installed)
# Download from: https://rustup.rs

# 3. Install Node.js (if not installed)
# Download from: https://nodejs.org

# 4. Install client dependencies
cd client
npm install
cd ..

# 5. Build everything
.\build.ps1
```

### Server Development

```powershell
cd server
cargo run                    # Debug mode (más logs)
cargo run --release          # Release mode (optimizado)
```

El servidor inicia en:

- **WebSocket**: `ws://0.0.0.0:8080/ws` (escucha en todas las interfaces)
- **UDP**: `0.0.0.0:9000`
- **Base de datos**: `./data/nexum.db` (se crea automáticamente)

**💡 Para conectarte desde el mismo PC, usa:** `localhost:8080` o `127.0.0.1:8080`

### Cliente (Tauri + React)

```powershell
cd client
$env:PATH += ";$env:USERPROFILE\.cargo\bin"   # Solo si Rust no está en PATH
npm run tauri dev                               # Hot reload habilitado
```

**Hot reload:** Los cambios en React se recargan automáticamente. Cambios en Rust requieren reiniciar.

---

## 🎮 Cómo Usar la App

1. **Abre la app** → Verás "Your Servers" (vacío al inicio)
2. **Click "Add Server"**:
   - Name: `Local`
   - Address: `localhost:8080`
   - Click "Add Server"
3. **Click "Connect"** en el servidor que añadiste
4. **Ingresa tu username** → Connect
5. **Crea un canal** (botón +):
   - Name: `general`
   - Type: `Text`
6. **Chatea!**

---

## 🏗️ Build para Producción

### Forma rápida: script unificado (recomendado)

Desde la raíz del repositorio:

```powershell
.\build.ps1 -Release -Bundle
```

Esto hace los 3 pasos en orden automáticamente:
1. Compila el servidor (`cargo build --release` en `server/`)
2. Copia `voice-server.exe` → `client/src-tauri/resources/`
3. Genera el instalador (`npm run tauri build` en `client/`)

Al finalizar encontrarás los instaladores en:
- `client/src-tauri/target/release/bundle/msi/Nexum_*_x64_en-US.msi`
- `client/src-tauri/target/release/bundle/nsis/Nexum_*_x64-setup.exe`

**Nota PowerShell:** escribe siempre `.\build.ps1`, no `build.ps1`.

---

### Forma manual (paso a paso)

> Úsala si quieres más control o si el script falla por algún motivo.

**Paso 1 — Compilar el servidor:**
```powershell
cd server
cargo build --release
cd ..
```

**Paso 2 — Copiar el binario al cliente:**
```powershell
Copy-Item server\target\release\voice-server.exe client\src-tauri\resources\voice-server.exe -Force
```

> ⚠️ Este paso es crítico. `npm run tauri build` **no recompila el servidor** — solo empaqueta el `.exe` que esté en `resources/`. Si lo omites, el instalador lleva el servidor anterior.

**Paso 3 — Generar el instalador:**
```powershell
cd client
npm run tauri build
```

**Genera:**
- `src-tauri/target/release/bundle/msi/Nexum_*_x64_en-US.msi`
- `src-tauri/target/release/bundle/nsis/Nexum_*_x64-setup.exe`

---

### Opciones adicionales del script

```powershell
.\build.ps1 -ServerOnly -Release      # Solo compilar servidor
.\build.ps1 -ClientOnly -Bundle       # Solo generar instalador (servidor ya compilado)
.\build.ps1                            # Build debug (sin -Release ni -Bundle)
```

---

## 🔧 Troubleshooting

**Error: "cargo not found"**

```powershell
$env:PATH += ";$env:USERPROFILE\.cargo\bin"
# O reinicia PowerShell después de instalar Rust
```

**Error: "failed to download crates"**

```powershell
# Revisa conexión a internet
# Rust descarga ~400 MB de dependencias la primera vez
```

**El cliente no conecta:**

- ✅ Verifica que el servidor esté corriendo (`cargo run` en otra terminal)
- ✅ Dirección correcta: `localhost:8080` (sin `http://` ni `ws://`)

---

## 📁 Estructura del Proyecto

```
nexum/
├── server/                    # Rust (Tokio + Axum + SQLite)
│   ├── src/
│   │   ├── main.rs           # Entry point
│   │   ├── websocket.rs      # WebSocket server
│   │   ├── handlers.rs       # Message handlers
│   │   ├── db.rs             # SQLite operations
│   │   └── ...
│   └── Cargo.toml
│
├── client/                    # Tauri (Rust + React + TypeScript)
│   ├── src/                  # React frontend
│   │   ├── App.tsx           # Main app (gestión multi-servidor)
│   │   ├── components/       # UI components
│   │   └── lib/              # WebSocket client, server manager
│   ├── src-tauri/            # Tauri backend (Rust)
│   │   └── src/main.rs       # Commands (launch server, etc.)
│   └── package.json
│
└── readme.md                  # Documentación principal
```

---

## ✅ Estado Actual

| Feature               | Estado                                        |
| --------------------- | --------------------------------------------- |
| WebSocket chat        | ✅ Funcional                                  |
| Multi-servidor        | ✅ Funcional                                  |
| Canales (text)        | ✅ Funcional                                  |
| Roles (owner/member)  | ✅ Funcional                                  |
| Persistencia SQLite   | ✅ Funcional                                  |
| Lanzar servidor local | ✅ UI lista, binario pendiente                |
| Audio (voz)           | ⏳ Estructura lista, implementación pendiente |

---

## 🎯 Próximos Pasos

- [ ] Implementar captura/reproducción de audio
- [ ] Completar UDP voice forwarding
- [ ] Empaquetar servidor con el cliente
- [ ] Testing multi-usuario
- [ ] Build macOS

---

**Documentación completa:** [readme.md](readme.md)  
**Decisiones técnicas:** [agent_decisions.md](agent_decisions.md)  
**Tareas pendientes:** [todo.md](todo.md)
