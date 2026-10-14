import { useEffect, useRef } from "react"

/** Marks the history entry the trace sheet pushed. */
const SHEET_ENTRY = "adminTraceSheet"

function isSheetEntry(state: unknown): boolean {
  return typeof state === "object" && state !== null && SHEET_ENTRY in state
}

function traceInUrl(): string {
  return new URL(window.location.href).searchParams.get("trace") ?? ""
}

/**
 * Gives the trace sheet its own history entry, so the back button (a
 * phone's above all) closes the sheet and leaves the list in place instead
 * of leaving the page, and forward opens it again.
 *
 * The popstate listener runs in the capture phase, ahead of Astro's router,
 * and stops the event for the steps into or out of the sheet's entry: the
 * router would otherwise treat a query-only step as a navigation and load
 * the page again. `setTrace` receives the trace in the URL stepped to.
 */
export function useTraceSheetHistory(setTrace: (traceId: string) => void) {
  // A reload keeps the entry's state: the page then still sits on it.
  const inSheetEntry = useRef(isSheetEntry(window.history.state))

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const intoSheet = isSheetEntry(event.state)
      if (!intoSheet && !inSheetEntry.current) return
      event.stopImmediatePropagation()
      inSheetEntry.current = intoSheet
      setTrace(traceInUrl())
    }
    window.addEventListener("popstate", onPopState, { capture: true })
    return () =>
      window.removeEventListener("popstate", onPopState, { capture: true })
  }, [setTrace])

  const open = (traceId: string) => {
    const url = new URL(window.location.href)
    url.searchParams.set("trace", traceId)
    window.history.pushState(
      { ...window.history.state, [SHEET_ENTRY]: true },
      "",
      url
    )
    inSheetEntry.current = true
    setTrace(traceId)
  }

  /** Steps back out of the sheet's entry when it pushed one; a sheet
   *  opened from the URL (a link from the activity log) just drops the
   *  param, so back still returns where the link came from. */
  const close = () => {
    if (inSheetEntry.current) {
      window.history.back()
      return
    }
    setTrace("")
  }

  return { open, close }
}
