import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { cleanup, fireEvent, render } from "@testing-library/react"
import {
  clampToBounds,
  readStoredWidth,
  resizableWidthBounds,
  useResizableWidth,
} from "@/hooks/use-resizable-width"

const STORAGE_KEY = "test-panel:width"
const OPTIONS = { storageKey: STORAGE_KEY, minRem: 20, maxViewportRatio: 0.5 }

function rootFontSize() {
  return Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
}

function Panel() {
  const { width, handleProps } = useResizableWidth(OPTIONS)
  const shownWidth = width === null ? "" : String(width)
  return (
    <div data-testid="panel" data-width={shownWidth}>
      <div data-testid="handle" {...handleProps} />
    </div>
  )
}

function renderPanel() {
  const view = render(<Panel />)
  return {
    handle: view.getByTestId("handle"),
    width: () => view.getByTestId("panel").dataset.width,
  }
}

beforeEach(() => localStorage.clear())
afterEach(() => cleanup())

describe("resizableWidthBounds", () => {
  test("goes from minRem in px to the viewport ratio", () => {
    const bounds = resizableWidthBounds(OPTIONS)
    expect(bounds.min).toBe(20 * rootFontSize())
    expect(bounds.max).toBe(Math.max(bounds.min, window.innerWidth * 0.5))
  })

  test("never lets max fall below min on a narrow viewport", () => {
    const bounds = resizableWidthBounds({ minRem: 20, maxViewportRatio: 0 })
    expect(bounds.max).toBe(bounds.min)
  })
})

describe("clampToBounds", () => {
  test("clamps and rounds into the bounds", () => {
    const bounds = { min: 300, max: 600 }
    expect(clampToBounds(100, bounds)).toBe(300)
    expect(clampToBounds(900, bounds)).toBe(600)
    expect(clampToBounds(420.6, bounds)).toBe(421)
  })
})

describe("readStoredWidth", () => {
  test("returns null when nothing valid is stored", () => {
    expect(readStoredWidth(STORAGE_KEY)).toBeNull()
    localStorage.setItem(STORAGE_KEY, "wide")
    expect(readStoredWidth(STORAGE_KEY)).toBeNull()
    localStorage.setItem(STORAGE_KEY, "-5")
    expect(readStoredWidth(STORAGE_KEY)).toBeNull()
  })

  test("returns a stored positive width", () => {
    localStorage.setItem(STORAGE_KEY, "480")
    expect(readStoredWidth(STORAGE_KEY)).toBe(480)
  })
})

describe("useResizableWidth", () => {
  test("starts on the CSS default without a stored width", () => {
    expect(renderPanel().width()).toBe("")
  })

  test("starts on the stored width", () => {
    localStorage.setItem(STORAGE_KEY, "400")
    expect(renderPanel().width()).toBe("400")
  })

  test("ArrowLeft widens and ArrowRight narrows, Shift taking bigger steps, and stores the result", () => {
    localStorage.setItem(STORAGE_KEY, "400")
    const panel = renderPanel()

    fireEvent.keyDown(panel.handle, { key: "ArrowLeft" })
    expect(panel.width()).toBe("416")
    fireEvent.keyDown(panel.handle, { key: "ArrowRight", shiftKey: true })
    expect(panel.width()).toBe("352")
    expect(localStorage.getItem(STORAGE_KEY)).toBe("352")
  })

  test("Home and End jump to the bounds", () => {
    localStorage.setItem(STORAGE_KEY, "400")
    const panel = renderPanel()
    const bounds = resizableWidthBounds(OPTIONS)

    fireEvent.keyDown(panel.handle, { key: "End" })
    expect(panel.width()).toBe(String(Math.round(bounds.max)))
    fireEvent.keyDown(panel.handle, { key: "Home" })
    expect(panel.width()).toBe(String(Math.round(bounds.min)))
  })

  test("keyboard steps stay inside the bounds", () => {
    const bounds = resizableWidthBounds(OPTIONS)
    localStorage.setItem(STORAGE_KEY, String(Math.round(bounds.min)))
    const panel = renderPanel()

    fireEvent.keyDown(panel.handle, { key: "ArrowRight" })
    expect(panel.width()).toBe(String(Math.round(bounds.min)))
  })

  test("ignores other keys", () => {
    localStorage.setItem(STORAGE_KEY, "400")
    const panel = renderPanel()

    fireEvent.keyDown(panel.handle, { key: "Enter" })
    expect(panel.width()).toBe("400")
  })

  test("double click goes back to the default and forgets the stored width", () => {
    localStorage.setItem(STORAGE_KEY, "400")
    const panel = renderPanel()

    fireEvent.doubleClick(panel.handle)
    expect(panel.width()).toBe("")
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})
