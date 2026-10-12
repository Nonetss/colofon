import { useCallback, useEffect, useRef, useState } from "react"

const KEY_STEP_PX = 16
const KEY_STEP_LARGE_PX = 64

export interface ResizableWidthOptions {
  /** localStorage key that remembers the width per browser. */
  storageKey: string
  /** Narrowest width, in rem. */
  minRem: number
  /** Widest width, as a fraction of the viewport width. */
  maxViewportRatio: number
}

export interface WidthBounds {
  min: number
  max: number
}

function remToPx(rem: number): number {
  return (
    rem * Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
  )
}

/** Current pixel bounds for `options`; they follow the viewport width. */
export function resizableWidthBounds({
  minRem,
  maxViewportRatio,
}: Pick<ResizableWidthOptions, "minRem" | "maxViewportRatio">): WidthBounds {
  const min = remToPx(minRem)
  return {
    min,
    max: Math.max(min, window.innerWidth * maxViewportRatio),
  }
}

export function clampToBounds(width: number, { min, max }: WidthBounds) {
  return Math.round(Math.min(max, Math.max(min, width)))
}

export function readStoredWidth(storageKey: string): number | null {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return null
    const width = Number.parseFloat(raw)
    if (!Number.isFinite(width) || width <= 0) return null
    return width
  } catch {
    return null
  }
}

function writeStoredWidth(storageKey: string, width: number | null): void {
  try {
    if (width === null) localStorage.removeItem(storageKey)
    else localStorage.setItem(storageKey, String(width))
  } catch {
    // Ignore quota / private-mode failures; the width still applies now.
  }
}

/** The handle sits inside the panel, so its parent is what gets measured. */
function panelWidthFrom(handle: HTMLElement): number {
  return handle.parentElement?.getBoundingClientRect().width ?? 0
}

interface DragState {
  pointerId: number
  startX: number
  startWidth: number
  moved: boolean
}

/**
 * User-chosen width of a panel docked to the right edge, resized from a
 * handle on its left border (`ResizeHandle`): drag, arrows (Shift for
 * bigger steps), Home/End, and double click to go back to the default.
 * `null` means the panel's CSS default. The stored value is kept unclamped,
 * so callers clamp it in CSS as the window changes size.
 */
export function useResizableWidth(options: ResizableWidthOptions) {
  const { storageKey, minRem, maxViewportRatio } = options
  const [width, setWidth] = useState<number | null>(() =>
    readStoredWidth(storageKey)
  )
  const [isResizing, setIsResizing] = useState(false)
  const dragRef = useRef<DragState | null>(null)
  const frameRef = useRef<number | null>(null)
  const pendingWidthRef = useRef<number | null>(null)

  const getBounds = useCallback(
    () => resizableWidthBounds({ minRem, maxViewportRatio }),
    [minRem, maxViewportRatio]
  )

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    },
    []
  )

  // Pointer moves arrive faster than frames and each width change can
  // reflow the page, so apply at most one per frame.
  const scheduleWidth = useCallback((next: number) => {
    pendingWidthRef.current = next
    if (frameRef.current !== null) return
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null
      if (pendingWidthRef.current !== null) setWidth(pendingWidthRef.current)
    })
  }, [])

  const commit = useCallback(
    (next: number | null) => {
      setWidth(next)
      writeStoredWidth(storageKey, next)
    },
    [storageKey]
  )

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return
      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startWidth: panelWidthFrom(event.currentTarget),
        moved: false,
      }
      setIsResizing(true)
    },
    []
  )

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== event.pointerId) return
      const delta = drag.startX - event.clientX
      if (delta !== 0) drag.moved = true
      scheduleWidth(clampToBounds(drag.startWidth + delta, getBounds()))
    },
    [scheduleWidth, getBounds]
  )

  const endDrag = useCallback(() => {
    const drag = dragRef.current
    if (!drag) return
    dragRef.current = null
    setIsResizing(false)
    // A click (or each half of a double click) must not pin the default.
    if (drag.moved && pendingWidthRef.current !== null) {
      commit(pendingWidthRef.current)
    }
    pendingWidthRef.current = null
  }, [commit])

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      const current = width ?? panelWidthFrom(event.currentTarget)
      const step = event.shiftKey ? KEY_STEP_LARGE_PX : KEY_STEP_PX
      const bounds = getBounds()
      let next: number | null = null
      switch (event.key) {
        case "ArrowLeft":
          next = current + step
          break
        case "ArrowRight":
          next = current - step
          break
        case "Home":
          next = bounds.min
          break
        case "End":
          next = bounds.max
          break
        default:
          return
      }
      event.preventDefault()
      commit(clampToBounds(next, bounds))
    },
    [width, commit, getBounds]
  )

  const reset = useCallback(() => commit(null), [commit])

  return {
    width,
    isResizing,
    getBounds,
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onLostPointerCapture: endDrag,
      onKeyDown,
      onDoubleClick: reset,
    },
  }
}

export type ResizeHandleEventProps = ReturnType<
  typeof useResizableWidth
>["handleProps"]
