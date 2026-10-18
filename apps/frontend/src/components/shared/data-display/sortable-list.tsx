import {
  type ComponentProps,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import { Hint } from "@/components/shared/feedback/hint"
import { buttonVariants } from "@/components/ui/button"
import { getIcon } from "@/lib/icon-registry"
import { cn } from "@/lib/utils"

const ReorderIcon = getIcon("actions", "reorder")

const ACTIVATE_PX = 4
const SHIFT_MS = 180

interface DragSession {
  id: string
  originIndex: number
  startY: number
  deltaY: number
  heights: number[]
  ids: string[]
  pointerId: number
  handle: HTMLButtonElement
  reduceMotion: boolean
}

export interface SortableListApi {
  listRef: RefObject<HTMLDivElement | null>
  isDragging: boolean
  activeId: string | null
  itemProps: (id: string) => {
    "data-sortable-id": string
    className?: string
    style?: CSSProperties
  }
  handleProps: (id: string) => {
    disabled: boolean
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void
    onPointerMove: (event: PointerEvent<HTMLButtonElement>) => void
    onPointerUp: (event: PointerEvent<HTMLButtonElement>) => void
    onPointerCancel: (event: PointerEvent<HTMLButtonElement>) => void
  }
}

/**
 * Pointer-based vertical sortable. Native HTML5 drag-and-drop is a poor fit
 * here: `draggable` on the grip ghosts a tiny button, and a React re-render
 * on `dragstart` often cancels the operation before the pointer moves.
 *
 * The grip captures the pointer, the row translates with the cursor, and
 * neighbours shift by their height so the gap travels with the insertion
 * index. `onReorder` fires once, on pointerup, if the order changed.
 */
export function useSortableList<T>({
  items,
  getId,
  disabled = false,
  onReorder,
}: {
  items: readonly T[]
  getId: (item: T) => string
  disabled?: boolean
  onReorder: (ids: string[]) => void
}): SortableListApi {
  const listRef = useRef<HTMLDivElement | null>(null)
  const itemsRef = useRef(items)
  const getIdRef = useRef(getId)
  const onReorderRef = useRef(onReorder)
  const disabledRef = useRef(disabled)
  const pendingRef = useRef<DragSession | null>(null)
  const activeRef = useRef(false)
  const latestYRef = useRef(0)
  const frameRef = useRef<number | null>(null)
  const [drag, setDrag] = useState<DragSession | null>(null)

  itemsRef.current = items
  getIdRef.current = getId
  onReorderRef.current = onReorder
  disabledRef.current = disabled

  const stopFrame = () => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
  }

  const finish = useCallback((commit: boolean) => {
    const session = pendingRef.current
    if (!session) return

    stopFrame()
    if (session.handle.hasPointerCapture(session.pointerId)) {
      session.handle.releasePointerCapture(session.pointerId)
    }

    const overIndex = indexFromDelta(
      session.originIndex,
      session.deltaY,
      session.heights
    )
    const shouldCommit =
      commit && activeRef.current && overIndex !== session.originIndex

    pendingRef.current = null
    activeRef.current = false
    setDrag(null)

    if (!shouldCommit) return
    const next = moveIndex(session.ids, session.originIndex, overIndex)
    if (next) onReorderRef.current(next)
  }, [])

  const applyPointerY = useCallback((clientY: number) => {
    const pending = pendingRef.current
    if (!pending) return

    const deltaY = clientY - pending.startY
    if (!activeRef.current) {
      if (Math.abs(deltaY) < ACTIVATE_PX) return
      activeRef.current = true
    }

    const next = { ...pending, deltaY }
    pendingRef.current = next
    setDrag(next)
  }, [])

  const onPointerDown = useCallback(
    (id: string, event: PointerEvent<HTMLButtonElement>) => {
      if (disabledRef.current || event.button !== 0) return
      const list = listRef.current
      if (!list) return

      const ids = itemsRef.current.map(getIdRef.current)
      const originIndex = ids.indexOf(id)
      if (originIndex < 0 || ids.length < 2) return

      const rows = [...list.querySelectorAll<HTMLElement>("[data-sortable-id]")]
      const heightById = new Map<string, number>()
      for (const row of rows) {
        const rowId = row.dataset.sortableId
        if (rowId) heightById.set(rowId, row.getBoundingClientRect().height)
      }

      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      latestYRef.current = event.clientY
      pendingRef.current = {
        id,
        originIndex,
        startY: event.clientY,
        deltaY: 0,
        heights: ids.map((rowId) => heightById.get(rowId) ?? 0),
        ids,
        pointerId: event.pointerId,
        handle: event.currentTarget,
        reduceMotion: window.matchMedia("(prefers-reduced-motion: reduce)")
          .matches,
      }
    },
    []
  )

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (!pendingRef.current) return
      event.preventDefault()
      latestYRef.current = event.clientY
      if (frameRef.current !== null) return
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null
        applyPointerY(latestYRef.current)
      })
    },
    [applyPointerY]
  )

  const onPointerUp = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      const session = pendingRef.current
      if (!session || event.pointerId !== session.pointerId) return
      applyPointerY(event.clientY)
      finish(true)
    },
    [applyPointerY, finish]
  )

  const onPointerCancel = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      const session = pendingRef.current
      if (!session || event.pointerId !== session.pointerId) return
      finish(false)
    },
    [finish]
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !pendingRef.current) return
      event.preventDefault()
      finish(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [finish])

  const isDragging = drag !== null

  useEffect(() => {
    if (!isDragging) return
    const previousCursor = document.body.style.cursor
    const previousSelect = document.body.style.userSelect
    document.body.style.cursor = "grabbing"
    document.body.style.userSelect = "none"
    return () => {
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousSelect
    }
  }, [isDragging])

  useEffect(() => () => stopFrame(), [])

  const activeId = drag?.id ?? null
  const overIndex = drag
    ? indexFromDelta(drag.originIndex, drag.deltaY, drag.heights)
    : null
  const draggedHeight = drag?.heights[drag.originIndex] ?? 0
  const canDrag = !disabled && items.length > 1

  return {
    listRef,
    isDragging,
    activeId,
    itemProps: (id: string) => {
      const style = itemStyle({
        id,
        drag,
        overIndex,
        draggedHeight,
      })
      return {
        "data-sortable-id": id,
        className:
          id === activeId
            ? "relative z-20 bg-card shadow-md ring-1 ring-foreground/10"
            : undefined,
        style,
      }
    },
    handleProps: (id: string) => ({
      disabled: !canDrag,
      onPointerDown: (event) => onPointerDown(id, event),
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    }),
  }
}

