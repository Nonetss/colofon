import { describe, expect, test } from "bun:test"
import {
  adminSidebarLinks,
  currentNavHref,
  getCurrentSearchHref,
  getSearchableSurfaces,
  pageHrefOf,
  profileSidebarLinks,
  sectionSidebarLinks,
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

  test("a result at a section of the current page marks that page", () => {
    const icon = () => null
    const groups = [
      {
        label: "Documentación",
        items: [
          {
            href: "/casa/red/dns#resolución-inversa",
            label: "DNS",
            description: "Nombres",
            icon,
            section: "Documentación",
          },
        ],
      },
    ]
    const current = getCurrentSearchHref("/casa/red/dns", groups)
    expect(current).toBe("/casa/red/dns")
  })
})

describe("pageHrefOf", () => {
  test("drops the fragment and keeps an href without one", () => {
    expect(pageHrefOf("/casa/red/dns#zonas")).toBe("/casa/red/dns")
    expect(pageHrefOf("/casa/red/dns")).toBe("/casa/red/dns")
  })
})

describe("sectionSidebarLinks", () => {
  test("starts with the section's own page under the given label", () => {
    const [overview] = sectionSidebarLinks("profile", "Cuenta")
    expect(overview?.href).toBe("/me")
    expect(overview?.label).toBe("Cuenta")
  })

  test("follows with the section's children in registry order", () => {
    expect(profileSidebarLinks.map((link) => link.href)).toEqual([
      "/me",
      "/me/api-keys",
      "/me/secrets",
      "/me/repositories",
      "/me/organizations",
      "/me/skills",
    ])
  })

  test("the admin rows open on Resumen followed by its children", () => {
    expect(adminSidebarLinks[0]?.href).toBe("/admin")
    expect(adminSidebarLinks[0]?.label).toBe("Resumen")
    expect(adminSidebarLinks.map((link) => link.href)).toContain("/admin/users")
  })
})

describe("currentNavHref", () => {
  const hrefs = profileSidebarLinks.map((link) => link.href)

  test("marks the sub-page, not the section it is under", () => {
    expect(currentNavHref("/me/secrets", hrefs)).toBe("/me/secrets")
  })

  test("marks the section's own page at its path", () => {
    expect(currentNavHref("/me", hrefs)).toBe("/me")
  })

  test("marks a row for a route nested under it", () => {
    const adminHrefs = adminSidebarLinks.map((link) => link.href)
    expect(currentNavHref("/admin/git/manual", adminHrefs)).toBe("/admin/git")
  })

  test("marks nothing outside the section", () => {
    expect(currentNavHref("/casa/red", hrefs)).toBeUndefined()
  })
})
