# TODO List - Nexum

## 🚧 Fase 0.5: Integración cliente-servidor (EN PROGRESO)

**Prioridad: ALTA - Foco actual**

Esta fase integra el servidor CLI con el cliente para ofrecer una experiencia de usuario unificada.

### 🔴 Bugs de alta prioridad — EN REVISIÓN (feature/qa-fixes-round1)

- [ ] **[QA1][BUG] Avatares rotos cuando el servidor es accedido por ngrok/HTTPS en puerto 443** — Las URLs construidas como `http://host:443/avatars/...` son inválidas; el puerto 443 requiere `https://`. El cliente genera `http://${serverAddress}/...` sin detectar el protocolo correcto. Solución: helper `buildBaseUrl(serverAddress)` que emite `https://host` cuando el puerto es 443, `http://host` en resto. Afecta a `UserListPanel`, `ChatArea`, `DirectMessageView`, `UserProfileModal`, `App.tsx`.
  - Branch: `feature/qa-fixes-round1`

- [x] **[QA3][BUG] Modal de autenticación de admin no muestra error al introducir contraseña incorrecta** — Closure obsoleto (*stale closure*): el handler de mensajes WebSocket captura `showAdminAuthModal = false` en el momento de la conexión. Cuando el modal se abre más tarde y el servidor responde con `UNAUTHORIZED`, el check `if (... && showAdminAuthModal)` siempre es `false` y el error nunca se muestra. Solución: `useRef` que espeja el estado del modal para acceder al valor actual desde el closure.
  - Branch: `feature/qa-fixes-round1`

- [x] **[QA4][BUG] Banear a un usuario no pide motivo al admin ni muestra razón al baneado** — El botón de ban en `UserListPanel` ejecuta `onBan(userId)` sin ningún input de motivo. El servidor envía `"You have been banned from this server"` al baneado sin incluir la razón aunque el payload `BAN_USER` ya soporta `reason: Option<String>`. Solución: añadir UI de motivo en el popover de ban + incluir razón en el mensaje de error que el servidor envía al usuario baneado.
  - Branch: `feature/qa-fixes-round1`

- [x] **[QA6][BUG] Puntos de mensajes no leídos en canales inconsistentes** — Causa raíz: `broadcast_to_channel` solo entrega mensajes al usuario que ha hecho `JOIN_CHANNEL` para ese canal específico. Al cambiar de canal, el usuario deja de recibir mensajes de los canales anteriores, por lo que nunca acumula mensajes no leídos en canales no activos. Solución: cambiar `handle_send_message`, `handle_delete_message` y `handle_edit_message` a `broadcast_message` para entregar a todos los usuarios conectados; la lógica de unread en el cliente ya es correcta.
  - Branch: `feature/qa-fixes-round1`

- [x] **[BUG] Avatar upload falla con "Failed to fetch" para clientes no-host** — Resuelto en `feature/fix-avatar-remote-clients`. Causa: WebView2 PNA bloqueaba `fetch()` a IPs privadas. Solución: comando Tauri `upload_avatar_via_backend` usando `reqwest` (bypassa WebView2).

- [x] **[BUG] Imágenes de perfil de otros usuarios aparecen rotas para clientes no-host** — Parcialmente resuelto con `crossOrigin="anonymous"` en `feature/fix-avatar-remote-clients`. Completado en `feature/qa-fixes-round1` con `buildBaseUrl` (QA1).

---

### 🔴 Bug crítico — Autenticación de admin falla para clientes remotos (feature/qa-fixes-round2) — ✅ RESUELTO

**Síntoma:** Un usuario que descarga la app e intenta autenticarse como admin en el servidor de otro PC introduce la contraseña correcta, pero su rol sigue como `member` y no obtiene acceso a las herramientas de administrador. El host en el mismo PC donde corre el servidor autenticó correctamente en una sesión anterior y su rol `owner` fue persistido en DB, por lo que al reconectarse ya no necesita volver a autenticarse — lo que da la falsa impresión de que la autenticación funciona para el host pero no para el guest.

**Causa raíz:** El handler `ADMIN_AUTHENTICATED` en `handleServerMessage` llamaba a `setShowAdminAuthModal(false)` y `setAdminAuthError(null)` **dentro del actualizador funcional de `setView`**. Esto convierte esas llamadas en *side effects* de un actualizador de estado, comportamiento que React 18 con automatic batching puede ejecutar en condiciones inesperadas. `handleServerMessage` es capturado por el closure del `wsClient.onMessage` en el momento de la conexión, y cuando el actualizador se ejecuta más tarde para un cliente remoto (donde la latencia de red hace que el modal ya esté abierto y el componente haya re-renderizado varias veces), los efectos secundarios dentro del updater pueden comportarse de forma inconsistente.

**Solución aplicada:**
- Ambos `wsClient.onMessage` handlers (en `handleConnectWithUserId` y en `handleConnect`) ahora detectan `message.type === 'ADMIN_AUTHENTICATED'` directamente y llaman `setShowAdminAuthModal(false)` / `setAdminAuthError(null)` como state updates propias, fuera del `setView` updater.
- El mensaje sigue cayendo al `setView` → `handleServerMessage` para que actualice `connection.role`.
- `handleServerMessage` case `ADMIN_AUTHENTICATED` queda limpio: solo devuelve `{ ...connection, role: message.payload.new_role }` sin side effects.
- Archivos: `client/src/App.tsx`

**Feature añadida: Revocación de rol admin al cambiar la contraseña del servidor:**
- Cuando el admin cambia `admin_password` en `UpdateServerSettings`, el servidor revoca el rol de todos los usuarios `owner` (DB + in-memory sessions) y emite `SERVER_USERS` broadcast.
- El cliente en `SERVER_USERS` sincroniza `connection.role` con `selfInUsers.role` de la lista autoritativa del servidor; si fue revocado, el cliente pasa automáticamente a `member` sin necesidad de un nuevo tipo de mensaje.
- Archivos: `server/src/db.rs` (+`demote_all_owners_to_member`), `server/src/session.rs` (+`demote_all_owners_to_member`), `server/src/handlers.rs` (lógica de revocación), `client/src/App.tsx` (role sync en `SERVER_USERS`)

**Estado:** ✅ Implementado en `feature/qa-fixes-round2`. Requiere rebuild con `.\build.ps1 -Release -Bundle`.

---

### � Bug crítico — WebView2 PNA bloquea avatares en clientes remotos (feature/qa-fixes-round2) — ✅ RESUELTO

**Síntoma:** Los avatares aparecen siempre como iniciales/fallback para el cliente invitado (PC2), aunque el servidor los sirva correctamente. El usuario host (PC1, `localhost:8080`) los ve sin problema. El bug persistió a través de tres rondas de corrección.

**Causa raíz definitiva (confirmada):** WebView2 en Tauri 2.0 aplica la política *Chrome Private Network Access* (PNA). Las peticiones desde el origen `tauri://localhost` a IPs RFC-1918 (`192.168.x.x`) requieren un preflight OPTIONS exitoso con cabecera `Access-Control-Allow-Private-Network: true`. El host está exento porque `localhost:8080` es loopback. Esta restricción afecta tanto a `<img src="http://...">` como a `fetch()` en modo GET — si WebView2 realiza la petición, la bloquea de forma no determinista incluso cuando el servidor responde correctamente.

**Intentos fallidos (documentados para referencia futura):**

1. **`crossOrigin="anonymous"` en etiquetas `<img>`** (feature/fix-avatar-remote-clients)
   - Resultado: empeoró la situación. El atributo fuerza a WebView2 a elevar la petición a CORS, pero `nest_service` (Axum) no propagaba el middleware CORS del router — las imágenes fallaban con error CORS en lugar de solo PNA.
   - Archivos: `ChatArea.tsx`, `DirectMessageView.tsx`, `MainView.tsx`, `UserListPanel.tsx`, `UserProfileModal.tsx`

2. **Reemplazar `nest_service` con ruta Axum explícita + `.allow_private_network(true)`** (feature/qa-fixes-round2)
   - Causa detectada: `nest_service("/avatars", ServeDir::new(...))` en Axum 0.7 **no hereda** el middleware `Router::layer(cors)`. Se reemplazó por `.route("/avatars/:filename", get(avatar::serve_static_avatar))` con función propia que incluye cabeceras CORS y PNA explícitas.
   - Resultado: el servidor responde correctamente, pero WebView2 sigue bloqueando las peticiones GET de manera no determinista. El problema es del cliente, no del servidor.

3. **Componente `ServerImage` con `fetch()` → Blob URL** (feature/qa-fixes-round2, commit ad75aa3)
   - Estrategia: cambiar de `<img src>` a `fetch()` + `URL.createObjectURL()`. Creado `ServerImage.tsx` como drop-in replacement de `<img>`.
   - Resultado: idéntico. `fetch()` en modo GET también pasa por el stack de red de WebView2 y está sujeto a las mismas restricciones PNA. El componente mostraba siempre el fallback (iniciales).

**Solución definitiva — reqwest vía comando Tauri (bypassa WebView2 completamente):**

Enrutar toda la carga de imágenes del servidor a través del backend Rust, evitando WebView2 por completo. El cliente invoca un comando Tauri que ejecuta la petición HTTP desde Rust con `reqwest`, codifica la respuesta en base64 y devuelve una data URL `data:image/webp;base64,...`. El componente `ServerImage` renderiza `<img src="data:...">` — mismo origen, sin red, sin restricciones PNA ni CORS.

- **Nuevo comando Tauri:** `fetch_remote_image(url: String) -> Result<String, String>`
  - Valida que la URL sea `http://` o `https://` (rechaza otros esquemas)
  - Usa `reqwest::Client` con timeout de 15 segundos y TLS nativo (rustls)
  - Codifica bytes de respuesta con `base64::engine::general_purpose::STANDARD.encode`
  - Devuelve `"data:{content-type};base64,{b64}"` (fallback mime: `image/webp`)

- **Componente `ServerImage`:** caché a nivel de módulo (`Map<string, string>`) keyed por URL completa incluyendo `?v=N`; URLs `data:` / `blob:` se pasan directamente sin invoke.

- **Dependencias añadidas a `client/src-tauri/Cargo.toml`:**
  - `reqwest = { version = "0.12", default-features = false, features = ["rustls-tls", "multipart"] }`
  - `base64 = "0.22"`

**Archivos clave modificados:**
- `client/src-tauri/src/main.rs` — comando `fetch_remote_image` + registro en `invoke_handler!`
- `client/src-tauri/Cargo.toml` — dependencias `reqwest` + `base64`
- `client/src/components/ServerImage.tsx` — reescrito para usar `invoke('fetch_remote_image', { url })`
- `server/src/avatar.rs` — función `serve_static_avatar` (reemplaza `nest_service`)
- `server/src/websocket.rs` — `.route("/avatars/:filename", get(avatar::serve_static_avatar))`

**Estado:** ✅ Resuelto en `feature/qa-fixes-round2`. TypeScript limpio. Rust `cargo check` limpio (`Finished dev profile [44.18s]`). Rebuild con `.\build.ps1 -Release -Bundle` necesario antes de test final.

