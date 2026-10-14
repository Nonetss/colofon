import { endOfDay, startOfDay } from "date-fns"

/** A calendar day lower bound as the API takes it: 00:00 local. */
export function dayStart(date: Date | undefined): string | undefined {
  if (!date) return undefined
  return startOfDay(date).toISOString()
}

/** A calendar day upper bound as the API takes it: 23:59:59.999 local. */
export function dayEnd(date: Date | undefined): string | undefined {
  if (!date) return undefined
  return endOfDay(date).toISOString()
}
