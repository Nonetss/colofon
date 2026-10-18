import { beforeEach, describe, expect, test } from "bun:test"
import {
  type FakeDbCall,
  type SecretRow,
  secretRow,
  secretUsageRow,
  stepArgs,
} from "@nonete/db/testing"
import { z } from "zod"
import { decryptValues, encryptValues, type SecretValues } from "#lib/cipher"
import { userContext } from "#tests/fixtures/context"
import { fakeDb } from "#tests/fixtures/db"
import { resetEnv, testEnv } from "#tests/fixtures/env"
import { expectErrorCode } from "#tests/fixtures/errors"
import { secretHandler } from "#v1/secret/handler"
import { secretInput } from "#v1/secret/input"

const KEY = Buffer.alloc(32, 7).toString("base64")
const context = userContext()
const USER_ID = "user-id"
const SECRET_ID = "00000000-0000-4000-8000-000000000001"
const stored = { key: "stored-key-value", secret: "stored-secret-value" }

/** A secret row of the caller's whose ciphertext holds `values`. */
function storedRow(
  values: SecretValues = stored,
  overrides: Partial<SecretRow> = {}
): SecretRow {
  return secretRow({
    fieldNames: Object.keys(values),
    ciphertext: encryptValues(values, { secretId: SECRET_ID, userId: USER_ID }),
    ...overrides,
  })
}

const writtenSecret = z.object({
  id: z.string().optional(),
  ciphertext: z.string(),
  fieldNames: z.array(z.string()),
})

/** The columns a write set, read from its `values` or `set` step. */
function written(call: FakeDbCall | undefined, step: "values" | "set") {
  if (!call) throw new Error("no write recorded")
  return writtenSecret.parse(stepArgs(call, step)[0])
}

function decrypted(ciphertext: string): SecretValues | null {
  return decryptValues(ciphertext, { secretId: SECRET_ID, userId: USER_ID })
}

beforeEach(() => {
  fakeDb.reset()
  resetEnv()
  testEnv.SECRETS_ENCRYPTION_KEY = KEY
})

