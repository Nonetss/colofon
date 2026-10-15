import { afterEach, describe, expect, test } from "bun:test"
import { cleanup, render } from "@testing-library/react"
import { HighlightedTokens } from "@/components/shared/data-display/highlighted-tokens"

afterEach(() => {
  cleanup()
})

describe("HighlightedTokens", () => {
  test("wraps classed tokens in their th-* span and keeps the rest as text", () => {
    const { container } = render(
      <pre>
        <HighlightedTokens
          tokens={[
            { className: "keyword", value: "const" },
            { value: " a = " },
            { className: "number", value: "1" },
          ]}
        />
      </pre>
    )
    const spans = container.querySelectorAll("span")

    expect(container.textContent).toBe("const a = 1")
    expect(spans).toHaveLength(2)
    expect(spans[0]?.className).toBe("th-token th-keyword")
    expect(spans[1]?.className).toBe("th-token th-number")
  })

  test("renders markup in the source as text, never as HTML", () => {
    const { container } = render(
      <pre>
        <HighlightedTokens
          tokens={[{ className: "string", value: "<img src=x>" }]}
        />
      </pre>
    )

    expect(container.querySelector("img")).toBeNull()
    expect(container.textContent).toBe("<img src=x>")
  })
})
