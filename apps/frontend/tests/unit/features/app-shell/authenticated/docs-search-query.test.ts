import { describe, expect, test } from "bun:test"
import {
  docSearchEntries,
  docSearchMeta,
} from "@/features/app-shell/authenticated/model/doc-search-entries"
import {
  docsSearchQuery,
  getSearchSourceSurfaces,
  sourceSearchText,
} from "@/features/app-shell/authenticated/model/surface-search-sources"
import { orpc } from "@/lib/orpc"

const options = { enabled: true, search: "dns", scope: "casa" }

describe("docsSearchQuery", () => {
  test("asks for the dialog's scope, or every repository without one", () => {
    expect(docsSearchQuery(options).input).toEqual({
      query: "dns",
      limit: 10,
      repository: "casa",
    })
    expect(
      docsSearchQuery({ ...options, scope: undefined }).input.repository
    ).toBeUndefined()
  })

  test("waits for the dialog and for two characters", () => {
    expect(docsSearchQuery(options).enabled).toBe(true)
    expect(docsSearchQuery({ ...options, enabled: false }).enabled).toBe(false)
    expect(docsSearchQuery({ ...options, search: "d" }).enabled).toBe(false)
  })

  test("the pages and the catalog read the same query", () => {
    const pages = orpc.v1.docs.search.queryOptions({
      ...docsSearchQuery(options),
      select: docSearchEntries,
    })
    const meta = orpc.v1.docs.search.queryOptions({
      ...docsSearchQuery(options),
      select: docSearchMeta,
    })
    expect(meta.queryKey).toEqual(pages.queryKey)
  })
})

describe("sourceSearchText", () => {
  test("the documentation drops its own section word and keeps the rest", () => {
    const target = getSearchSourceSurfaces(false).find(
      (surface) => surface.source === "doc-pages"
    )
    if (target === undefined) throw new Error("no doc-pages source")
    expect(sourceSearchText(target, "documentación dns")).toBe("dns")
  })
})
