import { type RefObject, useEffect, useRef, useState } from "react"

// What the sidebar keeps across reloads in the same tab: its scroll offset
// and which sections are open. Across client-side navigations the island
// stays mounted and keeps both on its own.

const STORAGE_KEY = "docs-sidebar"

type Saved = { top: number; open: string[] }

function readSaved(): Saved | undefined {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw === null) return undefined
    const value: unknown = JSON.parse(raw)
    if (typeof value !== "object" || value === null) return undefined
    if (!("top" in value) || typeof value.top !== "number") return undefined
    if (!("open" in value) || !Array.isArray(value.open)) return undefined
    const open = value.open.filter(
      (entry): entry is string => typeof entry === "string"
    )
    return { top: value.top, open }
  } catch {
    return undefined
  }
}

function save(saved: Saved) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
  } catch {
    // Storage can be full or blocked; the sidebar still works without it.
  }
}

/**
 * The open sections, starting from the saved ones plus `required` (the
 * sections above the current page, which open again on every navigation),
 * and the scroller restored to its saved offset on mount.
 */
export function useSidebarMemory(
  scroller: RefObject<HTMLElement | null>,
  required: readonly string[]
) {
  const [open, setOpen] = useState<ReadonlySet<string>>(
    () => new Set([...(readSaved()?.open ?? []), ...required])
  )

  const requiredKey = required.join("\n")
  useEffect(() => {
    if (requiredKey === "") return
    setOpen((current) => {
      const missing = requiredKey
        .split("\n")
        .filter((href) => !current.has(href))
      if (missing.length === 0) return current
      return new Set([...current, ...missing])
    })
  }, [requiredKey])

  const openRef = useRef(open)

  // Restored once: later offsets come from the user scrolling.
  useEffect(() => {
    const element = scroller.current
    if (element === null) return
    const saved = readSaved()
    if (saved !== undefined) element.scrollTop = saved.top
    const onScroll = () =>
      save({ top: element.scrollTop, open: [...openRef.current] })
    element.addEventListener("scroll", onScroll, { passive: true })
    return () => element.removeEventListener("scroll", onScroll)
  }, [scroller])

  // Astro moves the persisted wrapper to the new body; where `moveBefore`
  // isn't available that detaches it, and a detached scroller loses its
  // offset. Keep the offset from before the swap and put it back after.
  useEffect(() => {
    let top = 0
    const onBeforeSwap = () => {
      top = scroller.current?.scrollTop ?? 0
    }
    const onAfterSwap = () => {
      if (scroller.current !== null) scroller.current.scrollTop = top
    }
    document.addEventListener("astro:before-swap", onBeforeSwap)
    document.addEventListener("astro:after-swap", onAfterSwap)
    return () => {
      document.removeEventListener("astro:before-swap", onBeforeSwap)
      document.removeEventListener("astro:after-swap", onAfterSwap)
    }
  }, [scroller])

  useEffect(() => {
    openRef.current = open
    save({ top: scroller.current?.scrollTop ?? 0, open: [...open] })
  }, [open, scroller])

  const toggle = (href: string) =>
    setOpen((current) => {
      const next = new Set(current)
      if (next.has(href)) next.delete(href)
      else next.add(href)
      return next
    })

  return { open, toggle }
}