---

### �🟡 Mejoras de moderación — PENDIENTE

- [ ] **[QA2][FEATURE] Badge en barra de tareas para mensajes no leídos en canales de texto** — El badge de la bandeja del sistema solo contabiliza DMs no leídos. Los mensajes nuevos en canales de texto no incrementan el contador. Añadir `unreadChannelIds.size` al cálculo del badge. También: clic derecho sobre un canal para silenciarlo/activarlo.

- [ ] **[QA5][FEATURE] Registro de moderación completo y mejoras al ban** — (a) Registro de moderación unificado (kick, ban, mute, unban, mensajes borrados) visible para el admin. (b) Los usuarios baneados deben desaparecer de la lista de miembros inmediatamente. (c) Mejoras al listado de bans: mostrar IP, motivo, fecha, con opción de filtrado.

---

### 🔴 UX / Notificaciones — URGENTE

- [x] **[QA7][UX] Toggle de notificaciones de DMs poco visible** — El control "Sound notifications for DMs" en `ClientSettingsModal` es gris tanto en estado activo como inactivo, lo que hace imposible distinguir si está habilitado o no a simple vista. Prioridad: URGENTE. Rediseñar el toggle con colores claramente diferenciados: verde/azul para activado, gris neutro para desactivado, con etiqueta de estado textual ("ON" / "OFF") junto al control.
  - Archivo: `client/src/components/ClientSettingsModal.tsx`

---

### 🟠 Gestión de servidor por el usuario — ALTA PRIORIDAD

- [ ] **[QA8][FEATURE] Silenciar canales de texto individualmente** — Los usuarios deben poder silenciar/activar un canal de texto con clic derecho en el nombre del canal. Al silenciar un canal: no se muestra el punto naranja de mensajes no leídos en ese canal, ni se incrementa el badge de la barra de tareas. El resto del funcionamiento es normal (el usuario sigue recibiendo los mensajes, solo se suprimen las notificaciones visuales). La acción es reversible con otro clic derecho. Alta prioridad.
  - Almacenamiento: `localStorage` o `tauri-store`, clave `mutedChannels: string[]` (IDs de canal).
  - Archivos: `client/src/components/ChannelList.tsx`, `client/src/App.tsx` (lógica de unread).

- [ ] **[QA9][FEATURE] Silenciar DMs de un usuario concreto** — Desde la tarjeta de usuario en el panel "Server members", añadir opción "Silenciar mensajes directos" (o "Activar notificaciones de mensajes directos" si ya está silenciado). Si un usuario tiene silenciado a otro, no recibirá el sonido de notificación ni el badge de DM no leído de ese usuario, aunque los mensajes siguen entregándose. Requiere persistencia local y UI contextual en la tarjeta de usuario.
  - Almacenamiento: `localStorage` o `tauri-store`, clave `mutedDmUsers: string[]` (IDs de usuario).
  - Archivos: `client/src/components/UserListPanel.tsx`, `client/src/App.tsx` (lógica de DM unread).

- [ ] **[QA10][FEATURE] Menú de opciones de servidor (clic en nombre del servidor)** — Al hacer clic en el nombre del servidor en la esquina superior izquierda de la vista conectada, se desplegará un menú contextual con opciones a nivel de usuario:
  - **Abandonar servidor** — Elimina el servidor de la lista de servidores guardados, desconecta al usuario y lo elimina de la lista de miembros del servidor. Requiere modal de confirmación. El servidor debe emitir un `USER_LEFT` al resto de usuarios. El cliente guest envía una petición de baja antes de desconectar (nuevo mensaje WS `LEAVE_SERVER` o similar). El servidor elimina al usuario de la BD o lo marca como inactivo.
  - **Silenciar servidor** — Silencia todos los canales de texto y todos los DMs del servidor. Los canales e ítems individuales mostrarán una indicación visual de "silenciado por servidor". Las opciones individuales de silenciar canal/DM quedarán deshabilitadas mientras el servidor esté silenciado globalmente. Reversible desde el mismo menú.
  - **Invitar al servidor** — Deshabilitado de momento (pendiente de definir el flujo de invitación).
  - **Marcar todo como leído** — Marca como leídos todos los canales con mensajes no leídos de este servidor, limpiando los puntos naranjas y el badge del sistema de forma inmediata.
  - Almacenamiento de estado de silencio: `localStorage` o `tauri-store`.
  - Archivos: `client/src/components/MainView.tsx`, `client/src/App.tsx`, `server/src/handlers.rs` (para `LEAVE_SERVER`), `server/src/db.rs`.

- [ ] **[FEATURE] Mensaje de motivo al kickear a un usuario** — Al kickear a un usuario, el admin debería poder introducir opcionalmente un motivo. Requiere añadir `reason: Option<String>` al payload `KICK_USER` en servidor y cliente, e input en el popover de kick.
  - Archivos candidatos: `server/src/handlers.rs`, `server/src/models.rs`, `client/src/components/UserListPanel.tsx`, `client/src/App.tsx`

---

### 🟢 Sistema de reacciones a mensajes — PENDIENTE (baja prioridad)

- [ ] **[FEATURE] Reacciones con emoticonos en canales de servidor y DMs**

  **Descripción general:** Los usuarios podrán añadir reacciones emoji a cualquier mensaje, tanto en canales de texto de servidor como en conversaciones de DM. Las reacciones son visibles en tiempo real para todos los miembros del servidor.

  **Paleta de emoticonos:**
  - Usar una librería gratuita de emoji estándar (p.ej. `emoji-picker-react` o `@emoji-mart/react` + `@emoji-mart/data`) que exponga la paleta completa y en color: caras, gestos, manos, animales, banderas, objetos, etc. — la misma que ofrece WhatsApp/Discord. Sin versiones monocromáticas.

  **Reglas de negocio:**
  - Un usuario puede añadir un máximo de **10 reacciones distintas por mensaje**.
  - Un usuario puede añadir y quitar sus propias reacciones libremente.
  - Un usuario **no puede quitar** reacciones de otros usuarios.
  - Si una reacción ya existe en un mensaje (puesta por otro usuario), cualquier usuario puede hacer clic sobre ella para "sumarla": el contador sube en 1. Si el mismo usuario vuelve a hacer clic, se resta (toggle: add/remove).
  - Al pasar el ratón sobre una reacción se muestra un tooltip con los nombres de los usuarios que la han añadido.
  - Un usuario **muteado de texto no puede añadir reacciones**.
  - Si el mensaje es eliminado, se eliminan todas sus reacciones.
  - Si un usuario reacciona, es kickeado y luego vuelve al servidor, conserva sus reacciones previas y puede seguir retirándolas o añadiendo nuevas.

  **UX / interacción:**
  - Al pasar el ratón sobre un mensaje aparece un botón "+" (junto a los botones de editar/borrar ya existentes). Una de las opciones al hacer clic será "Añadir reacción", lo que desplegará la paleta de emoticonos.
  - Las reacciones existentes se muestran en una fila debajo del texto del mensaje: `[emoji][contador]`. Hacer clic en una reacción existente actúa como toggle (añadir/quitar la propia reacción).

  **Tiempo real:**
  - Cuando un usuario añade o quita una reacción, el servidor emite un broadcast a todos los clientes conectados al servidor (o a ambos participantes del DM) con el estado actualizado de las reacciones del mensaje.

  **Alcance:**
  - Canales de texto de servidor ✅
  - DMs ✅ (mismo límite de 10 reacciones por mensaje)

  **Implementación estimada — áreas afectadas:**
  - Servidor: nueva tabla SQLite `message_reactions` (`id`, `message_id`, `user_id`, `emoji`, `created_at`); handlers `ADD_REACTION` y `REMOVE_REACTION`; broadcast `REACTION_UPDATED` con el listado completo de reacciones del mensaje; respetar límite de 10 por usuario por mensaje; bloquear si `is_text_muted`; cascade delete al borrar mensaje.
  - Servidor DM: misma lógica aplicada a `direct_messages`; nueva tabla `dm_reactions` o columna de discriminador.
  - Cliente: integrar picker de emoji (p.ej. `emoji-mart`); componente `MessageReactions` reutilizable (lista de píldoras emoji+contador + tooltip de autores); botón "+" en hover de mensaje; handler de `REACTION_UPDATED` en `App.tsx`; actualizar `protocol.ts` con los nuevos tipos de mensaje.
  - Archivos principales: `server/src/db.rs`, `server/src/handlers.rs`, `server/src/models.rs`, `client/src/components/ChatArea.tsx`, `client/src/components/DirectMessageView.tsx`, `client/src/App.tsx`, `client/src/types/protocol.ts`

---

### ✅ Correcciones de bugs ronda 3 QA — COMPLETADO

Diagnosticados y corregidos tras constatar que los arreglos de rondas anteriores no surtían efecto en el instalador.

- [x] **Binario del servidor obsoleto en el instalador** — `npm run tauri build` NO recompila el servidor. El `voice-server.exe` en `client/src-tauri/resources/` era el binario anterior a todas las correcciones. Síntoma: cualquier fix en `server/src/` se ignora al ejecutar el cliente instalado. Solución: `cargo build --release` en `server/` → copiar a `resources/` → volver a empaquetar con `npm run tauri build`. Automatizado con `build.ps1 -Release -Bundle`.
- [x] **Estado online siempre mostraba 0 conectados** — El servidor no emitía el estado correcto de usuarios conectados en el broadcast de bienvenida y en la actualización periódica. Arreglado en `server/src/handlers.rs` y `server/src/session.rs`, pero el fix solo llegó al cliente tras reconstruir el binario.
- [x] **Badge de notificaciones en barra de tareas era un cuadrado rojo** — `CreateBitmap` (DDB) de 32bpp ignora la máscara AND de 1bpp en Windows moderno; el resultado siempre es rectangular. Solución: `CreateDIBSection` (DIB, 32bpp) con alpha por pixel — círculo naranja (`#FF8C00`) radio 5px con alpha=255, exterior con alpha=0. Afectado: `client/src-tauri/src/main.rs`.
- [x] **Avatar upload y visualización fallaba para usuarios no-host** — Chrome Private Network Access (PNA) bloquea peticiones `fetch()` desde `tauri://localhost` a IPs privadas (`192.168.x.x`) si el servidor no responde con `Access-Control-Allow-Private-Network: true`. Los WebSocket no tienen este problema (sin preflight). Solución: `.allow_private_network(true)` en el `CorsLayer` de `tower-http` en `server/src/websocket.rs`.
- [x] **Avatar no se actualizaba visualmente tras subir una imagen** — El navegador cacheaba la URL del avatar sin `?v=N`. Solución: se añade `?v=${avatar_version}` a todas las URLs de avatar en `UserListPanel.tsx`, `ChatArea.tsx` y `App.tsx` para forzar la recarga cuando la versión cambia.
- [x] **Admin no podía borrar mensajes** (heredado de rondas anteriores — corregido al reconstruir el binario)
- [x] **Dot de presencia del owner aparecía gris** (heredado — corregido al reconstruir el binario)

