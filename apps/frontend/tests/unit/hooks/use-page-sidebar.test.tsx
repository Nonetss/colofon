import { afterEach, describe, expect, test } from "bun:test"
import { act, cleanup, renderHook } from "@testing-library/react"
import { usePageSidebarId } from "@/hooks/use-page-sidebar"
import { PAGE_SIDEBAR_ATTRIBUTE } from "@/lib/page-sidebar"

afterEach(() => {
  cleanup()
  document.body.removeAttribute(PAGE_SIDEBAR_ATTRIBUTE)
})

describe("usePageSidebarId", () => {
  test("returns the id the layout marked", () => {
    document.body.setAttribute(PAGE_SIDEBAR_ATTRIBUTE, "docs-sidebar")
    const { result } = renderHook(() => usePageSidebarId())
    expect(result.current).toBe("docs-sidebar")
  })

  test("follows the mark after a client-side navigation", () => {
    const { result } = renderHook(() => usePageSidebarId())
    expect(result.current).toBeNull()
    act(() => {
      document.body.setAttribute(PAGE_SIDEBAR_ATTRIBUTE, "section-sidebar")
      document.dispatchEvent(new Event("astro:after-swap"))
    })
    expect(result.current).toBe("section-sidebar")
  })
})
