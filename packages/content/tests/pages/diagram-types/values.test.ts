import { describe, expect, test } from "bun:test"
import {
  formatDate,
  formatNumber,
  formatPercent,
  parseDate,
} from "#pages/diagram-types/values"

describe("formatNumber", () => {
  test("uses Spanish separators, its decimals and its unit", () => {
    expect(formatNumber(1234.5, { unit: "€", decimals: 1 })).toBe("1.234,5 €")
    expect(formatNumber(1200, { unit: "usuarios", decimals: 0 })).toBe(
      "1.200 usuarios"
    )
    expect(formatNumber(1234567, { unit: null, decimals: 0 })).toBe("1.234.567")
  })

  test("writes negative values with a minus sign, and no sign for a rounded zero", () => {
    expect(formatNumber(-2500, { unit: null, decimals: 0 })).toBe("−2.500")
    expect(formatNumber(-0.01, { unit: null, decimals: 0 })).toBe("0")
  })

  test("percentages are rounded to whole numbers", () => {
    expect(formatPercent(-0.6)).toBe("−60 %")
    expect(formatPercent(0.125)).toBe("13 %")
  })
})

describe("dates", () => {
  test("a day and a month are read and shown with Spanish short months", () => {
    const day = parseDate("2026-03-03")
    const month = parseDate("2026-03")
    if (day === null || month === null) throw new Error("not read")
    expect(formatDate(day)).toBe("3 mar 2026")
    expect(formatDate(month)).toBe("mar 2026")
    expect(month.time).toBe(Date.UTC(2026, 2, 1))
  })

  test("a date that does not exist is not read", () => {
    expect(parseDate("2026-13-01")).toBeNull()
    expect(parseDate("2026-02-30")).toBeNull()
    expect(parseDate("marzo")).toBeNull()
  })
})
