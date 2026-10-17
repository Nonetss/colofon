import { useSyncExternalStore } from "react"
import { pageSidebarId } from "@/lib/page-sidebar"

// The navbar is a persisted island: it rereads <body>'s mark after every
// client-side navigation instead of trusting what it saw on mount.
function subscribe(onChange: () => void) {
  document.addEventListener("astro:page-load", onChange)
  document.addEventListener("astro:after-swap", onChange)
  return () => {
    document.removeEventListener("astro:page-load", onChange)
    document.removeEventListener("astro:after-swap", onChange)
  }
}

/** The element id of the sidebar of the page on screen, or null. */
export function usePageSidebarId(): string | null {
  return useSyncExternalStore(subscribe, pageSidebarId, () => null)
}
