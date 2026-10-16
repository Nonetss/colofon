import {
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import { Hint } from "@/components/shared/feedback/hint"
import { Button } from "@/components/ui/button"
import {
  FITTED,
  MIN_SCALE,
  type Point,
  type ZoomView,
  zoomAt,
  zoomLabel,
} from "@/features/docs/lightbox/model/zoom"
import { getIcon } from "@/lib/icon-registry"

const CloseIcon = getIcon("controls", "close")
const ZoomInIcon = getIcon("views", "zoomIn")
const ZoomOutIcon = getIcon("views", "zoomOut")

/** The pictures of a page that open enlarged (not those inside a link). */
const ZOOMABLE = ".doc img[data-zoomable]:not(a img)"
/** A diagram's drawing opens enlarged too, unless the press is on a node link. */
const DIAGRAM_CANVAS = ".doc .doc-diagram-canvas"
/** Share of the screen an enlarged drawing fits in, and its largest scale. */
const DRAWING_FIT = { width: 0.94, height: 0.86, scale: 2 }
const STEP = 1.5
const DOUBLE_CLICK_SCALE = 2.5
const WHEEL_SPEED = 0.0015
/** Pointer travel (px) under which a press off the picture closes it. */
const CLICK_SLOP = 5

type Picture =
  | { kind: "image"; src: string; alt: string }
  /** A copy of a diagram's SVG, sized to fit the screen. */
  | { kind: "drawing"; svg: SVGSVGElement }

function zoomableOf(target: EventTarget | null): HTMLImageElement | null {
  if (!(target instanceof Element)) return null
  const image = target.closest(ZOOMABLE)
  if (image instanceof HTMLImageElement) return image
  return null
}

/** The diagram drawing a press lands on, unless it is on a node's link. */
function drawingOf(target: EventTarget | null): SVGSVGElement | null {
  if (!(target instanceof Element)) return null
  if (target.closest("a") !== null) return null
  const canvas = target.closest(DIAGRAM_CANVAS)
  if (canvas === null) return null
  const svg = canvas.querySelector("svg")
  if (svg instanceof SVGSVGElement) return svg
  return null
}

/** A copy of `svg` scaled to fit the screen, keeping its proportions. */
function drawingPicture(svg: SVGSVGElement): Picture | null {
  const copy = svg.cloneNode(true)
  if (!(copy instanceof SVGSVGElement)) return null
  const { width, height } = svg.viewBox.baseVal
  if (width === 0 || height === 0) return null
  const fit = Math.min(
    (window.innerWidth * DRAWING_FIT.width) / width,
    (window.innerHeight * DRAWING_FIT.height) / height,
    DRAWING_FIT.scale
  )
  copy.setAttribute("width", String(Math.round(width * fit)))
  copy.setAttribute("height", String(Math.round(height * fit)))
  return { kind: "drawing", svg: copy }
}

/** The source the page loaded (`currentSrc`), or `src` before it loads. */
function sourceOf(image: HTMLImageElement): string {
  if (image.currentSrc !== "") return image.currentSrc
  return image.src
}

function pictureOf(image: HTMLImageElement): Picture {
  return { kind: "image", src: sourceOf(image), alt: image.alt }
}

function zoomableLabel(image: HTMLImageElement): string {
  if (image.alt === "") return "Ampliar imagen"
  return `Ampliar: ${image.alt}`
}

/** Makes the page's pictures focusable buttons that name what they do. */
function markZoomable() {
  for (const image of document.querySelectorAll<HTMLImageElement>(ZOOMABLE)) {
    image.tabIndex = 0
    image.setAttribute("role", "button")
    image.setAttribute("aria-label", zoomableLabel(image))
  }
}

function screenCentre(): Point {
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 }
}

/**
 * The documentation's image viewer, mounted once by `Docs.astro` and kept
 * across navigations. A click (or Enter) on a picture of the page, or a click
 * on a diagram's drawing off its links, opens it enlarged; the wheel, a
 * pinch, a double click or the buttons zoom, dragging moves it, and a click
 * off it, the close button or Esc close it.
 */
