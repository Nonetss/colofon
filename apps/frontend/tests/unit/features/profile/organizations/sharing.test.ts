import { describe, expect, test } from "bun:test"
import { sameOrganizations } from "@/features/profile/organizations/model/sharing"

describe("sameOrganizations", () => {
  test("the same organizations in another order are no change", () => {
    expect(sameOrganizations(["a", "b"], ["b", "a"])).toBe(true)
    expect(sameOrganizations([], [])).toBe(true)
    expect(sameOrganizations(["a"], ["a", "b"])).toBe(false)
    expect(sameOrganizations(["a", "b"], ["a", "c"])).toBe(false)
  })
})
