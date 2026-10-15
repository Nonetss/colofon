// The reader's scope: one repository or "Todos". It lives in a cookie so the
// server renders the right sidebar and `/` knows where to go; the selector
// writes it and visiting a page of another repository moves it there.

export const DOCS_SCOPE_COOKIE = "docs_scope"

/** Cookie value of the scope that shows every repository. */
export const ALL_SCOPE = "todos"

/** How long the scope cookie lasts. */
export const SCOPE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export type DocsScope = { kind: "all" } | { kind: "repository"; slug: string }

/**
 * The scope for a stored cookie value. With fewer than two repositories the
 * scope is the only one there is; a value naming no repository is "Todos".
 */
export function resolveScope(
  stored: string | undefined,
  slugs: readonly string[]
): DocsScope {
  const [only] = slugs
  if (slugs.length === 1 && only !== undefined)
    return { kind: "repository", slug: only }
  if (stored !== undefined && slugs.includes(stored))
    return { kind: "repository", slug: stored }
  return { kind: "all" }
}

/** The scope after opening a page of `slug`: "Todos" stays "Todos". */
export function scopeAfterVisit(current: DocsScope, slug: string): DocsScope {
  if (current.kind === "all") return current
  return { kind: "repository", slug }
}

/**
 * The cookie value to store after the server renders a page of `slug`, or
 * `undefined` when the stored one stays (it already says so, or there are
 * fewer than two repositories and the scope isn't stored at all).
 */
export function scopeToStore(
  stored: string | undefined,
  slugs: readonly string[],
  slug: string
): string | undefined {
  if (slugs.length < 2) return undefined
  const next = scopeValue(scopeAfterVisit(resolveScope(stored, slugs), slug))
  if (next === stored) return undefined
  return next
}

export function scopeValue(scope: DocsScope): string {
  if (scope.kind === "all") return ALL_SCOPE
  return scope.slug
}

/** Whether the repository `slug` is shown in `scope`. */
export function inScope(scope: DocsScope, slug: string): boolean {
  if (scope.kind === "all") return true
  return scope.slug === slug
}

/** A `Set-Cookie`/`document.cookie` string that stores `scope`. */
export function scopeCookie(scope: DocsScope): string {
  return `${DOCS_SCOPE_COOKIE}=${encodeURIComponent(scopeValue(scope))}; Path=/; Max-Age=${SCOPE_COOKIE_MAX_AGE}; SameSite=Lax`
}

/** The scope cookie's value in a `Cookie` header or `document.cookie`. */
export function readScopeCookie(cookies: string): string | undefined {
  for (const part of cookies.split(";")) {
    const [name, ...rest] = part.trim().split("=")
    if (name === DOCS_SCOPE_COOKIE) return decodeURIComponent(rest.join("="))
  }
  return undefined
}
