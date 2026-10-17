import { describe, expect, test } from "bun:test"
import { skipToken } from "@tanstack/react-query"
import {
  createInput,
  ownBranchesSource,
  remainingOf,
  updateInput,
} from "@/features/profile/repositories/model/repository-form"
import type { OwnRepository } from "@/features/profile/repositories/model/types"

const AT = "2026-02-01T10:00:00.000Z"

const stored: OwnRepository = {
  id: "00000000-0000-4000-8000-000000000001",
  slug: "apuntes",
  name: "Apuntes",
  url: "https://***@github.com/ana/apuntes.git",
  ref: "main",
  lastSyncedAt: null,
  lastCommit: null,
  lastSyncError: null,
  createdAt: AT,
  updatedAt: AT,
}

describe("createInput", () => {
  test("sends the slug with the form's fields", () => {
    expect(
      createInput("apuntes", {
        name: "Apuntes",
        url: "https://github.com/ana/apuntes.git",
        ref: "main",
      })
    ).toEqual({
      slug: "apuntes",
      name: "Apuntes",
      url: "https://github.com/ana/apuntes.git",
      ref: "main",
    })
  })
})

describe("updateInput", () => {
  test("sends only what changed, and an empty URL keeps the stored one", () => {
    expect(
      updateInput(stored, { name: "Notas", url: "", ref: "main" })
    ).toEqual({ slug: "apuntes", name: "Notas" })
  })

  test("a typed URL and a new ref are sent", () => {
    expect(
      updateInput(stored, {
        name: "Apuntes",
        url: "https://github.com/ana/otro.git",
        ref: "produccion",
      })
    ).toEqual({
      slug: "apuntes",
      url: "https://github.com/ana/otro.git",
      ref: "produccion",
    })
  })
})

describe("ownBranchesSource", () => {
  test("nothing is read while the dialog is closed", () => {
    expect(ownBranchesSource(false, null, "https://github.com/a/b.git")).toBe(
      skipToken
    )
  })

  test("a complete https URL is read as typed", () => {
    expect(ownBranchesSource(true, null, "https://github.com/a/b.git")).toEqual(
      { url: "https://github.com/a/b.git" }
    )
  })

  test("an incomplete or http URL is not read yet", () => {
    expect(ownBranchesSource(true, null, "https://")).toBe(skipToken)
    expect(ownBranchesSource(true, null, "http://github.com/a/b.git")).toBe(
      skipToken
    )
    expect(ownBranchesSource(true, null, "")).toBe(skipToken)
  })

  test("editing with the URL left empty reads the stored repository", () => {
    expect(ownBranchesSource(true, stored, "")).toEqual({ slug: "apuntes" })
  })
})

describe("remainingOf", () => {
  test("counts what is left and never goes below zero", () => {
    expect(remainingOf(3, 10)).toBe(7)
    expect(remainingOf(10, 10)).toBe(0)
    expect(remainingOf(12, 10)).toBe(0)
  })
})
