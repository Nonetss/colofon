// The origin the browser reaches the site at. Behind the gateway, a
// request's own URL can carry the wrong scheme (TLS may end before Caddy),
// so the configured public origin (`CORS_ORIGIN`) wins when it is set.

/** The origin of `configured`, or of `requestUrl` when it is unset or bad. */
export function publicOrigin(
  configured: string | undefined,
  requestUrl: URL
): string {
  if (configured !== undefined && URL.canParse(configured))
    return new URL(configured).origin
  return requestUrl.origin
}
