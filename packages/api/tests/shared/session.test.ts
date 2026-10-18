import { describe, expect, test } from "bun:test"
import { ORPCError } from "@orpc/server"
import { requireUserId } from "#shared/session"
import { anonymousContext, userContext } from "#tests/fixtures/context"

describe("requireUserId", () => {
  test("is the signed-in user's id", () => {
    const context = userContext()
    expect(requireUserId(context)).toBe(context.user?.id ?? "")
  })

  test("refuses a caller without a user with UNAUTHORIZED", () => {
    expect(() => requireUserId(anonymousContext())).toThrow(ORPCError)
    try {
      requireUserId(anonymousContext())
    } catch (error) {
      expect(error instanceof ORPCError && error.code).toBe("UNAUTHORIZED")
    }
  })
})