---

### ✅ Correcciones de bugs post-0.5.14 — COMPLETADO

- [x] **DM se quedaba cargando / pestaña mostraba "…"** — Cuando el usuario A ya estaba conectado y el usuario B se conectaba después, A nunca recibía la lista actualizada, por lo que al abrir un DM con B la pantalla se quedaba cargando. Además la pestaña mostraba "…" en lugar del nombre. Doble arreglo: (1) el servidor ahora emite `ServerUsers` a todos los clientes tras dar la bienvenida a cada nuevo usuario; (2) `MainView` construye un usuario temporal con los datos del propio mensaje DM si el usuario no está aún en `serverUsers`.
- [x] **Avatares rotos para usuarios remotos** — Los avatares se guardaban como URL absoluta (`http://localhost:8080/...`), inútil para clientes en otra máquina. Ahora se guarda solo la ruta relativa (`avatars/uuid.webp`) y cada cliente la resuelve con su propia dirección de servidor. Afectados: `AvatarModal`, `UserListPanel`, `DirectMessageView`, `ChatArea`, `App.tsx`. CSP de Tauri actualizada de `null` a una política explícita que permite `img-src http:` para IPs locales.
- [x] **Lista de usuarios no se actualizaba al conectarse alguien nuevo** — `USER_JOINED` solo se emitía a miembros del canal, no a todos. Solucionado emitiendo `ServerUsers` desde `handle_connect` en el servidor tras enviar `WELCOME`.
- [x] **Usuario silenciado podía seguir escribiendo** — El input de texto no tenía ninguna comprobación de `is_text_muted`. Ahora `ChatArea` muestra un aviso rojo en lugar del formulario de envío cuando el usuario está silenciado.
- [x] **Admin no podía borrar mensajes de otros usuarios** — El botón de borrar solo aparecía en los propios mensajes. Ahora el owner puede borrar cualquier mensaje; editar sigue siendo solo para mensajes propios.

---

### ✅ Identidad de dispositivo criptográfica ed25519 (0.5.24) — COMPLETADO

**Problema:** Los usuarios se persisten en la base de datos del servidor con un `user_id` generado en el primer login, vinculado a la IP del cliente en ese momento. Si el usuario cambia de IP (IP dinámica, VPN, reinstalación del cliente), el servidor no puede relacionarlo con su `user_id` anterior y su username aparece como "ya en uso".

**Solución: par de claves ed25519 estable por dispositivo**

El cliente genera un par de claves ed25519 en el primer arranque y persiste la clave privada en `~/.nexum/device.key`. La clave pública se convierte en el "Device ID" del usuario — sin datos de hardware, sin fingerprinting invasivo. Es exactamente el modelo de SSH/Git/libp2p.

- ✅ **Identidad estable** — no depende de IP ni del servidor
- ✅ **Sin Privacy issues** — no recopila ni transmite datos de hardware
- ✅ **Sobrevive a reinstalaciones** — `~/.nexum/device.key` persiste entre versiones
- ⚠️ **Cambio de ordenador** — se pierde la identidad (aceptado, trabajo futuro)

**Flujos:**

- Primera conexión: genera keypair → envía `device_public_key` en CONNECT → servidor crea user ligando la clave pública
- Reconexión (IP cambiada): envía `device_public_key` → servidor encuentra el user por clave pública → resume sin error "username taken"
- Clientes viejos sin `device_public_key`: flujo actual inalterado (compatible)

**Tareas:**

- [x] Tauri: comando `get_device_public_key` — genera/persiste keypair ed25519 en `~/.nexum/device.key`, retorna clave pública hex
- [x] Cliente TS: `protocol.ts` — añadir `device_public_key?: string` a `ConnectPayload`
- [x] Cliente TS: `App.tsx` — obtener device key via `invoke` y enviarla en todos los `CONNECT`
- [x] Servidor: `models.rs` — `ConnectPayload.device_public_key: Option<String>`
- [x] Servidor: `db.rs` — migración columna `device_public_key` en users, `get_user_by_device_key`, `link_device_key`, `create_user` acepta clave opcional
- [x] Servidor: `handlers.rs` — si llega `device_public_key` sin `resume_session_id`: buscar user por device key → si existe, resume; si no, crear nuevo user con esa clave

---

### 0.5.22 / 0.5.23 — Corrección del instalador + Mensajería privada ✅

- [x] **NSIS installer launch checkbox (0.5.22)** — Fixed "Launch Nexum" checkbox not working after NSIS install. Added `nsis.installMode: "currentUser"` to `tauri.conf.json`.

- [x] **Private direct messages (0.5.23)** — End-to-end encrypted DMs between server members
  - ✅ Server: `direct_messages` DB table (id, sender_id, recipient_id, encrypted_content, created_at)
  - ✅ Server: `SEND_DM` + `GET_DM_HISTORY` WebSocket message types + handlers
  - ✅ Client: `dmCrypto.ts` — AES-GCM 256 + PBKDF2(100k) key derivation with module-level cache
  - ✅ Client: `DirectMessageView` component with message grouping, date separators, privacy banner
  - ✅ Client: UserListPanel popover (click user → inline input + "Send message" button)
  - ✅ Client: DM tab bar in MainView (Server tab + DM tabs with × close)
  - ✅ Client: App.tsx DM state (`dmMessages`, `openDmTabs`, `activeDmUserId`) + handlers
  - ✅ Client: DM tab unread badges, always-show chat button, pulsing indicators (0.5.23)
  - Future: true forward-secret key exchange (ECDH)
  - Future: message delete/edit in DMs

### 0.5.0 Funciones de administrador y mejoras de UX ✅

- [x] **Username persistence** — server sends username back in `WELCOME`, saved to localStorage; no more username prompts on reconnect
- [x] **Pre-WELCOME error guard** — if server rejects `resume_session_id` (e.g. DB wiped), clear stored userId and redirect to username modal gracefully
- [x] **Channel rename from UI** — owners hover channel row to reveal pencil icon; inline edit commits on Enter/blur, cancels on Escape; broadcasts `CHANNEL_RENAMED` to all clients
- [x] **Channel delete from UI** — owners hover channel row to reveal trash icon; delete sends `DELETE_CHANNEL` with confirm dialog
- [x] **Editable server settings panel** — `ServerSettingsModal` is now fully editable (name, admin password, max users, max voice users, max message size); WS/UDP ports shown read-only; saves to `server.toml` live via `Config::save()`
- [x] **Server user list** — owners can open `UserListModal` from sidebar "View Users" button; shows all registered users with role, join date, avatar initial
- [x] **`AppState.config` → `RwLock<Config>`** — server settings can be updated live without restart
- [x] **`WelcomePayload.username`** — server now includes username in WELCOME response
- [x] **Admin auth error feedback** — incorrect password shows red error message below input field
- [x] **Admin auth moved to dropdown** — removed standalone button, added to user avatar dropdown menu
- [x] **Secure password change** — requires current password verification + double entry validation
- [x] **Username persistence bug fix** — reload server from localStorage after clearing invalid userId
- [x] **Dark mode color update** — replaced all blue accents with gray (31 replacements across 10 files)
- [x] **App tagline change** — "Secure voice and text communication" instead of "Manage your servers"
- [x] **Client settings panel** — modal with placeholders for auto-start, language, theme, audio devices
- [x] **Documentation reorganization** — moved 10 .md files into `docs/` folder

### 0.5.1 Arquitectura de instalación ✅

- [x] Design unified installation structure (client + server same directory)
- [x] Configure Tauri bundle to include server binary (`tauri.conf.json` → resources)
- [x] Create unified build script (`build.ps1` with `-Release`, `-Bundle`, `-ServerOnly` flags)
- [ ] Test installation on clean Windows system

### 0.5.2 Sistema de avatares e interfaz de usuario ✅

- [x] **Avatar file upload support** — server accepts image files up to 10MB (jpg, png, gif, webp)
- [x] **Avatar URL support** — users can also provide direct image URLs
- [x] **Avatar storage** — server stores files in `avatars/` directory, serves via `/avatars` endpoint
- [x] **Avatar upload endpoint** — `/api/upload-avatar` accepts multipart/form-data
- [x] **Avatar modal with tabs** — "Upload File" and "Use URL" tabs in client
- [x] **Real-time avatar updates** — avatar appears in profile immediately after upload/save
- [x] **User settings modal** — dropdown now has "User Settings" with "Change Avatar" option
- [x] **Right sidebar user list** — displays all server users with avatars, roles, "(you)" indicator
- [x] **Button styling consistency** — Cancel buttons are gray with gray text, Save buttons are blue
- [x] **User list loading fix** — removed owner-only restriction from GET_USERS, now accessible to all authenticated users
- [x] **Avatar display after upload fix** — client constructs full URLs from server's avatar_path + serverAddress

### 0.5.3 Rediseño de UX de la pantalla de inicio ✅

- [x] **Server dropdown navigation** — moved local server management from card to header dropdown
- [x] **Settings dropdown with sections** — General (app/language/appearance) and Voice & Video (audio devices)
- [x] **Minimal add server button** — changed from card-style button to icon-only "+"
- [x] **Server name auto-fetch** — removed manual name field, server sends real name in WELCOME message
- [x] **Client settings tabs** — reorganized modal into General and Voice & Video sections
- [x] **Removed gear icon** — consolidated settings access into dropdown menu
- [x] **Server card connect button** — replaced text button with icon-only button with tooltip

### 0.5.4 Análisis e implementación del tema claro ✅

**Prioridad: MEDIA - COMPLETADO 2026-02-24**

Analizadas e implementadas las clases de tema claro en toda la aplicación.

#### Implementación completada ✅

**Funcionalidades implementadas:**

- [x] Create theme context/provider in React (`ThemeContext.tsx`)
- [x] Define color palette for both themes in `theme.ts`
- [x] Create `useAppTheme` hook for theme consumption
- [x] Persist theme preference in localStorage
- [x] Update all component classes to use theme-aware utilities
- [x] Test all components in both themes (dark and light)
- [x] Wire theme selector in ClientSettingsModal to actual theme switching
- [x] Add smooth transition between themes

**Refinamientos visuales:**

- [x] Revised light mode color palette (`#f8f9fa` main bg, `#ffffff` cards)
- [x] Fixed light mode visibility issues (headers, dropdowns, server cards)
- [x] Added borders between 3-panel layout for clear separation
- [x] Implemented minimalist button design (no bold, subtle backgrounds)
- [x] Renamed "User Settings" to "Profile" with user icon
- [x] Added cursor-pointer to all clickable elements

**Componentes actualizados:** 20+ archivos  
**Clases modificadas:** 500+ clases Tailwind  
**Estado de compilación:** ✅ Sin errores en cliente y servidor

### 0.5.5 Mejoras del sistema de mensajes ✅

**Prioridad: ALTA - Completado**

Mejoras del sistema de mensajes: visualización de avatares, perfiles de usuario y gestión de mensajes.

#### Correcciones de bugs

