function parseUrl(value: string): URL | undefined {
  try {
    return new URL(value)
  } catch {
    return undefined
  }
}

/**
 * `url` with `user` and `token` as its credentials, replacing any it already
 * carried. Without a token, or when `url` isn't a URL yet, it is returned as
 * typed, so a URL pasted with its credentials keeps working.
 */
export function urlWithAccess(
  url: string,
  user: string,
  token: string
): string {
  if (token === "") return url
  const parsed = parseUrl(url)
  if (parsed === undefined) return url
  parsed.username = user
  parsed.password = token
  return parsed.href
}
