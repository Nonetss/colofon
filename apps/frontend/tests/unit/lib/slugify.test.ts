import { describe, expect, test } from "bun:test"
import { slugify } from "@/lib/slugify"

describe("slugify", () => {
  test("lowercases and drops accents", () => {
    expect(slugify("Documentación Técnica")).toBe("documentacion-tecnica")
  })

  test("joins every run of other characters with a single hyphen", () => {
    expect(slugify("Mi   repo / v2__final")).toBe("mi-repo-v2-final")
  })

  test("leaves no hyphen at either end", () => {
    expect(slugify("  ¡Hola, mundo!  ")).toBe("hola-mundo")
  })

  test("a value with no letters or digits is empty", () => {
    expect(slugify("¿?")).toBe("")
  })
})
