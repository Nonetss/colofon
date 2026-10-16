// The lightbox's zoom: a scale and the offset of the picture, changed so the
// point under the pointer (or the screen's centre) stays still.

export const MIN_SCALE = 1
export const MAX_SCALE = 10

export interface ZoomView {
  scale: number
  x: number
  y: number
}

export interface Point {
  x: number
  y: number
}

export const FITTED: ZoomView = { scale: MIN_SCALE, x: 0, y: 0 }

function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale))
}

/**
 * The view zoomed to `scale` around `point` (screen pixels), given where the
 * picture is drawn now (`origin`, the top-left of its box on screen). At the
 * smallest scale the picture is fitted again.
 */
export function zoomAt(
  view: ZoomView,
  scale: number,
  point: Point,
  origin: Point
): ZoomView {
  const next = clampScale(scale)
  if (next === MIN_SCALE) return FITTED
  const left = origin.x - view.x
  const top = origin.y - view.y
  return {
    scale: next,
    x: point.x - left - ((point.x - origin.x) * next) / view.scale,
    y: point.y - top - ((point.y - origin.y) * next) / view.scale,
  }
}

/** The zoom level as the lightbox shows it ("250%"). */
export function zoomLabel(view: ZoomView): string {
  return `${Math.round(view.scale * 100)}%`
}
