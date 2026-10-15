import { describe, expect, test } from "bun:test"
import { matchesSearch } from "@/features/admin/git/model/repository-search"

const manual = { name: "Manual de operación", slug: "manual" }

describe("matchesSearch", () => {
  test("an empty or blank search matches every repository", () => {
    expect(matchesSearch(manual, "")).toBe(true)
    expect(matchesSearch(manual, "   ")).toBe(true)
  })

  test("matches the name or the slug, ignoring case and accents", () => {
    expect(matchesSearch(manual, "MAN")).toBe(true)
    expect(matchesSearch(manual, "operacion")).toBe(true)
    expect(matchesSearch({ name: "Docs", slug: "homelab" }, "lab")).toBe(true)
  })

  test("every word must appear, in any order", () => {
    expect(matchesSearch(manual, "operación manual")).toBe(true)
    expect(matchesSearch(manual, "manual notas")).toBe(false)
  })
})
