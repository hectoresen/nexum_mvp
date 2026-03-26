/**
 * Builds the correct base URL for a server address.
 * Detects HTTPS when the port is 443 (e.g. ngrok tunnels).
 *
 * Examples:
 *   "localhost:8080"           → "http://localhost:8080"
 *   "example.ngrok-free.dev:443" → "https://example.ngrok-free.dev"
 *   "192.168.1.100:8080"       → "http://192.168.1.100:8080"
 */
export function buildBaseUrl(serverAddress: string): string {
  const lastColon = serverAddress.lastIndexOf(':')
  if (lastColon === -1) {
    return `http://${serverAddress}`
  }
  const port = serverAddress.slice(lastColon + 1)
  const host = serverAddress.slice(0, lastColon)
  if (port === '443') {
    return `https://${host}`
  }
  if (port === '80') {
    return `http://${host}`
  }
  return `http://${serverAddress}`
}
