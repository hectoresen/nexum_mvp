# Nexum - User Flow & Server Decisions

**Documento de decisiones de flujo de usuarios y configuración del servidor**

---

## 📋 Estado Actual (2026-02-21)

### ✅ Completado

1. **✅ Role persiste**: Los usuarios se reconectan con su role original (owner/member)
2. **✅ Username se muestra**: Los mensajes muestran el nombre real del usuario
3. **✅ Persistencia de identidad**: Cada reconexión recupera el usuario existente por UUID
4. **✅ Mensajes se cargan**: Los últimos 50 mensajes se cargan al entrar a un canal
5. **✅ Sistema de admin con contraseña**: Los members pueden autenticarse como admin
6. **✅ Panel de configuración del servidor**: Owners ven un panel de configuración básico

### 🚧 En Progreso

- Edición de configuración del servidor (nombre, contraseña, límites)
- Sistema de ban/unban con persistencia en DB

### 📝 Pendiente

- Cambio de nombre de usuario
- Historial de cambios de nombre
- Kick temporal de usuarios

---

## 🎯 Sistema de Identidad (Implementado)

### Flujo de Usuario

#### Primera Conexión

1. Usuario abre la app → Ve lista de servidores
2. Añade servidor → Dirección IP:Puerto
3. Click "Connect" → Modal pide **username** (primera vez)
4. Cliente NO tiene `userId` guardado
5. Cliente envía: `{ username: "Pepe", client_version: "1.0.0" }`
6. Servidor:
   - Verifica que username no esté en uso
   - Crea nuevo usuario con UUID generado
   - Asigna role: **Member** (siempre)
   - Guarda en base de datos
7. Servidor responde: `{ userId: "abc-123", username: "Pepe", role: "member" }`
8. **Cliente guarda `userId` en localStorage** asociado al servidor

#### Reconexiones

1. Usuario vuelve a conectar al mismo servidor
2. Cliente YA tiene `userId` guardado
3. **Cliente conecta automáticamente SIN pedir username**
4. Cliente envía: `{ client_version: "1.0.0", resume_session_id: "abc-123" }`
5. Servidor:
   - Busca usuario por UUID
   - Si existe: Recupera username, role, etc. de la DB
   - Si no existe: Error → Cliente debe reconectar como nueva conexión
6. Servidor responde con datos del usuario existente
7. **NO pide username nuevamente**

### Almacenamiento Local (Cliente)

```typescript
// localStorage structure per server
{
  "servers": [
    {
      "id": "server-uuid-1",
      "name": "My Server",
      "address": "localhost:8080",
      "userId": "abc-123-def-456",  // ← Guarda el UUID del usuario
      "lastUsername": "Pepe"         // ← Para mostrar en UI
    }
  ]
}
```

---

## 🔐 Sistema de Administración (Implementado)

### Primera Vez que Lanzas el Servidor

**Sin archivo de configuración:**

1. El servidor detecta que no existe `server.toml`
2. **Genera una contraseña aleatoria segura** (16 caracteres alfanuméricos)
3. Muestra la contraseña en la consola con un mensaje destacado
4. Crea `server.toml` con esa contraseña
5. Guarda el archivo automáticamente

**Salida de consola:**

```
======================================================================
🔐 SERVER FIRST-TIME SETUP
======================================================================

A new configuration file has been created: server.toml

⚠️  IMPORTANT: Your Admin Password (keep this secure!)

    K7m9nP2xR4qW8vL5

This password is required to authenticate as admin from the client.
Share it only with trusted administrators.

To change the password, edit 'server.toml' and restart the server.
======================================================================
```

### Contraseña de Administrador

**⚠️ IMPORTANTE**: Todos los usuarios inician como `member`. No hay usuarios owner por defecto.

**Para convertirse en owner**:

1. Usuario conecta como `member`
2. Ve botón "🔒 Authenticate as Admin" en el sidebar
3. Click en el botón → Modal pide contraseña
4. Ingresa la contraseña mostrada al iniciar el servidor
5. Servidor valida contraseña
6. Si es correcta: Promociona a `owner` en DB y sesión
7. UI se actualiza automáticamente con controles de admin

### Cambiar la Contraseña de Admin

1. Detener el servidor
2. Editar `server.toml`
3. Cambiar el valor de `admin_password`
4. Reiniciar el servidor
5. Compartir la nueva contraseña con los admins de confianza

