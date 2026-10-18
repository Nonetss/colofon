import { useSyncExternalStore } from "react"
import { readScopeCookie } from "@/features/docs/shared/public"

/** Fired after the selector writes the scope cookie. */
export const DOCS_SCOPE_CHANGE_EVENT = "docs-scope:change"

// The server moves the cookie when a page of another repository opens, and
// the selector writes it: reread it after every navigation and every choice.
function subscribe(onChange: () => void) {
  document.addEventListener("astro:after-swap", onChange)
  document.addEventListener("astro:page-load", onChange)
  window.addEventListener(DOCS_SCOPE_CHANGE_EVENT, onChange)
  return () => {
    document.removeEventListener("astro:after-swap", onChange)
    document.removeEventListener("astro:page-load", onChange)
    window.removeEventListener(DOCS_SCOPE_CHANGE_EVENT, onChange)
  }
}

/** The stored scope value (`todos` or a slug), as the cookie holds it now. */
export function useStoredScope(serverValue: string | undefined) {
  return useSyncExternalStore(
    subscribe,
    () => readScopeCookie(document.cookie),
    () => serverValue
  )
}
