import { afterEach, describe, expect, test } from "bun:test"
import { cleanup, render } from "@testing-library/react"
import { JsonView } from "@/components/shared/data-display/json-view"

afterEach(() => {
  cleanup()
})

describe("JsonView", () => {
  test("renders nothing for undefined", () => {
    const { container } = render(<JsonView value={undefined} />)

    expect(container.firstChild).toBeNull()
  })

  test("prints the value as 2-space indented JSON", () => {
    const { container } = render(<JsonView value={{ a: 1 }} />)

    expect(container.querySelector("pre")?.textContent).toBe(
      JSON.stringify({ a: 1 }, null, 2)
    )
  })

  test("falls back to the string when the value isn't serializable", () => {
    const { container } = render(<JsonView value={10n} />)

    expect(container.querySelector("pre")?.textContent).toBe("10")
  })

  test("boxed is the default and carries a border", () => {
    const { container } = render(<JsonView value={{}} />)
    const pre = container.querySelector("pre")

    expect(pre?.className).toContain("border")
    expect(pre?.className).toContain("rounded-lg")
  })

  test("flush drops the border and scrolls sideways only", () => {
    const { container } = render(<JsonView value={{}} variant="flush" />)
    const classes = container.querySelector("pre")?.className.split(" ") ?? []

    expect(classes).toContain("overflow-x-auto")
    expect(classes).not.toContain("border")
    expect(classes).not.toContain("overflow-auto")
  })

  test("keeps the caller's className and id", () => {
    const { container } = render(
      <JsonView value={{}} id="raw" className="max-h-40" />
    )
    const pre = container.querySelector("pre")

    expect(pre?.id).toBe("raw")
    expect(pre?.className).toContain("max-h-40")
  })
})
