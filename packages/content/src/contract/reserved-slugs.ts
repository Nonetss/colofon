// A content repository's slug is the first segment of its reader routes
// (`/<slug>/…`), so it can't be a name the web or the gateway already uses
// there: the frontend's own top-level pages and public folders, and the paths
// the gateway sends to the backend. `tests/contract/reserved-slugs.test.ts` reads
// both from the repository and fails when a new one is missing here.

export const RESERVED_SLUGS = [
  "404",
  "admin",
  "api",
  "git",
  "health",
  "login",
  "me",
  "pwa",
  "rpc",
  "scalar",
  "signup",
] as const

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.some((reserved) => reserved === slug)
}
