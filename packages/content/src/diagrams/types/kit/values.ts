import { z } from "zod"

// Numbers and dates as the typed forms read and print them: Spanish
// separators ("1.234,5 €") and short month names ("3 mar 2026"), always,
// whatever the server's locale.

const MONTHS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
]

/** A finite number. */
export const numberSchema = z.number().refine(Number.isFinite, {
  error: "Es un número",
})

/** How a form prints its values. */
export type ValueFormat = { unit: string | null; decimals: number }

/** The `unit` and `decimals` keys of a form that takes values. */
export function formatFields() {
  return {
    unit: z.string().min(1).optional().meta({
      description: 'El texto tras cada valor ("usuarios", "€")',
    }),
    decimals: z.number().int().min(0).max(6).optional().meta({
      description: "Cuántos decimales se muestran (0 por defecto)",
    }),
  }
}

export function formatOf(written: {
  unit?: string
  decimals?: number
}): ValueFormat {
  return { unit: written.unit ?? null, decimals: written.decimals ?? 0 }
}

/** `value` with Spanish separators, `decimals` places and its unit. */
export function formatNumber(value: number, format: ValueFormat): string {
  const fixed = Math.abs(value).toFixed(format.decimals)
  const [whole = "0", fraction] = fixed.split(".")
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  const sign = signOf(value, fixed)
  const number = withFraction(`${sign}${grouped}`, fraction)
  if (format.unit === null) return number
  return `${number} ${format.unit}`
}

function signOf(value: number, fixed: string): string {
  if (value >= 0 || Number(fixed) === 0) return ""
  return "−"
}

function withFraction(whole: string, fraction: string | undefined): string {
  if (fraction === undefined) return whole
  return `${whole},${fraction}`
}

/** A percentage, rounded to a whole number ("−60 %"). */
export function formatPercent(ratio: number): string {
  const rounded = Math.round(ratio * 100)
  if (rounded < 0) return `−${Math.abs(rounded)} %`
  return `${rounded} %`
}

/** A date as written: a day or a whole month. */
export type DayOrMonth = {
  /** Midnight UTC of the day, or of the month's first day. */
  time: number
  precision: "day" | "month"
}

const DATE = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/

/** The schema of a date: `YYYY-MM-DD` or `YYYY-MM`. */
export const dateSchema = z
  .string()
  .refine((value) => parseDate(value) !== null, {
    error: "Es una fecha AAAA-MM-DD o AAAA-MM que exista",
  })
  .meta({ description: "AAAA-MM-DD, o AAAA-MM para un mes" })

/** `YYYY-MM-DD` or `YYYY-MM`, `null` when it is not a real date. */
export function parseDate(value: string): DayOrMonth | null {
  const match = DATE.exec(value)
  if (match === null) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = dayOf(match[3])
  if (month < 1 || month > 12) return null
  const time = Date.UTC(year, month - 1, day)
  const date = new Date(time)
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  if (match[3] === undefined) return { time, precision: "month" }
  return { time, precision: "day" }
}

function dayOf(written: string | undefined): number {
  if (written === undefined) return 1
  return Number(written)
}

/** "3 mar 2026", or "mar 2026" for a whole month. */
export function formatDate(date: DayOrMonth): string {
  const at = new Date(date.time)
  const month = `${MONTHS[at.getUTCMonth()]} ${at.getUTCFullYear()}`
  if (date.precision === "month") return month
  return `${at.getUTCDate()} ${month}`
}

/** "mar", "ene 2027" (with the year on January or when asked). */
export function monthTick(time: number, withYear: boolean): string {
  const at = new Date(time)
  const name = MONTHS[at.getUTCMonth()] ?? ""
  if (withYear || at.getUTCMonth() === 0)
    return `${name} ${at.getUTCFullYear()}`
  return name
}

/** "3 mar" for a week tick. */
export function dayTick(time: number): string {
  const at = new Date(time)
  return `${at.getUTCDate()} ${MONTHS[at.getUTCMonth()]}`
}

export const DAY = 86_400_000
