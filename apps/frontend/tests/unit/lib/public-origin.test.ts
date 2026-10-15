import { describe, expect, test } from "bun:test"
import { publicOrigin } from "@/lib/public-origin"

const requestUrl = new URL("http://frontend:4321/casa/llm.txt")

describe("publicOrigin", () => {
  test("the configured origin wins over the request's", () => {
    expect(publicOrigin("https://docs.example.org", requestUrl)).toBe(
      "https://docs.example.org"
    )
  })

  test("a configured origin with a path or trailing slash keeps only the origin", () => {
    expect(publicOrigin("https://docs.example.org/", requestUrl)).toBe(
      "https://docs.example.org"
    )
  })

  test("unset or unparseable, the request's origin is used", () => {
    expect(publicOrigin(undefined, requestUrl)).toBe("http://frontend:4321")
    expect(publicOrigin("not a url", requestUrl)).toBe("http://frontend:4321")
  })
})