- [x] **Avatar display in messages** — User avatars not showing in text channel messages (showing default instead of uploaded avatar)
  - ✅ Extended MessagePayload to include avatar_url, avatar_path, avatar_version
  - ✅ Updated server to propagate avatar information in message broadcasts
  - ✅ Modified get_message_history to fetch avatar data from users table
  - ✅ ChatArea now constructs avatar URLs and displays images
  - ✅ Commit: `dbe7db2` - "fix: Display user avatars in chat messages"

#### Nuevas funcionalidades

- [x] **User profile modal (clickable users)** — Click on user in member list or message shows user info popup
  - ✅ Created UserProfileModal component
  - ✅ Shows avatar, username, role badge, user ID, join date
  - ✅ Accessible from message usernames (click)
  - ✅ Accessible from member list (click)
  - ✅ Owner users get special badge and info note
  - ✅ Commit: `11ec55c` - "feat: Add user profile modal"

- [x] **Message deletion** — Users can delete their own messages
  - ✅ Added DELETE_MESSAGE protocol implementation (client + server)
  - ✅ Delete button on message hover (trash icon, owner-only)
  - ✅ Confirmation dialog before deletion
  - ✅ Soft delete: message kept with deletion metadata
  - ✅ Display: "Message deleted by: {username}" (gray italic)
  - ✅ Database migration for deleted_by_user_id, deleted_at
  - ✅ Real-time broadcast via WebSocket
  - ✅ Commit: `517bebf` - "feat: Implement message deletion"
  - Future: Mod/admin can delete any message

- [x] **Message editing** — Users can edit their own messages
  - ✅ Add edit icon on message hover (pencil icon)
  - ✅ Inline edit with input field (Enter to save, Escape to cancel)
  - ✅ Server: `EDIT_MESSAGE` WebSocket event
  - ✅ Show "(edited)" label next to timestamp
  - ✅ Server: Store edit history (edited_at timestamp) in DB
  - ✅ Broadcast updated message to all channel members
  - ✅ Commit: `3f7c5f1` - "feat: Implement message editing"
  - Future: Show edit history on hover

#### Detalles de implementación técnica

**Cambios de protocolo:**

- ✅ `DELETE_MESSAGE` client message type + DeleteMessagePayload
- ✅ `MESSAGE_DELETED` server message type + MessageDeletedPayload
- ✅ `EDIT_MESSAGE` client message type + EditMessagePayload
- ✅ `MESSAGE_EDITED` server message type + MessageEditedPayload
- ✅ Extended `Message` model with `deleted_by`, `deleted_at` fields
- ✅ Added `edited_at` field to `Message` model

**Esquema de base de datos:**

```sql
✅ ALTER TABLE messages ADD COLUMN deleted_by_user_id TEXT;
✅ ALTER TABLE messages ADD COLUMN deleted_at INTEGER;
✅ ALTER TABLE messages ADD COLUMN edited_at INTEGER;
```

**Actualizaciones de componentes:**

- ✅ `ChatArea.tsx` - Added message delete button
- ✅ `UserProfileModal.tsx` (NEW) - Modal showing user details
- ✅ Message hover state with delete action button
- ✅ Avatar rendering fix in message component
- ✅ Add edit button to message hover state
- ✅ Add inline edit mode for messages

**Mejoras de UI/UX:**

- ✅ Added cursor pointer to avatars (clickable to view profile)
- ✅ Added cursor pointer to message content (clickable to view sender profile)
- ✅ Changed default theme to dark mode on first launch
- ✅ Restricted User ID visibility to owners only (privacy enhancement)

### 0.5.6 Documentación y estructura de releases ✅

**Prioridad: BAJA - Mantenimiento**

- [ ] **Simplify releases structure** — Consolidate README files
  - Remove redundant `releases/README.md` (generic overview)
  - Keep `releases/v0.X.X/README.md` for version-specific release notes
  - Update release workflow to only maintain version-specific READMEs
  - Generic release info should be in main project README

### 0.5.7 Detección y configuración del servidor local ✅

**Prioridad: ALTA - Corrección de bug + mejora de funcionalidad**

#### Problema

La detección del servidor local no funcionaba correctamente. El cliente mostraba "Not installed" aunque el servidor estuviera en el mismo directorio. Los usuarios no podían especificar manualmente la ruta si estaba en una ubicación no estándar.

#### Tareas

- [x] **Fix automatic server detection** — Improved detection with 6 executable name variants and prioritized path order (same dir > CWD > resources > standard paths)
- [x] **Manual server path configuration** — "Configure Server Path" button with file picker (Tauri dialog plugin)
- [x] **Server process isolation** — Server now runs from `~/.nexum/server/` instead of inheriting client CWD (was polluting `src-tauri/` with `data/`, `server.toml`)
- [x] **Fix IP restriction bug** — Removed one-IP-per-user restriction; multiple users from localhost or same NAT now work
- [x] **Fix username taken error loop** — Client now stops auto-reconnect on pre-auth errors, shows message to user
- [x] **Add `--data-path` CLI argument to server** — Server accepts custom data directory via `--data-path` argument

### 0.5.8 Eliminar botón redundante "Ver usuarios" ✅

**Prioridad: BAJA - Limpieza de UI - COMPLETADO 2026-02-25**

#### Problema

Tras implementar la lista de usuarios en el panel lateral derecho (0.5.2), el botón "View Users" en el menú de administrador era redundante.

#### Implementado ✅

- [x] Removed `onViewUsers` prop and button from `MainView.tsx`
- [x] Removed `handleGetUsers` function from `App.tsx`
- [x] Removed `showUserListModal` state and `UserListModal` import/render from `App.tsx`
- [x] `UserListModal.tsx` preserved for reuse in **0.5.12 Moderation System**
- [x] TypeScript: `tsc --noEmit` — clean
- [x] Rust: `cargo check` — clean

**Affected files:** `client/src/components/MainView.tsx`, `client/src/App.tsx`

### 0.5.9 Categorías y organización de canales ✅

**Prioridad: MEDIA - Mejora de funcionalidad - COMPLETADO**

#### Problema

Los servidores con muchos canales se vuelven desordenados. Los usuarios necesitan agrupar canales en categorías colapsables.

#### Solución

Implementar categorías colapsables similares a Discord: agrupaciones visuales (no entidades separadas en BD), configurables e identificadas por color.

#### Tareas

- [x] **Database schema update** — Add category support
  - Add `category_id` (optional) to channels table
  - Create `categories` table: `id`, `name`, `position`, `created_at`
  - Migration script for existing channels (all uncategorized initially)

- [x] **Backend protocol changes** — Category CRUD operations
  - Add `CREATE_CATEGORY` client message
  - Add `DELETE_CATEGORY` client message
  - Add `RENAME_CATEGORY` client message
  - Add `MOVE_CHANNEL_TO_CATEGORY` client message
  - Add corresponding server broadcast messages (`CATEGORY_CREATED`, `CATEGORY_DELETED`, `CATEGORY_RENAMED`, `CHANNEL_MOVED`)
  - Update `WELCOME` payload to include categories

- [x] **Frontend UI implementation** — Category display and interaction
  - Update ChannelList to render categories with channels inside
  - Add collapse/expand chevron next to category name
  - Store collapsed state per category in localStorage
  - Add "Add Category" button for owners (inline creation)
  - Add inline rename/delete controls for category and channel rows

- [x] **Category management** — Admin controls
  - Inline rename and delete for categories
  - Drag-drop channels between categories (HTML5 native API)
  - Delete category moves channels to uncategorized
  - Channels without category_id render in "Channels" section

**Estado de compilación:** ✅ Sin errores en cliente y servidor

### 0.5.10 Arranque automático al iniciar Windows ✅

**Prioridad: BAJA - COMPLETADO 2026-02-25**

#### Implementado ✅

- [x] **Backend implementation** — 3 Tauri commands using `winreg` crate
  - `is_auto_start_enabled(app_handle)` — reads `HKCU\Run` registry key
  - `enable_auto_start(app_handle)` — writes exe path to `HKCU\Run`
  - `disable_auto_start(app_handle)` — removes key from `HKCU\Run`
  - Windows-only (`#[cfg(windows)]`); returns `false`/error on other platforms
- [x] **Frontend implementation** — Settings UI toggle
  - Toggle loads real registry state on modal open (`useEffect` + `invoke`)
  - Calls enable/disable commands on change; grayed out while pending
  - Label: "Launch Nexum at Windows startup"
- [x] Rust: `cargo check` — clean, no errors
- [x] TypeScript: `tsc --noEmit` — clean, no errors

**Affected files:**

- `client/src-tauri/Cargo.toml` — added `winreg = "0.52"` (Windows-only)
- `client/src-tauri/src/main.rs` — 3 new commands + registered in invoke_handler
- `client/src/components/ClientSettingsModal.tsx` — wired toggle to real commands

### 0.5.11 UI de gestión del servidor local ✅

**Prioridad: MEDIA - Completado**

#### Problema

Una vez arrancado el servidor local, el botón "Configure Server" no hacía nada. No había forma de detenerlo, reiniciar la contraseña o borrar datos desde la UI del cliente.

#### Implementado ✅

- [x] **Server dropdown three-way split** — running: Stop Server (red) + Configure Server (gear); installed+stopped: Start Server; not installed: existing path controls
- [x] **Local Server Management Modal** — tabbed panel opened by "Configure Server" when running
  - ✅ Overview tab: running/stopped badge, data directory path, Stop/Start toggle
  - ✅ Reset Password tab: password input + Generate; stops server, deletes `server.toml`, relaunches with new password
  - ✅ Delete Data tab: requires server to be **stopped first** (explicit blocking step), two-step confirmation (type `DELETE`), wipes `~/.nexum/server/data/`, keeps `server.toml`
- [x] **Auto-connect error feedback** — When a saved server is unreachable, the connection modal now opens with a clear error message instead of failing silently
- [x] **New Tauri commands**: `reset_admin_password`, `delete_server_data`
- [x] **New Rust methods**: `ServerManager::reset_admin_password()`, `ServerManager::delete_server_data()`
- Commits: `7097a7e`, `45a7647`, `(delete-data-ux)`
- Starts polling server health when modal is open

**Casos límite:**

- Disable password reset if server is running
- Show clear warning before data wipe
- Refresh `localServerStatus` after stop/start actions

- [ ] Add private message functionality (click user in sidebar to DM)
- [ ] Implement end-to-end encryption for private messages
- [ ] Add encryption indicator in private chat UI

### 0.5.25 Paginación del historial de mensajes 🔴 CRÍTICO

**Prioridad: ALTA — Escalabilidad**

Actualmente `GET_MESSAGE_HISTORY` carga **todos** los mensajes de un canal en memoria de una sola vez. En servidores con uso prolongado esto provocará tiempos de carga altos, consumo de RAM elevado y una UX degradada.

**Comportamiento esperado (igual que Discord):**

- Al abrir un canal se cargan los **N mensajes más recientes** (p.ej. 50).
- Al hacer scroll hacia **arriba** se cargan bloques anteriores bajo demanda (infinite scroll hacia el pasado).
- Al hacer scroll hacia **abajo** se muestran siempre los mensajes más nuevos.