export function DocLightbox() {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const pictureRef = useRef<HTMLImageElement>(null)
  const drawingRef = useRef<HTMLDivElement>(null)
  const [picture, setPicture] = useState<Picture | null>(null)
  const [view, setView] = useState<ZoomView>(FITTED)
  const viewRef = useRef(view)
  viewRef.current = view
  const pointers = useRef(new Map<number, Point>())
  const travel = useRef(0)
  const closeOnRelease = useRef(false)
  const [dragging, setDragging] = useState(false)

  const show = useCallback((shown: Picture) => {
    setView(FITTED)
    setPicture(shown)
    dialogRef.current?.showModal()
  }, [])

  const open = useCallback(
    (image: HTMLImageElement) => show(pictureOf(image)),
    [show]
  )

  /** The enlarged picture or drawing on screen, if any. */
  const shownElement = useCallback((): HTMLElement | null => {
    if (pictureRef.current !== null) return pictureRef.current
    return drawingRef.current
  }, [])

  // The drawing is a DOM copy of the page's SVG, put in place once mounted.
  useEffect(() => {
    if (picture?.kind !== "drawing") return
    drawingRef.current?.replaceChildren(picture.svg)
  }, [picture])

  const zoomTo = useCallback(
    (scale: number, point: Point) => {
      const box = shownElement()?.getBoundingClientRect()
      if (box === undefined) return
      setView(
        zoomAt(viewRef.current, scale, point, { x: box.left, y: box.top })
      )
    },
    [shownElement]
  )

  useEffect(() => {
    markZoomable()
    const onClick = (event: globalThis.MouseEvent) => {
      const image = zoomableOf(event.target)
      if (image !== null) {
        open(image)
        return
      }
      const drawing = drawingOf(event.target)
      if (drawing === null) return
      const shown = drawingPicture(drawing)
      if (shown !== null) show(shown)
    }
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return
      const image = zoomableOf(event.target)
      if (image === null) return
      event.preventDefault()
      open(image)
    }
    document.addEventListener("click", onClick)
    document.addEventListener("keydown", onKeyDown)
    document.addEventListener("astro:page-load", markZoomable)
    return () => {
      document.removeEventListener("click", onClick)
      document.removeEventListener("keydown", onKeyDown)
      document.removeEventListener("astro:page-load", markZoomable)
    }
  }, [open, show])

  // React's wheel listener is passive, so it could not stop the page scroll.
  useEffect(() => {
    const stage = stageRef.current
    if (stage === null) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      zoomTo(viewRef.current.scale * Math.exp(-event.deltaY * WHEEL_SPEED), {
        x: event.clientX,
        y: event.clientY,
      })
    }
    stage.addEventListener("wheel", onWheel, { passive: false })
    return () => stage.removeEventListener("wheel", onWheel)
  }, [zoomTo])

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    })
    travel.current = 0
    const onPicture =
      event.target instanceof Node &&
      shownElement()?.contains(event.target) === true
    closeOnRelease.current = pointers.current.size === 1 && !onPicture
    setDragging(true)
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const last = pointers.current.get(event.pointerId)
    if (last === undefined) return
    const now = { x: event.clientX, y: event.clientY }
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      if (a === undefined || b === undefined) return
      const before = Math.hypot(a.x - b.x, a.y - b.y)
      pointers.current.set(event.pointerId, now)
      const [c, d] = [...pointers.current.values()]
      if (c === undefined || d === undefined) return
      const after = Math.hypot(c.x - d.x, c.y - d.y)
      travel.current = Number.POSITIVE_INFINITY
      zoomTo((viewRef.current.scale * after) / before, {
        x: (c.x + d.x) / 2,
        y: (c.y + d.y) / 2,
      })
      return
    }
    pointers.current.set(event.pointerId, now)
    const dx = now.x - last.x
    const dy = now.y - last.y
    travel.current += Math.abs(dx) + Math.abs(dy)
    if (viewRef.current.scale > MIN_SCALE)
      setView({
        ...viewRef.current,
        x: viewRef.current.x + dx,
        y: viewRef.current.y + dy,
      })
  }

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.delete(event.pointerId)) return
    if (pointers.current.size > 0) return
    setDragging(false)
    const isClick = event.type === "pointerup" && travel.current < CLICK_SLOP
    if (closeOnRelease.current && isClick) dialogRef.current?.close()
  }

  const onDoubleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (viewRef.current.scale > MIN_SCALE) {
      setView(FITTED)
      return
    }
    zoomTo(DOUBLE_CLICK_SCALE, { x: event.clientX, y: event.clientY })
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === "+" || event.key === "=")
      zoomTo(viewRef.current.scale * STEP, screenCentre())
    if (event.key === "-") zoomTo(viewRef.current.scale / STEP, screenCentre())
    if (event.key === "0") setView(FITTED)
  }

  const onClose = () => {
    pointers.current.clear()
    setDragging(false)
    setPicture(null)
  }

  const zoomed = view.scale > MIN_SCALE

  return (
    <dialog
      ref={dialogRef}
      className="doc-lightbox"
      aria-label="Imagen ampliada"
      onClose={onClose}
      onKeyDown={onKeyDown}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: drag, pinch and double-click zoom; the keys (+, −, 0, Esc) are the keyboard equivalent, on the dialog */}
      <div
        ref={stageRef}
        className="doc-lightbox-stage"
        data-zoomed={zoomed ? "" : undefined}
        data-dragging={dragging ? "" : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
      >
        {picture?.kind === "image" && (
          <img
            ref={pictureRef}
            src={picture.src}
            alt={picture.alt}
            draggable={false}
            className="doc-lightbox-picture"
            style={{
              transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
            }}
          />
        )}
        {picture?.kind === "drawing" && (
          <div
            ref={drawingRef}
            className="doc doc-lightbox-picture doc-lightbox-drawing"
            style={{
              transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
            }}
          />
        )}
      </div>
      <Hint label="Cerrar (Esc)" side="left">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Cerrar"
          className="fixed top-4 right-4 rounded-full bg-popover text-popover-foreground shadow-lg hover:bg-muted"
          onClick={() => dialogRef.current?.close()}
        >
          <CloseIcon />
        </Button>
      </Hint>
      <div className="-translate-x-1/2 fixed bottom-4 left-1/2 flex items-center gap-1 rounded-full bg-popover p-1 text-popover-foreground shadow-lg">
        <Hint label="Alejar (−)">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Alejar"
            className="rounded-full"
            onClick={() => zoomTo(viewRef.current.scale / STEP, screenCentre())}
          >
            <ZoomOutIcon />
          </Button>
        </Hint>
        <Hint label="Ajustar a la pantalla (0)">
          <Button
            variant="ghost"
            aria-label="Ajustar a la pantalla"
            className="min-w-16 rounded-full font-mono tabular-nums"
            onClick={() => setView(FITTED)}
          >
            {zoomLabel(view)}
          </Button>
        </Hint>
        <Hint label="Acercar (+)">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Acercar"
            className="rounded-full"
            onClick={() => zoomTo(viewRef.current.scale * STEP, screenCentre())}
          >
            <ZoomInIcon />
          </Button>
        </Hint>
      </div>
    </dialog>
  )
}
