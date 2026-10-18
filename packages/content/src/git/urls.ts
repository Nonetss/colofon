// Credentials in a repository URL: they only travel inside it, so every
// URL or message this package reports goes through these helpers first.

/** `url` with its user and password, if any, replaced by `***`. */
export function publicUrl(url: string): string {
  const parsed = parseUrl(url)
  if (parsed === undefined) return url
  if (parsed.username === "" && parsed.password === "") return url
  parsed.username = "***"
  parsed.password = ""
  return parsed.href
}

/**
 * `url` with `username` and `token` as its credentials, replacing any it
 * carried; `url` as is when it isn't a URL.
 */
export function withCredentials(
  url: string,
  username: string,
  token: string
): string {
  const parsed = parseUrl(url)
  if (parsed === undefined) return url
  parsed.username = username
  parsed.password = token
  return parsed.href
}

/** The host (with its port) of `url`, lowercase; `undefined` if not a URL. */
export function hostOf(url: string): string | undefined {
  return parseUrl(url)?.host
}

/** `text` with every credential of `url` replaced by `***`. */
export function redactCredentials(text: string, url: string): string {
  return credentialsOf(url).reduce(
    (redacted, secret) => redacted.split(secret).join("***"),
    text
  )
}

function credentialsOf(url: string): string[] {
  const parsed = parseUrl(url)
  if (parsed === undefined) return []
  const secrets: string[] = []
  for (const part of [parsed.password, parsed.username]) {
    if (part === "") continue
    secrets.push(part, decodeURIComponent(part))
  }
  return secrets
}

function parseUrl(url: string): URL | undefined {
  try {
    return new URL(url)
  } catch {
    return undefined
  }
}
