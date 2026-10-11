import { afterEach, describe, expect, jest, spyOn, test } from "bun:test"
import { act, cleanup, renderHook } from "@testing-library/react"
import {
  type ColumnPreferenceDefault,
  columnPreferencesStorageKey,
  defaultColumnPreferences,
  normalizeColumnOrder,
  parseColumnPreferences,
  useColumnPreferences,
} from "@/hooks/use-column-preferences"

const columns: ColumnPreferenceDefault[] = [
  {
    id: "ip",
    size: 160,
    minSize: 120,
    maxSize: 240,
    hideable: false,
    visible: true,
    reorderable: false,
  },
  {
    id: "mac",
    size: 160,
    minSize: 120,
    maxSize: 280,
    hideable: true,
    visible: true,
    reorderable: true,
  },
  {
    id: "seen",
    size: 120,
    minSize: 80,
    maxSize: 200,
    hideable: true,
    visible: true,
    reorderable: true,
  },
  {
    id: "owner",
    size: 160,
    minSize: 100,
    maxSize: 320,
    hideable: true,
    visible: true,
    reorderable: true,
  },
  {
    id: "expand",
    size: 40,
    minSize: 40,
    maxSize: 40,
    hideable: false,
    visible: true,
    reorderable: false,
  },
]

function saved(value: object) {
  return JSON.stringify({ v: 1, ...value })
}

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  jest.useRealTimers()
})

describe("normalizeColumnOrder", () => {
  test("keeps fixed columns at their default index", () => {
    expect(
      normalizeColumnOrder(["owner", "ip", "expand", "seen", "mac"], columns)
    ).toEqual(["ip", "owner", "seen", "mac", "expand"])
  })

  test("drops unknown and repeated ids", () => {
    expect(
      normalizeColumnOrder(
        ["ip", "gone", "seen", "seen", "mac", "owner", "expand"],
        columns
      )
    ).toEqual(["ip", "seen", "mac", "owner", "expand"])
  })

  test("a missing column lands after its default predecessor", () => {
    expect(
      normalizeColumnOrder(["ip", "owner", "mac", "expand"], columns)
    ).toEqual(["ip", "owner", "mac", "seen", "expand"])
  })
})

describe("parseColumnPreferences", () => {
  test("no saved data yields the defaults", () => {
    expect(parseColumnPreferences(null, columns)).toEqual(
      defaultColumnPreferences(columns)
    )
  })

  test("corrupt JSON and another version yield the defaults", () => {
    const defaults = defaultColumnPreferences(columns)
    expect(parseColumnPreferences("{not json", columns)).toEqual(defaults)
    expect(
      parseColumnPreferences(
        JSON.stringify({ v: 2, visibility: { mac: false } }),
        columns
      )
    ).toEqual(defaults)
  })

  test("merges saved values over the defaults", () => {
    const result = parseColumnPreferences(
      saved({
        visibility: { mac: false, gone: false, seen: "no" },
        sizing: { owner: 200, gone: 90 },
        order: ["ip", "owner", "mac", "seen", "expand"],
      }),
      columns
    )
    expect(result.visibility).toEqual({
      ip: true,
      mac: false,
      seen: true,
      owner: true,
      expand: true,
    })
    expect(result.sizing.owner).toBe(200)
    expect(result.sizing).not.toHaveProperty("gone")
    expect(result.order).toEqual(["ip", "owner", "mac", "seen", "expand"])
  })

  test("a non-hideable column cannot be saved hidden", () => {
    const result = parseColumnPreferences(
      saved({ visibility: { ip: false } }),
      columns
    )
    expect(result.visibility.ip).toBe(true)
  })

  test("clamps widths to the current limits", () => {
    const result = parseColumnPreferences(
      saved({ sizing: { mac: 10, owner: 9000 } }),
      columns
    )
    expect(result.sizing.mac).toBe(120)
    expect(result.sizing.owner).toBe(320)
  })
})

/** `columns` with "seen" declared hidden by default. */
const withHiddenSeen: ColumnPreferenceDefault[] = columns.map((column) => {
  if (column.id !== "seen") return column
  return { ...column, visible: false }
})

