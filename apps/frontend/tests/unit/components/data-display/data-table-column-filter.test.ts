import { describe, expect, test } from "bun:test"
import {
  onlyValue,
  toggleFilterValue,
  toggleIncludedValue,
} from "@/components/shared/data-display/data-table-column-filter"

const VALUES = ["a", "b", "c"]

describe("toggleFilterValue", () => {
  test("unchecking a value while every value is kept keeps the rest", () => {
    expect(toggleFilterValue([], VALUES, "b")).toEqual(["a", "c"])
  })

  test("checking the last unchecked value goes back to every value", () => {
    expect(toggleFilterValue(["a", "c"], VALUES, "b")).toEqual([])
  })

  test("keeps the values in the options' order", () => {
    expect(toggleFilterValue(["c"], VALUES, "a")).toEqual(["a", "c"])
  })

  test("unchecking a kept value drops it", () => {
    expect(toggleFilterValue(["a", "c"], VALUES, "c")).toEqual(["a"])
  })
})

describe("toggleIncludedValue", () => {
  test("checking a value adds it to the kept ones", () => {
    expect(toggleIncludedValue(["a"], "b")).toEqual(["a", "b"])
  })

  test("unchecking the only kept value removes the filter", () => {
    expect(toggleIncludedValue(["a"], "a")).toEqual([])
  })
})

describe("onlyValue", () => {
  test("keeps just that value", () => {
    expect(onlyValue(["a", "b", "c"], "b")).toEqual(["b"])
  })

  test("is every value when the column has no other", () => {
    expect(onlyValue(["a"], "a")).toEqual([])
  })
})