#### Tareas

- [ ] **Protocolo** — añadir `before_id?: string` y `limit?: number` a `GET_MESSAGE_HISTORY` payload; el servidor devuelve mensajes anteriores al `message_id` dado, ordenados DESC, limitados a `limit` (default 50)
- [ ] **Servidor `db.rs`** — modificar `get_message_history(channel_id, before_id, limit)` para usar cursor-based pagination (`WHERE id < before_id ORDER BY created_at DESC LIMIT ?`)
- [ ] **Servidor `handlers.rs`** — pasar `before_id` y `limit` al método de DB; incluir `has_more: bool` en la respuesta para que el cliente sepa si hay más páginas
- [ ] **Cliente `App.tsx`** — al abrir un canal, solicitar los últimos 50 sin `before_id`; detectar scroll al top → solicitar siguiente página con `before_id = id del mensaje más antiguo cargado`
- [ ] **Cliente `ChatArea.tsx`** — prepend de mensajes al inicio sin perder la posición de scroll; mostrar spinner de carga en la parte superior mientras se carga la página anterior; quitar spinner cuando `has_more: false`
- [ ] **Tests manuales** — verificar que el scroll no salta, que los mensajes se insertan en orden y que no se duplican

#### Archivos afectados

| Archivo                              | Cambio                                                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `server/src/db.rs`                   | `get_message_history` acepta `before_id: Option<Uuid>` + `limit: i64`                                   |
| `server/src/handlers.rs`             | Pasar parámetros de paginación; añadir `has_more` a la respuesta                                        |
| `server/src/models.rs`               | Añadir `before_id?`, `limit?` a `GetMessageHistoryPayload`; `has_more: bool` en `MessageHistoryPayload` |
| `client/src/types/protocol.ts`       | Actualizar interfaces                                                                                   |
| `client/src/App.tsx`                 | Lógica de carga incremental                                                                             |
| `client/src/components/ChatArea.tsx` | Infinite scroll hacia arriba + spinner                                                                  |

---

### 0.5.12 Sistema de moderación ✅

**Prioridad: ALTA - v0.1.5 — COMPLETADO (mergeado a develop)**

Permitir a los administradores gestionar usuarios problemáticos mediante expulsión, ban y silenciado individual.

---

#### Expulsión (Kick)

- [x] Admin can kick a user — forcibly disconnects them; they can reconnect immediately with no restrictions
- [x] `KICK_USER` client message → server closes the target's WebSocket with a `KICKED` error code
- [x] `USER_KICKED` broadcast so all other clients update their member list
- [x] Kicked user's client: show "You were kicked from this server" and navigate back to server list
- [x] **Kick log** — each kick is persisted in a `kick_log` SQLite table: `id`, `user_id`, `username`, `ip_address`, `kicked_at`, `kicked_by_user_id`

---

#### Ban permanente

- [x] Admin can ban a user — permanently blocks reconnection from that device
- [x] Ban is enforced by **device_public_key + IP address + user_id** (NOT username)
- [x] `BAN_USER` client message → server disconnects target, inserts into `bans` table, broadcasts `USER_BANNED`
- [x] `UNBAN_USER` client message → server removes row from `bans` (revoke)
- [x] On every `CONNECT`: server checks `bans` table against incoming `device_public_key`, origin IP **and** `user_id`; any match → reject with `BANNED` error code
- [x] Banned user's client: show "You have been banned from this server" on connect attempt
- [x] `bans` table schema: `id TEXT PK`, `user_id TEXT`, `username TEXT`, `ip_address TEXT`, `device_public_key TEXT`, `banned_at TEXT`, `reason TEXT`, `banned_by_user_id TEXT`
- [x] **Bug fix (post-merge)**: `User` struct now includes `device_public_key` field; all DB queries select it; `handle_ban_user` passes `target.device_public_key.as_deref()` to `create_ban` — previously always passed `None`, making device-key ban evasion possible via IP change

---

#### Silenciado (texto y/o voz)

- [x] Two independent mute types: **text mute** (cannot send messages) and **voice mute** (flag set, UI shown)
- [x] Mutes applied via popover in right-panel member list (owner-only controls)
- [x] `MUTE_USER` client message: `{ user_id, mute_text: bool, mute_voice: bool }` — sets or clears flags
- [x] Server persists mute state in `users` table: `is_text_muted`, `is_voice_muted`
- [x] `USER_MUTE_UPDATED` server broadcast: all clients update local user state
- [x] Text mute enforced: server rejects `SEND_MESSAGE` with `MUTED_TEXT` error code
- [x] Mute icons in member list (right sidebar): 🚫💬 / 🚫🎙️ icons
- [x] "Mute all" / "Unmute all" combo buttons in moderation popover

> ⚠️ **Known limitation — voice mute enforcement**: Voice mute flag is stored and broadcast correctly but has no actual audio enforcement. UDP voice forwarding is not yet implemented (stub in `udp.rs`). When UDP relay is added in a future phase, `is_voice_muted` must be checked before forwarding packets from a muted user.

---

#### Pestaña de moderación en Configuración del servidor

- [x] **"Moderation"** tab in `ServerConfigModal` (manage mode only)
- [x] **Banned users section** — list of active bans with username, IP, banned at; "Revoke ban" button per row
- [x] **Kick log section** — read-only list of historical kicks: username, IP, kicked at
- [x] Loaded via `GET_BAN_LIST` / `GET_KICK_LOG` WebSocket messages

### 0.5.13 Contraseña de acceso al servidor ✅

**Prioridad: BAJA - Funcionalidad de privacidad**

Permitir a los propietarios del servidor requerir una contraseña para unirse, haciendo el servidor privado.

#### Tareas

- [x] **Config field** — added `join_password: Option<String>` to `ServerConfig` in `server.toml`; default `None` (public server)
- [x] **Protocol change** — `ConnectPayload` gains optional `join_password` field; new `ErrorCode::PasswordRequired` returned when missing or wrong; server distinguishes "not provided" vs "incorrect" with distinct messages
- [x] **UI — join flow** — `JoinPasswordModal.tsx` shown when server returns `PASSWORD_REQUIRED`; retries with password attached to `CONNECT` payload; shows error on wrong password
- [x] **Server settings** — "Private Server" toggle + join password field added to Security tab of `ServerConfigModal` (both pre-launch and manage modes); `UpdateServerSettingsPayload` gains `join_password` field; empty string clears (makes public)
- [x] **`is_private` flag in `ServerSettingsPayload`** — server sends `is_private: bool` so the client knows privacy status without revealing the actual password
- [x] **Empty = open** — empty string / absent field means no password required

### 0.5.16 Detección de desconexión del servidor ✅

**Prioridad: ALTA - Bug crítico de UX**

**Bug:** cuando el proceso del servidor se mataba mientras había clientes conectados, los clientes no reaccionaban. Se quedaban en la vista conectada mostrando una UI obsoleta.

#### Comportamiento esperado

- Al cerrar el WebSocket inesperadamente y agotar todos los intentos de reconexión, el cliente debe volver a la lista de servidores con un mensaje claro de error.
- Mientras se reintenta la conexión, mostrar un banner visible "Reconnecting…" en la vista conectada.

#### Tareas

- [x] Add `onGiveUp?: () => void` callback to `WebSocketClient` — fires when all `maxReconnectAttempts` are exhausted
- [x] In `WebSocketClient.onclose`: call `onGiveUp?.()` when reconnect loop will not retry
- [x] In App.tsx `handleConnectWithUserId` and `handleConnect`: set `wsClient.onGiveUp` to navigate to `server-list` with a "Lost connection to server" error
- [x] Add "Reconnecting…" status indicator in the connected view (based on `connection.connecting` flag already in state)

**Affected files:** `client/src/lib/websocket.ts`, `client/src/App.tsx`, `client/src/components/MainView.tsx`

---

### 0.5.17 Corrección de bug: eliminación de canales ✅

**Prioridad: ALTA - Bug de funcionalidad**

**Bug:** hacer clic en el icono de papelera mostraba la UI de confirmación (✓ / ✕), pero hacer clic en ✓ no hacía nada.

#### Causas raíz

1. **Cliente (`ChannelList.tsx`):** El atributo `draggable` del contenedor padre suprimía los clics en los botones hijo en Tauri/WebView.
2. **Servidor (`handlers.rs` / `db.rs`):** `delete_channel` no eliminaba los mensajes asociados antes de borrar el canal, provocando fallos silenciosos por restricciones FK en SQLite.

#### Tareas

- [x] **Client — `ChannelList.tsx`:** Change `draggable={isOwner}` to `draggable={isOwner && !isDeleting && !isRenaming}` so the row is never draggable while edit/delete UI is active
- [x] **Client — `ChannelList.tsx`:** Add `e.stopPropagation()` to the ✓ confirm button `onClick` to prevent any parent event interference
- [x] **Server — `db.rs`:** Add `delete_channel_messages(channel_id: Uuid) -> Result<()>` method that deletes all messages for a channel
- [x] **Server — `handlers.rs`:** In `handle_delete_channel`, call `state.db.delete_channel_messages(payload.channel_id)?` before `state.db.delete_channel(...)` — ensures cascade cleanup and no FK violations
- [x] **Server — `handlers.rs`:** Wrap DB errors in `send_error` so the client receives feedback if deletion fails

**Affected files:** `client/src/components/ChannelList.tsx`, `server/src/db.rs`, `server/src/handlers.rs`

---

### 0.5.18 Reseteo de contraseña de admin antes del lanzamiento ✅

**Prioridad: ALTA - Laguna de UX**

**Problema:** en la pestaña de Seguridad del modal "Start Server" con servidor ya configurado, no era posible cambiar la contraseña de administrador sin arrancar el servidor primero.

#### Tareas

- [x] **Rust — `client/src-tauri/src/main.rs`:** Add `update_server_admin_password(new_password: String)` Tauri command
  - Reads `~/.nexum/server/server.toml`, replaces the `admin_password = "..."` line, writes back
  - Returns error if server currently running or if server.toml does not exist
  - Register in `invoke_handler`
- [x] **Frontend — `ServerConfigModal.tsx`:** Replace static info note (pre-launch + isConfigured) with an inline password reset section:
  - Collapses behind a "Reset Password" button; clicking it reveals: new password input + Generate button + "Update" button
  - On "Update": calls `update_server_admin_password`, shows success/error feedback inline
  - On "Launch Server": if `newAdminPassword` is non-empty and not yet saved, auto-call `update_server_admin_password` before starting

**Affected files:** `client/src-tauri/src/main.rs`, `client/src/components/ServerConfigModal.tsx`

---

### 0.5.19 Persistencia de configuración en el modal de pre-lanzamiento ✅

**Prioridad: ALTA - Bug de UX**

**Problema:** al reabrir el modal "Start Server" en un servidor ya configurado, la pestaña General siempre mostraba "My Nexum Server" y los límites por defecto en lugar de los valores previamente guardados.

#### Tareas

