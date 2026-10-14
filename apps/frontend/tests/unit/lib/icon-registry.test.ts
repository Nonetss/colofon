import { describe, expect, test } from "bun:test"
import { appSurfaceList } from "@/lib/app-surfaces"
import { getIcon, iconRef, resolveIconRef } from "@/lib/icon-registry"

describe("icon references", () => {
  test("an IconRef is plain data", () => {
    expect(iconRef("theme", "darkTheme")).toEqual({
      group: "theme",
      key: "darkTheme",
    })
  })

  test("resolves back to the same component getIcon returns", () => {
    expect(resolveIconRef(iconRef("theme", "darkTheme"))).toBe(
      getIcon("theme", "darkTheme")
    )
  })

  test("every surface's icon resolves to a component", () => {
    for (const surface of appSurfaceList) {
      expect(resolveIconRef(surface.icon)).toBeDefined()
    }
  })
})