describe("default-hidden columns", () => {
  test("start hidden when nothing was saved", () => {
    expect(parseColumnPreferences(null, withHiddenSeen).visibility.seen).toBe(
      false
    )
  })

  test("saved preferences override the default", () => {
    const result = parseColumnPreferences(
      saved({ visibility: { seen: true } }),
      withHiddenSeen
    )
    expect(result.visibility.seen).toBe(true)
  })

  test("a column the saved preferences don't mention keeps its default", () => {
    const result = parseColumnPreferences(
      saved({ visibility: { mac: false } }),
      withHiddenSeen
    )
    expect(result.visibility.seen).toBe(false)
  })

  test("a non-hideable column ignores the default", () => {
    const pinned = columns.map((column) => {
      if (column.id !== "ip") return column
      return { ...column, visible: false }
    })
    expect(defaultColumnPreferences(pinned).visibility.ip).toBe(true)
  })

  test("reset hides it again", () => {
    window.localStorage.setItem(
      columnPreferencesStorageKey("arp"),
      saved({ visibility: { seen: true } })
    )
    const { result } = renderHook(() =>
      useColumnPreferences("arp", withHiddenSeen)
    )
    expect(result.current.visibility.seen).toBe(true)
    act(() => {
      result.current.reset()
    })
    expect(result.current.visibility.seen).toBe(false)
  })
})

describe("useColumnPreferences", () => {
  test("restores what was saved under the table's key", () => {
    window.localStorage.setItem(
      columnPreferencesStorageKey("arp"),
      saved({ visibility: { seen: false } })
    )
    const { result } = renderHook(() => useColumnPreferences("arp", columns))
    expect(result.current.visibility.seen).toBe(false)
  })

  test("writes changes after the debounce", () => {
    jest.useFakeTimers()
    const { result } = renderHook(() => useColumnPreferences("arp", columns))

    act(() => {
      result.current.setVisibility((previous) => ({
        ...previous,
        owner: false,
      }))
      result.current.setSizing({ mac: 220 })
    })
    expect(
      window.localStorage.getItem(columnPreferencesStorageKey("arp"))
    ).toBeNull()

    act(() => {
      jest.advanceTimersByTime(300)
    })
    const stored = parseColumnPreferences(
      window.localStorage.getItem(columnPreferencesStorageKey("arp")),
      columns
    )
    expect(stored.visibility.owner).toBe(false)
    expect(stored.sizing.mac).toBe(220)
  })

  test("setters keep fixed columns visible and in place", () => {
    const { result } = renderHook(() => useColumnPreferences("arp", columns))
    act(() => {
      result.current.setVisibility({ ip: false, mac: false })
      result.current.setOrder(["expand", "owner", "ip", "mac", "seen"])
    })
    expect(result.current.visibility.ip).toBe(true)
    expect(result.current.visibility.mac).toBe(false)
    expect(result.current.order).toEqual([
      "ip",
      "owner",
      "mac",
      "seen",
      "expand",
    ])
  })

  test("reset restores the defaults and clears the saved layout", () => {
    window.localStorage.setItem(
      columnPreferencesStorageKey("arp"),
      saved({ visibility: { seen: false } })
    )
    const { result } = renderHook(() => useColumnPreferences("arp", columns))
    act(() => {
      result.current.reset()
    })
    expect(result.current).toMatchObject(defaultColumnPreferences(columns))
    expect(
      window.localStorage.getItem(columnPreferencesStorageKey("arp"))
    ).toBeNull()
  })

  test("works when storage throws", () => {
    const getItem = spyOn(Storage.prototype, "getItem").mockImplementation(
      () => {
        throw new Error("blocked")
      }
    )
    const setItem = spyOn(Storage.prototype, "setItem").mockImplementation(
      () => {
        throw new Error("blocked")
      }
    )
    try {
      jest.useFakeTimers()
      const { result } = renderHook(() => useColumnPreferences("arp", columns))
      expect(result.current.order).toEqual(
        defaultColumnPreferences(columns).order
      )
      act(() => {
        result.current.setVisibility({ mac: false })
        jest.advanceTimersByTime(300)
      })
      expect(result.current.visibility.mac).toBe(false)
    } finally {
      getItem.mockRestore()
      setItem.mockRestore()
    }
  })
})
