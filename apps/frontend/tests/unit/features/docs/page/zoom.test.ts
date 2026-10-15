import { describe, expect, test } from "bun:test"
import {
  FITTED,
  MAX_SCALE,
  zoomAt,
  zoomLabel,
} from "@/features/docs/page/model/zoom"

describe("zoomAt", () => {
  test("the point under the pointer stays still", () => {
    const origin = { x: 100, y: 50 }
    const point = { x: 300, y: 250 }
    const view = zoomAt(FITTED, 2, point, origin)
    // The picture's pixel under `point` before, drawn after the zoom.
    const pixel = { x: point.x - origin.x, y: point.y - origin.y }
    expect(origin.x + view.x + pixel.x * view.scale).toBe(point.x)
    expect(origin.y + view.y + pixel.y * view.scale).toBe(point.y)
  })

  test("never zooms past the largest scale", () => {
    const view = zoomAt(FITTED, 50, { x: 0, y: 0 }, { x: 0, y: 0 })
    expect(view.scale).toBe(MAX_SCALE)
  })

  test("zooming out to the smallest scale fits the picture again", () => {
    const zoomed = { scale: 3, x: -120, y: 40 }
    expect(zoomAt(zoomed, 0.5, { x: 10, y: 10 }, { x: 0, y: 0 })).toEqual(
      FITTED
    )
  })
})

describe("zoomLabel", () => {
  test("shows the scale as a rounded percentage", () => {
    expect(zoomLabel({ scale: 2.456, x: 0, y: 0 })).toBe("246%")
  })
})
