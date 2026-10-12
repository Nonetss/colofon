import { useCallback, useEffect, useRef, useState } from "react"

interface ScrollEdges {
  canScrollLeft: boolean
  canScrollRight: boolean
}

const NO_OVERFLOW: ScrollEdges = { canScrollLeft: false, canScrollRight: false }

/** Sub-pixel scroll positions never quite reach the end. */
const EDGE_TOLERANCE = 1

function readEdges(element: HTMLElement): ScrollEdges {
  const maxScroll = element.scrollWidth - element.clientWidth
  return {
    canScrollLeft: element.scrollLeft > EDGE_TOLERANCE,
    canScrollRight: element.scrollLeft < maxScroll - EDGE_TOLERANCE,
  }
}

function keepIfUnchanged(current: ScrollEdges, next: ScrollEdges) {
  if (
    current.canScrollLeft === next.canScrollLeft &&
    current.canScrollRight === next.canScrollRight
  ) {
    return current
  }
  return next
}

/**
 * Tracks whether a horizontally scrolling row has hidden content on either
 * side, and scrolls it by most of its visible width, so arrow buttons can be
 * shown only when there is something to reveal.
 */
export function useHorizontalScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [edges, setEdges] = useState<ScrollEdges>(NO_OVERFLOW)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const update = () => {
      const next = readEdges(element)
      setEdges((current) => keepIfUnchanged(current, next))
    }
    update()
    element.addEventListener("scroll", update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(element)
    for (const child of element.children) observer.observe(child)
    return () => {
      element.removeEventListener("scroll", update)
      observer.disconnect()
    }
  }, [])

  const scrollBy = useCallback((direction: -1 | 1) => {
    const element = ref.current
    if (!element) return
    element.scrollBy({
      left: direction * element.clientWidth * 0.8,
      behavior: "smooth",
    })
  }, [])

  return { ref, ...edges, scrollBy }
}
