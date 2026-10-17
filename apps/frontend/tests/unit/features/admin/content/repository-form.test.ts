import { describe, expect, test } from "bun:test"
import {
  createInput,
  initialSource,
  type RepositoryFormValues,
  updateInput,
  urlRequired,
} from "@/features/admin/content/model/repository-form"
import type { ContentRepository } from "@/features/admin/content/model/types"

const AT = "2026-02-01T10:00:00.000Z"

const external: ContentRepository = {
  id: "00000000-0000-4000-8000-000000000001",
  slug: "documentacion",
  name: "Documentación",
  url: "https://***@git.example/docs.git",
  hosted: false,
  pushUrl: null,
  ref: "main",
  path: "",
  catalogUrl: "https://localhost:4321/api/v1/content/schemas/documentacion",
  lastSyncedAt: null,
  lastCommit: null,
  lastSyncError: null,
  createdAt: AT,
  updatedAt: AT,
}

const hosted: ContentRepository = {
  ...external,
  slug: "manual",
  name: "Manual",
  url: "/git/manual.git",
  hosted: true,
  pushUrl: "https://localhost:4321/git/manual.git",
}

function values(
  overrides: Partial<RepositoryFormValues> = {}
): RepositoryFormValues {
  return {
    source: "url",
    name: "Manual",
    url: "",
    ref: "main",
    path: "",
    ...overrides,
  }
}

describe("initialSource", () => {
  test("a new repository and an external one start on a URL, a hosted one hosted", () => {
    expect(initialSource(null)).toBe("url")
    expect(initialSource(external)).toBe("url")
    expect(initialSource(hosted)).toBe("hosted")
  })
})

describe("urlRequired", () => {
  test("a URL is required to create from a URL or to move a hosted repository to one", () => {
    expect(urlRequired(null, "url")).toBe(true)
    expect(urlRequired(hosted, "url")).toBe(true)
  })

  test("an external repository's edit keeps its URL when left empty, and hosted needs none", () => {
    expect(urlRequired(external, "url")).toBe(false)
    expect(urlRequired(null, "hosted")).toBe(false)
    expect(urlRequired(external, "hosted")).toBe(false)
  })
})

describe("createInput", () => {
  test("a URL source sends the URL", () => {
    expect(
      createInput(
        "documentacion",
        values({ url: "https://git.example/docs.git" })
      )
    ).toEqual({
      slug: "documentacion",
      name: "Manual",
      ref: "main",
      path: "",
      url: "https://git.example/docs.git",
    })
  })

  test("the content folder travels with the create", () => {
    expect(
      createInput(
        "documentacion",
        values({ url: "https://git.example/docs.git", path: "docs" })
      )
    ).toMatchObject({ path: "docs" })
  })

  test("a hosted source sends hosted and never the URL typed before", () => {
    expect(
      createInput(
        "manual",
        values({ source: "hosted", url: "https://git.example/docs.git" })
      )
    ).toEqual({
      slug: "manual",
      name: "Manual",
      ref: "main",
      path: "",
      hosted: true,
    })
  })
})

describe("updateInput", () => {
  test("only the changed fields travel, and an empty URL keeps the stored one", () => {
    expect(
      updateInput(external, values({ name: "Docs", ref: "produccion" }))
    ).toEqual({ slug: "documentacion", name: "Docs", ref: "produccion" })
  })

  test("a changed content folder travels alone, and emptying it goes back to the root", () => {
    expect(
      updateInput(external, values({ name: "Documentación", path: "docs" }))
    ).toEqual({
      slug: "documentacion",
      path: "docs",
    })
    const inDocs = { ...external, path: "docs" }
    expect(updateInput(inDocs, values({ name: "Documentación" }))).toEqual({
      slug: "documentacion",
      path: "",
    })
  })

  test("making an external repository hosted sends hosted", () => {
    expect(
      updateInput(external, values({ name: "Documentación", source: "hosted" }))
    ).toEqual({ slug: "documentacion", hosted: true })
  })

  test("a hosted repository that stays hosted sends no source change", () => {
    expect(updateInput(hosted, values({ source: "hosted" }))).toEqual({
      slug: "manual",
    })
  })

  test("moving a hosted repository to a URL sends the URL", () => {
    expect(
      updateInput(hosted, values({ url: "https://git.example/manual.git" }))
    ).toEqual({ slug: "manual", url: "https://git.example/manual.git" })
  })
})
