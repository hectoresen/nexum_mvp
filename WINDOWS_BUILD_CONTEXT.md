# 🪟 Contexto de Build para Windows

**Fecha:** 2026-02-21  
**Estado:** Cliente compilado exitosamente en Linux, listo para build de Windows  
**Branch:** `FEAT/mvp-1`

---

## 📍 Resumen Ejecutivo

El proyecto Voice MVP está **~70% completo**. La aplicación de escritorio (cliente Tauri) está completamente funcional con chat de texto. Se ha compilado exitosamente en Linux generando `.deb`, `.rpm` y `.AppImage`. 

**AHORA NECESITAMOS:** Generar el instalador `.msi` para Windows, lo cual **solo es posible compilando desde Windows nativo** (no WSL).

---

## ✅ Lo que YA está hecho

### Código Completo
- ✅ **Servidor Rust** (`server/`) - WebSocket + UDP + SQLite completamente funcional
- ✅ **Cliente Tauri** (`client/`) - React + TypeScript + Tauri 2.0
- ✅ **UI completa** - Pantalla de conexión, lista de canales, chat, controles de voz
- ✅ **Protocol implementation** - WebSocket para chat, estructura para UDP voice
- ✅ **Iconos de aplicación** - Generados en `client/src-tauri/icons/` (incluye `icon.ico`)

### Builds Exitosos (Linux)
- ✅ Frontend compilado con Vite (`npm run build`)
- ✅ Tauri compilado para Linux:
  - `Voice MVP_0.1.0_amd64.deb` (3.8 MB)
  - `Voice MVP-0.1.0-1.x86_64.rpm` (3.8 MB)  
  - `Voice MVP_0.1.0_amd64.AppImage` (74 MB)
- ✅ Ubicación: `client/src-tauri/target/release/bundle/`

### Configuración Lista
- ✅ `client/src-tauri/tauri.conf.json` - Configurado con metadata correcta
- ✅ `client/src-tauri/Cargo.toml` - Dependencias correctas (sin `shell-open` feature)
- ✅ `client/package.json` - Scripts de Tauri configurados
- ✅ TypeScript sin errores - `npm run build` exitoso

---

## 🎯 Siguiente Paso: Build en Windows

### OBJETIVO INMEDIATO
Generar el instalador **`.msi`** de Windows ejecutando el proyecto desde Windows nativo.

### Pre-requisitos (Instalar en Windows)

1. **Node.js 20+ LTS**
   - Descarga: https://nodejs.org/
   - Verificar: `node --version` (debe ser v18+)

2. **Rust Toolchain**
   - Descarga: https://rustup.rs/
   - Instalar con default settings
   - Verificar: `rustc --version` y `cargo --version`

3. **Visual Studio Build Tools** (CRÍTICO)
   - Descarga: https://visualstudio.microsoft.com/downloads/
   - Durante instalación, seleccionar: **"Desktop development with C++"**
   - Esto instala el compilador MSVC que Rust necesita

4. **WebView2** (Probablemente ya instalado)
   - Windows 10/11 ya lo incluye
   - Si falla, descargar: https://developer.microsoft.com/microsoft-edge/webview2/

---

## 📋 Instrucciones EXACTAS para Windows

### Paso 1: Copiar el Proyecto a Windows

Si estás en WSL, copia el proyecto al filesystem de Windows:

```bash
# Desde WSL (Linux)
cp -r /home/hector/Personal/voice_mvp /mnt/c/Users/TuUsuario/Desktop/voice_mvp
```

**IMPORTANTE:** Trabaja desde `C:\Users\TuUsuario\Desktop\voice_mvp`, NO desde la ruta WSL (`\\wsl$\...`). Rust/Cargo tienen problemas con paths de WSL.

### Paso 2: Abrir PowerShell o CMD en Windows

```powershell
cd C:\Users\TuUsuario\Desktop\voice_mvp\client
```

### Paso 3: Instalar Dependencias (Primera vez)

