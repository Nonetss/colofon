import { describe, expect, test } from "bun:test"
import { skipToken } from "@tanstack/react-query"
import { branchesSource } from "@/features/admin/content/model/branches-source"
import type { ContentRepository } from "@/features/admin/content/model/types"

const stored: ContentRepository = {
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
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
}

describe("branchesSource", () => {
  test("a closed form reads nothing", () => {
    expect(
      branchesSource(false, null, "url", "https://git.example/docs.git")
    ).toBe(skipToken)
  })

  test("a complete http(s) URL is read as typed", () => {
    expect(
      branchesSource(true, null, "url", "https://git.example/docs.git")
    ).toEqual({
      url: "https://git.example/docs.git",
    })
    expect(
      branchesSource(true, stored, "url", "http://git.local/docs.git")
    ).toEqual({
      url: "http://git.local/docs.git",
    })
  })

  test("a half-typed or non-http URL reads nothing", () => {
    expect(branchesSource(true, null, "url", "https://")).toBe(skipToken)
    expect(branchesSource(true, null, "url", "git@git.example:docs.git")).toBe(
      skipToken
    )
    expect(branchesSource(true, stored, "url", "file:///srv/docs.git")).toBe(
      skipToken
    )
  })

  test("editing with the URL left empty reads the stored repository", () => {
    expect(branchesSource(true, stored, "url", "")).toEqual({
      slug: "documentacion",
    })
  })

  test("creating with the URL empty reads nothing", () => {
    expect(branchesSource(true, null, "url", "")).toBe(skipToken)
  })
})

describe("branchesSource for a hosted repository", () => {
  const hosted: ContentRepository = {
    ...stored,
    slug: "manual",
    url: "/git/manual.git",
    hosted: true,
    pushUrl: "https://localhost:4321/git/manual.git",
  }

  test("a new hosted repository has no branches to read", () => {
    expect(branchesSource(true, null, "hosted", "")).toBe(skipToken)
    expect(
      branchesSource(true, null, "hosted", "https://git.example/docs.git")
    ).toBe(skipToken)
  })

  test("editing a hosted repository reads its own branches", () => {
    expect(branchesSource(true, hosted, "hosted", "")).toEqual({
      slug: "manual",
    })
  })

  test("making an external repository hosted reads nothing", () => {
    expect(branchesSource(true, stored, "hosted", "")).toBe(skipToken)
  })

  test("moving a hosted repository to a URL reads the URL, never the hosted branches", () => {
    expect(branchesSource(true, hosted, "url", "")).toBe(skipToken)
    expect(
      branchesSource(true, hosted, "url", "https://git.example/docs.git")
    ).toEqual({ url: "https://git.example/docs.git" })
  })
})
