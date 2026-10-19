import { describe, expect, test } from "bun:test"
import { organizationSlug, ROLE_NAMES } from "#shared/organization"

describe("organizationSlug", () => {
  test("takes lowercase letters, digits and hyphens only", () => {
    const slug = organizationSlug()
    expect(slug.safeParse("equipo-docs-2").success).toBe(true)
    expect(slug.safeParse("Equipo").success).toBe(false)
    expect(slug.safeParse("equipo docs").success).toBe(false)
    expect(slug.safeParse("").success).toBe(false)
  })
})

describe("ROLE_NAMES", () => {
  test("lists the built-in roles from most to least powerful", () => {
    expect(ROLE_NAMES).toEqual(["owner", "admin", "member"])
  })
})
