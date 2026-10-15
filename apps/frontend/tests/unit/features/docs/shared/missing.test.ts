import { describe, expect, test } from "bun:test"
import { ORPCError } from "@orpc/client"
import { isMissing } from "@/features/docs/shared/model/missing"

describe("isMissing", () => {
  test("NOT_FOUND and BAD_REQUEST mean there is no such page", () => {
    expect(isMissing(new ORPCError("NOT_FOUND"))).toBe(true)
    expect(isMissing(new ORPCError("BAD_REQUEST"))).toBe(true)
  })

  test("other oRPC errors and plain errors are real failures", () => {
    expect(isMissing(new ORPCError("UNAUTHORIZED"))).toBe(false)
    expect(isMissing(new ORPCError("INTERNAL_SERVER_ERROR"))).toBe(false)
    expect(isMissing(new Error("NOT_FOUND"))).toBe(false)
  })
})
