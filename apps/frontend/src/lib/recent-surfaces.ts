/** How many recently visited routes each list remembers. */
export const RECENT_SURFACES_LIMIT = 5

const STORAGE_PREFIX = "recent-surfaces:"

function storageKey(list: string, userId: string): string {
  return `${STORAGE_PREFIX}${list}:${userId}`
}

/**
 * Local-storage list `list` of the routes a user visited most recently,
 * newest first, scoped per user so shared browsers don't mix histories.
 * Read and write failures (private mode, quota, malformed JSON) degrade to
 * an empty list instead of throwing.
 */
export function readRecentList(list: string, userId: string): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(storageKey(list, userId))
    const parsed: unknown = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((href): href is string => typeof href === "string")
      .slice(0, RECENT_SURFACES_LIMIT)
  } catch {
    return []
  }
}

/** Moves `href` to the front of the user's list `list` and returns it. */
export function recordRecent(
  list: string,
  userId: string,
  href: string
): string[] {
  const next = [
    href,
    ...readRecentList(list, userId).filter((item) => item !== href),
  ].slice(0, RECENT_SURFACES_LIMIT)
  if (typeof window === "undefined") return next
  try {
    localStorage.setItem(storageKey(list, userId), JSON.stringify(next))
  } catch {
    // Ignore quota / private-mode failures.
  }
  return next
}
