import { describe, expect, test } from "bun:test"
import {
  lastSyncOf,
  shortCommit,
} from "@/features/admin/content/model/last-sync"
import type { ContentRepository } from "@/features/admin/content/model/types"

const AT = "2026-02-01T10:00:00.000Z"

function repository(
  overrides: Partial<ContentRepository> = {}
): ContentRepository {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    slug: "documentacion",
    name: "Documentación",
    url: "https://git.example/docs.git",
    ref: "main",
    catalogUrl: "https://localhost:4321/api/v1/content/schemas/documentacion",
    lastSyncedAt: null,
    lastCommit: null,
    lastSyncError: null,
    createdAt: AT,
    updatedAt: AT,
    ...overrides,
  }
}

describe("lastSyncOf", () => {
  test("a repository never synced says so", () => {
    expect(lastSyncOf(repository())).toEqual({ state: "never" })
  })

  test("a failed sync carries its error, even with an older commit checked out", () => {
    expect(
      lastSyncOf(
        repository({
          lastSyncedAt: AT,
          lastCommit: "abcdef0123456789",
          lastSyncError: "fatal: rejected",
        })
      )
    ).toEqual({ state: "failed", at: AT, error: "fatal: rejected" })
  })

  test("a successful sync carries its short commit", () => {
    expect(
      lastSyncOf(
        repository({ lastSyncedAt: AT, lastCommit: "abcdef0123456789" })
      )
    ).toEqual({ state: "ok", at: AT, commit: "abcdef0" })
  })
})

describe("shortCommit", () => {
  test("keeps the first seven characters and passes null through", () => {
    expect(shortCommit("abcdef0123456789")).toBe("abcdef0")
    expect(shortCommit(null)).toBe(null)
  })
})
