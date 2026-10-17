import { afterEach, describe, expect, test } from "bun:test"
import {
  PAGE_SIDEBAR_ATTRIBUTE,
  PAGE_SIDEBAR_TOGGLE_EVENT,
  pageSidebarId,
  togglePageSidebar,
} from "@/lib/page-sidebar"

afterEach(() => {
  document.body.removeAttribute(PAGE_SIDEBAR_ATTRIBUTE)
})

describe("pageSidebarId", () => {
  test("reads the sidebar's id from the body", () => {
    document.body.setAttribute(PAGE_SIDEBAR_ATTRIBUTE, "section-sidebar")
    expect(pageSidebarId()).toBe("section-sidebar")
  })

  test("is null on a page without a sidebar", () => {
    expect(pageSidebarId()).toBeNull()
  })

  test("is null when the mark carries no id", () => {
    document.body.setAttribute(PAGE_SIDEBAR_ATTRIBUTE, "")
    expect(pageSidebarId()).toBeNull()
  })
})

describe("togglePageSidebar", () => {
  test("dispatches the toggle event on the window", () => {
    let calls = 0
    const onToggle = () => {
      calls += 1
    }
    window.addEventListener(PAGE_SIDEBAR_TOGGLE_EVENT, onToggle)
    togglePageSidebar()
    window.removeEventListener(PAGE_SIDEBAR_TOGGLE_EVENT, onToggle)
    expect(calls).toBe(1)
  })
})
