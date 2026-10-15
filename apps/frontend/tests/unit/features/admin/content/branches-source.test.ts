import { describe, expect, test } from "bun:test"
import { skipToken } from "@tanstack/react-query"
import {
  branchesSource,
  refOptions,
  suggestedBranch,
} from "@/features/admin/content/model/branches-source"
import type { ContentRepository } from "@/features/admin/content/model/types"

const stored: ContentRepository = {
  id: "00000000-0000-4000-8000-000000000001",
  slug: "documentacion",
  name: "Documentación",
  url: "https://***@git.example/docs.git",
  ref: "main",
  catalogUrl: "https://localhost:4321/api/v1/content/schemas/documentacion",
  lastSyncedAt: null,
  lastCommit: null,
  lastSyncError: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
}

describe("branchesSource", () => {
  test("a closed form reads nothing", () => {
    expect(branchesSource(false, null, "https://git.example/docs.git")).toBe(
      skipToken
    )
  })

  test("a complete http(s) URL is read as typed", () => {
    expect(branchesSource(true, null, "https://git.example/docs.git")).toEqual({
      url: "https://git.example/docs.git",
    })
    expect(branchesSource(true, stored, "http://git.local/docs.git")).toEqual({
      url: "http://git.local/docs.git",
    })
  })

  test("a half-typed or non-http URL reads nothing", () => {
    expect(branchesSource(true, null, "https://")).toBe(skipToken)
    expect(branchesSource(true, null, "git@git.example:docs.git")).toBe(
      skipToken
    )
    expect(branchesSource(true, stored, "file:///srv/docs.git")).toBe(skipToken)
  })

  test("editing with the URL left empty reads the stored repository", () => {
    expect(branchesSource(true, stored, "")).toEqual({ slug: "documentacion" })
  })

  test("creating with the URL empty reads nothing", () => {
    expect(branchesSource(true, null, "")).toBe(skipToken)
  })
})

describe("refOptions", () => {
  test("the branches stay as they are when the current ref is one of them", () => {
    expect(refOptions(["dev", "main"], "main")).toEqual(["dev", "main"])
  })

  test("a current ref that is not a branch goes first", () => {
    expect(refOptions(["dev", "main"], "v1.2")).toEqual(["v1.2", "dev", "main"])
  })

  test("an empty current ref adds nothing", () => {
    expect(refOptions(["main"], "")).toEqual(["main"])
  })
})

describe("suggestedBranch", () => {
  test("prefers the branch HEAD points at", () => {
    expect(
      suggestedBranch({ branches: ["dev", "main"], defaultBranch: "main" })
    ).toBe("main")
  })

  test("falls back to the first branch when HEAD points at none", () => {
    expect(
      suggestedBranch({ branches: ["dev", "main"], defaultBranch: null })
    ).toBe("dev")
  })

  test("suggests nothing without branches", () => {
    expect(suggestedBranch({ branches: [], defaultBranch: null })).toBe(
      undefined
    )
  })
})
