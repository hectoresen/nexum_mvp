# TODO - Avatar System Implementation

## 🎯 Objetivo

Implementar sistema de avatares completo con arquitectura limpia: **WebSocket para señalización + HTTP para recursos estáticos**.

## 🏗️ Arquitectura

**Servidor Rust expone:**

- WebSocket → `ws://ip:port/ws` (señalización, mensajes, estado)
- HTTP REST → `http://ip:port/api/...` (recursos estáticos, avatares)

**Mismo proceso. Mismo runtime. Misma aplicación.**

---

## 📋 Tareas de Implementación

### 1️⃣ Base de Datos - Schema Update

**Archivo:** `server/src/db.rs`

Actualizar tabla `users`:

```sql
ALTER TABLE users ADD COLUMN avatar_path TEXT;
ALTER TABLE users ADD COLUMN avatar_version INTEGER DEFAULT 0;
```

**Campos:**

- `avatar_path` (TEXT, nullable): Ruta relativa al archivo de avatar (ej: `avatars/uuid.webp`)
- `avatar_version` (INTEGER, default 0): Control de versión para invalidar cache

**Migración:**

- [ ] Añadir campos en función `init_db()`
- [ ] Actualizar struct `User` en `models.rs`
- [ ] Recrear DB o migrar existente

---

### 2️⃣ Servidor - Upload Endpoint

**Archivo:** `server/src/handlers.rs` (nuevo: `avatar.rs`)

**Endpoint:** `POST /api/users/{userId}/avatar`

**Headers requeridos:**

- `Authorization: Session <sessionId>`
- `Content-Type: multipart/form-data`

**Validaciones:**

1. ✅ Sesión válida y userId coincide con sesión
2. ✅ Tamaño máximo: **200KB**
3. ✅ MIME type: **image/png** o **image/webp** únicamente
4. ✅ NO permitir SVG (vector de ataque)
5. ✅ Re-encode en servidor (evitar malware embebido)

**Procesamiento:**

1. Recibir multipart upload
2. Validar tamaño y MIME
3. Decodificar imagen con `image` crate
4. Redimensionar a **256x256** pixels (mantener aspect ratio + crop center)
5. Re-encodear a WebP con calidad 85%
6. Guardar en `/data/avatars/{userId}.webp`
7. Actualizar DB:
   ```sql
   UPDATE users
   SET avatar_path = 'avatars/{userId}.webp',
       avatar_version = avatar_version + 1
   WHERE id = {userId}
   ```
8. Broadcast WebSocket `USER_UPDATED` a todos los clientes conectados

**Respuesta exitosa:**

```json
{
  "success": true,
  "avatarPath": "avatars/{userId}.webp",
  "avatarVersion": 3
}
```

**Dependencias necesarias:**

```toml
[dependencies]
image = "0.24"
webp = "0.2"
```

---

### 3️⃣ Servidor - Download Endpoint

**Archivo:** `server/src/handlers.rs`

**Endpoint:** `GET /api/users/{userId}/avatar`

**Headers de respuesta:**

- `Content-Type: image/webp`
- `Cache-Control: public, max-age=86400` (24h)
- `ETag: "v{avatarVersion}"`
- `Last-Modified: <timestamp>`

**Lógica:**

1. Buscar usuario en DB
2. Si NO tiene `avatar_path` → 404 o default avatar
3. Si cliente envía `If-None-Match: "v{version}"` y coincide → **304 Not Modified**
4. Leer archivo de `/data/avatars/{userId}.webp`
5. Stream bytes con headers de cache

**Optimización:**

- Cacheable en cliente y proxies
- ETag basado en `avatar_version`
- 304 Not Modified reduce bandwidth

---

### 4️⃣ WebSocket Protocol - Notificación

**Archivo:** `server/src/websocket.rs`

**Nuevo mensaje de servidor → clientes:**

```json
{
  "type": "USER_UPDATED",
  "payload": {
    "userId": "uuid-string",
    "avatarVersion": 3
  }
}
```

**Cuándo enviar:**

- Después de upload exitoso de avatar
- Después de cambio de userName (reutilizar mismo mensaje)
- Después de cambio de rol/estado visible

**Handlers en cliente:**

- Invalidar cache de avatar del usuario
- Re-fetch `GET /api/users/{userId}/avatar`
- O actualizar URL con query param: `...avatar?v={avatarVersion}`

---

### 5️⃣ Cliente - Upload Flow

**Archivo:** `client/src/components/UserSettings.tsx` (o nuevo modal)

**Pre-procesamiento en cliente:**

1. Seleccionar imagen desde input file
2. Leer como blob
3. Cargar en canvas HTML5
4. Redimensionar a **256x256** pixels
5. Comprimir a WebP (si soportado) o PNG
6. Validar que resulte < **200KB**
7. Si > 200KB, reducir calidad hasta cumplir o mostrar error

**Upload request:**

