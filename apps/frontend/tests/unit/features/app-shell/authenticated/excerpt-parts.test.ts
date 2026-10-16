import { describe, expect, test } from "bun:test"
import { excerptParts } from "@/features/app-shell/authenticated/model/excerpt-parts"

describe("excerptParts", () => {
  test("cuts the text into plain and marked runs, in order", () => {
    expect(
      excerptParts({
        text: "…la consulta inversa da",
        highlights: [
          { start: 13, end: 20 },
          { start: 4, end: 12 },
        ],
      })
    ).toEqual([
      { text: "…la ", marked: false },
      { text: "consulta", marked: true },
      { text: " ", marked: false },
      { text: "inversa", marked: true },
      { text: " da", marked: false },
    ])
  })

  test("a highlight at either end leaves no empty run", () => {
    expect(
      excerptParts({ text: "dns", highlights: [{ start: 0, end: 3 }] })
    ).toEqual([{ text: "dns", marked: true }])
  })

  test("skips overlapping, empty and out-of-range highlights", () => {
    expect(
      excerptParts({
        text: "abcdef",
        highlights: [
          { start: 0, end: 3 },
          { start: 2, end: 4 },
          { start: 4, end: 4 },
          { start: 5, end: 9 },
        ],
      })
    ).toEqual([
      { text: "abc", marked: true },
      { text: "def", marked: false },
    ])
  })

  test("without highlights the text is one plain run", () => {
    expect(excerptParts({ text: "texto", highlights: [] })).toEqual([
      { text: "texto", marked: false },
    ])
  })
})