### Recuperar Contraseña Perdida

1. Detener el servidor
2. **Eliminar** `server.toml`
3. Reiniciar el servidor
4. Se generará una nueva contraseña aleatoria
5. **Nota:** Los usuarios, canales y mensajes NO se pierden (están en la DB)

**Archivo de configuración del servidor**: `server.toml`

```toml
[server]
host = "0.0.0.0"
ws_port = 8080
admin_password = "mi_contraseña_segura"  # ← Nueva configuración
```

**Flujo:**

1. Usuario con role `member` ve botón "Authenticate as Admin"
2. Click → Modal pide contraseña de admin
3. Cliente envía: `{ type: "AUTHENTICATE_ADMIN", password: "..." }`
4. Servidor verifica contraseña contra `admin_password` en config
5. Si es correcta:
   - Actualiza role del usuario a `owner` en DB
   - Envía confirmación al cliente
6. Cliente actualiza UI para mostrar controles de admin

**Consideración de seguridad**: La contraseña se envía por WebSocket sin cifrar (para MVP). En producción, usar TLS/WSS.

---

## 👥 Gestión de Usuarios (Planificado)

### Expulsión Temporal (Kick)

**Acción:** Admin click derecho en usuario → "Kick"

**Efecto:**

- Usuario es desconectado inmediatamente
- **NO se guarda en DB** (es temporal)
- Puede volver a conectar

### Veto Permanente (Ban)

**Acción:** Admin click derecho en usuario → "Ban"

**Efecto:**

- Usuario es desconectado inmediatamente
- Se guarda UUID en tabla `banned_users` con razón y timestamp
- Al intentar reconectar: Servidor rechaza conexión con error `USER_BANNED`

**Nueva tabla en DB:**

```sql
CREATE TABLE banned_users (
    user_id TEXT PRIMARY KEY,
    banned_by TEXT NOT NULL,
    reason TEXT,
    banned_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (banned_by) REFERENCES users(id)
);
```

### Desbanear Usuario

**Acción:** Admin → Panel de configuración → Lista de baneados → "Unban"

**Efecto:**

- Se elimina registro de `banned_users`
- Usuario puede volver a conectar

---

## 📝 Historial de Nombres (Planificado)

### Cambio de Nombre

**Flujo:**

1. Usuario click en su nombre (esquina superior izquierda)
2. Modal para cambiar nombre
3. Cliente envía: `{ type: "CHANGE_USERNAME", newUsername: "Nuevo Nombre" }`
4. Servidor:
   - Guarda cambio en tabla `username_history`
   - Actualiza `username` en tabla `users`
5. Broadcast a todos: "User X cambió su nombre a Y"

**Nueva tabla en DB:**

