/**
 * dmCrypto.ts — AES-GCM 256-bit encryption for Nexum direct messages.
 *
 * Key is derived deterministically from both users' IDs using PBKDF2.
 * The server receives and stores only ciphertext — it CANNOT read plaintext.
 *
 * SECURITY MODEL (MVP):
 *  - Deterministic shared key: derived from sorted user IDs + a fixed salt.
 *  - No forward secrecy (no ephemeral key exchange).
 *  - Provides confidentiality against the server owner and passive observers.
 *  - A production version should implement ECDH with ephemeral key pairs.
 *
 * Wire format:  `<iv_base64>.<ciphertext_base64>`
 */

const PBKDF2_ITERATIONS = 100_000
const SALT = new TextEncoder().encode('nexum-dm-v1-salt-2026')

/** Module-level key cache: sorted_id1:sorted_id2 → CryptoKey */
const keyCache = new Map<string, CryptoKey>()

/** Derive (or retrieve cached) the shared AES-GCM-256 key for a conversation between two users. */
async function deriveSharedKey(userId1: string, userId2: string): Promise<CryptoKey> {
  // Sort IDs so both sides always produce the same key regardless of who initiated.
  const [a, b] = [userId1, userId2].sort()
  const cacheKey = `${a}:${b}`

  const cached = keyCache.get(cacheKey)
  if (cached) return cached

  const keyMaterial = new TextEncoder().encode(`nexum-dm:${a}:${b}`)

  const baseKey = await crypto.subtle.importKey('raw', keyMaterial, { name: 'PBKDF2' }, false, [
    'deriveKey',
  ])

  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: SALT, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )

  keyCache.set(cacheKey, key)
  return key
}

/**
 * Encrypt `plaintext` for a DM between `myUserId` and `theirUserId`.
 * Returns the wire-format string `<iv_b64>.<ciphertext_b64>`.
 */
export async function encryptDm(
  plaintext: string,
  myUserId: string,
  theirUserId: string,
): Promise<string> {
  const key = await deriveSharedKey(myUserId, theirUserId)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)

  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)

  const ivB64 = btoa(String.fromCharCode(...iv))
  const ctB64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)))
  return `${ivB64}.${ctB64}`
}

/**
 * Decrypt a wire-format DM string (`<iv_b64>.<ciphertext_b64>`).
 * Returns the plaintext or throws if decryption fails (wrong key / tampered data).
 */
export async function decryptDm(
  encrypted: string,
  myUserId: string,
  theirUserId: string,
): Promise<string> {
  const dot = encrypted.indexOf('.')
  if (dot === -1) throw new Error('Invalid encrypted DM format — missing separator')

  const iv = Uint8Array.from(atob(encrypted.slice(0, dot)), c => c.charCodeAt(0))
  const ciphertext = Uint8Array.from(atob(encrypted.slice(dot + 1)), c => c.charCodeAt(0))

  const key = await deriveSharedKey(myUserId, theirUserId)

  const plainBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return new TextDecoder().decode(plainBuffer)
}
