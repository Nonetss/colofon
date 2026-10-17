import { lookup } from "node:dns/promises"
import { isIP } from "node:net"

// What a user may point a repository at. The backend clones the URL from
// inside the platform's network, so a user's remote must be a public HTTPS
// host: an address of this network (loopback, private, link-local…) would
// turn the clone into a request the user could not make themselves.

/** Looks up every address `host` resolves to. */
export type ResolveHost = (host: string) => Promise<string[]>

export type RemoteCheck = { ok: true } | { ok: false; error: string }

async function resolveAddresses(host: string): Promise<string[]> {
  const found = await lookup(host, { all: true })
  return found.map((entry) => entry.address)
}

function ipv4Octets(address: string): number[] {
  return address.split(".").map(Number)
}

function isInternalIpv4(address: string): boolean {
  const [first = 0, second = 0, third = 0] = ipv4Octets(address)
  if (first === 0 || first === 10 || first === 127) return true
  if (first >= 224) return true
  if (first === 100 && second >= 64 && second <= 127) return true
  if (first === 169 && second === 254) return true
  if (first === 172 && second >= 16 && second <= 31) return true
  if (first === 192 && second === 168) return true
  if (first === 192 && second === 0 && third === 0) return true
  if (first === 198 && (second === 18 || second === 19)) return true
  return false
}

const MAPPED_IPV4 = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i

function isInternalIpv6(address: string): boolean {
  const lower = address.toLowerCase()
  const mapped = MAPPED_IPV4.exec(lower)
  if (mapped?.[1] !== undefined) return isInternalIpv4(mapped[1])
  if (lower === "::" || lower === "::1") return true
  // fc00::/7 (unique local), fe80::/10 (link-local), ff00::/8 (multicast).
  return /^(f[cd]|fe[89ab]|ff)/.test(lower)
}

/** Whether `address`, an IP literal, belongs to this machine or network. */
export function isInternalAddress(address: string): boolean {
  const version = isIP(address)
  if (version === 4) return isInternalIpv4(address)
  if (version === 6) return isInternalIpv6(address)
  return false
}

function hostnameOf(url: URL): string {
  return url.hostname.replace(/^\[|\]$/g, "")
}

/**
 * Why `url` can't be a user's repository by its text alone, or `undefined`
 * when it can: HTTPS only and no IP literal of an internal address. Names
 * are checked by `checkUserRemote`.
 */
export function userRemoteProblem(url: string): string | undefined {
  const parsed = URL.canParse(url) ? new URL(url) : undefined
  if (parsed === undefined) return "No es una URL válida"
  if (parsed.protocol !== "https:") return "La URL debe empezar por https://"
  const host = hostnameOf(parsed)
  if (host === "localhost" || host.endsWith(".localhost")) {
    return "La URL apunta a una dirección interna"
  }
  if (isInternalAddress(host)) return "La URL apunta a una dirección interna"
  return undefined
}

/**
 * The check a sync of a user's repository runs first: `userRemoteProblem`
 * plus the addresses the host resolves to, which must all be public. The
 * error never names the resolved addresses.
 */
export async function checkUserRemote(
  url: string,
  resolve: ResolveHost = resolveAddresses
): Promise<RemoteCheck> {
  const problem = userRemoteProblem(url)
  if (problem !== undefined) return { ok: false, error: problem }
  const host = hostnameOf(new URL(url))
  if (isIP(host) !== 0) return { ok: true }
  try {
    const addresses = await resolve(host)
    if (addresses.length === 0 || addresses.some(isInternalAddress)) {
      return { ok: false, error: "The remote host is not allowed" }
    }
    return { ok: true }
  } catch {
    return { ok: false, error: "The remote host could not be resolved" }
  }
}