```sql
CREATE TABLE username_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    old_username TEXT NOT NULL,
    new_username TEXT NOT NULL,
    changed_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Ver Historial

**Acción:** Admin click derecho en mensaje → "Ver info del usuario"

**Modal muestra:**

- UUID del usuario
- Nombre actual
- Historial de nombres anteriores con timestamps
- Botón "Ban" (si es admin)

---

## 💬 Persistencia de Mensajes

### Estado Actual

- ✅ Los mensajes se guardan en `messages` table
- ❌ No se cargan al entrar a un canal

### Solución (En Implementación)

Al hacer `JOIN_CHANNEL`:

1. Servidor carga últimos 50 mensajes de ese canal desde DB
2. Envía `MESSAGE_HISTORY` al cliente con array de mensajes
3. Cliente los muestra en orden cronológico

```rust
// Pseudocódigo
async fn handle_join_channel(...) {
    // ... código actual ...

    // Cargar historial
    let messages = state.db.get_recent_messages(channel_id, 50)?;

    send_json(tx, ServerMessage::MessageHistory {
        channel_id,
        messages,
    })?;
}
```

---

## 🖥️ Panel de Configuración del Servidor (Planificado)

**Ubicación:** Botón "⚙️ Server Settings" (solo visible para owners)

**Secciones:**

### General

- Nombre del servidor (editable)
- Contraseña de admin (cambiar)
- Icono del servidor (futuro)

### Límites

- Máximo de usuarios totales
- Máximo de usuarios por canal de voz
- Máximo de caracteres por mensaje

### Usuarios Baneados

- Lista de usuarios vetados
- Nombre actual + UUID
- Razón del ban
- Botón "Unban"

### Logs (Futuro)

- Últimas acciones de administración
- Kicks, bans, cambios de nombre, etc.

---

## 📊 Prioridades de Implementación

### ✅ Fase 1: Identidad Persistente (COMPLETADO)

- [x] Modificar `ConnectPayload` para incluir `userId` opcional
- [x] Servidor verifica userId y recupera usuario existente
- [x] Cliente guarda userId en localStorage por servidor
- [x] Corregir display de username en UI

### ✅ Fase 2: Carga de Mensajes (COMPLETADO)

- [x] Implementar `get_message_history` con JOIN y límite
- [x] Enviar historial en `JOIN_CHANNEL`
- [x] Cliente muestra mensajes históricos en orden

### ✅ Fase 3: Sistema de Admin (COMPLETADO)

- [x] Añadir `admin_password` y `name` a config
- [x] Mensaje `AUTHENTICATE_ADMIN`
- [x] Handler para verificación de contraseña
- [x] UI: Botón "Authenticate as Admin"
- [x] UI: Panel de configuración básico

### Fase 4: Gestión de Usuarios (EN PROGRESO)

- [ ] Tabla `banned_users`
- [ ] Mensajes `KICK_USER`, `BAN_USER`, `UNBAN_USER`
- [ ] UI: Click derecho en usuario → menú contextual
- [ ] Panel de usuarios baneados en settings

### Fase 5: Historial de Nombres (PLANIFICADO)

- [ ] Tabla `username_history`
- [ ] Mensaje `CHANGE_USERNAME`
- [ ] UI: Modal de cambio de nombre
- [ ] UI: Modal de info de usuario con historial

### Fase 6: Edición de Configuración (PLANIFICADO)

- [ ] Guardar cambios de configuración en archivo
- [ ] Mensaje `UPDATE_SERVER_CONFIG`
- [ ] Recargar config sin reiniciar servidor
- [ ] Validación de cambios

---

## 🔄 Cambios en Protocolos

### Nuevos Mensajes Cliente → Servidor

```typescript
// Autenticación como admin
{
  type: "AUTHENTICATE_ADMIN",
  payload: {
    password: string
  }
}

// Cambiar nombre de usuario
{
  type: "CHANGE_USERNAME",
  payload: {
    newUsername: string
  }
}

// Expulsar usuario (solo admin)
{
  type: "KICK_USER",
  payload: {
    userId: string
  }
}

// Banear usuario (solo admin)
{
  type: "BAN_USER",
  payload: {
    userId: string,
    reason?: string
  }
}

// Desbanear usuario (solo admin)
{
  type: "UNBAN_USER",
  payload: {
    userId: string
  }
}
```

### Nuevos Mensajes Servidor → Cliente

```typescript
// Historial de mensajes al unirse a canal
{
  type: "MESSAGE_HISTORY",
  payload: {
    channelId: string,
    messages: Message[]
  }
}

// Confirmación de admin
{
  type: "ADMIN_AUTHENTICATED",
  payload: {
    userId: string,
    newRole: "owner"
  }
}

// Usuario fue expulsado
{
  type: "USER_KICKED",
  payload: {
    userId: string,
    username: string,
    kickedBy: string
  }
}

// Usuario fue baneado
{
  type: "USER_BANNED",
  payload: {
    userId: string,
    username: string,
    bannedBy: string,
    reason?: string
  }
}

// Notificación de cambio de nombre
{
  type: "USERNAME_CHANGED",
  payload: {
    userId: string,
    oldUsername: string,
    newUsername: string
  }
}
```

---

## 📝 Notas Técnicas

### Seguridad

- Contraseñas en config.toml (plain text para MVP)
- En producción: hash con bcrypt
- WebSocket sin cifrar (para MVP)
- En producción: usar WSS (TLS)

### Performance

- Historial de mensajes limitado a 50 por defecto
- Scroll infinito (cargar más) es para futuro
- Historial de nombres limitado a últimos 10 cambios

### Compatibilidad

- Versión del protocol: 1.0.0
- Cliente valida versión mayor.menor
- Cambios backwards-compatible permitidos

---

_Última actualización: 2026-02-21_
