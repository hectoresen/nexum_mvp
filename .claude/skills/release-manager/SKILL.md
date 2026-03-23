---
name: release-manager
description: >
  Gestiona el proceso completo de crear una nueva versión oficial (release) de Nexum.
  Usa esta skill SIEMPRE que el usuario mencione crear una release, publicar una versión,
  subir a vX.X.X, generar instaladores para distribución, o cualquier combinación de
  "versión" + "oficial/release/publicar/distribución". También trigger cuando el usuario
  diga "vamos a sacar la X.X.X" o "prepara la release". Esta skill orquesta todos los
  pasos: bump de versión, compilación, artifacts, notas de versión y actualización de
  toda la documentación afectada.
---

# Release Manager — Nexum

Cuando el usuario quiere crear una nueva versión oficial de Nexum, este proceso cubre
todos los archivos que deben actualizarse para que la release quede completa y consistente.

---

## 0. Antes de empezar

Confirma con el usuario:

1. **Número de versión** — por ejemplo `0.1.6`
2. **Tipo de release** — `Bug Fix Release`, `Feature Release`, `Feature + Bug Fixes`, `Alpha`, `MVP`
3. **Cambios incluidos** — qué se ha implementado/corregido desde la versión anterior (si el usuario no los enumera, búscalos en `docs/changelog.md` y en las secciones completadas de `docs/todo.md`)
4. **Fecha de la release** — por defecto la fecha actual

Si el usuario ya ha dado esta información en el chat, extráela directamente sin preguntar.

---

## 1. Crea la rama de release

**Nunca trabajes en `develop` ni en `main` directamente.**

```
git checkout develop
git checkout -b release/vX.X.X
```

---

## 2. Bump de versión

Actualiza el número de versión en **todos** estos archivos:

| Archivo | Dónde | Cambio |
|---------|-------|--------|
| `client/src-tauri/tauri.conf.json` | `"version"` en el objeto raíz | `"0.1.X"` |
| `client/src-tauri/Cargo.toml` | `version = "0.1.X"` en `[package]` | bump |
| `client/package.json` | `"version"` en el objeto raíz | `"0.1.X"` |
| `server/Cargo.toml` | `version = "0.1.X"` en `[package]` | bump |

Lee el contenido actual de cada archivo antes de editarlo para asegurarte de que el
string antiguo coincide exactamente.

---

## 3. Compilación

### 3.1 Binario del servidor

```powershell
cd server
cargo build --release
```

El binario resultante es `server/target/release/nexum-server.exe` (o `voice-server.exe`
según la versión). Cópialo a `client/src-tauri/resources/`:

```powershell
Copy-Item server\target\release\<binario>.exe client\src-tauri\resources\<binario>.exe -Force
```

> ⚠️ Si el servidor ha cambiado desde el último build, siempre recompila. Si solo
> cambiaron archivos del cliente puedes reutilizar el binario existente, pero confirma
> con el usuario antes de hacerlo.

### 3.2 Instaladores del cliente

```powershell
cd client
npm run tauri build
```

Los artifacts se generan en:
- `client/src-tauri/target/release/bundle/msi/Nexum_X.X.X_x64_en-US.msi`
- `client/src-tauri/target/release/bundle/nsis/Nexum_X.X.X_x64-setup.exe`

---

## 4. Carpeta de release

Crea `releases/vX.X.X/` y dentro un `README.md` con las notas de versión.

### Estructura del README.md de versión

```markdown
# Nexum vX.X.X — [Tipo de Release]

**Fecha:** [Fecha]  
**Plataforma:** Windows 10/11 (x64)

## Descargas

| Archivo | Tipo | Tamaño |
|---------|------|--------|
| `Nexum_X.X.X_x64_en-US.msi` | Instalador MSI (recomendado) | ~XX MB |
| `Nexum_X.X.X_x64-setup.exe` | Instalador NSIS | ~XX MB |
| `Nexum-Server_X.X.X_x64.exe` | Servidor standalone | ~X MB |

## Notas de versión

### ✨ Nuevo   ← omite si no hay novedades
- …

### 🐛 Correcciones   ← omite si no hay fixes
- …

### ⚠️ Notas de actualización   ← omite si no hay notas especiales
- …

## Instalación

1. Descarga `Nexum_X.X.X_x64_en-US.msi`
2. Ejecuta el instalador
3. Lanza Nexum desde el menú Inicio

## Requisitos

- Windows 10/11 (64-bit)
- 2 GB RAM mínimo
```

