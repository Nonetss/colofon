import { describe, expect, test } from "bun:test"
import {
  recordableDocPath,
  resolveRecentDocPages,
} from "@/features/app-shell/authenticated/model/recent-doc-pages"
import type { DocsNav } from "@/features/docs/shared"

const entry = (href: string, title: string) => ({
  path: href.split("/").slice(2).join("/"),
  href,
  title,
  description: "",
  icon: null,
})

const repositories: DocsNav["repositories"] = [
  {
    slug: "casa",
    name: "Casa",
    title: "Casa",
    description: null,
    available: true,
    sharedBy: null,
    home: entry("/casa", "Inicio"),
    nodes: [
      {
        kind: "group",
        title: "Infraestructura",
        description: "",
        icon: null,
        children: [
          {
            kind: "section",
            ...entry("/casa/red", "Red"),
            children: [
              { kind: "page", ...entry("/casa/red/dns", "DNS") },
              { kind: "page", ...entry("/casa/red/vlan", "VLAN") },
            ],
          },
        ],
      },
    ],
  },
]

describe("recordableDocPath", () => {
  test("pages, homes and catalog type pages are recorded as routes", () => {
    expect(recordableDocPath("/casa")).toBe("/casa")
    expect(recordableDocPath("/casa/red/dns")).toBe("/casa/red/dns")
    expect(recordableDocPath("/casa/catalog/maquinas")).toBe(
      "/casa/catalog/maquinas"
    )
    expect(recordableDocPath("/casa/red/dns/")).toBe("/casa/red/dns")
    expect(recordableDocPath("/casa/configuraci%C3%B3n")).toBe(
      "/casa/configuración"
    )
  })

  test("entity pages and application screens are not", () => {
    for (const path of [
      "/casa/catalog/maquinas/nas",
      "/",
      "/me",
      "/me/api-keys",
      "/admin/users",
      "/login",
    ])
      expect(recordableDocPath(path)).toBeNull()
  })
})

describe("resolveRecentDocPages", () => {
  test("resolves pages with their repository and sections, in order", () => {
    expect(
      resolveRecentDocPages(
        ["/casa/red/vlan", "/casa/red/dns", "/casa"],
        repositories,
        "/colofon/frontend"
      )
    ).toEqual([
      {
        href: "/casa/red/vlan",
        label: "VLAN",
        trail: ["Casa", "Infraestructura", "Red"],
      },
      {
        href: "/casa/red/dns",
        label: "DNS",
        trail: ["Casa", "Infraestructura", "Red"],
      },
      { href: "/casa", label: "Inicio", trail: ["Casa"] },
    ])
  })

  test("drops the current page, removed pages and unlisted repositories", () => {
    expect(
      resolveRecentDocPages(
        ["/casa/red/dns", "/casa/red/vpn", "/trabajo/correo", "/casa/red"],
        repositories,
        "/casa/red/dns#zonas"
      ).map((page) => page.href)
    ).toEqual(["/casa/red"])
  })
})
