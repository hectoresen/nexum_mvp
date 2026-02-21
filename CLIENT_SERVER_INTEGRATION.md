# Integración Cliente + Servidor CLI

## 📋 Visión General

El cliente y el servidor CLI se instalarán juntos en la misma ruta, permitiendo una experiencia integrada donde el usuario puede gestionar su servidor local directamente desde la interfaz del cliente.

## 🎯 Objetivos

1. **Instalación única**: Un instalador que incluya cliente + servidor CLI
2. **Detección automática**: El cliente detecta si el servidor está instalado localmente
3. **Gestión integrada**: Control del servidor desde la UI del cliente
4. **Experiencia simplificada**: Usuario no técnico puede levantar su propio servidor

## 📁 Estructura de Instalación

```
C:\Program Files\Voice MVP\
├── voice-client.exe          # Cliente Tauri
├── voice-server.exe          # Servidor CLI
├── resources\
│   ├── client\ ...
│   └── server\ ...
└── data\                     # Datos del servidor (si se usa local)
    ├── server.toml
    └── voice.db
```

## 🔍 Flujo de Usuario

### 1. Primera Instalación

```
Usuario instala Voice MVP (cliente + servidor)
    ↓
Cliente detecta voice-server.exe en la misma ruta
    ↓
Muestra opción "Run Local Server" en la UI
    ↓
Usuario configura contraseña admin (primera vez)
    ↓
Cliente lanza: voice-server.exe --admin-password "xxx"
    ↓
Cliente se conecta automáticamente a localhost:8080
```

### 2. Uso Regular

```
Usuario abre el cliente
    ↓
Cliente detecta servidor local instalado
    ↓
Ofrece dos opciones:
  [Start Local Server]      → Lanza servidor local y conecta
  [Connect to Remote]       → Conecta a servidor remoto
    ↓
Si elige local:
  - Lanza servidor en background
  - Conecta automáticamente
  - Muestra estado del servidor en UI
```

## 🔧 Implementación Técnica

### Fase 1: Detección del Servidor

**En cliente Tauri (Rust backend):**

```rust
// src-tauri/src/server_manager.rs (nuevo archivo)

pub fn detect_local_server() -> bool {
    let exe_path = std::env::current_exe().unwrap();
    let server_path = exe_path
        .parent()
        .unwrap()
        .join("voice-server.exe");

    server_path.exists()
}

pub fn get_server_path() -> Option<PathBuf> {
    let exe_path = std::env::current_exe().unwrap();
    let server_path = exe_path
        .parent()
        .unwrap()
        .join("voice-server.exe");

    if server_path.exists() {
        Some(server_path)
    } else {
        None
    }
}
```

**Comando Tauri:**

```rust
#[tauri::command]
fn is_server_installed() -> bool {
    detect_local_server()
}
```

### Fase 2: Configuración Inicial del Servidor

**UI en cliente (React):**

```tsx
// Modal de configuración primera vez
function ServerSetupModal() {
  const [password, setPassword] = useState('')

  const generatePassword = () => {
    // Genera contraseña aleatoria 16 chars
  }

  const saveConfig = async () => {
    await invoke('setup_local_server', {
      adminPassword: password,
    })
  }

  return (
    <Modal>
      <h2>Configure Local Server</h2>
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
      <button onClick={generatePassword}>Generate</button>
      <button onClick={saveConfig}>Save & Start</button>
    </Modal>
  )
}
```

**Backend Tauri:**

```rust
#[tauri::command]
async fn setup_local_server(admin_password: String) -> Result<(), String> {
    let server_path = get_server_path()
        .ok_or("Server not found")?;

    // Ejecutar servidor con contraseña para crear server.toml
    let output = Command::new(server_path)
        .args(&["--non-interactive", "--admin-password", &admin_password])
        .output()
        .map_err(|e| e.to_string())?;

    // Matar el proceso después de que cree la config
    // (se lanzará de nuevo cuando el usuario haga "Start")

    Ok(())
}
```

### Fase 3: Control del Servidor

**Estado en Rust:**

