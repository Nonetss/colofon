import { describe, expect, test } from "bun:test"
import {
  assignableRoles,
  canEditMember,
  canEditOrganization,
  canManageMembers,
} from "@/features/profile/organizations/model/permissions"

describe("organization permissions", () => {
  test("owners and admins manage members; only owners edit the organization", () => {
    expect(canManageMembers("owner")).toBe(true)
    expect(canManageMembers("admin")).toBe(true)
    expect(canManageMembers("member")).toBe(false)
    expect(canEditOrganization("owner")).toBe(true)
    expect(canEditOrganization("admin")).toBe(false)
  })

  test("only an owner gives the owner role", () => {
    expect(assignableRoles("owner")).toEqual(["owner", "admin", "member"])
    expect(assignableRoles("admin")).toEqual(["admin", "member"])
    expect(assignableRoles("member")).toEqual([])
  })

  test("an admin edits members and admins but not owners", () => {
    expect(canEditMember("admin", "member")).toBe(true)
    expect(canEditMember("admin", "admin")).toBe(true)
    expect(canEditMember("admin", "owner")).toBe(false)
    expect(canEditMember("owner", "owner")).toBe(true)
    expect(canEditMember("member", "member")).toBe(false)
  })
})
