import { formatDate } from "@/lib/format"

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

/** The date a page header shows, with the tone that marks it. */
export type HeaderDate = { label: string; tone: "primary" | "muted" }

/**
 * The page header's date: `updated` (`actualizado`, the data's date) when
 * set, marked for review when stale; otherwise `edited` (the file's last
 * commit), never marked; `null` with neither.
 */
export function headerDate(
  updated: string | null,
  edited: string | null,
  now: Date
): HeaderDate | null {
  if (updated !== null) {
    if (isStale(updated, now))
      return {
        label: `Revisar · datos del ${formatDate(updated)}`,
        tone: "primary",
      }
    return { label: `Datos del ${formatDate(updated)}`, tone: "muted" }
  }
  if (edited !== null)
    return { label: `Editado el ${formatDate(edited)}`, tone: "muted" }
  return null
}