- [x] **Rust — `client/src-tauri/src/main.rs`:** Add `read_server_config()` Tauri command — parses `~/.nexum/server/server.toml` line-by-line, returns `{ name, max_users, max_users_per_voice_channel, max_message_size, is_private }` as a serialised struct
- [x] **Frontend — `ServerConfigModal.tsx`:** Add `useEffect` on mount that calls `read_server_config` when `mode === 'pre-launch' && isConfigured`, then sets `serverName`, `maxUsers`, `maxVoice`, `maxMessage`, `isPrivate` from the result

**Affected files:** `client/src-tauri/src/main.rs`, `client/src/components/ServerConfigModal.tsx`

---

### 0.5.20 Asistente de configuración inicial del servidor standalone ✅

**Prioridad: ALTA - UX incompleta**

**Problema:** el binario standalone del servidor solo pedía contraseña de administrador en el primer arranque. No preguntaba por el nombre del servidor ni la visibilidad pública/privada.

#### Tareas

- [x] **Expand `prompt_for_setup()` in `server/src/config.rs`** — replace the old password-only `prompt_for_password()` with a full wizard:
  - Step 1: Server name (`dialoguer::Input` with default "My Nexum Server")
  - Step 2: Admin password (existing generate/manual logic, unchanged)
  - Step 3: Server visibility — Public / Private; if Private, prompts for join password (`dialoguer::Password` with confirmation)
  - Returns `(name, password, join_password)` tuple; applies all three fields to `Config` before writing `server.toml`
- [x] **Add `--server-name` and `--join-password` CLI args to `server/src/main.rs`** — for non-interactive/scripted launches (bypasses wizard, uses provided values or defaults)
- [x] **Updated confirmation printout** — shows Server name and Visibility (🌐 Public / 🔒 Private) alongside admin password

**Affected files:** `server/src/config.rs`, `server/src/main.rs`

---

### 0.5.21 Unificación de rutas de datos del servidor standalone ✅

**Prioridad: ALTA - Bug de consistencia de datos**

**Problema:** el servidor standalone guardaba `server.toml` y `data/` en el directorio de trabajo actual, mientras que el cliente Tauri siempre usaba `~/.nexum/server/`. Esto provocaba que los servidores configurados desde el cliente no se encontraran al relanzar el standalone, y viceversa.

#### Tareas

- [x] **`server/Cargo.toml`**: Add `dirs = "5.0"` dependency
- [x] **`server/src/config.rs`**: Add `nexum_server_dir()` helper that returns `~/.nexum/server/`; update `Config::load()` to use it as default config and data path (respects existing `CONFIG_PATH` env var override)

**Affected files:** `server/src/config.rs`, `server/Cargo.toml`

---

### 0.5.26 Bandeja del sistema (System Tray) ✅

**Prioridad: ALTA — Requisito previo para notificaciones — COMPLETADO**

La app no se cierra al pulsar la X de la ventana: se minimiza a la bandeja del sistema (esquina inferior derecha de Windows). Para salir completamente el usuario usa el menú contextual del icono.

#### Comportamiento

- Cerrar la ventana (X) → ventana oculta, proceso sigue vivo, icono en system tray.
- Clic en el icono de tray → restaura/muestra la ventana.
- Clic derecho en el icono de tray → dropdown contextual:
  - **Header**: "Nexum" (sólo texto, no accionable)
  - **Check for updates** — por ahora no hace nada (placeholder para futura feature de auto-update)
  - **Quit Nexum** — cierra el proceso completamente

#### Tareas

- [x] **Tauri `main.rs`** — `TrayIconBuilder` con el icono de la app; `on_tray_icon_event` gestiona `LeftClick` (mostrar ventana); `on_menu_event` gestiona `quit` y `check_updates`
- [x] **Tauri `main.rs`** — `.on_window_event` intercepts `CloseRequested`: llama `api.prevent_close()` y `window.hide()`
- [x] **Tauri `main.rs`** — menú con `MenuItem` deshabilitado "Nexum", separadores, "Check for updates" (no-op), "Quit Nexum"
- [x] **`Cargo.toml`** — feature `tray-icon` añadida a la dependencia `tauri`

#### Archivos afectados

| Archivo | Cambio |
|---|---|
| `client/src-tauri/src/main.rs` | `setup_tray()` + `.setup()` + `.on_window_event()` en builder |
| `client/src-tauri/Cargo.toml` | `tauri = { features = ["tray-icon"] }` |

---

### ✅ 0.5.14 Sistema de notificaciones — COMPLETADO

**Prioridad: ALTA — depende de 0.5.26 (Bandeja del sistema)**

Sistema de notificaciones de mensajes pendientes. El objetivo MVP es que el usuario sepa cuando tiene mensajes sin leer sin tener la ventana visible.

#### Alcance MVP

**Qué notifica:**
- **DMs**: siempre emiten notification (badge + sonido opcional).
- **Canales de texto del servidor**: emiten badge visual únicamente (sin sonido por ahora).
- **Canales de solo-lectura / notificaciones del servidor**: solo badge visual.

**Qué NO notifica (pendiente, tareas separadas):**
- menciones `@username` → ver **0.5.29**
- silenciar servidores / canales individuales → ver subtarea MEDIUM abajo

#### Unread badges

- Badge rojo (bolita) aparece en:
  - La pestaña de conversación DM no abierta en el tab bar (ya implementado en 0.5.23).
  - El icono del system tray (tooltip con número de mensajes pendientes). ✅
- Los badges desaparecen cuando el usuario abre la conversación correspondiente.
- Los canales de texto con mensajes sin leer muestran un punto rojo en la lista de canales del sidebar. ✅

#### Sonido

- Las notificaciones sonoras aplican **únicamente a DMs**.
- El sonido es configurable por el usuario en la pestaña **Notificaciones** de Client Settings. ✅
- Implementado con Web Audio API (oscilador sintético) — sin archivos de audio externos.

#### Tareas

**Tauri (Rust)**
- [x] Comando Tauri `update_unread_count(count: u32)` — actualiza tooltip del sistema trey con conteo de mensajes no leídos
- [ ] Implementar overlay icon en taskbar (número de mensajes pendientes) via WinAPI — PENDIENTE (subtarea futura)

**Frontend**
- [x] `App.tsx` — `unreadChannelIds: Set<string>` en `ActiveConnection`; se puebla cuando llega `MESSAGE` en canal no activo; se limpia al hacer `handleJoinChannel`
- [x] `ChannelList.tsx` — badge/punto rojo en canales con mensajes sin leer
- [x] `App.tsx` — `useEffect` invoca `update_unread_count` con conteo total (DMs + canales) cuando cambia unread state
- [x] `App.tsx` — `DM_RECEIVED` reproduce sonido sintético (Web Audio API) si sonido habilitado
- [x] `playDmNotificationSound()` — oscilador 880 Hz, 0.3s, sin asset externo

**Client Settings — pestaña Notificaciones**
- [x] Añadir pestaña **"Notifications"** en `ClientSettingsModal.tsx`
- [x] Toggle: **"Sound notifications for DMs"** (default: off) — persiste en `localStorage` como `nexum_dm_sound_enabled`
- [ ] Subtarea pendiente (LOW): permitir al usuario configurar el sonido de notificación (archivo personalizado)

**Silenciar servidores/canales (MEDIUM — pendiente, no en MVP)**
- [ ] El usuario podrá silenciar un servidor completo (sin badges, sin sonido para ese servidor)
- [ ] El usuario podrá silenciar canales individuales dentro de un servidor
- [ ] La configuración de mute se almacena en `localStorage` por `serverId/channelId`
- [ ] UI: botón derecho / menú contextual en el nombre del servidor o canal en el sidebar

#### Archivos afectados

| Archivo | Cambio |
|---|---|
| `client/src-tauri/src/main.rs` | Comando `update_unread_count` + taskbar overlay |
| `client/src/App.tsx` | `unreadChannelIds`, invocar `update_unread_count`, sonido DM |
| `client/src/components/ChannelList.tsx` | Badge visual en canales con mensajes no leídos |
| `client/src/components/ClientSettingsModal.tsx` | Nueva pestaña Notifications + toggle de sonido |

---

### 0.5.27 Canal de notificaciones del servidor + Canales de solo lectura 🚧

**Prioridad: ALTA — Requisito previo para notificaciones del servidor**

#### Canal de notificaciones del servidor

El administrador puede designar un canal de texto existente como **canal de notificaciones del servidor**. En ese canal el servidor escribirá automáticamente mensajes de sistema (bienvenidas, salidas, etc.). Es un canal normal en el que los usuarios también pueden escribir mensajes.

**Mensajes automáticos del servidor (MVP):**
- `"👋 {username} se ha unido al servidor."`
- `"👋 {username} ha abandonado el servidor."`

**Configuración:**
- En la modal de administración del servidor (tab **Moderation** o nuevo tab **Notifications**): selector/dropdown con los canales de texto existentes para elegir el canal de notificaciones; botón para deseleccionar (desactivar).
- Botón **(i)** informativo: explica qué mensajes llegarán al canal y que si no hay canal configurado no llega ninguna notificación de servidor.
- Si no hay canal configurado → no se envía ningún mensaje automático.
- El canal configurado se persiste en `server.toml` o en la DB como metadato del servidor.

**Tareas canal de notificaciones:**
- [ ] **`server/src/config.rs`** — añadir campo `notification_channel_id: Option<String>` a `ServerConfig`
- [ ] **`server/src/handlers.rs`** — en `handle_connect` y `handle_disconnect` (o equivalente): si `notification_channel_id` está configurado, enviar mensaje de sistema al canal vía `broadcast_to_channel`
- [ ] **`server/src/models.rs`** — nuevo tipo de mensaje: `system: true` flag en `Message` para que el cliente lo renderice diferente (texto gris/cursiva, sin avatar)
- [ ] **Protocolo** — `GET_SERVER_SETTINGS` devuelve `notification_channel_id`; nuevo mensaje `SET_NOTIFICATION_CHANNEL { channel_id: Option<String> }` (admin only)
- [ ] **`ServerConfigModal.tsx`** — nuevo selector en tab de administración para elegir canal de notificaciones + botón (i) con tooltip explicativo
- [ ] **`ChatArea.tsx`** — renderizar mensajes con `system: true` en estilo diferenciado (gris, cursiva, sin avatar, sin acciones)

#### Canales de solo lectura

El administrador puede marcar un canal de texto como **solo lectura**: los usuarios normales no pueden escribir, solo el administrador y el servidor (mensajes de sistema). Útil para canales de anuncios o para usar como canal de notificaciones exclusivo.

**Tareas canales solo lectura:**
- [ ] **`server/src/db.rs`** — añadir columna `is_read_only: bool` (default `false`) a la tabla `channels`
- [ ] **`server/src/handlers.rs`** — en `handle_send_message`: rechazar con `ERROR` si el canal es `is_read_only` y el usuario no es owner/admin
- [ ] **Protocolo** — `is_read_only` incluido en el payload de canal al cliente
- [ ] **`client/src/types/protocol.ts`** — añadir `is_read_only?: boolean` a `Channel`
- [ ] **`ChannelList.tsx`** — icono de candado 🔒 en canales solo lectura
- [ ] **`ChatArea.tsx`** — ocultar / deshabilitar el input de mensaje cuando el canal es solo lectura; mostrar mensaje "Este canal es de solo lectura"
- [ ] **Admin UI** — toggle `is_read_only` en el menú contextual / panel de edición de canal (owner only)

