import { DAY } from "#pages/diagram-types/values"

// Scales and their ticks for the chart forms: a value axis ends on a round
// number (1, 2 or 5 × 10ⁿ steps, 4 to 6 ticks) and includes zero; a time
// axis ticks weekly up to ten weeks and monthly beyond.

/** A linear map from a domain to a range, with its ticks. */
export type Scale = {
  min: number
  max: number
  ticks: number[]
  at: (value: number) => number
}

/** A step of 1, 2 or 5 × 10ⁿ that splits `span` in about `count` parts. */
export function niceStep(span: number, count = 5): number {
  if (span <= 0) return 1
  const raw = span / count
  const power = 10 ** Math.floor(Math.log10(raw))
  for (const factor of [1, 2, 5, 10]) {
    if (factor * power >= raw) return factor * power
  }
  return 10 * power
}

/**
 * The round domain that holds `low` to `high` and zero, and its ticks.
 * 870 → 0 to 1000 by 200.
 */
export function niceDomain(
  low: number,
  high: number,
  count = 5
): { min: number; max: number; step: number; ticks: number[] } {
  const from = Math.min(0, low)
  const to = Math.max(0, high)
  const step = niceStep(to - from, count)
  const min = Math.floor(from / step) * step
  const max = Math.max(Math.ceil(to / step) * step, min + step)
  const ticks: number[] = []
  for (let tick = min; tick <= max + step / 2; tick += step)
    ticks.push(Math.round(tick / step) * step)
  return { min, max, step, ticks }
}

/** `low`…`high` (made round, with zero) onto `start`…`end`. */
export function linearScale(
  low: number,
  high: number,
  start: number,
  end: number,
  count = 5
): Scale {
  const { min, max, ticks } = niceDomain(low, high, count)
  return {
    min,
    max,
    ticks,
    at: (value) => start + ((value - min) / (max - min)) * (end - start),
  }
}

/** `min`…`max` exactly onto `start`…`end`, no rounding, no zero. */
export function exactScale(
  min: number,
  max: number,
  start: number,
  end: number
): (value: number) => number {
  const span = max - min
  if (span === 0) return () => (start + end) / 2
  return (value) => start + ((value - min) / span) * (end - start)
}

/**
 * The ticks of a time axis from `start` to `end` (UTC milliseconds): every
 * Monday up to ten weeks, else the first of every month.
 */
export function timeTicks(
  start: number,
  end: number
): { unit: "week" | "month"; ticks: number[] } {
  if (end - start <= 70 * DAY) {
    const first = new Date(start)
    const back = (first.getUTCDay() + 6) % 7
    const ticks: number[] = []
    for (let at = start - back * DAY; at <= end; at += 7 * DAY)
      if (at >= start) ticks.push(at)
    return { unit: "week", ticks }
  }
  const first = new Date(start)
  const ticks: number[] = []
  let year = first.getUTCFullYear()
  let month = first.getUTCMonth()
  for (;;) {
    const at = Date.UTC(year, month, 1)
    if (at > end) break
    ticks.push(at)
    month += 1
    if (month === 12) {
      month = 0
      year += 1
    }
  }
  return { unit: "month", ticks }
}
