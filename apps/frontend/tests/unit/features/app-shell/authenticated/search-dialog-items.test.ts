import { describe, expect, test } from "bun:test"
import type { DocsSearchEntity } from "@/features/app-shell/authenticated/model/doc-search-entries"
import {
  entityDescription,
  entityKeywords,
  searchItemKeywords,
} from "@/features/app-shell/authenticated/model/search-dialog-items"
import type { SiteNavSearchItem } from "@/lib/site-nav"

const entity: DocsSearchEntity = {
  repository: { slug: "casa", name: "Casa" },
  type: { id: "maquinas", plural: "Máquinas" },
  id: "nas",
  label: "NAS",
  href: "/casa/catalog/maquinas/nas",
  exact: false,
}

describe("searchItemKeywords", () => {
  test("joins the label, description, section, trail and keywords", () => {
    const item: SiteNavSearchItem = {
      href: "/casa/red/dns",
      label: "DNS",
      description: "Nombres",
      icon: () => null,
      section: "Documentación",
      trail: ["Red"],
      keywords: ["inversa"],
    }
    expect(searchItemKeywords(item)).toEqual([
      "DNS",
      "Nombres",
      "Documentación",
      "Red",
      "inversa",
    ])
  })
})

describe("entityDescription", () => {
  test("shows the type, and the repository when several are searched", () => {
    expect(entityDescription(entity, false)).toBe("Máquinas")
    expect(entityDescription(entity, true)).toBe("Máquinas · Casa")
  })
})

describe("entityKeywords", () => {
  test("keeps the searched words so a field match is not filtered out", () => {
    expect(entityKeywords(entity, ["192", "168"])).toEqual([
      "NAS",
      "nas",
      "Máquinas",
      "Casa",
      "192",
      "168",
    ])
  })
})
