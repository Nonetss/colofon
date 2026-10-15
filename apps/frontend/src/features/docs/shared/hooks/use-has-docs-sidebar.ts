import { useSyncExternalStore } from "react"
import { hasDocsSidebar } from "@/features/docs/shared/model/sidebar-toggle"

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

/** Whether the page on screen has the documentation sidebar. */
export function useHasDocsSidebar(): boolean {
  return useSyncExternalStore(subscribe, hasDocsSidebar, () => false)
}