```rust
struct AppState {
    server_process: Arc<Mutex<Option<Child>>>,
    server_status: Arc<Mutex<ServerStatus>>,
}

enum ServerStatus {
    NotInstalled,
    Stopped,
    Starting,
    Running,
    Error(String),
}
```

**Comandos Tauri:**

```rust
#[tauri::command]
async fn start_local_server(state: State<'_, AppState>) -> Result<(), String> {
    let mut process = state.server_process.lock().unwrap();

    if process.is_some() {
        return Err("Server already running".to_string());
    }

    let server_path = get_server_path()
        .ok_or("Server not installed")?;

    let child = Command::new(server_path)
        .args(&["--non-interactive"])  // Usa config existente
        .spawn()
        .map_err(|e| e.to_string())?;

    *process = Some(child);
    *state.server_status.lock().unwrap() = ServerStatus::Running;

    Ok(())
}

#[tauri::command]
async fn stop_local_server(state: State<'_, AppState>) -> Result<(), String> {
    let mut process = state.server_process.lock().unwrap();

    if let Some(mut child) = process.take() {
        child.kill().map_err(|e| e.to_string())?;
        *state.server_status.lock().unwrap() = ServerStatus::Stopped;
        Ok(())
    } else {
        Err("Server not running".to_string())
    }
}

#[tauri::command]
fn get_server_status(state: State<'_, AppState>) -> String {
    let status = state.server_status.lock().unwrap();
    format!("{:?}", *status)
}
```

### Fase 4: UI de Gestión

**Componente React:**

```tsx
function LocalServerPanel() {
  const [status, setStatus] = useState('stopped')
  const [password, setPassword] = useState('')

  useEffect(() => {
    // Polling del estado
    const interval = setInterval(async () => {
      const s = await invoke('get_server_status')
      setStatus(s)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleStart = async () => {
    try {
      await invoke('start_local_server')
      // Auto-conectar a localhost:8080
      handleConnect('127.0.0.1:8080', password)
    } catch (err) {
      console.error(err)
    }
  }

  const handleStop = async () => {
    await invoke('stop_local_server')
  }

  return (
    <div className="local-server-panel">
      <h3>🖥️ Local Server</h3>
      <div className="status">
        Status: <span className={status}>{status}</span>
      </div>

      {status === 'stopped' && <button onClick={handleStart}>Start Local Server</button>}

      {status === 'running' && (
        <>
          <button onClick={handleStop}>Stop Server</button>
          <div className="info">Running on localhost:8080</div>
        </>
      )}
    </div>
  )
}
```

### Fase 5: Empaquetado

**En cliente `src-tauri/tauri.conf.json`:**

```json
{
  "bundle": {
    "resources": ["../server/target/release/voice-server.exe"],
    "externalBin": ["../server/target/release/voice-server"]
  }
}
```

**Script de build:**

```powershell
# build-bundle.ps1

# 1. Compilar servidor
cd server
cargo build --release
cd ..

# 2. Compilar cliente (incluye servidor en bundle)
cd client
npm run tauri:build

# 3. El instalador incluirá ambos
Write-Host "Installer: client/src-tauri/target/release/bundle/msi/Voice MVP_x.x.x.msi"
```

## 🔐 Gestión de Contraseñas

### Primera vez:

1. Cliente detecta que no existe `server.toml`
2. Muestra modal de setup
3. Usuario ingresa o genera contraseña
4. Cliente ejecuta: `voice-server.exe --non-interactive --admin-password "xxx"`
5. Esto crea `server.toml` con la contraseña
6. Cliente guarda la contraseña en keychain local (seguro)

### Reconexión:

1. Cliente lee contraseña de keychain
2. Lanza servidor: `voice-server.exe --non-interactive`
3. Auto-conecta a `localhost:8080` con contraseña guardada

### Cambio de contraseña:

1. Usuario va a Settings → Local Server
2. Edita contraseña
3. Cliente actualiza `server.toml`
4. Reinicia servidor

## 🎨 Diseño UI

### ConnectView con servidor local:

