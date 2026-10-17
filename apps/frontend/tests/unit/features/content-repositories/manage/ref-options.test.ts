import { describe, expect, test } from "bun:test"
import {
  refOptions,
  suggestedBranch,
} from "@/features/content-repositories/manage/model/ref-options"

describe("refOptions", () => {
  test("the branches stay as they are when the current ref is one of them", () => {
    expect(refOptions(["dev", "main"], "main")).toEqual(["dev", "main"])
  })

  test("a current ref that is not a branch goes first", () => {
    expect(refOptions(["dev", "main"], "v1.2")).toEqual(["v1.2", "dev", "main"])
  })

  test("an empty current ref adds nothing", () => {
    expect(refOptions(["main"], "")).toEqual(["main"])
  })
})

describe("suggestedBranch", () => {
  test("prefers the branch HEAD points at", () => {
    expect(
      suggestedBranch({ branches: ["dev", "main"], defaultBranch: "main" })
    ).toBe("main")
  })

  test("falls back to the first branch when HEAD points at none", () => {
    expect(
      suggestedBranch({ branches: ["dev", "main"], defaultBranch: null })
    ).toBe("dev")
  })

  test("suggests nothing without branches", () => {
    expect(suggestedBranch({ branches: [], defaultBranch: null })).toBe(
      undefined
    )
  })
})
