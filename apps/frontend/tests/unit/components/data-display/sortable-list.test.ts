import { describe, expect, test } from "bun:test"
import { moveIndex } from "@/components/shared/data-display/sortable-list"

describe("moveIndex", () => {
  test("moves an item forward and backward", () => {
    expect(moveIndex(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"])
    expect(moveIndex(["a", "b", "c", "d"], 3, 1)).toEqual(["a", "d", "b", "c"])
  })

  test("leaves the input untouched", () => {
    const items = ["a", "b"]
    moveIndex(items, 0, 1)
    expect(items).toEqual(["a", "b"])
  })

  test("is null for a no-op or an out-of-range index", () => {
    expect(moveIndex(["a", "b"], 1, 1)).toBeNull()
    expect(moveIndex(["a", "b"], -1, 0)).toBeNull()
    expect(moveIndex(["a", "b"], 0, 2)).toBeNull()
    expect(moveIndex([], 0, 0)).toBeNull()
  })
})
