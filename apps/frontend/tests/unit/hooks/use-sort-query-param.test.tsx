import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { act, cleanup, renderHook } from "@testing-library/react"
import {
  type SortOrdering,
  useSortQueryParam,
} from "@/hooks/use-sort-query-param"

type Key = "name" | "createdAt"

const KEYS: readonly Key[] = ["name", "createdAt"]
const NEWEST: SortOrdering<Key> = { sort: "createdAt", order: "desc" }

function searchParam(key: string) {
  return new URL(window.location.href).searchParams.get(key)
}

beforeEach(() => {
  window.history.replaceState(null, "", "/admin/organizations")
})

afterEach(() => {
  cleanup()
})

describe("useSortQueryParam", () => {
  test("starts from the fallback and leaves it out of the URL", () => {
    const { result } = renderHook(() => useSortQueryParam(KEYS, NEWEST))

    expect(result.current[0]).toEqual([{ id: "createdAt", desc: true }])
    expect(result.current[2]).toEqual(NEWEST)
    expect(searchParam("sort")).toBeNull()
    expect(searchParam("order")).toBeNull()
  })

  test("writes a header sort to the URL and a fresh render reads it back", () => {
    const first = renderHook(() => useSortQueryParam(KEYS, NEWEST))
    act(() => first.result.current[1]([{ id: "name", desc: false }]))

    expect(searchParam("sort")).toBe("name")
    expect(searchParam("order")).toBe("asc")
    const second = renderHook(() => useSortQueryParam(KEYS, NEWEST))
    expect(second.result.current[2]).toEqual({ sort: "name", order: "asc" })
  })

  test("drops both params once the sort is back to the fallback", () => {
    const { result } = renderHook(() => useSortQueryParam(KEYS, NEWEST))
    act(() => result.current[1]([{ id: "name", desc: false }]))
    act(() => result.current[1]([{ id: "createdAt", desc: true }]))

    expect(searchParam("sort")).toBeNull()
    expect(searchParam("order")).toBeNull()
  })

  test("an unknown key in the URL reads as the fallback", () => {
    window.history.replaceState(null, "", "/admin/organizations?sort=token")
    const { result } = renderHook(() => useSortQueryParam(KEYS, NEWEST))

    expect(result.current[2]).toEqual(NEWEST)
  })

  test("with no fallback the rows start unsorted", () => {
    const { result } = renderHook(() => useSortQueryParam(KEYS, null))

    expect(result.current[0]).toEqual([])
    expect(result.current[2]).toBeNull()
    act(() => result.current[1]([{ id: "name", desc: true }]))
    expect(result.current[0]).toEqual([{ id: "name", desc: true }])
  })
})
