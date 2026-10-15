/** Months after which a page's data is marked for review. */
export const STALE_MONTHS = 6

/** Whether `updated` (`YYYY-MM-DD`) is more than six months before `now`. */
export function isStale(updated: string, now: Date): boolean {
  const date = new Date(`${updated}T00:00:00`)
  if (Number.isNaN(date.getTime())) return false
  const limit = new Date(now)
  limit.setMonth(limit.getMonth() - STALE_MONTHS)
  return date < limit
}
