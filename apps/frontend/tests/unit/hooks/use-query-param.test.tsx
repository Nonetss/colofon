import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { act, cleanup, renderHook } from "@testing-library/react"
import {
  NO_VALUES,
  type QueryParamCodec,
  useQueryParam,
  valueListCodec,
} from "@/hooks/use-query-param"

const pageCodec: QueryParamCodec<number> = {
  parse: (raw) => Number(raw),
  serialize: (value) => String(value),
}

function searchParam(key: string) {
  return new URL(window.location.href).searchParams.get(key)
}

beforeEach(() => {
  window.history.replaceState(null, "", "/crons")
})

afterEach(() => {
  cleanup()
})

describe("useQueryParam", () => {
  test("starts from the default when the param is absent", () => {
    const { result } = renderHook(() => useQueryParam("q", ""))
    expect(result.current[0]).toBe("")
  })

  test("writes the value to the URL and a fresh render parses it back", () => {
    const first = renderHook(() => useQueryParam("page", 1, pageCodec))
    act(() => first.result.current[1](3))

    expect(first.result.current[0]).toBe(3)
    expect(searchParam("page")).toBe("3")

    const second = renderHook(() => useQueryParam("page", 1, pageCodec))
    expect(second.result.current[0]).toBe(3)
  })

  test("drops the param once the value is back to the default", () => {
    const { result } = renderHook(() => useQueryParam("q", ""))
    act(() => result.current[1]("cron"))
    expect(searchParam("q")).toBe("cron")

    act(() => result.current[1](""))
    expect(searchParam("q")).toBeNull()
  })

  test("resyncs on back/forward navigation", () => {
    const { result } = renderHook(() => useQueryParam("q", ""))
    act(() => {
      window.history.replaceState(null, "", "/crons?q=nightly")
      window.dispatchEvent(new window.Event("popstate"))
    })
    expect(result.current[0]).toBe("nightly")
  })
})

describe("valueListCodec", () => {
  test("round-trips values, commas inside a value included", () => {
    const values = ["informes", "a,b", "día"]
    expect(valueListCodec.parse(valueListCodec.serialize(values))).toEqual(
      values
    )
  })

  test("reads an empty param as no values", () => {
    expect(valueListCodec.parse("")).toEqual([])
  })

  test("drops the param when set back to the shared empty list", () => {
    const { result } = renderHook(() =>
      useQueryParam("tag", NO_VALUES, valueListCodec)
    )
    act(() => result.current[1](["informes", "limpieza"]))
    expect(searchParam("tag")).toBe("informes,limpieza")

    act(() => result.current[1](NO_VALUES))
    expect(searchParam("tag")).toBeNull()
  })
})
