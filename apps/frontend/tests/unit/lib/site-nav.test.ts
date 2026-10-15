import { describe, expect, test } from "bun:test"
import {
  adminSidebarLinks,
  getCurrentSearchHref,
  getSearchableSurfaces,
  getSidebarSection,
  getSiteNavItemByHref,
  getSiteNavItems,
  isNavItemCurrent,
  isNavSubItemCurrent,
} from "@/lib/site-nav"

function requireNavItem(href: string) {
  const item = getSiteNavItemByHref(href)
  if (!item) throw new Error(`missing nav item ${href}`)
  return item
}

describe("current navigation item", () => {
  test("a leaf section stays current on nested pages", () => {
    expect(isNavItemCurrent(requireNavItem("/crons"), "/crons/abc")).toBe(true)
  })

  test("a parent yields to its more specific child", () => {
    const admin = requireNavItem("/admin")
    expect(isNavItemCurrent(admin, "/admin/users")).toBe(false)
    expect(isNavSubItemCurrent("/admin/users", "/admin/users", admin)).toBe(
      true
    )
    expect(isNavItemCurrent(admin, "/admin")).toBe(true)
  })
})

describe("getSiteNavItems", () => {
  test("filters admin-only sections by role", () => {
    const userHrefs = getSiteNavItems(false).map((item) => item.href)
    const adminHrefs = getSiteNavItems(true).map((item) => item.href)
    expect(userHrefs).not.toContain("/admin")
    expect(adminHrefs).toContain("/admin")
  })
})

describe("getSidebarSection", () => {
  test("returns the section hub with sub-items for a nested route", () => {
    expect(getSidebarSection("/admin/users")).toBe("/admin")
  })

  test("is undefined outside a section with sub-items", () => {
    expect(getSidebarSection("/crons")).toBeUndefined()
  })
})

describe("surface search", () => {
  test("lists no dynamic routes, hidden or admin-only surfaces for users", () => {
    const hrefs = getSearchableSurfaces(false).flatMap((group) =>
      group.items.map((item) => item.href)
    )
    expect(hrefs).toContain("/crons")
    expect(hrefs.some((href) => href.includes("["))).toBe(false)
    expect(hrefs).not.toContain("/login")
    expect(hrefs.some((href) => href.startsWith("/admin"))).toBe(false)
  })

  test("groups a section's children under it with their trail", () => {
    const groups = getSearchableSurfaces(true)
    const admin = groups.find((group) => group.label === "Admin")
    const users = admin?.items.find((item) => item.href === "/admin/users")
    expect(users?.trail).toEqual(["Admin"])
    expect(groups[0]?.label).toBe("General")
  })

  test("marks the most specific href as current", () => {
    const groups = getSearchableSurfaces(true)
    expect(getCurrentSearchHref("/admin/users", groups)).toBe("/admin/users")
  })
})

describe("adminSidebarLinks", () => {
  test("starts with the section overview followed by its children", () => {
    expect(adminSidebarLinks[0]?.href).toBe("/admin")
    expect(adminSidebarLinks.length).toBeGreaterThan(1)
  })
})