```powershell
npm install
```

Esto instalará todas las dependencias de Node.js (~200 MB). Solo necesario una vez.

### Paso 4: Compilar y Generar el Instalador

```powershell
npm run tauri build
```

**Esto tomará 5-15 minutos la primera vez** porque Cargo descargará y compilará ~470 crates de Rust.

### Paso 5: Verificar el Output

Si todo va bien, verás algo como:

```
Finished 2 bundles at:
    C:\Users\...\voice_mvp\client\src-tauri\target\release\bundle\msi\Voice MVP_0.1.0_x64_en-US.msi
    C:\Users\...\voice_mvp\client\src-tauri\target\release\bundle\nsis\Voice MVP_0.1.0_x64-setup.exe
```

**El archivo `.msi` es tu objetivo principal.**

---

## 🧪 Probar la Instalación

1. **Ejecutar el instalador:**
   ```powershell
   start "src-tauri\target\release\bundle\msi\Voice MVP_0.1.0_x64_en-US.msi"
   ```

2. **Instalar la aplicación** (Next → Next → Install)

3. **Lanzar Voice MVP:**
   - Buscar "Voice MVP" en el menú de inicio
   - O ejecutar desde: `C:\Program Files\Voice MVP\Voice MVP.exe`

4. **Probar conexión:**
   - Username: `TestUser`
   - Server: `localhost:8080` (si el servidor Rust está corriendo)
   - Click "Connect"

---

## 🔧 Troubleshooting Común

### ❌ Error: "rustc not found" o "cargo not found"

**Causa:** Rust no instalado o no en PATH

**Solución:**
```powershell
# Verificar
rustc --version
cargo --version

# Si falla, cerrar PowerShell y abrir uno nuevo (para recargar PATH)
# O reinstalar Rust desde https://rustup.rs/
```

### ❌ Error: "linker `link.exe` not found"

**Causa:** Visual Studio Build Tools no instalado o instalado sin C++

**Solución:**
1. Abrir Visual Studio Installer
2. Modificar instalación
3. Seleccionar **"Desktop development with C++"**
4. Instalar y reiniciar

### ❌ Error: "failed to download crates"

**Causa:** Firewall o proxy bloqueando conexión

**Solución:**
```powershell
# Configurar proxy si es necesario
$env:HTTP_PROXY="http://proxy:port"
$env:HTTPS_PROXY="http://proxy:port"

# Reintentar
npm run tauri build
```

### ❌ Error: "npm: command not found"

**Causa:** Node.js no instalado

**Solución:**
Instalar Node.js desde https://nodejs.org/ y reiniciar terminal

### ❌ Warning: "bundle identifier ends with .app"

**Causa:** Advertencia benigna sobre macOS naming (no afecta Windows build)

**Solución:**
Ignorar, o cambiar `identifier` en `tauri.conf.json` de `com.voicemvp.app` a `com.voicemvp.desktop`

---

## 📁 Estructura de Archivos Importante

```
voice_mvp/
├── client/                          # ← Trabajar aquí
│   ├── src/                         # Frontend React + TypeScript
│   ├── src-tauri/                   # Backend Tauri (Rust)
│   │   ├── src/
│   │   │   ├── main.rs              # Entry point Tauri
│   │   │   └── lib.rs
│   │   ├── icons/                   # ✅ Iconos generados (icon.ico, etc.)
│   │   ├── tauri.conf.json          # ✅ Configuración lista
│   │   ├── Cargo.toml               # ✅ Dependencias correctas
│   │   └── target/
│   │       └── release/
│   │           └── bundle/          # ← AQUÍ APARECERÁ el .msi
│   │               ├── msi/         # Voice MVP_0.1.0_x64_en-US.msi
│   │               └── nsis/        # Voice MVP_0.1.0_x64-setup.exe
│   ├── package.json                 # ✅ Scripts configurados
│   └── dist/                        # Frontend compilado (auto-generado)
│
├── server/                          # Servidor Rust (separado, opcional)
│   └── Cargo.toml
│
├── readme.md                        # Documentación principal
├── windows_build_guide.md           # Guía detallada (referencia)
├── todo.md                          # Estado del proyecto
└── WINDOWS_BUILD_CONTEXT.md         # ← ESTE ARCHIVO
```