describe("secret.list", () => {
  test("without the encryption key, says so and reads nothing", async () => {
    testEnv.SECRETS_ENCRYPTION_KEY = undefined

    expect(await secretHandler.list({ context })).toEqual({
      enabled: false,
      secrets: [],
    })
    expect(fakeDb.calls()).toEqual([])
  })

  test("returns the field names and flags without any value", async () => {
    fakeDb.queue("select", [storedRow()])

    const { enabled, secrets } = await secretHandler.list({ context })

    expect(enabled).toBe(true)
    expect(secrets).toEqual([
      {
        id: SECRET_ID,
        name: "komodo",
        description: null,
        fields: ["key", "secret"],
        origins: ["https://komodo.casa.lan"],
        allowWrite: false,
        allowInUrl: false,
        allowInBody: false,
        unreadable: false,
        lastUsedAt: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ])
    expect(JSON.stringify(secrets)).not.toContain("stored-key-value")
  })

  test("marks a secret encrypted under another key as unreadable", async () => {
    const row = storedRow()
    testEnv.SECRETS_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString("base64")
    fakeDb.queue("select", [row])

    const { secrets } = await secretHandler.list({ context })

    expect(secrets[0]?.unreadable).toBe(true)
  })
})

describe("secret.create", () => {
  test("is SERVICE_UNAVAILABLE without the encryption key, writing nothing", async () => {
    testEnv.SECRETS_ENCRYPTION_KEY = undefined

    await expectErrorCode(
      secretHandler.create({
        context,
        input: secretInput.create.parse({
          name: "npm",
          fields: [{ name: "token", value: "tok-1234" }],
          origins: ["https://registry.npmjs.org"],
        }),
      }),
      "SERVICE_UNAVAILABLE"
    )
    expect(fakeDb.calls()).toEqual([])
  })

  const input = secretInput.create.parse({
    name: "komodo",
    fields: [
      { name: "key", value: "new-key-value" },
      { name: "secret", value: "new-secret-value" },
    ],
    origins: ["HTTPS://Komodo.Casa.Lan/"],
    allowWrite: true,
  })

  test("a taken name is CONFLICT and nothing is written", async () => {
    fakeDb.queue("select", [{ id: SECRET_ID }])

    await expectErrorCode(secretHandler.create({ context, input }), "CONFLICT")
    expect(fakeDb.calls("insert")).toEqual([])
  })

  test("stores the values encrypted for the new row and returns no value", async () => {
    fakeDb.queue("select", [])
    fakeDb.queue("insert", [storedRow()])

    const created = await secretHandler.create({ context, input })

    const values = written(fakeDb.calls("insert")[0], "values")
    expect(values.fieldNames).toEqual(["key", "secret"])
    expect(values.ciphertext).not.toContain("new-key-value")
    expect(
      decryptValues(values.ciphertext, {
        secretId: values.id ?? "",
        userId: USER_ID,
      })
    ).toEqual({ key: "new-key-value", secret: "new-secret-value" })
    expect(JSON.stringify(created)).not.toContain("stored-key-value")
  })

  test("normalizes the origins", () => {
    expect(input.origins).toEqual(["https://komodo.casa.lan"])
  })
})

describe("secret.update", () => {
  test("another user's secret is NOT_FOUND and nothing is written", async () => {
    fakeDb.queue("select", [])

    await expectErrorCode(
      secretHandler.update({
        context,
        input: { id: SECRET_ID, description: "x" },
      }),
      "NOT_FOUND"
    )
    expect(fakeDb.calls("update")).toEqual([])
  })

  test("a field listed without a value keeps the stored one", async () => {
    fakeDb.queue("select", [storedRow()])
    fakeDb.queue("update", [storedRow()])

    await secretHandler.update({
      context,
      input: {
        id: SECRET_ID,
        fields: [{ name: "key", value: "replaced-key" }, { name: "secret" }],
      },
    })

    const set = written(fakeDb.calls("update")[0], "set")
    expect(set.fieldNames).toEqual(["key", "secret"])
    expect(decrypted(set.ciphertext)).toEqual({
      key: "replaced-key",
      secret: "stored-secret-value",
    })
  })

  test("a stored field not listed is removed", async () => {
    fakeDb.queue("select", [
      storedRow({ username: "admin", password: "hunter22" }),
    ])
    fakeDb.queue("update", [storedRow()])

    await secretHandler.update({
      context,
      input: { id: SECRET_ID, fields: [{ name: "token", value: "tok-1234" }] },
    })

    const set = written(fakeDb.calls("update")[0], "set")
    expect(set.fieldNames).toEqual(["token"])
    expect(decrypted(set.ciphertext)).toEqual({ token: "tok-1234" })
  })

  test("an unreadable secret needs every value: BAD_REQUEST and nothing is written", async () => {
    const row = storedRow()
    testEnv.SECRETS_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString("base64")
    fakeDb.queue("select", [row])

    await expectErrorCode(
      secretHandler.update({
        context,
        input: {
          id: SECRET_ID,
          fields: [{ name: "key", value: "replaced-key" }, { name: "secret" }],
        },
      }),
      "BAD_REQUEST"
    )
    expect(fakeDb.calls("update")).toEqual([])
  })

  test("without a field list the values are left alone", async () => {
    fakeDb.queue("select", [storedRow()])
    fakeDb.queue("update", [storedRow()])

    await secretHandler.update({
      context,
      input: { id: SECRET_ID, description: "Komodo de casa" },
    })

    const [update] = fakeDb.calls("update")
    if (!update) throw new Error("no update recorded")
    expect(stepArgs(update, "set")[0]).toEqual({
      description: "Komodo de casa",
    })
  })

  test("renaming to a name the caller already uses is CONFLICT", async () => {
    fakeDb.queue("select", [storedRow()])
    fakeDb.queue("select", [{ id: "00000000-0000-4000-8000-000000000002" }])

    await expectErrorCode(
      secretHandler.update({ context, input: { id: SECRET_ID, name: "npm" } }),
      "CONFLICT"
    )
    expect(fakeDb.calls("update")).toEqual([])
  })
})

describe("secret.delete", () => {
  test("another user's secret is NOT_FOUND", async () => {
    fakeDb.queue("delete", [])

    await expectErrorCode(
      secretHandler.delete({ context, input: { id: SECRET_ID } }),
      "NOT_FOUND"
    )
  })

  test("deletes the caller's secret", async () => {
    fakeDb.queue("delete", [{ id: SECRET_ID }])

    expect(
      await secretHandler.delete({ context, input: { id: SECRET_ID } })
    ).toEqual({ id: SECRET_ID, success: true })
  })
})

describe("secret.usage", () => {
  test("pages the entries newest first with a cursor only when more remain", async () => {
    const first = secretUsageRow({ id: "00000000-0000-4000-8000-0000000000a1" })
    const second = secretUsageRow({
      id: "00000000-0000-4000-8000-0000000000a2",
      outcome: "refused",
      status: null,
      detail: "origin not allowed",
    })
    fakeDb.queue("select", [first, second])

    const page = await secretHandler.usage({
      context,
      input: secretInput.usage.parse({ limit: 1 }),
    })

    expect(page.entries).toEqual([
      {
        id: first.id,
        apiKeyId: null,
        secretNames: ["komodo"],
        method: "GET",
        url: "https://komodo.casa.lan/read",
        outcome: "sent",
        status: 200,
        detail: null,
        durationMs: 12,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ])
    expect(page.nextCursor).toBe(`2026-01-01T00:00:00.000Z|${first.id}`)
  })

  test("the last page has no cursor", async () => {
    fakeDb.queue("select", [secretUsageRow()])

    const page = await secretHandler.usage({
      context,
      input: secretInput.usage.parse({}),
    })

    expect(page.nextCursor).toBeNull()
  })
})

describe("secret.purgeUsage", () => {
  test("deletes the old entries and counts them", async () => {
    fakeDb.queue("delete", [{ id: "a" }, { id: "b" }])

    expect(await secretHandler.purgeUsage()).toEqual({ deleted: 2 })
    expect(fakeDb.calls("delete")).toHaveLength(1)
  })
})
