import { afterEach, describe, expect, mock, test } from "bun:test"
import { createServerClientFor, forwardedHeaders } from "@/lib/server-link"

// The DOM preload's `Request` drops `cookie` like a browser would, so the
// incoming request is a plain object holding its headers, as Astro's is.
function incoming(headers: Record<string, string>) {
  return { headers: new Headers(headers) }
}

const realFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = realFetch
})

describe("forwardedHeaders", () => {
  test("keeps only the visitor's cookies", () => {
    const request = incoming({
      cookie: "session=abc",
      "user-agent": "x",
      host: "doc.example",
    })
    expect([...forwardedHeaders(request).entries()]).toEqual([
      ["cookie", "session=abc"],
    ])
  })

  test("sends no cookie header when the visitor has none", () => {
    expect(forwardedHeaders(incoming({})).has("cookie")).toBe(false)
  })
})

describe("createServerClientFor", () => {
  test("reads from the backend's /rpc as QUERY with the visitor's cookie", async () => {
    const calls: { url: string; method: string; cookie: string | null }[] = []
    // RPCLink calls fetch with the URL as a string and an init object.
    const fetchMock = mock(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        calls.push({
          url: String(input),
          method: init?.method ?? "",
          cookie: new Headers(init?.headers).get("cookie"),
        })
        return Response.json({ json: { repositories: [] } })
      }
    )
    globalThis.fetch = Object.assign(fetchMock, {
      preconnect: realFetch.preconnect,
    })
    const client = createServerClientFor(
      "http://backend:3000",
      incoming({ cookie: "s=1" })
    )

    await client.v1.docs.nav()

    expect(calls).toEqual([
      {
        url: "http://backend:3000/rpc/v1/docs/nav",
        method: "QUERY",
        cookie: "s=1",
      },
    ])
  })
})
