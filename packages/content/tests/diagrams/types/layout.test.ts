import { describe, expect, test } from "bun:test"
import type { Point } from "#diagrams/model"
import { overlaps, placeLabels, textBox } from "#diagrams/types/layout/labels"
import { layered } from "#diagrams/types/layout/layered"
import { orderRanks, rankNodes } from "#diagrams/types/layout/ranks"
import {
  linearScale,
  niceDomain,
  timeTicks,
} from "#diagrams/types/layout/scale"
import { squarify } from "#diagrams/types/layout/squarify"
import { tidyTree } from "#diagrams/types/layout/tidy-tree"

describe("rankNodes", () => {
  test("each node's rank is its longest distance from a source", () => {
    const { rank } = rankNodes(
      ["a", "b", "c", "d"],
      [
        { from: "a", to: "b" },
        { from: "a", to: "c" },
        { from: "b", to: "d" },
        { from: "c", to: "d" },
        { from: "a", to: "d" },
      ]
    )
    expect(Object.fromEntries(rank)).toEqual({ a: 0, b: 1, c: 1, d: 2 })
  })

  test("a link that closes a cycle is set aside and the cycle reported", () => {
    const ranked = rankNodes(
      ["a", "b", "c"],
      [
        { from: "a", to: "b" },
        { from: "b", to: "c" },
        { from: "c", to: "a" },
      ],
      ["a"]
    )
    expect([...ranked.back]).toEqual([2])
    expect(ranked.cycles).toEqual([["a", "b", "c"]])
    expect(Object.fromEntries(ranked.rank)).toEqual({ a: 0, b: 1, c: 2 })
  })

  test("ranks are ordered to put a node under the nodes it comes from", () => {
    const rows = orderRanks(
      ["a", "b", "x", "y"],
      new Map([
        ["a", 0],
        ["b", 0],
        ["x", 1],
        ["y", 1],
      ]),
      [
        { from: "a", to: "y" },
        { from: "b", to: "x" },
      ]
    )
    expect(rows).toEqual([
      ["a", "b"],
      ["y", "x"],
    ])
  })
})

/** Does the segment a→b pass through the inside of the box? */
function crosses(
  a: Point,
  b: Point,
  box: { x: number; y: number; w: number; h: number }
): boolean {
  const left = Math.min(a[0], b[0])
  const right = Math.max(a[0], b[0])
  const top = Math.min(a[1], b[1])
  const bottom = Math.max(a[1], b[1])
  return (
    left < box.x + box.w - 1 &&
    box.x + 1 < right + (a[0] === b[0] ? 1 : 0) &&
    top < box.y + box.h - 1 &&
    box.y + 1 < bottom + (a[1] === b[1] ? 1 : 0)
  )
}

describe("layered", () => {
  const node = (id: string) => ({ id, w: 100, h: 40, row: null, col: null })

  test("no route crosses a box other than its ends, back links included", () => {
    const links = [
      { from: "a", to: "b" },
      { from: "a", to: "c" },
      { from: "b", to: "d" },
      { from: "c", to: "d" },
      { from: "a", to: "d" },
      { from: "d", to: "a" },
    ]
    const layout = layered(["a", "b", "c", "d"].map(node), links, {
      left: 0,
      top: 40,
      rowGap: 56,
      colGap: 56,
    })
    links.forEach((link, index) => {
      const route = layout.routes[index]
      if (route === null || route === undefined) throw new Error("no route")
      for (const [id, cell] of layout.cells) {
        if (id === link.from || id === link.to) continue
        for (let i = 1; i < route.points.length; i++) {
          const a = route.points[i - 1]
          const b = route.points[i]
          if (a === undefined || b === undefined) continue
          expect(crosses(a, b, cell)).toBe(false)
        }
      }
    })
    expect([...layout.back]).toEqual([5])
  })

  test("routes run at right angles", () => {
    const layout = layered(
      ["a", "b", "c"].map(node),
      [
        { from: "a", to: "b" },
        { from: "a", to: "c" },
      ],
      { left: 0, top: 40, rowGap: 56, colGap: 56 }
    )
    for (const route of layout.routes) {
      if (route === null) continue
      for (let i = 1; i < route.points.length; i++) {
        const a = route.points[i - 1]
        const b = route.points[i]
        if (a === undefined || b === undefined) continue
        expect(a[0] === b[0] || a[1] === b[1]).toBe(true)
      }
    }
  })
})

