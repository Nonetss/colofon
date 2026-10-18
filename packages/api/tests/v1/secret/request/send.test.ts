import { describe, expect, test } from "bun:test"
import type { RenderedRequest } from "#v1/secret/request/plan"
import {
  type FetchLike,
  isTextual,
  type SendOptions,
  send,
} from "#v1/secret/request/send"

const request: RenderedRequest = {
  method: "GET",
  url: "https://komodo.casa.lan/read",
  headers: new Headers({ "x-api-key": "value" }),
  body: undefined,
}

function options(fetch: FetchLike, overrides: Partial<SendOptions> = {}) {
  return { fetch, timeoutMs: 1000, maxBodyBytes: 16, ...overrides }
}

/** A fetch that never answers until its signal aborts. */
const hangingFetch: FetchLike = (_url, init) =>
  new Promise((_resolve, reject) => {
    init.signal?.addEventListener("abort", () => reject(init.signal?.reason))
  })

describe("send", () => {
  test("passes the request through without following redirects", async () => {
    const seen: RequestInit[] = []
    const fetch: FetchLike = async (_url, init) => {
      seen.push(init)
      return new Response(null, {
        status: 302,
        headers: { location: "https://other.example/login" },
      })
    }

    const result = await send(request, options(fetch))

    expect(seen[0]?.redirect).toBe("manual")
    if (!result.ok) throw new Error(result.failure)
    expect(result.response.status).toBe(302)
    expect(result.response.headers).toContainEqual([
      "location",
      "https://other.example/login",
    ])
  })

  test("an error status is a response, not a failure", async () => {
    const fetch: FetchLike = async () =>
      Response.json({ error: "unauthorized" }, { status: 401 })

    const result = await send(request, options(fetch, { maxBodyBytes: 1024 }))

    if (!result.ok) throw new Error(result.failure)
    expect(result.response.status).toBe(401)
    expect(result.response.body).toMatchObject({
      kind: "text",
      text: '{"error":"unauthorized"}',
      truncated: false,
    })
  })

  test("cuts a long text body at the cap and reports its full size", async () => {
    const fetch: FetchLike = async () =>
      new Response("a".repeat(40), {
        headers: { "content-type": "text/plain" },
      })

    const result = await send(request, options(fetch))

    if (!result.ok) throw new Error(result.failure)
    expect(result.response.body).toEqual({
      kind: "text",
      text: "a".repeat(16),
      size: 40,
      truncated: true,
      complete: true,
    })
  })

  test("never splits a UTF-8 character when cutting", async () => {
    const fetch: FetchLike = async () => new Response(`${"a".repeat(15)}ñandú`)

    const result = await send(request, options(fetch))

    if (!result.ok) throw new Error(result.failure)
    expect(result.response.body).toMatchObject({ text: "a".repeat(15) })
  })

  test("describes a binary body by type and size only", async () => {
    const fetch: FetchLike = async () =>
      new Response(new Uint8Array(100), {
        headers: { "content-type": "application/zip" },
      })

    const result = await send(request, options(fetch))

    if (!result.ok) throw new Error(result.failure)
    expect(result.response.body).toEqual({
      kind: "binary",
      contentType: "application/zip",
      size: 100,
      complete: true,
    })
  })

  test("a timeout is a failure saying so", async () => {
    const result = await send(request, options(hangingFetch, { timeoutMs: 20 }))

    expect(result).toEqual({
      ok: false,
      failure: "The request timed out after 0 s",
    })
  })

  test("a body still arriving when time runs out is kept as incomplete", async () => {
    const fetch: FetchLike = async (_url, init) => {
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("partial"))
          init.signal?.addEventListener("abort", () =>
            controller.error(init.signal?.reason)
          )
        },
      })
      return new Response(stream)
    }

    const result = await send(request, options(fetch, { timeoutMs: 20 }))

    if (!result.ok) throw new Error(result.failure)
    expect(result.response.body).toMatchObject({
      text: "partial",
      complete: false,
    })
  })

  test("a connection error is a failure with its message", async () => {
    const fetch: FetchLike = async () => {
      throw new Error("connect ECONNREFUSED 10.0.0.5:3003")
    }

    expect(await send(request, options(fetch))).toEqual({
      ok: false,
      failure: "The request failed: connect ECONNREFUSED 10.0.0.5:3003",
    })
  })
})

describe("isTextual", () => {
  test.each([
    [null, true],
    ["", true],
    ["text/html; charset=utf-8", true],
    ["application/json", true],
    ["application/vnd.api+json", true],
    ["application/xml", true],
    ["application/x-www-form-urlencoded", true],
    ["application/zip", false],
    ["image/png", false],
    ["application/octet-stream", false],
  ])("%p is textual: %p", (type, expected) => {
    expect(isTextual(type)).toBe(expected)
  })
})
