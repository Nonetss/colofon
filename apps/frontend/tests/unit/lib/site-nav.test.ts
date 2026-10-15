import { describe, expect, test } from "bun:test"
import {
  adminSidebarLinks,
  getCurrentSearchHref,
  getSearchableSurfaces,
  siteNavItems,
} from "@/lib/site-nav"

describe("siteNavItems", () => {
  test("lists no section for the navbar: admin is reached from the account menu", () => {
    expect(siteNavItems.map((item) => item.href)).not.toContain("/admin")
  })
})

describe("surface search", () => {
  test("lists no dynamic routes, hidden or admin-only surfaces for users", () => {
    const hrefs = getSearchableSurfaces(false).flatMap((group) =>
      group.items.map((item) => item.href)
    )
    expect(hrefs).toContain("/")
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
