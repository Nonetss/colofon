import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test"
import { act, cleanup, renderHook } from "@testing-library/react"
import { useTraceSheetHistory } from "@/features/admin/traces/overview/hooks/use-trace-sheet-history"

const LIST_URL = "https://localhost:4321/admin/traces?names=cron.run"
const TRACE_ID = "05072b142fc78534c2d81b03ebd5fd73"

/** Stands in for Astro's router: a bubbling popstate listener on window. */
const router = mock((_event: PopStateEvent) => {})

/** Steps back to the list's entry the way the browser does: the URL first,
 *  then popstate with that entry's state. */
function stepBackToList(state: unknown) {
  window.history.replaceState(state, "", LIST_URL)
  window.dispatchEvent(new PopStateEvent("popstate", { state }))
}

beforeEach(() => {
  window.history.replaceState({ index: 0 }, "", LIST_URL)
  router.mockClear()
  window.addEventListener("popstate", router)
})

afterEach(() => {
  window.removeEventListener("popstate", router)
  cleanup()
})

describe("useTraceSheetHistory", () => {
  test("opening pushes an entry with the trace, keeping the router's state", () => {
    const setTrace = mock((_traceId: string) => {})
    const { result } = renderHook(() => useTraceSheetHistory(setTrace))

    act(() => result.current.open(TRACE_ID))

    const url = new URL(window.location.href)
    expect(url.searchParams.get("trace")).toBe(TRACE_ID)
    expect(url.searchParams.get("names")).toBe("cron.run")
    expect(window.history.state).toMatchObject({ index: 0 })
    expect(setTrace).toHaveBeenLastCalledWith(TRACE_ID)
  })

  test("back out of the sheet's entry closes it and stops the router", () => {
    const setTrace = mock((_traceId: string) => {})
    const { result } = renderHook(() => useTraceSheetHistory(setTrace))
    act(() => result.current.open(TRACE_ID))

    act(() => stepBackToList({ index: 0 }))

    expect(setTrace).toHaveBeenLastCalledWith("")
    expect(router).not.toHaveBeenCalled()
  })

  test("leaves other history steps to the router", () => {
    const setTrace = mock((_traceId: string) => {})
    renderHook(() => useTraceSheetHistory(setTrace))

    act(() => stepBackToList({ index: 0 }))

    expect(router).toHaveBeenCalledTimes(1)
    expect(setTrace).not.toHaveBeenCalled()
  })

  test("closing a sheet opened from the URL drops the param, no step back", () => {
    window.history.replaceState(
      { index: 0 },
      "",
      `${LIST_URL}&trace=${TRACE_ID}`
    )
    const setTrace = mock((_traceId: string) => {})
    const { result } = renderHook(() => useTraceSheetHistory(setTrace))

    act(() => result.current.close())

    expect(setTrace).toHaveBeenLastCalledWith("")
    expect(new URL(window.location.href).searchParams.get("trace")).toBe(
      TRACE_ID
    )
  })
})