export function SortableItem({
  id,
  list,
  className,
  style,
  children,
  ...rest
}: {
  id: string
  list: SortableListApi
  children: ReactNode
} & ComponentProps<"div">) {
  const item = list.itemProps(id)
  return (
    <div
      {...rest}
      {...item}
      className={cn(className, item.className)}
      style={{ ...style, ...item.style }}
    >
      {children}
    </div>
  )
}

export function SortableHandle({
  label,
  className,
  ...props
}: {
  label: string
} & Omit<ComponentProps<"button">, "type" | "children">) {
  return (
    <Hint label="Arrastra para cambiar la posición">
      <button
        type="button"
        aria-label={label}
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "cursor-grab touch-none text-muted-foreground active:cursor-grabbing",
          className
        )}
        {...props}
      >
        <ReorderIcon className="size-4" />
      </button>
    </Hint>
  )
}

export function moveIndex<T>(
  items: readonly T[],
  from: number,
  to: number
): T[] | null {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= items.length ||
    to >= items.length
  ) {
    return null
  }
  const next = [...items]
  const [moved] = next.splice(from, 1)
  if (moved === undefined) return null
  next.splice(to, 0, moved)
  return next
}

function indexFromDelta(
  originIndex: number,
  deltaY: number,
  heights: number[]
): number {
  const last = heights.length - 1
  if (last < 0) return originIndex

  let index = originIndex
  let remaining = deltaY

  if (remaining > 0) {
    while (index < last) {
      const nextHeight = heights[index + 1]
      if (nextHeight === undefined) break
      if (remaining <= nextHeight / 2) break
      remaining -= nextHeight
      index += 1
    }
  } else if (remaining < 0) {
    while (index > 0) {
      const prevHeight = heights[index - 1]
      if (prevHeight === undefined) break
      if (-remaining <= prevHeight / 2) break
      remaining += prevHeight
      index -= 1
    }
  }

  return index
}

function shiftFor(
  index: number,
  originIndex: number,
  overIndex: number,
  draggedHeight: number
): number {
  if (originIndex < overIndex && index > originIndex && index <= overIndex) {
    return -draggedHeight
  }
  if (originIndex > overIndex && index >= overIndex && index < originIndex) {
    return draggedHeight
  }
  return 0
}

function itemStyle({
  id,
  drag,
  overIndex,
  draggedHeight,
}: {
  id: string
  drag: DragSession | null
  overIndex: number | null
  draggedHeight: number
}): CSSProperties | undefined {
  if (!drag || overIndex === null) return undefined

  const index = drag.ids.indexOf(id)
  if (index < 0) return undefined

  const isActive = id === drag.id
  const y = isActive
    ? drag.deltaY
    : shiftFor(index, drag.originIndex, overIndex, draggedHeight)
  const scale = isActive && !drag.reduceMotion ? 1.015 : 1
  const transition =
    isActive || drag.reduceMotion
      ? "transform 0s"
      : `transform ${SHIFT_MS}ms ease`

  const style: CSSProperties = {
    transform: `translate3d(0, ${y}px, 0) scale(${scale})`,
    transition,
    animation: "none",
  }
  if (!isActive) return style
  return { ...style, zIndex: 20, position: "relative" }
}
