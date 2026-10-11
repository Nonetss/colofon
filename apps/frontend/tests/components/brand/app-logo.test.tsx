import { afterEach, describe, expect, test } from "bun:test"
import { cleanup, render, screen } from "@testing-library/react"
import { AppLogo } from "@/components/shared/brand/app-logo"

afterEach(() => {
  cleanup()
})

describe("AppLogo", () => {
  test("names the mark with its alt text", () => {
    render(<AppLogo alt="Stack" />)
    expect(screen.getByRole("img", { name: "Stack" })).toBeDefined()
  })

  test("hides the mark from assistive tech when alt is empty", () => {
    const { container } = render(<AppLogo alt="" />)
    expect(screen.queryByRole("img")).toBeNull()
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe(
      "true"
    )
  })

  test("sizes the mark and keeps the caller's class", () => {
    const { container } = render(
      <AppLogo alt="Stack" size={24} className="mx-auto" />
    )
    const svg = container.querySelector("svg")
    expect(svg?.getAttribute("width")).toBe("24")
    expect(svg?.getAttribute("height")).toBe("24")
    expect(svg?.getAttribute("class")).toContain("mx-auto")
  })
})