---

## 📊 Estado del Proyecto Completo

| Fase | Estado | Completitud |
|------|--------|-------------|
| Server Core | ✅ Completo | 100% |
| WebSocket Protocol | ✅ Completo | 100% |
| Database (SQLite) | ✅ Completo | 100% |
| Client UI | ✅ Completo | 100% |
| Text Chat | ✅ Funcional | 100% |
| Voice Audio | ⏳ UI lista, audio pendiente | 20% |
| Linux Builds | ✅ Generados | 100% |
| **Windows Build** | 🎯 **ESTE ES EL PASO** | 0% |
| macOS Build | ⏳ Pendiente | 0% |

**Total:** ~70% completado

---

## 🎤 Funcionalidad Implementada vs Pendiente

### ✅ Funcional Ahora
- ✅ Conexión a servidor WebSocket
- ✅ Creación de canales (solo owner)
- ✅ Listado de canales
- ✅ Chat de texto en tiempo real
- ✅ Indicadores de usuarios en canal
- ✅ Manejo de desconexión/reconexión
- ✅ UI moderna con Tailwind CSS

### ⏳ Pendiente (Después del Build)
- ⏳ Captura de audio del micrófono
- ⏳ Reproducción de audio de otros usuarios
- ⏳ Codec Opus para compresión
- ⏳ Envío/recepción UDP para voice packets
- ⏳ Indicadores visuales de "hablando"

---

## 🚀 Comando Rápido (TL;DR)

Si ya tienes Node + Rust + VS Build Tools instalados:

```powershell
# Navegar al proyecto
cd C:\Users\TuUsuario\Desktop\voice_mvp\client

# Instalar dependencias (solo primera vez)
npm install

# Compilar y generar instalador
npm run tauri build

# El .msi estará en:
# src-tauri\target\release\bundle\msi\Voice MVP_0.1.0_x64_en-US.msi
```

---

## 📞 Próximos Pasos Después del Build

1. ✅ Generar `.msi` instalador de Windows
2. 🧪 Probar instalación en máquina limpia
3. 🧪 Verificar que UI funciona correctamente
4. 🧪 Probar chat con servidor corriendo
5. 📝 Documentar proceso de instalación
6. 🔊 (Futuro) Implementar captura/reproducción de audio

---

## 📚 Referencias

- **Guía Detallada:** [windows_build_guide.md](windows_build_guide.md)
- **Documentación Principal:** [readme.md](readme.md)
- **Estado del Proyecto:** [todo.md](todo.md)
- **Spec Original:** [architecture_spec.md](architecture_spec.md)
- **Tauri Prerequisites:** https://tauri.app/start/prerequisites/#windows
- **Tauri Building Guide:** https://tauri.app/start/build/

---

## 🎯 Para el Agente AI

**Contexto para continuar:**

Este proyecto está en la fase de **generación del instalador de Windows**. Todo el código está completo y compilado exitosamente en Linux. La tarea es **ejecutar el mismo build pero desde Windows nativo** para generar el archivo `.msi`.

**Archivos clave a revisar:**
- `client/src-tauri/tauri.conf.json` - Configuración de bundle
- `client/package.json` - Scripts disponibles
- `client/src-tauri/Cargo.toml` - Dependencias Rust

**Paso inmediato:** Verificar que pre-requisitos estén instalados (Node.js, Rust, VS Build Tools), luego ejecutar `npm run tauri build` en el directorio `client/`.

**NO modificar código fuente** - ya está completo y funcional. Solo ejecutar el proceso de build.

---

**¡Éxito en el build! 🚀**
