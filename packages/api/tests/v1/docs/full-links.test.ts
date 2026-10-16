import { describe, expect, test } from "bun:test"
import { withOrigin } from "#v1/docs/full-links"

const origin = "https://docs.example.org"

describe("withOrigin", () => {
  test("links and images to reader routes become full addresses", () => {
    expect(
      withOrigin("[VPN](/casa/red/vpn) y ![Mapa](/rpc/x.png)", origin)
    ).toBe(
      "[VPN](https://docs.example.org/casa/red/vpn) y ![Mapa](https://docs.example.org/rpc/x.png)"
    )
  })

  test("external links and anchors are left as they are", () => {
    const markdown = "[Web](https://example.com/a) y [Zonas](#zonas)"
    expect(withOrigin(markdown, origin)).toBe(markdown)
  })
})
