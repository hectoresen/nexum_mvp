# Voice Server - Guía de Lanzamiento

El servidor de voz se puede lanzar de **dos formas diferentes** según tus necesidades:

## 1. 🖥️ Modo GUI (Recomendado para usuarios normales)

La forma más sencilla es usar la aplicación gráfica:

### Desarrollo

```powershell
cd server-gui
npm run tauri:dev
```

### Producción

```powershell
cd server-gui
npm run tauri:build
```

Esto genera:

- **Instalador MSI**: `server-gui/src-tauri/target/release/bundle/msi/Voice Server Manager_0.1.0_x64_en-US.msi`
- **Ejecutable portable**: `server-gui/src-tauri/target/release/voice-server-gui.exe`

### Características del GUI:

- ✅ Configuración visual del servidor
- ✅ Generación automática de contraseña admin
- ✅ Control de inicio/parada del servidor
- ✅ Visualización de logs en tiempo real
- ✅ Gestión de puertos y configuración
- ✅ No requiere conocimientos técnicos

### Uso:

1. Doble clic en el ejecutable o instalar con el MSI
2. Configurar nombre del servidor, puertos, etc.
3. Ingresar o generar una contraseña de administrador
4. Clic en "Start Server"
5. El servidor se ejecuta en segundo plano

---

## 2. ⌨️ Modo CLI (Para usuarios técnicos)

Para usuarios avanzados que prefieren la línea de comandos:

### Compilación

```powershell
cd server
cargo build --release
```

### Primera ejecución (interactiva)

```powershell
cd server
.\target\release\voice-server.exe
```

En la primera ejecución, el servidor te preguntará:

- ¿Generar contraseña aleatoria o ingresar una personalizada?
- Si eliges aleatoria, la mostrará en pantalla para que la guardes
- Si eliges personalizada, te pedirá que la escribas dos veces

### Ejecuciones posteriores

```powershell
cd server
.\target\release\voice-server.exe
```

El servidor carga la configuración desde `server.toml` automáticamente.

### Modo no interactivo (para scripts)

```powershell
.\target\release\voice-server.exe --non-interactive --admin-password "tu_contraseña"
```

### Argumentos CLI disponibles:

- `--non-interactive`: Ejecuta sin preguntas (usa contraseña aleatoria si no existe config)
- `--admin-password <PASSWORD>`: Establece la contraseña admin directamente

### Características del CLI:

- ✅ Control total sobre la configuración
- ✅ Edición manual del archivo `server.toml`
- ✅ Modo interactivo con menús en consola
- ✅ Logs detallados en consola
- ✅ Perfecto para servidores remotos o automatización

---

## 📁 Archivos de configuración

Ambos modos usan el mismo archivo de configuración:

**Ubicación**: `server/server.toml`

```toml
[server]
name = "My Voice Server"
host = "0.0.0.0"
ws_port = 8080
udp_port = 9000
data_path = "./data"
session_timeout_secs = 60
ping_interval_secs = 30
admin_password = "tu_contraseña_segura"

[limits]
max_users = 200
max_users_per_voice_channel = 100
max_message_size = 2000
rate_limit_messages_per_minute = 60

[persistence]
enabled = true
```

Para cambiar la contraseña:

1. Edita `server.toml` manualmente
2. Reinicia el servidor

---

## 🔐 Seguridad

### Contraseñas generadas automáticamente

- 16 caracteres alfanuméricos
- Alta entropía (62^16 combinaciones)
- Generadas con `rand::thread_rng()` (criptográficamente seguro)

### Buenas prácticas

- ✅ Usa contraseñas de al menos 12 caracteres
- ✅ Combina letras mayúsculas, minúsculas y números
- ✅ No compartas la contraseña admin públicamente
- ✅ Cambia la contraseña periódicamente
- ❌ No uses contraseñas simples como "admin", "password", etc.

---

## 🚀 Comenzando

### Para usuarios normales:

```powershell
# Compilar servidor backend
cd server
cargo build --release

# Compilar GUI
cd ../server-gui
npm install
npm run tauri:build

# El instalador estará en:
# server-gui/src-tauri/target/release/bundle/msi/
```

### Para usuarios técnicos:

```powershell
cd server
cargo build --release
.\target\release\voice-server.exe
# Sigue las instrucciones en pantalla
```

---

## 🐛 Solución de problemas

### El GUI no encuentra el servidor

- Verifica que `server/target/release/voice-server.exe` existe
- Compila el servidor primero con `cargo build --release`

### El puerto ya está en uso

- Cambia `ws_port` y `udp_port` en la configuración
- Verifica que no haya otra instancia del servidor corriendo

### Olvidé la contraseña admin

1. Detén el servidor
2. Elimina `server/server.toml`
3. Reinicia el servidor (generará nueva configuración)

---

## 📊 Comparación GUI vs CLI

| Característica        | GUI        | CLI        |
| --------------------- | ---------- | ---------- |
| Facilidad de uso      | ⭐⭐⭐⭐⭐ | ⭐⭐⭐     |
| Control avanzado      | ⭐⭐⭐     | ⭐⭐⭐⭐⭐ |
| Visualización de logs | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐   |
| Automatización        | ⭐⭐       | ⭐⭐⭐⭐⭐ |
| Uso remoto (SSH)      | ❌         | ✅         |
| Instalador .msi       | ✅         | ❌         |
| Scripts/Servicios     | ❌         | ✅         |

---

## ℹ️ Más información

- El cliente se conecta de la misma forma en ambos casos
- Los puertos WebSocket (8080) y UDP (9000) deben estar abiertos
- La configuración se comparte entre GUI y CLI
- Se puede alternar entre GUI y CLI sin problemas