Copia también los tres artifacts (`.msi`, `.exe` del NSIS, servidor) a esta carpeta.

---

## 5. Actualiza `releases/README.md`

Modifica estas partes en orden:

### 5a. Estructura del directorio (bloque de código)
Añade `v X.X.X/` como nueva entrada al bloque de código de la estructura.

### 5b. Sección "Latest Release"
Reemplaza el bloque "Latest Release" con:
```
**[vX.X.X — Tipo de Release](vX.X.X/)** (Fecha)

- [Punto clave 1]
- [Punto clave 2 ...]
- Ver [vX.X.X Release Notes](vX.X.X/README.md) para los detalles completos
```

### 5c. Tabla "Previous Releases"
Mueve la versión anterior (la que era "Latest") al inicio de la tabla Previous Releases:
```
| [vX.X.X-anterior](vX.X.X-anterior/) | Fecha | Tipo |
```

### 5d. Tabla "Version History" (al final del README)
Añade una fila al inicio de la tabla con la nueva versión.

---

## 6. Actualiza `docs/changelog.md`

- Marca la entrada de la versión anterior como `_(released)_` si no lo estaba.
- Añade una nueva entrada al principio (o actualiza la entrada `Unreleased` existente):

```markdown
## [X.X.X] — [Fecha] — [Tipo de Release]

### Nuevo
- …

### Correcciones
- …
```

---

## 7. Actualiza `docs/todo.md`

- En la sección de foco actual, marca como `✅` las tareas que van incluidas en la release.
- Si hay una entrada de tipo "corrección de bugs ronda X" o similar, actualiza su estado.
- Si procede, añade una nueva sección de pendientes para la siguiente versión.

---

## 8. Actualiza `readme.md` (raíz del proyecto)

Localiza la sección `## 📦 Current Status` y actualiza:

- La línea `**Version:** X.X.X (Tipo)` con la nueva versión.
- La tabla de componentes si algún componente ha cambiado de estado (🚧 → ✅, 📋 → 🚧, etc.).

No toques la sección `## 🏷️ Release History` — solo contiene un link a `releases/README.md`.

---

## 9. Commit y push

```powershell
git add -A
git commit -m "release: vX.X.X — [descripción breve de una línea]"
git push origin release/vX.X.X
```

**Nunca hagas `git push origin develop` ni `git push origin main`.**
Deja que el usuario haga el merge desde GitHub.

---

## 10. Checklist de verificación

Antes de hacer el commit final, comprueba mentalmente que has hecho todo:

- [ ] Versión bumpeada en los 4 archivos (tauri.conf.json, client/Cargo.toml, client/package.json, server/Cargo.toml)
- [ ] Servidor compilado (si era necesario) y binario copiado a resources
- [ ] Instaladores generados con `npm run tauri build`
- [ ] Carpeta `releases/vX.X.X/` creada con README.md y los 3 artifacts
- [ ] `releases/README.md` actualizado (estructura, Latest Release, Previous Releases, Version History)
- [ ] `docs/changelog.md` actualizado
- [ ] `docs/todo.md` actualizado
- [ ] `readme.md` actualizado (versión + tabla de estado)
- [ ] Todo commiteado en `release/vX.X.X`, rama pushed al remote

---

## Notas del proyecto

- El binario del servidor generado por el build puede llamarse `nexum-server.exe` o
  `voice-server.exe` según la versión del proyecto. Antes de copiarlo, comprueba el
  nombre real en `server/target/release/`.
- El script `build.ps1 -Release -Bundle` automatiza los pasos 3.1 y 3.2 juntos.
  Úsalo si está disponible y actualizado.
- Los artifacts MSI/NSIS después del build están en
  `client/src-tauri/target/release/bundle/`.
