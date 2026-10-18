import type { z } from "zod"
import { spanishErrors } from "#contract/read/problems"
import { isRecord } from "#contract/read/records"

// The pieces every diagram reader shares (`drawn.ts`, `read.ts` and each typed
// form under `types/`): a report that prefixes the field path, and checks
// that report every problem and keep what is valid, so one bad part never
// hides the rest.

/** Reports `message` on the field path `at` (`nodes.3.entity`, or ""). */
export type Report = (at: string, message: string) => void

export function withPath(at: string, message: string): string {
  if (at === "") return message
  return `${at}: ${message}`
}

export function joinPath(at: string, field: string): string {
  if (at === "") return field
  if (field === "") return at
  return `${at}.${field}`
}

/** A report whose paths are under `at`. */
export function under(report: Report, at: string): Report {
  return (field, message) => report(joinPath(at, field), message)
}

export function requiredText(
  value: unknown,
  key: string,
  report: Report,
  fallback: string
): string {
  if (typeof value === "string" && value.trim() !== "") return value
  if (value === undefined) report(key, "Falta: es obligatorio")
  else report(key, "Es un texto")
  return fallback
}

export function optionalText(
  value: unknown,
  key: string,
  report: Report
): string | null {
  if (value === undefined) return null
  if (typeof value === "string" && value.trim() !== "") return value
  report(key, "Es un texto")
  return null
}

export function positive(
  value: unknown,
  key: string,
  report: Report
): number | null {
  if (typeof value === "number" && value > 0) return value
  if (value === undefined) report(key, "Falta: es obligatorio")
  else report(key, "Es un número mayor que 0")
  return null
}

export function numberOr(
  value: unknown,
  key: string,
  report: Report,
  fallback: number
): number {
  if (value === undefined) return fallback
  if (typeof value === "number") return value
  report(key, "Es un número")
  return fallback
}

/** A list field: its items, or none (reported) when it is not a list. */
export function listOf(
  value: unknown,
  key: string,
  report: Report,
  required: boolean
): unknown[] {
  if (value === undefined) {
    if (required) report(key, "Falta: es una lista con al menos un elemento")
    return []
  }
  if (!Array.isArray(value)) {
    report(key, "Es una lista")
    return []
  }
  if (required && value.length === 0)
    report(key, "Es una lista con al menos un elemento")
  return value
}

export function optional<T>(
  schema: z.ZodType<T>,
  value: unknown,
  key: string,
  report: Report
): T | undefined {
  if (value === undefined) return undefined
  const parsed = schema.safeParse(value, { error: spanishErrors })
  if (parsed.success) return parsed.data
  for (const issue of parsed.error.issues)
    report(joinPath(key, issueKey(issue)), issueMessage(issue))
  return undefined
}

/**
 * One part of a list (a box, an arrow…) checked by `schema`. Every problem
 * is reported; a part whose wrong fields are all optional is kept without
 * them, and one missing a `required` field is left out.
 */
export function salvaged<T>(
  schema: z.ZodType<T>,
  value: unknown,
  at: string,
  required: readonly string[],
  report: Report
): T | null {
  const parsed = schema.safeParse(value, { error: spanishErrors })
  if (parsed.success) return parsed.data
  const wrong = new Set<string>()
  let whole = false
  for (const issue of parsed.error.issues) {
    report(joinPath(at, issueKey(issue)), issueMessage(issue))
    const key = issueKey(issue)
    if (key === "") whole = true
    else wrong.add(firstKey(key))
  }
  if (whole || !isRecord(value)) return null
  if (required.some((key) => wrong.has(key))) return null
  const kept = Object.fromEntries(
    Object.entries(value).filter(([key]) => !wrong.has(key))
  )
  const again = schema.safeParse(kept)
  if (again.success) return again.data
  return null
}

/** Each item of the list `key`, salvaged by `schema`, with its path. */
export function salvagedList<T>(
  schema: z.ZodType<T>,
  value: unknown,
  key: string,
  required: readonly string[],
  report: Report,
  listRequired = true
): { at: string; index: number; value: T }[] {
  const kept: { at: string; index: number; value: T }[] = []
  listOf(value, key, report, listRequired).forEach((item, index) => {
    const at = `${key}.${index}`
    const read = salvaged(schema, item, at, required, report)
    if (read !== null) kept.push({ at, index, value: read })
  })
  return kept
}

function firstKey(key: string): string {
  const [first = ""] = key.split(".")
  return first
}

/** Where an issue points; an unknown key points at that key. */
function issueKey(issue: z.core.$ZodIssue): string {
  const path = issue.path.map(String)
  if (issue.code === "unrecognized_keys") {
    const [first] = issue.keys
    if (first !== undefined) path.push(first)
  }
  return path.join(".")
}

function issueMessage(issue: z.core.$ZodIssue): string {
  if (issue.code === "unrecognized_keys")
    return `no es una clave que admita (${issue.keys.map((key) => `\`${key}\``).join(", ")})`
  return issue.message
}

export function subLines(sub: string | string[] | undefined): string[] {
  if (sub === undefined) return []
  if (typeof sub === "string") return [sub]
  return sub
}

/** Reports every key of `data` that is not in `keys`. */
export function unknownKeys(
  data: Record<string, unknown>,
  keys: readonly string[],
  what: string,
  report: Report
) {
  for (const key of Object.keys(data)) {
    if (!keys.includes(key))
      report("", `\`${key}\` no es una clave de ${what} (${keys.join(", ")})`)
  }
}
