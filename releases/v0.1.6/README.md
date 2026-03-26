# Nexum v0.1.6 — Bug Fix Release

**Fecha:** March 26, 2026  
**Plataforma:** Windows 10/11 (x64)

---

## Descargas

| Archivo | Tipo | Tamaño |
|---------|------|--------|
| `Nexum_0.1.6_x64_en-US.msi` | Instalador MSI (recomendado) | ~8.4 MB |
| `Nexum_0.1.6_x64-setup.exe` | Instalador NSIS | ~5.9 MB |
| `Nexum-Server_0.1.6_x64.exe` | Servidor standalone | ~7.3 MB |

---

## Notas de versión

### 🐛 Correcciones

#### 🔐 Admin auth para clientes remotos

**Problema:** Los clientes guest/remotos no podían autenticarse como admin aunque introdujeran la contraseña correcta. El host local funcionaba bien.

**Causa:** `setShowAdminAuthModal(false)` y `setAdminAuthError(null)` se llamaban como side-effects dentro del updater funcional `setView(prev => ...)`. Con React 18 automatic batching, el updater se ejecuta en un tick impredecible; en clientes con latencia de red, el componente ya se había vuelto a renderizar desde que el closure fue capturado, por lo que los setters nunca llegaban a ejecutarse.

**Solución:** Ambos handlers `wsClient.onMessage` detectan `ADMIN_AUTHENTICATED` antes del `setView` y llaman a los setters de modal/error como updates independientes de nivel superior.

---

#### 🔑 Revocación de rol owner al cambiar contraseña del servidor

**Nuevo comportamiento:** Cuando el admin modifica la contraseña del servidor, todos los usuarios con rol `owner` son automáticamente degradados a `member` y deben volver a autenticarse. Esto evita que ex-administradores mantengan privilegios tras un cambio de credenciales.

**Implementación:**
- Servidor: `demote_all_owners_to_member()` en BD + sesiones en memoria
- Cliente: sincroniza `connection.role` en tiempo real al recibir `SERVER_USERS`

---

#### 🖼️ Avatares rotos para clientes guest (IP privada)

**Problema:** Los avatares de otros usuarios aparecían rotos para clientes conectados a un servidor en otra máquina de la red local.

**Causa:** Las etiquetas `<img>` en el cliente carecían de `crossOrigin="anonymous"`. WebView2 (Tauri) ejecuta bajo el origen `tauri://localhost`; sin este atributo, el preflight de Chrome Private Network Access (PNA) no se enviaba correctamente, bloqueando la carga de imágenes desde IPs privadas (`192.168.x.x`).

**Solución:** Añadido `crossOrigin="anonymous"` a todos los `<img>` de avatar en `ChatArea`, `DirectMessageView`, `MainView`, `UserListPanel` y `UserProfileModal`.

---

#### 🔄 Limpieza de avatar_path al actualizar avatar por URL

**Problema:** Si un usuario tenía un avatar subido (`avatar_path`) y luego lo actualizaba por URL (`avatar_url`), el avatar anterior seguía mostrándose porque `avatar_path` tenía prioridad en `getAvatarUrl`.

**Solución:** El handler de `USER_AVATAR_UPDATED` ahora limpia `avatar_path: undefined` al actualizar por URL.

---

#### 🔔 Toggles de configuración sin contraste visual (QA7)

**Problema:** Los toggles "Iniciar Nexum al arrancar Windows" y "Notificaciones de sonido para DMs" en los ajustes del cliente usaban `gray-500` (activo) vs `gray-600` (inactivo) — diferencia imperceptible, imposible saber si estaban encendidos.

**Solución:** Estado activo cambiado a `green-600` con etiqueta textual `ON`/`OFF` en verde/gris.

---

#### 💬 Puntos de no leídos en canales (QA6)

**Problema:** Los puntos de canal no leído no reaparecían al recibir nuevos mensajes después de haber cambiado a otro canal.

**Causa:** `broadcast_to_channel` solo enviaba mensajes al usuario actualmente dentro de ese canal. Al cambiar de canal, el usuario dejaba de recibir actualizaciones de los anteriores.

**Solución:** `handle_send_message`, `handle_delete_message` y `handle_edit_message` ahora usan `broadcast_message` para entregar a todos los usuarios conectados al servidor.

---

#### 🚫 Motivo de ban en UI y mensaje al baneado (QA4)

**Problema:** Al banear a un usuario no había forma de especificar un motivo, y el usuario baneado no recibía ningún mensaje explicativo.

**Solución:** El panel de usuario ahora muestra un campo opcional de motivo al confirmar el ban. El servidor incluye el motivo en el mensaje de error enviado al baneado.

---

#### 🔧 Stale closure en modal de autenticación de admin (QA3)

**Problema:** El modal de autenticación de admin podía quedar abierto o cerrado incorrectamente en escenarios de reconexión o re-render.

**Solución:** Añadidos `showAdminAuthModalRef` y `showChangePasswordModalRef` (`useRef`) en `App.tsx` para que los handlers WebSocket registrados en tiempo de conexión puedan acceder al estado actual del modal sin depender del closure capturado.

---

## Instalación

1. Descarga `Nexum_0.1.6_x64_en-US.msi`
2. Ejecuta el instalador
3. Lanza Nexum desde el menú Inicio o el escritorio

## Requisitos

- Windows 10/11 (64-bit)
- 2 GB RAM mínimo
- WebView2 Runtime (incluido en Windows 11; se instala automáticamente en Windows 10)