describe("tidyTree", () => {
  test("a parent is centred over its children and siblings never overlap", () => {
    const leaf = (id: string) => ({ id, breadth: 100, children: [] })
    const { placed } = tidyTree({
      id: "root",
      breadth: 100,
      children: [
        { id: "a", breadth: 100, children: [leaf("a1"), leaf("a2")] },
        leaf("b"),
      ],
    })
    const at = new Map(placed.map((entry) => [entry.id, entry]))
    const centre = (id: string) => {
      const entry = at.get(id)
      if (entry === undefined) throw new Error(`${id} not placed`)
      return entry.centre
    }
    expect(centre("a")).toBe((centre("a1") + centre("a2")) / 2)
    expect(centre("root")).toBe((centre("a") + centre("b")) / 2)
    expect(centre("a2") - centre("a1")).toBeGreaterThanOrEqual(100)
    expect(centre("b") - centre("a2")).toBeGreaterThanOrEqual(100)
    expect(at.get("a1")?.depth).toBe(2)
  })
})

describe("scales", () => {
  test("a value axis ends on a round number with zero: 870 gives 0 to 1000 by 200", () => {
    expect(niceDomain(0, 870)).toEqual({
      min: 0,
      max: 1000,
      step: 200,
      ticks: [0, 200, 400, 600, 800, 1000],
    })
  })

  test("negative values keep zero inside the axis", () => {
    const { min, max, ticks } = niceDomain(-30, 45)
    expect(min).toBeLessThanOrEqual(-30)
    expect(max).toBeGreaterThanOrEqual(45)
    expect(ticks).toContain(0)
  })

  test("a linear scale maps its round domain onto the range", () => {
    const scale = linearScale(0, 870, 0, 500)
    expect(scale.at(0)).toBe(0)
    expect(scale.at(1000)).toBe(500)
  })

  test("a span of half a year ticks every month", () => {
    const { unit, ticks } = timeTicks(
      Date.UTC(2026, 0, 5),
      Date.UTC(2026, 5, 30)
    )
    expect(unit).toBe("month")
    expect(ticks.map((tick) => new Date(tick).getUTCMonth())).toEqual([
      0, 1, 2, 3, 4, 5,
    ])
  })

  test("a span of a few weeks ticks every Monday", () => {
    const { unit, ticks } = timeTicks(
      Date.UTC(2026, 2, 2),
      Date.UTC(2026, 2, 31)
    )
    expect(unit).toBe("week")
    expect(ticks.map((tick) => new Date(tick).getUTCDay())).toEqual([
      1, 1, 1, 1, 1,
    ])
  })
})

describe("squarify", () => {
  test("each rectangle's area follows its value and all fill the area", () => {
    const rects = squarify([6, 3, 2, 1], { x: 0, y: 0, w: 120, h: 100 })
    const areas = rects.map((rect) => rect.w * rect.h)
    expect(areas[0]).toBeCloseTo(6000)
    expect(areas[1]).toBeCloseTo(3000)
    expect(areas[3]).toBeCloseTo(1000)
    for (const rect of rects) {
      expect(rect.x + rect.w).toBeLessThanOrEqual(120.0001)
      expect(rect.y + rect.h).toBeLessThanOrEqual(100.0001)
    }
  })
})

describe("placeLabels", () => {
  test("labels take their first free spot and never overlap", () => {
    const spots = [
      { x: 100, y: 50, anchor: "start" as const },
      { x: 100, y: 70, anchor: "start" as const },
    ]
    const placed = placeLabels([
      { text: "Primero", role: "label", spots },
      { text: "Segundo", role: "label", spots },
      { text: "Tercero", role: "label", spots },
    ])
    expect(placed[0]).toEqual(spots[0])
    expect(placed[1]).toEqual(spots[1])
    expect(placed[2]).toBeNull()
    if (placed[0] === null || placed[0] === undefined) return
    if (placed[1] === null || placed[1] === undefined) return
    expect(
      overlaps(
        textBox("Primero", "label", placed[0]),
        textBox("Segundo", "label", placed[1])
      )
    ).toBe(false)
  })
})
