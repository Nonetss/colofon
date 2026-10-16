import { describe, expect, test } from "bun:test"
import {
  badgeWidth,
  chainGap,
  fit,
  tableHeight,
  tagWidth,
  textWidth,
} from "#pages/diagram-measure"

describe("diagram text measures", () => {
  test("text is measured with lib.mjs's average advances", () => {
    expect(textWidth("Gitea", 12, "sans")).toBeCloseTo(34.8)
    expect(textWidth("pull", 9)).toBeCloseTo(22.32)
    expect(textWidth("CURL", 8, "mono", 0.06)).toBeCloseTo(21.76)
    expect(textWidth("ñandú", 10)).toBeCloseTo(31)
  })

  test("tags, badges and tables are sized as lib.mjs draws them", () => {
    expect(tagWidth("1 · Repositorio")).toBe(86)
    expect(badgeWidth("SSO")).toBe(25)
    expect(tableHeight(3, false)).toBe(84)
    expect(tableHeight(3, true)).toBe(98)
    // 36 + 14 × 3 + (10 + 14 × 2) + 6
    expect(tableHeight(3, false, 2)).toBe(122)
  })

  test("a box fits its longest line on the 4px grid, never below its minimum", () => {
    expect(fit("VM", [], null)).toBe(120)
    expect(
      fit("Registro de Gitea", ["<owner>/<imagen>:latest"], "Imágenes")
    ).toBe(164)
  })

  test("a chain's gap grows with its label", () => {
    expect(chainGap(null)).toBe(48)
    expect(chainGap("BUILD")).toBe(60)
    expect(chainGap("SNAPSHOT")).toBe(76)
  })
})
