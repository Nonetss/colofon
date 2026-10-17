import { useSyncExternalStore } from "react"

/**
 * The live `<body>`, kept in sync across Astro View Transitions.
 *
 * The router replaces `<body>` on every navigation while `transition:persist`
 * islands survive it, so a portal an island resolved to `document.body` once
 * keeps pointing at the old, detached one. Passing this as the portal's
 * `container` moves it to each new body.
 */
function subscribe(onChange: () => void) {
  document.addEventListener("astro:after-swap", onChange)
  return () => document.removeEventListener("astro:after-swap", onChange)
}

const getSnapshot = () => document.body
const getServerSnapshot = () => undefined

export function useDocumentBody() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
