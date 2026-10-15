import { describe, expect, test } from "bun:test"
import {
  appSurfaceList,
  getAppSurface,
  getAppSurfaceByPath,
  getChildSurfaces,
  getNavigableSurfaces,
  isSurfacePathActive,
} from "@/lib/app-surfaces"

describe("surface registry", () => {
  test("every surface has a unique id and path", () => {
    const ids = appSurfaceList.map((surface) => surface.id)
    const paths = appSurfaceList.map((surface) => surface.path)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(paths).size).toBe(paths.length)
  })

  test("children are flattened with their parent id", () => {
    expect(getAppSurface("admin-users").parentId).toBe("admin")
    expect(getChildSurfaces("admin").map((surface) => surface.id)).toContain(
      "admin-users"
    )
  })

  test("detail surfaces list their records through a search source", () => {
    expect(getAppSurface("doc-page").searchSource).toBe("doc-pages")
  })

  test("looks a surface up by its exact path", () => {
    expect(getAppSurfaceByPath("/admin/users")?.id).toBe("admin-users")
    expect(getAppSurfaceByPath("/admin/users/123")).toBeUndefined()
  })
})

describe("getNavigableSurfaces", () => {
  test("hides admin-only surfaces from non-admins", () => {
    const surfaces = getNavigableSurfaces(false)
    expect(surfaces.some((surface) => surface.adminOnly)).toBe(false)
    expect(surfaces.every((surface) => surface.nav)).toBe(true)
  })

  test("admin is not a navigation section: it is reached from the account menu", () => {
    const ids = getNavigableSurfaces(true).map((surface) => surface.id)
    expect(ids).not.toContain("admin")
  })
})

describe("isSurfacePathActive", () => {
  test("matches the path itself and nested routes", () => {
    expect(isSurfacePathActive("/admin", "/admin")).toBe(true)
    expect(isSurfacePathActive("/admin", "/admin/users")).toBe(true)
  })

  test("doesn't match a sibling that only shares a prefix", () => {
    expect(isSurfacePathActive("/admin", "/administration")).toBe(false)
  })

  test("the root only matches itself", () => {
    expect(isSurfacePathActive("/", "/")).toBe(true)
    expect(isSurfacePathActive("/", "/casa")).toBe(false)
  })
})