#### Archivos afectados

| Archivo | Cambio |
|---|---|
| `server/src/config.rs` | `notification_channel_id` |
| `server/src/db.rs` | Columna `is_read_only` en channels |
| `server/src/handlers.rs` | Mensajes de sistema en join/leave; rechazar send en read-only |
| `server/src/models.rs` | `system` flag en Message; `is_read_only` en Channel |
| `client/src/types/protocol.ts` | `is_read_only`, `system` |
| `client/src/components/ChannelList.tsx` | Icono candado |
| `client/src/components/ChatArea.tsx` | Renderizado mensajes sistema; input deshabilitado |
| `client/src/components/ServerConfigModal.tsx` | Selector canal de notificaciones |

---

### 0.5.28 Reacciones a mensajes 🚧

**Prioridad: BAJA**

Los usuarios pueden reaccionar a cualquier mensaje con emojis (como Discord / WhatsApp). Pueden añadir una reacción o eliminar una que ya pusieron.

#### Comportamiento

- Hover sobre un mensaje → botón emoji "+" aparece.
- Click en "+" → emoji picker (selector de emojis básico).
- El emoji elegido aparece bajo el mensaje con un contador (p.ej. `👍 3`).
- Si el usuario ya puso ese mismo emoji, hacer click en la reacción la elimina.
- Si el usuario no puso ese emoji, hacer click en la reacción existente la añade.
- Las reacciones son visibles para todos los usuarios en el canal.

#### Tareas

- [ ] **DB** — nueva tabla `message_reactions`: `id`, `message_id`, `user_id`, `emoji`, `created_at`
- [ ] **Protocolo** — `ADD_REACTION { message_id, emoji }` / `REMOVE_REACTION { message_id, emoji }`; broadcast `REACTION_UPDATED { message_id, reactions: [{emoji, count, user_ids}] }`
- [ ] **`server/src/handlers.rs`** — handlers para `ADD_REACTION` / `REMOVE_REACTION`
- [ ] **`server/src/db.rs`** — `add_reaction`, `remove_reaction`, `get_reactions_for_message`
- [ ] **`client/src/types/protocol.ts`** — nuevas interfaces
- [ ] **`ChatArea.tsx`** — renderizar reacciones bajo cada mensaje; emoji picker básico; lógica add/remove

---

### 0.5.29 Sistema de menciones 🚧

**Prioridad: BAJA**

Permite mencionar usuarios con `@username` en mensajes de canal. MVP: solo detección y highlight visual en el cliente, sin notificación sonora ni push.

#### Tareas

- [ ] **`ChatArea.tsx`** — parsear texto del mensaje buscando `@username`; resaltar en color diferente si el username coincide con el usuario local
- [ ] **Protocolo** — el servidor puede incluir `mentions: string[]` en el payload de mensaje para que el cliente no tenga que hacer parsing propio (opcional, puede hacerse solo en cliente en MVP)
- [ ] **Visual** — mensajes que contienen una mención al usuario actual tienen fondo ligeramente resaltado en el chat
- [ ] **Notificación** — integración con el sistema de notificaciones (0.5.14) cuando esté implementado

---

### 0.5.15 UX de lanzamiento del servidor y modal unificado de configuración ✅

**Prioridad: ALTA - Laguna de UX + Refactor**

#### Problema

1. Al hacer clic en "Start Server", el servidor arrancaba sin dar ningún feedback: sin paso de configuración, sin spinner, sin notificación "listo", sin acceso directo a "Conectar ahora".
2. `ServerSettingsModal` era una lista plana sin pestañas, sin espacio para secciones futuras (Moderación, etc.).

#### Solución

Sustituir ambos flujos por un único componente `ServerConfigModal` que se adapta a dos modos: **pre-launch** (antes de arrancar) y **manage** (modo administrador conectado).

#### Subtareas

**Rust — `server_manager.rs` + `main.rs`**

- [x] Add `write_initial_server_config(name, max_users, max_voice, max_message)` Tauri command
  - Writes `~/.nexum/server/server.toml` with provided values before first launch
  - Only intended for pre-launch first-time configuration
  - Registered in `invoke_handler`
- [x] Add `check_server_ready(port)` Tauri command
  - TCP connect to `127.0.0.1:port` with 500 ms timeout
  - Returns `true` when server is accepting connections
  - Registered in `invoke_handler`

**Frontend — `ServerConfigModal.tsx` (nuevo componente)**

- [x] Create `ServerConfigModal.tsx` with props: `mode`, `isConfigured`, `port`, `settings?`, `onClose`, `onSaveSettings?`, `onChangePassword?`, `onConnectNow?`
- [x] Tab: **General** — server name input + Max Users + Max Voice Channel Users + Max Message Size
- [x] Tab: **Security**
  - Pre-launch + unconfigured: admin password input + Generate button (min 8 chars)
  - Pre-launch + configured: read-only note ("Server already configured — use Reset Password to change")
  - Manage mode: "Change Admin Password" button → calls `onChangePassword`
- [x] Tab: **Moderation** — placeholder "Coming in 0.5.12"
- [x] Pre-launch launch flow (internal state machine):
  - [x] `phase: 'config' | 'launching' | 'ready' | 'error'`
  - [x] `phase='config'`: form displayed, footer shows "Launch Server" button
  - [x] On launch: if first time → call `write_initial_server_config`, then `start_local_server`; if configured → just `start_local_server`
  - [x] `phase='launching'`: spinner overlay, polls `check_server_health` + `check_server_ready` every 1 s, times out after 30 s
  - [x] `phase='ready'`: success banner with WS address + "Connect Now" button (calls `onConnectNow`)
  - [x] `phase='error'`: error message + "Try Again" button (resets to `phase='config'`)
- [x] Manage mode: save/close behavior identical to old `ServerSettingsModal`

**Refactor — sustituir `ServerSettingsModal`**

- [x] Replace `<ServerSettingsModal>` usage in `App.tsx` with `<ServerConfigModal mode='manage'>`
- [x] Remove `ServerSettingsModal.tsx` from codebase
- [x] Remove `import ServerSettingsModal` from `App.tsx`

**Conexión a `App.tsx`**

- [x] Open `<ServerConfigModal mode='pre-launch'>` from `handleLaunchLocalServer` (replaces old `showLocalServerSetupModal`)
- [x] Remove old states: `showLocalServerSetupModal`, `localSetupPassword`, `localSetupError`, `localSetupLaunching`
- [x] Add `showServerConfigModal: boolean` + `isServerConfigured: boolean` states
- [x] Pass `onConnectNow` (`handleServerConnectNow`): auto-adds local server entry if missing + opens `ServerConnectModal`
- [x] Pass `isConfigured` from `invoke('is_server_configured')` called on modal open

**Validación**

- [x] `tsc --noEmit` — clean
- [x] `cargo check` — clean

**Documentación**

- [x] `changelog.md` updated
- [x] `todo.md` subtasks ticked

### 0.5.3 Detección del servidor ✅

- [x] Create `server_manager.rs` module in client backend
- [x] Implement `detect_server()` function (searches ~7 common install paths)
- [x] Implement `get_server_path()` logic inside detect
- [x] Add Tauri command `detect_local_server()`
- [x] Unit tests passing (3/3)

### 0.5.3 Control del servidor ✅

- [x] Implement `start_local_server()` command
  - [x] Launch server process with `--non-interactive`
  - [x] Track process handle in AppState (Arc<Mutex<Option<Child>>>)
  - [x] Status tracking (NotInstalled/Stopped/Starting/Running/Error)
- [x] Implement `stop_local_server()` command (kill + wait)
- [x] Implement `get_server_status()` command
- [x] Implement `check_server_health()` - detects crashed processes

### 0.5.4 Flujo de configuración inicial ✅

- [x] Create first-run detection (`is_server_configured()` → checks server.toml)
- [x] Password input integrated in `LocalServerPanel`
  - [x] Password input field
  - [x] "Generate" button (16-char random)
  - [x] Only shown on first setup (no server.toml)
- [x] Pass `--admin-password` on first start
- [ ] Persist password securely in system keychain

### 0.5.5 Componentes de UI ✅

- [x] Create `LocalServerPanel` component
  - [x] Server status indicator with animated pulse
  - [x] Start/Stop buttons with loading states
  - [x] Port info display (WS + UDP)
  - [x] PID display when running
  - [x] Refresh button (🔄)
  - [x] Error display area
  - [x] Binary path display for troubleshooting
- [x] Integrate `LocalServerPanel` into `ConnectView`
- [ ] Collapse/expand panel option
- [x] "Connect to Local" quick button after server starts — "Connect Now →" button in launch modal

### 0.5.6 Conexión automática 🚧

- [x] Auto-fill `localhost:8080` on server start
- [x] Auto-trigger Connect after server starts — "Connect Now →" in launch ready step
- [ ] Handle connection failures gracefully
- [ ] Add retry logic with exponential backoff

### 0.5.7 Gestión de configuración 🚧

- [x] Add "Local Server Settings" to Settings modal — implemented as `ServerConfigModal` (tabbed: General, Security, Moderation)
  - [x] Change admin password — Security tab (manage mode + pre-launch 0.5.18)
  - [ ] Change server ports (WS / UDP)
  - [x] Toggle auto-start on client launch — Auto-start toggle in Client Settings (0.5.10)
  - [ ] View last server log lines
- [x] Implement config file editing from client — `write_initial_server_config` + `update_server_admin_password` + `read_server_config`
- [ ] Restart server when config changes
- [ ] Validate configuration before applying

### 0.5.8 Asistente de configuración inicial 🚧

- [ ] Create first-launch wizard component
  - [ ] Welcome screen
  - [ ] "Host local server" vs "Connect to remote" choice
  - [ ] Password setup step (if hosting)
  - [ ] Connection test / confirmation
- [ ] Save wizard completion state (localStorage)
- [ ] Skip wizard on subsequent launches

### 0.5.9 Compilación y distribución ✅

- [x] Create unified build script (`build.ps1`)
- [x] Bundle server binary with client in installer
- [ ] Test installer on clean machine
- [ ] Verify both client and server are installed together
- [ ] Test uninstallation (clean removal)

### 0.5.10 Documentación 🚧

- [ ] Update README with new installation process
- [ ] Create user guide for local server mode
- [ ] Document troubleshooting steps
- [ ] Add FAQ for common issues

**Referencia:** Ver [CLIENT_SERVER_INTEGRATION.md](CLIENT_SERVER_INTEGRATION.md) para diseño detallado.

---

## ✅ Fase 0: Configuración del proyecto (COMPLETADO)

- [x] Create documentation structure
- [x] Define technology stack
- [x] Create server project with Cargo.toml
- [x] Create client project with Tauri
- [x] Create protocol types definition

