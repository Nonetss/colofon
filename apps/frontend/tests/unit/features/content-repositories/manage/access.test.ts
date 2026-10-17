import { describe, expect, test } from "bun:test"
import { urlWithAccess } from "@/features/content-repositories/manage/model/access"

describe("urlWithAccess", () => {
  test("puts the user and token in the URL", () => {
    expect(
      urlWithAccess("https://git.example.com/org/docs", "ana", "tok")
    ).toBe("https://ana:tok@git.example.com/org/docs")
  })

  test("percent-encodes special characters", () => {
    expect(
      urlWithAccess("https://git.example.com/org/docs", "ana", "s3cr/et@:")
    ).toBe("https://ana:s3cr%2Fet%40%3A@git.example.com/org/docs")
  })

  test("a token replaces the credentials the URL carried", () => {
    expect(
      urlWithAccess("https://ana:old@host/org/docs.git", "ana", "new")
    ).toBe("https://ana:new@host/org/docs.git")
  })

  test("without a token the URL is returned as typed", () => {
    expect(urlWithAccess("https://ana:tok@host/org/docs.git", "", "")).toBe(
      "https://ana:tok@host/org/docs.git"
    )
    expect(urlWithAccess("https://host/org/docs", "ana", "")).toBe(
      "https://host/org/docs"
    )
  })

  test("an incomplete URL is returned as typed", () => {
    expect(urlWithAccess("", "ana", "tok")).toBe("")
    expect(urlWithAccess("git.example.com", "ana", "tok")).toBe(
      "git.example.com"
    )
  })
})
