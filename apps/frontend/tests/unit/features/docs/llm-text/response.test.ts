import { describe, expect, test } from "bun:test"
import {
  textNotFound,
  textResponse,
} from "@/features/docs/llm-text/model/response"

describe("textResponse", () => {
  test("answers the body as plain text kept out of shared caches", async () => {
    const response = textResponse("# DNS\n")
    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe(
      "text/plain; charset=utf-8"
    )
    expect(response.headers.get("cache-control")).toBe("private, no-cache")
    expect(await response.text()).toBe("# DNS\n")
  })
})

describe("textNotFound", () => {
  test("is a plain-text 404", () => {
    const response = textNotFound()
    expect(response.status).toBe(404)
    expect(response.headers.get("content-type")).toBe(
      "text/plain; charset=utf-8"
    )
  })
})
