import { afterEach, describe, expect, test } from "bun:test"
import { act, cleanup, renderHook } from "@testing-library/react"
import { useDocumentBody } from "@/hooks/use-document-body"

// The other suites' `screen` queries the original body: put it back.
const original = document.body

afterEach(() => {
  cleanup()
  if (document.body !== original) document.body.replaceWith(original)
})

/** Replaces `<body>` the way the router does, then announces the swap. */
function swapBody() {
  const next = document.createElement("body")
  document.body.replaceWith(next)
  document.dispatchEvent(new Event("astro:after-swap"))
  return next
}

describe("useDocumentBody", () => {
  test("returns the current body", () => {
    const { result } = renderHook(() => useDocumentBody())
    expect(result.current).toBe(document.body)
  })

  test("follows the body the router swaps in", () => {
    const { result } = renderHook(() => useDocumentBody())
    const before = result.current
    let next: HTMLElement | undefined
    act(() => {
      next = swapBody()
    })
    expect(result.current).toBe(next)
    expect(result.current).not.toBe(before)
  })
})
