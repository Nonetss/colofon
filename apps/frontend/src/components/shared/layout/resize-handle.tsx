import { getIcon } from "@/lib/icon-registry"

const GripVertical = getIcon("controls", "grip")

import { useEffect, useRef, useState } from "react"
import type {
  ResizeHandleEventProps,
  WidthBounds,
} from "@/hooks/use-resizable-width"
import { cn } from "@/lib/utils"

interface ResizeHandleProps extends ResizeHandleEventProps {
  isResizing: boolean
  /** Accessible name, e.g. `"Redimensionar asistente"`. */
  label: string
  /** Current pixel bounds, from `useResizableWidth().getBounds`. */
  getBounds: () => WidthBounds
}

/**
 * Drag strip on a right-docked panel's left edge, driven by
 * `useResizableWidth`. Must be a direct child of the panel (which needs a
 * positioning context): the hook measures its parent. Double click restores
 * the default width; arrows (Shift for bigger steps) and Home/End resize
 * from the keyboard.
 */
export function ResizeHandle({
  isResizing,
  label,
  getBounds,
  ...handleProps
}: ResizeHandleProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [aria, setAria] = useState({ now: 0, min: 0, max: 0 })

  // A separator must report its value; read the rendered width so it is
  // right whether the CSS default or a stored width is in effect.
  useEffect(() => {
    const panel = ref.current?.parentElement
    if (!panel) return
    const update = () => {
      const { min, max } = getBounds()
      setAria({
        now: Math.round(panel.getBoundingClientRect().width),
        min: Math.round(min),
        max: Math.round(max),
      })
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(panel)
    return () => observer.disconnect()
  }, [getBounds])

  return (
    // biome-ignore lint/a11y/useSemanticElements: <hr> cannot be a focusable, draggable separator.
    <div
      ref={ref}
      role="separator"
      tabIndex={0}
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={aria.now}
      aria-valuemin={aria.min}
      aria-valuemax={aria.max}
      data-resizing={isResizing ? "" : undefined}
      className={cn(
        // Centered on the panel's left border; the highlight line sits on it.
        "group absolute inset-y-0 -left-1.5 z-10 flex w-3 cursor-col-resize touch-none items-center justify-center outline-none",
        "after:absolute after:inset-y-0 after:left-1/2 after:w-0.5 after:-translate-x-1/2 after:bg-transparent after:transition-colors",
        "hover:after:bg-primary/60 focus-visible:after:bg-primary data-resizing:after:bg-primary"
      )}
      {...handleProps}
    >
      {/* Visible grab target; the whole strip stays draggable. */}
      <span className="relative z-10 flex h-8 w-4 items-center justify-center rounded-sm border bg-background text-muted-foreground shadow-xs transition-colors group-hover:border-primary/60 group-hover:text-foreground group-focus-visible:border-primary group-data-resizing:border-primary group-data-resizing:text-foreground">
        <GripVertical className="size-3.5" />
      </span>
    </div>
  )
}