```
┌─────────────────────────────────────────┐
│  Voice MVP                              │
├─────────────────────────────────────────┤
│                                         │
│  🖥️  LOCAL SERVER                       │
│  ┌───────────────────────────────────┐ │
│  │  Status: ● Running                │ │
│  │  Address: localhost:8080          │ │
│  │                                   │ │
│  │  [Stop Server]  [Reconnect]      │ │
│  └───────────────────────────────────┘ │
│                                         │
│  OR                                     │
│                                         │
│  🌐 REMOTE SERVER                       │
│  ┌───────────────────────────────────┐ │
│  │  Server Address:                  │ │
│  │  [_________________________]      │ │
│  │                                   │ │
│  │  [Connect]                        │ │
│  └───────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

## 📦 Instalador

### Características:

- ✅ Instalador único `.msi` que incluye cliente + servidor
- ✅ Crea acceso directo al cliente
- ✅ Servidor se instala en la misma carpeta que el cliente
- ✅ Primera apertura muestra wizard de configuración
- ✅ Usuario elige: "Host my own server" o "Connect to existing"

### Wizard Primera Ejecución:

```
Step 1: Welcome to Voice MVP
[ ] Host my own server on this computer
[ ] Connect to an existing server

Step 2 (si eligió "Host"):
Configure your server password:
[__________________]  [Generate Random]
[Continue]

Step 3:
Starting your server...
● Server running on localhost:8080
You're ready to use Voice MVP!
[Start Using]
```

## 🔄 Estados y Transiciones

```
Cliente Iniciado
    ↓
¿Servidor instalado?
    ├─ NO  → Modo solo cliente remoto
    └─ YES → ¿Configurado?
              ├─ NO  → Mostrar wizard setup
              └─ YES → ¿Auto-start habilitado?
                       ├─ YES → Iniciar servidor + conectar
                       └─ NO  → Mostrar panel control
```

## ✅ Checklist de Implementación

### Fase 1: Infraestructura

- [ ] Crear `server_manager.rs` en cliente
- [ ] Implementar `detect_local_server()`
- [ ] Implementar `get_server_path()`
- [ ] Agregar comandos Tauri básicos

### Fase 2: UI Básica

- [ ] Crear `LocalServerPanel` component
- [ ] Agregar indicador de estado del servidor
- [ ] Botones Start/Stop
- [ ] Integrar en `ConnectView`

### Fase 3: Configuración

- [ ] Modal de setup primera vez
- [ ] Generador de contraseñas
- [ ] Guardar config en `server.toml`
- [ ] Almacenamiento seguro de contraseña

### Fase 4: Control de Procesos

- [ ] Lanzar servidor como proceso hijo
- [ ] Monitoreo de estado del proceso
- [ ] Manejo de cierre limpio
- [ ] Auto-reconexión si servidor se cae

### Fase 5: Auto-Conexión

- [ ] Conectar automáticamente a localhost después de start
- [ ] Usar contraseña guardada
- [ ] Manejo de errores de conexión

### Fase 6: Empaquetado

- [ ] Configurar bundle con servidor incluido
- [ ] Script de build unificado
- [ ] Crear instalador `.msi`
- [ ] Testing de instalación completa

### Fase 7: Pulido

- [ ] Wizard de primera ejecución
- [ ] Settings para servidor local
- [ ] Opciones de auto-start
- [ ] Logs del servidor en UI

## 🚀 Ventajas de este Enfoque

1. **Experiencia unificada**: Un solo instalador para todo
2. **Simplicidad**: Usuario no técnico puede tener su servidor
3. **Sin configuración de red**: localhost siempre funciona
4. **Privacidad**: Datos locales, no en la nube
5. **Flexibilidad**: Puede elegir local o remoto
6. **Testing más fácil**: Desarrolladores pueden probar todo localmente

## 🔮 Futuro: GUI Server

El servidor con GUI será una opción **alternativa** para:

- Usuarios que quieren un servidor dedicado
- Administradores que gestionan múltiples servidores
- Casos donde se necesita configuración avanzada

No reemplaza a esta integración, la complementa.
