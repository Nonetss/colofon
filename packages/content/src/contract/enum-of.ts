import { z } from "zod"

/**
 * A string that must be one of `values`. With no values nothing is valid, and
 * the error says why (`emptyMessage`) instead of a bare "invalid value".
 */
export function enumOf(values: readonly string[], emptyMessage: string) {
  const [first, ...rest] = values
  if (first === undefined) return z.never({ error: emptyMessage })
  return z.enum([first, ...rest])
}
