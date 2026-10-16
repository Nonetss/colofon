// The origins a secret may be sent to: `http(s)://host[:port]`, where the host
// may start with `*.` to cover every subdomain of the rest. Stored and
// compared normalized the way the WHATWG URL parser writes an origin:
// lowercase, default port dropped, no trailing slash.

const WILDCARD = "*."

/**
 * `input` as a normalized origin, or `null` when it isn't one: another
 * scheme, a path, a query, a fragment, credentials, or a `*` anywhere but a
 * leading `*.` label.
 */
export function normalizeOrigin(input: string): string | null {
  const trimmed = input.trim()
  if (trimmed.includes("?") || trimmed.includes("#")) return null
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return null
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null
  if (url.username !== "" || url.password !== "") return null
  if (url.pathname !== "/") return null
  if (url.hostname === "") return null
  const rest = hostWithoutWildcard(url.hostname)
  if (rest.includes("*") || rest === "") return null
  return url.origin
}

function hostWithoutWildcard(hostname: string): string {
  if (hostname.startsWith(WILDCARD)) return hostname.slice(WILDCARD.length)
  return hostname
}

/** The normalized origin of a request `url`, or `null` if it has none. */
export function originOfUrl(url: URL): string | null {
  if (url.protocol !== "http:" && url.protocol !== "https:") return null
  return url.origin
}

/**
 * Whether the normalized request origin `origin` is allowed by the stored
 * `allowed` one: equal, or `allowed` is `scheme://*.host[:port]` and `origin`
 * has the same scheme and port and a host ending in `.host`.
 */
export function originAllowed(origin: string, allowed: string): boolean {
  if (origin === allowed) return true
  const wildcard = new URL(allowed)
  if (!wildcard.hostname.startsWith(WILDCARD)) return false
  const target = new URL(origin)
  if (target.protocol !== wildcard.protocol) return false
  if (target.port !== wildcard.port) return false
  const suffix = wildcard.hostname.slice(WILDCARD.length - 1)
  return target.hostname.endsWith(suffix)
}
