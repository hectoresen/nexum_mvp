# Guía de Compilación para Windows

Esta guía explica cómo generar el instalador `.msi` para Windows desde la aplicación Voice MVP.

## ⚠️ Importante: Compilación Nativa

Para generar el instalador `.msi` de Windows, **debes compilar desde Windows nativo**. La cross-compilation desde Linux a Windows es compleja y no está oficialmente soportada por Tauri.

## Requisitos Previos en Windows

### 1. Node.js
Descarga e instala desde [nodejs.org](https://nodejs.org/)
```bash
node --version  # Debe ser v18 o superior
npm --version
```

### 2. Rust
Descarga e instala desde [rustup.rs](https://rustup.rs/)
```bash
rustup --version
cargo --version
```

### 3. Visual Studio Build Tools
Tauri requiere el toolchain de Microsoft C++. Instala **una** de estas opciones:

**Opción A: Visual Studio Build Tools (Recomendado)**
- Descarga: [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/)
- Durante la instalación, selecciona: **"Desktop development with C++"**

**Opción B: Visual Studio Community**
- Incluye IDE completo + Build Tools
- Descarga: [Visual Studio Community](https://visualstudio.microsoft.com/vs/community/)

### 4. WebView2
Windows 10/11 ya incluye WebView2. Si usas Windows más antiguo:
- Descarga: [WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/)

## Pasos de Compilación

### 1. Clonar/Copiar el Proyecto
Si estás en WSL, copia el proyecto al sistema de archivos de Windows:
```bash
# Desde WSL
cp -r /home/hector/Personal/voice_mvp /mnt/c/Users/TuUsuario/voice_mvp
```

O desde Windows:
```bash
# En PowerShell o CMD
cd C:\Users\TuUsuario
# Git clone o copiar manualmente la carpeta
```

### 2. Instalar Dependencias
```bash
cd voice_mvp\client
npm install
```

### 3. Compilar y Generar Bundle
```bash
npm run tauri build
```

Este comando:
1. Ejecuta `npm run build` (compila React/TypeScript)
2. Compila el backend Rust con `cargo`
3. Genera los instaladores en `src-tauri\target\release\bundle\`

## Ubicación del Instalador

Después de la compilación exitosa, encontrarás el instalador en:
```
client\src-tauri\target\release\bundle\msi\Voice MVP_0.1.0_x64_en-US.msi
```

También se generará:
- **NSIS installer**: `Voice MVP_0.1.0_x64-setup.exe` (alternativa más ligera)

## Instalación y Prueba

1. **Instalar**: Doble clic en el archivo `.msi`
2. **Ejecutar**: Busca "Voice MVP" en el menú inicio
3. **Probar conexión**: 
   - Ingresa el nombre de usuario
   - Servidor: `localhost:8080` (si el servidor corre localmente)
   - Presiona "Connect"

## Troubleshooting

### Error: "rustc not found"
```bash
# Verifica la instalación de Rust
rustc --version
cargo --version

# Si falla, reinstala con rustup
rustup self update
rustup update
```

### Error: "MSVC toolchain not found"
Instala Visual Studio Build Tools con "Desktop development with C++".

Verifica en PowerShell:
```powershell
Get-Command cl
# Debería mostrar la ruta a cl.exe (compilador de C++)
```

### Error: "npm run tauri: command not found"
```bash
# Reinstala dependencias
rm -rf node_modules package-lock.json
npm install
```

### Build Muy Lento (Primera Vez)
La primera compilación de Rust puede tardar **5-15 minutos** descargando y compilando dependencias. Compilaciones posteriores serán más rápidas (~1-2 min).

## Optimización: Release vs Debug

### Release (Producción) - Por defecto
```bash
npm run tauri build
```
- **Tiempo**: 5-10 minutos
- **Tamaño**: ~5-10 MB
- **Optimizado**: Sí
- **Ubicación**: `target\release\bundle\`

### Debug (Desarrollo rápido)
```bash
npm run tauri dev
```
- **Tiempo**: 30 segundos (después de primera compilación)
- **Tamaño**: ~50-100 MB
- **Optimizado**: No
- **Hot-reload**: Sí (frontend)

## Comparación: Linux vs Windows

| Archivo | Plataforma | Tamaño | Descripción |
|---------|------------|--------|-------------|
| `.msi` | Windows | ~5 MB | Instalador estilo Windows |
| `.exe` (NSIS) | Windows | ~5 MB | Instalador portable |
| `.deb` | Linux | ~4 MB | Debian/Ubuntu |
| `.AppImage` | Linux | ~74 MB | Portable (incluye runtime) |

## Distribución

### Instalador Firmado (Opcional)
Para distribución pública, considera firmar el instalador:
1. Obtener certificado de code signing
2. Configurar en `tauri.conf.json`:
```json
{
  "bundle": {
    "windows": {
      "certificateThumbprint": "TU_THUMBPRINT",
      "digestAlgorithm": "sha256",
      "timestampUrl": "http://timestamp.digicert.com"
    }
  }
}
```

### Auto-update (Futuro)
Tauri soporta auto-updates con [tauri-plugin-updater](https://github.com/tauri-apps/tauri-plugin-updater).

## Próximos Pasos

1. ✅ **Completado**: Build de cliente funcional
2. 🔄 **Siguiente**: Servidor Rust (compilar y empaquetar)
3. 🔄 **Pendiente**: Implementar captura/reproducción de audio
4. 🔄 **Pendiente**: UDP voice forwarding

## Referencias

- [Tauri Prerequisites - Windows](https://tauri.app/start/prerequisites/#windows)
- [Tauri Building Guide](https://tauri.app/start/build/)
- [Troubleshooting Tauri](https://tauri.app/guides/debug/)