---

## ✅ Fase 1: Núcleo del servidor (COMPLETADO)

### 1.1 Estructura del proyecto ✅

- [x] Initialize Cargo project in `server/`
- [x] Set up folder structure (all files created)
- [x] Add all dependencies to Cargo.toml

**Decisiones tomadas:**

- Using env vars and TOML config (no CLI args for MVP)
- Default ports: WebSocket (8080), UDP (9000)

### 1.2 Configuración ✅

- [x] Create `server.toml` example
- [x] Implement config loader with serde
- [x] Add default values
- [x] Support environment variable overrides

**Decisiones tomadas:**

- Config in `./server.toml` (same folder)
- maxUsers requires restart to change

### 1.3 Configuración de la base de datos ✅

- [x] Define SQL schema (users, channels, messages, call_history, server_config)
- [x] Implement SQLite connection (Arc<Mutex<Connection>>)
- [x] Write init_db() function
- [x] Add CRUD for users, channels, messages

**Decisiones tomadas:**

- Single connection wrapped in Arc<Mutex> (sufficient for MVP)
- Hard deletes (no soft delete for MVP)

### 1.4 Servidor WebSocket ✅

- [x] Set up Axum router
- [x] Implement WebSocket upgrade handler
- [x] Create session manager (HashMap)
- [x] Implement CONNECT handshake
- [x] Implement WELCOME response
- [x] Implement ERROR responses
- [x] Add ping/pong keepalive

**Decisiones tomadas:**

- No username validation (accepts any string 1-32 chars)
- No per-IP connection limit for MVP

---

## ✅ Fase 2: Lógica de dominio (COMPLETADO)

### 2.1 Gestión de usuarios ✅

- [x] Create user on first connect
- [x] Assign userId (UUID)
- [x] Store in database
- [x] Handle username changes (DB method exists)
- [x] Implement role assignment (owner vs member)

**Decisiones tomadas:**

- First user is always owner
- Owner role transfer not implemented in MVP

### 2.2 Gestión de canales ✅

- [x] CREATE_CHANNEL message handler
- [x] DELETE_CHANNEL message handler
- [x] LIST_CHANNELS (sent on WELCOME)
- [x] JOIN_CHANNEL logic
- [x] LEAVE_CHANNEL logic
- [x] Enforce max_users per channel

**Decisiones tomadas:**

- No channel descriptions for MVP
- No channel renaming for MVP

### 2.3 Mensajería de texto ✅

- [x] SEND_MESSAGE handler
- [x] Validate message size (2000 chars)
- [x] Store in database
- [x] Broadcast to channel members
- [x] Rate limiting (basic structure, not enforced)

**Decisiones tomadas:**

- Rate limit: 60 messages/minute (configured, not enforced yet)
- Empty messages blocked by UI

### 2.4 Control de roles ✅

- [x] Check permissions for channel creation
- [x] Check permissions for channel deletion
- [x] Return ERROR on unauthorized actions
- [ ] Kick actions → covered by **0.5.12 Moderation System** (kick, ban, mute)

---

## ⚠️ Fase 3: Integración de voz (PARCIAL)

### 3.1 Servidor UDP ⚠️

- [x] Bind UDP socket
- [x] Parse incoming packets (version + sessionId + opus)
- [x] Validate session exists
- [x] Identify user's current voice channel
- [ ] 🚧 **Forward packet to all other channel members** (needs UDP address tracking)
- [x] Handle errors gracefully (no crash on bad packets)

**Problema conocido:** el registro de la dirección UDP por sesión no está implementado

**Decisiones tomadas:**

- Validate packet structure, drop invalid
- Drop packets from non-authenticated sessions

### 3.2 Estado de canales de voz ✅

- [x] Track active voice connections per channel
- [x] JOIN_VOICE handler
- [x] LEAVE_VOICE handler
- [x] Notify channel members on join/leave
- [x] Enforce max_users_per_voice_channel

**Decisiones tomadas:**

- Auto-leave voice on disconnect (yes)
- No "speaking" state tracking for MVP

### 3.3 Historial de llamadas ❌

- [ ] Log call start time (deferred)
- [ ] Log call end time (deferred)
- [ ] Calculate duration (deferred)
- [ ] Store in call_history table (schema exists, not used)

---

## ✅ Fase 4: Cliente (MAYORMENTE COMPLETADO)

### 4.1 Configuración del proyecto ✅

- [x] Initialize Tauri project
- [x] Set up React + TypeScript
- [x] Configure Tailwind CSS
- [x] Create basic app layout
- [x] No routing needed (single view app)

### 4.2 UI de conexión ✅

- [x] Username input field
- [x] Server address input (IP:PORT)
- [x] Connect button
- [x] Connection status indicator
- [x] Error message display

**Decisiones tomadas:**

- No localStorage for username (fresh each time)
- No pre-connect validation (server validates)

### 4.3 Cliente WebSocket ✅

- [x] Implement WebSocket connection
- [x] Send CONNECT message
- [x] Handle WELCOME response
- [x] Handle ERROR response
- [x] Implement auto-reconnect logic
- [x] Ping/pong handling

**Decisiones tomadas:**

- Reconnect backoff: 1s, 2s, 4s, 8s, max 10s (exponential)
- Show reconnection in connection status (not separate UI)

### 4.4 UI principal ✅

- [x] Channel list sidebar
- [x] Text chat area
- [x] Message input
- [x] Voice controls UI (non-functional)
- [ ] User list per channel (deferred)

**Decisiones tomadas:**

- Fixed layout (no resizing for MVP)
- Show timestamps on messages (yes)

### 4.5 Captura de audio ❌ (NO IMPLEMENTADO)

- [ ] 🚧 Request microphone permission
- [ ] 🚧 Capture audio with Web Audio API
- [ ] 🚧 Encode to Opus (need WASM library)
- [ ] 🚧 Send via UDP
- [ ] 🚧 Implement push-to-talk

**Bloqueante:** se requiere experiencia en ingeniería de audio y la biblioteca Opus WASM

### 4.6 Reproducción de audio ❌ (NO IMPLEMENTADO)

- [ ] 🚧 Receive UDP packets (need Tauri UDP bridge)
- [ ] 🚧 Decode Opus frames
- [ ] 🚧 Mix multiple speakers
- [ ] 🚧 Play through AudioContext
- [ ] 🚧 Handle packet loss

**Bloqueante:** se requiere implementación de audio + UDP en Tauri

---

## 🎯 Fase 5: Empaquetado (FOCO ACTUAL)

### 5.1 Binario del servidor

- [x] Cross-compile for Windows x64
- [ ] Cross-compile for macOS (Intel + ARM)
- [x] Test binary standalone
- [x] Create default config structure (creates server.example.toml)

### 5.2 Empaquetado del cliente ✅

- [x] Embed server binary in Tauri resources
- [x] Implement "Start Local Server" button
- [x] Spawn server process from client
- [ ] Display server logs in UI (optional)
- [x] Handle server process lifecycle

**Decisiones:**

- Defer server embedding for MVP
- Focus on standalone client installer first

### 5.3 Instaladores ✅ **LINUX COMPLETADO, WINDOWS DOCUMENTADO**

- [x] 🎯 **Verify client compiles successfully**
- [x] 🎯 **Create app icons (PNG, ICO, ICNS)** - Generated via Tauri CLI from SVG
- [x] 🎯 **Configure bundle metadata in tauri.conf.json**
- [x] 🎯 **Build Linux bundles with Tauri** - Generated `.deb`, `.rpm`, `.AppImage`
- [x] 🎯 **Build Windows .msi with Tauri** - Built `Nexum_0.1.3_x64_en-US.msi` + `Nexum_0.1.3_x64-setup.exe`
- [x] 🎯 **Test installation on Windows** - Verified running on Windows
- [ ] Build macOS .dmg with Tauri (later)
- [ ] Test installation flow on macOS (later)

**Estado:**

- ✅ Linux builds successful (3.8 MB `.deb`, 74 MB `.AppImage`)
- 📝 Windows build guide created with complete instructions
- ⚠️ Windows `.msi` requires native Windows compilation (not WSL)
- 📦 Build artifacts: `client/src-tauri/target/release/bundle/`

---

## Fase 6: Refinamiento (APLAZADO)

### 6.1 Manejo de errores

- [x] User-friendly error messages (basic)
- [x] Handle network failures gracefully
- [x] Show connection state clearly
- [x] Auto-reconnect mechanism
- [ ] Better error details (can improve)

### 6.2 Mejoras de UX

- [ ] Loading states (basic spinners)
- [x] Empty states (no channels, no messages)
- [ ] Keyboard shortcuts
- [ ] Sound notifications

### 6.3 Pruebas

- [ ] Manual test full flow
- [ ] Test with 2+ clients simultaneously
- [ ] Test voice with multiple users (when audio implemented)
- [x] Test reconnection scenarios (basic)
- [ ] Test server restart scenarios

---

## ❌ Fuera del MVP (aplazado explícitamente)

Todas las funcionalidades de abajo están FUERA DEL ALCANCE del lanzamiento inicial:

- [ ] TLS support (use reverse proxy)
- [ ] Message search
- [ ] User profile pictures
- [ ] Custom emojis/reactions
- [ ] File uploads
- [ ] Screen sharing
- [ ] Video chat
- [ ] Mobile apps
- [ ] Web client
- [ ] Multi-server support in single client
- [ ] Server discovery/browser
- [ ] Invite links
- [ ] Message editing
- [ ] Message deletion

---

## 🚨 Current Blockers & Next Steps

### Immediate (This Session)

1. ✅ **Update todo.md** - DONE
2. ✅ **Verify client builds** - DONE (Linux bundles successful)
3. ✅ **Create app icons** - DONE (generated from SVG)
4. 📝 **Build Windows installer** - DOCUMENTED (requires Windows OS)

### Windows Build Next Steps

- Transfer project to Windows machine or WSL2 with Windows access
- Follow [windows_build_guide.md](windows_build_guide.md) instructions
- Install Visual Studio Build Tools + Rust + Node.js on Windows
- Run `npm run tauri build` to generate `.msi` installer

### Known Blockers

1. **Audio implementation:** Requires Web Audio API + Opus WASM + UDP bridge
2. **UDP address tracking:** Server can't send UDP packets to clients yet
3. **Windows builds:** Only possible from Windows OS (not Linux/WSL)
4. **Unit tests missing for new features:** `RENAME_CHANNEL`, `UPDATE_SERVER_SETTINGS`, `GET_USERS` handlers, `db.list_users()`, `db.rename_channel()` — required by Definition of Done before final release

### Technical Debt

- No rate limiting enforcement (structure exists)
- No call history tracking (table exists, unused)
- Message pagination → trasladado a **0.5.25** como ítem crítico
- No user list per channel UI

---

_Last updated: 2026-03-22 (0.5.26 System Tray añadido HIGH; 0.5.14 Notifications reescrito con spec completa; 0.5.27 Read-only channels + notification channel añadido HIGH; 0.5.28 Message reactions añadido LOW; 0.5.29 Mention system añadido LOW)_
