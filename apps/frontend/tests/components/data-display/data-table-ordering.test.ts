import { describe, expect, test } from "bun:test"
import { moveColumn } from "@/components/shared/data-display/data-table-columns-menu"
import { reorderColumns } from "@/components/shared/data-display/data-table-header"

const order = ["ip", "mac", "seen", "location", "owner", "expand"]
const reorderable = new Set(["mac", "seen", "location", "owner"])

describe("moveColumn", () => {
  test("swaps with the next reorderable column", () => {
    expect(moveColumn(order, reorderable, "seen", 1)).toEqual([
      "ip",
      "mac",
      "location",
      "seen",
      "owner",
      "expand",
    ])
  })

  test("swaps with the previous reorderable column", () => {
    expect(moveColumn(order, reorderable, "seen", -1)).toEqual([
      "ip",
      "seen",
      "mac",
      "location",
      "owner",
      "expand",
    ])
  })

  test("never moves past a fixed column", () => {
    expect(moveColumn(order, reorderable, "mac", -1)).toEqual(order)
    expect(moveColumn(order, reorderable, "owner", 1)).toEqual(order)
  })

  test("skips over a fixed column between two reorderable ones", () => {
    const withFixed = ["ip", "mac", "pinned", "owner"]
    expect(moveColumn(withFixed, new Set(["mac", "owner"]), "mac", 1)).toEqual([
      "ip",
      "owner",
      "pinned",
      "mac",
    ])
  })

  test("an unknown id leaves the order alone", () => {
    expect(moveColumn(order, reorderable, "gone", 1)).toEqual(order)
  })
})

describe("reorderColumns", () => {
  test("drops a column before its target", () => {
    expect(
      reorderColumns(order, "owner", { id: "mac", side: "before" })
    ).toEqual(["ip", "owner", "mac", "seen", "location", "expand"])
  })

  test("drops a column after its target", () => {
    expect(
      reorderColumns(order, "mac", { id: "location", side: "after" })
    ).toEqual(["ip", "seen", "location", "mac", "owner", "expand"])
  })

  test("dropping on itself changes nothing", () => {
    expect(
      reorderColumns(order, "seen", { id: "seen", side: "after" })
    ).toEqual(order)
  })

  test("an unknown target changes nothing", () => {
    expect(
      reorderColumns(order, "seen", { id: "gone", side: "before" })
    ).toEqual(order)
  })
})