```typescript
const formData = new FormData()
formData.append('avatar', compressedBlob, 'avatar.webp')

const response = await fetch(`/api/users/${userId}/avatar`, {
  method: 'POST',
  headers: {
    Authorization: `Session ${sessionId}`,
  },
  body: formData,
})
```

**UI considerations:**

- Loading spinner durante upload
- Preview instantáneo del avatar seleccionado
- Progress bar (opcional)
- Manejo de errores (demasiado grande, formato inválido, etc.)

---

### 6️⃣ Cliente - Download & Cache

**Archivo:** `client/src/components/UserAvatar.tsx`

**Lógica de carga:**

```typescript
const avatarUrl = userId ? `/api/users/${userId}/avatar?v=${avatarVersion}` : '/default-avatar.png'
```

**Incluir query param `?v={version}`** para invalidar cache del browser.

**Fallback:**

- Si 404 → mostrar avatar default
- Si error de red → mostrar placeholder

**WebSocket handler:**

```typescript
case 'USER_UPDATED':
  // Actualizar avatarVersion en state del usuario
  setUsers(prev => prev.map(u =>
    u.id === payload.userId
      ? { ...u, avatarVersion: payload.avatarVersion }
      : u
  ));
  break;
```

Esto forzará re-render con nueva URL.

---

## 🔐 Seguridad - Checklist

- [ ] Máximo **200KB** por archivo
- [ ] Solo MIME types: `image/png`, `image/webp`
- [ ] NO permitir `image/svg+xml` (posible XSS)
- [ ] Re-encode completo en servidor (elimina metadata maliciosa)
- [ ] Validar sesión en upload endpoint
- [ ] Solo el usuario puede cambiar su propio avatar (userId == session.userId)
- [ ] Rate limiting: máximo 5 uploads por minuto por usuario
- [ ] Sanitizar nombres de archivo (no usar input del usuario directamente)
- [ ] Servir avatares con `Content-Disposition: inline` (no `attachment`)

---

## 🧪 Testing

- [ ] Upload avatar válido (PNG 100KB)
- [ ] Upload avatar válido (WebP 150KB)
- [ ] Rechazar archivo > 200KB
- [ ] Rechazar formato no permitido (JPEG, GIF, SVG)
- [ ] Rechazar upload sin sesión válida
- [ ] Rechazar upload de avatar de otro usuario
- [ ] Verificar broadcast de `USER_UPDATED` a todos los clientes
- [ ] Verificar cache (304 Not Modified en segunda request)
- [ ] Verificar que `?v=X` invalida cache
- [ ] Verificar que avatar se muestra en user list
- [ ] Verificar que avatar se actualiza en tiempo real en todos los clientes

---

## 📁 Estructura de Archivos

```
server/
  src/
    avatar.rs          (nuevo) - Lógica de procesamiento de imágenes
    handlers.rs        (modificar) - Endpoints HTTP
    websocket.rs       (modificar) - Mensaje USER_UPDATED
    models.rs          (modificar) - Struct User con avatar fields
    db.rs              (modificar) - Schema y queries
  data/
    avatars/           (crear) - Storage de archivos
      {userId}.webp

client/
  src/
    components/
      UserAvatar.tsx   (nuevo) - Componente de avatar
      UserSettings.tsx (modificar) - Modal con upload
      UserListPanel.tsx (modificar) - Mostrar avatares
```

---

## 🚀 Orden de Implementación

1. **Database schema** (`db.rs`, `models.rs`)
2. **Server upload endpoint** (`avatar.rs`, `handlers.rs`)
3. **Server download endpoint** (`handlers.rs`)
4. **WebSocket notification** (`websocket.rs`)
5. **Client upload UI** (modal, compression, request)
6. **Client download & display** (avatar component, cache)
7. **Testing completo**
8. **Security audit**

---

## 📦 Dependencias Nuevas

**Server (`server/Cargo.toml`):**

```toml
[dependencies]
image = "0.24"          # Procesamiento de imágenes
webp = "0.2"            # Encoding WebP
tokio = { version = "1", features = ["fs"] }  # I/O async
mime = "0.3"            # MIME type validation
```

**Client (`client/package.json`):**

```json
{
  "dependencies": {
    "browser-image-compression": "^2.0.0" // Compresión client-side
  }
}
```

---

## ✅ Definition of Done

- [ ] Avatar upload funcional con validaciones completas
- [ ] Avatar download con cache headers correctos
- [ ] WebSocket notification broadcast en tiempo real
- [ ] UI muestra avatares en user list
- [ ] UI permite cambiar avatar desde modal de settings
- [ ] Todos los tests de seguridad pasan
- [ ] Sin errores de compilación
- [ ] Sin warnings de clippy
- [ ] Documentación actualizada en README
- [ ] Changelog actualizado

---

**Notas:**

- Este diseño es **limpio, profesional y escalable**
- NO rompe arquitectura, la **complementa**
- WebSocket para señalización, HTTP para estáticos = **industry standard**
- Mismo proceso Rust sirve ambos protocolos = **eficiente**
