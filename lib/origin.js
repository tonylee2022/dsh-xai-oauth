/**
 * Origin policy for the plugin's loopback control server.
 *
 * DSH Desktop serves its Web UI from the privileged `dsh-app://app` scheme, so
 * a fetch from the settings page carries that origin even though the control
 * server listens on 127.0.0.1. Accept it alongside the loopback HTTP origins
 * that a plain `dsh web` page uses.
 */

/**
 * @param {string | undefined} origin value of the request's `Origin` header.
 * @returns whether the control server may answer this origin.
 */
export function isLocalOrigin(origin) {
  if (origin === undefined) return false
  if (origin === 'dsh-app://app' || origin === 'dsh-app://app/') return true
  try {
    const hostname = new URL(origin).hostname
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
  } catch {
    return false
  }
}

/**
 * CORS headers for an accepted origin.
 *
 * The private/local network allow headers answer Chromium's Private Network
 * Access / Local Network Access preflight: a `dsh-app://app` page lives in a
 * different address space from the loopback service, so Chromium asks before
 * letting the request through.
 *
 * @param {string} origin an origin already accepted by {@link isLocalOrigin}.
 * @returns {Record<string, string>} headers for the preflight response.
 */
export function corsHeaders(origin) {
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type, x-dsh-csrf',
    'access-control-allow-private-network': 'true',
    'access-control-allow-local-network': 'true',
  }
}
