import { describe, expect, test } from "bun:test"
import { normalizeOrigin, originAllowed } from "#v1/secret/origins"

describe("normalizeOrigin", () => {
  test("lowercases and drops the default port and trailing slash", () => {
    expect(normalizeOrigin("HTTPS://Pangolin.Example.com:443/")).toBe(
      "https://pangolin.example.com"
    )
    expect(normalizeOrigin("http://komodo.casa.lan:80")).toBe(
      "http://komodo.casa.lan"
    )
  })

  test("keeps a non-default port, private addresses and wildcards", () => {
    expect(normalizeOrigin("http://10.0.0.5:3003")).toBe("http://10.0.0.5:3003")
    expect(normalizeOrigin("https://*.example.com")).toBe(
      "https://*.example.com"
    )
  })

  test.each([
    "https://komodo.casa.lan/api",
    "https://komodo.casa.lan?x=1",
    "https://komodo.casa.lan/#top",
    "https://user:pass@komodo.casa.lan",
    "ftp://komodo.casa.lan",
    "komodo.casa.lan",
    "https://a.*.example.com",
    "https://*.",
    "",
  ])("rejects %p", (input) => {
    expect(normalizeOrigin(input)).toBeNull()
  })
})

describe("originAllowed", () => {
  test("allows an equal origin and nothing else without a wildcard", () => {
    expect(
      originAllowed("https://komodo.casa.lan", "https://komodo.casa.lan")
    ).toBe(true)
    expect(
      originAllowed("https://evil.example", "https://komodo.casa.lan")
    ).toBe(false)
    expect(
      originAllowed("http://komodo.casa.lan", "https://komodo.casa.lan")
    ).toBe(false)
    expect(
      originAllowed("https://komodo.casa.lan:8443", "https://komodo.casa.lan")
    ).toBe(false)
  })

  test("a wildcard covers subdomains, not the bare host", () => {
    const allowed = "https://*.example.com"

    expect(originAllowed("https://api.example.com", allowed)).toBe(true)
    expect(originAllowed("https://a.b.example.com", allowed)).toBe(true)
    expect(originAllowed("https://example.com", allowed)).toBe(false)
    expect(originAllowed("https://evilexample.com", allowed)).toBe(false)
  })

  test("a wildcard keeps its scheme and port", () => {
    const allowed = "https://*.example.com:8443"

    expect(originAllowed("https://api.example.com:8443", allowed)).toBe(true)
    expect(originAllowed("https://api.example.com", allowed)).toBe(false)
    expect(originAllowed("http://api.example.com:8443", allowed)).toBe(false)
  })
})
