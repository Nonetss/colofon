import { beforeEach, describe, expect, test } from "bun:test"
import {
  type FakeDbCall,
  memberRow,
  organizationRow,
  type SecretRow,
  secretRow,
  secretUsageRow,
  stepArgs,
} from "@nonete/db/testing"
import { call } from "@orpc/server"
import { z } from "zod"
import { decryptValues, encryptValues, type SecretValues } from "#lib/cipher"
import { apiKeyContext, userContext } from "#tests/fixtures/context"
import { fakeDb } from "#tests/fixtures/db"
import { resetEnv, testEnv } from "#tests/fixtures/env"
import { expectErrorCode } from "#tests/fixtures/errors"
import { secretHandler } from "#v1/secret/handler"
import { secretInput } from "#v1/secret/input"
import { secretRouter } from "#v1/secret/router"

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

const equipo = organizationRow({
  id: "org-equipo",
  name: "Equipo docs",
  slug: "equipo-docs",
})
const casa = organizationRow({ id: "org-casa", name: "Casa", slug: "casa" })

/** `row` as the owner procedures read it, with the organizations it is shared with. */
function withShares(
  row: SecretRow,
  organizations: (typeof equipo)[] = []
): SecretRow & { shares: { organization: typeof equipo }[] } {
  return {
    ...row,
    shares: organizations.map((organization) => ({ organization })),
  }
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
      shared: [],
    })
    expect(fakeDb.calls()).toEqual([])
  })

  test("returns the field names and flags without any value", async () => {
    fakeDb.queue("query.secret.findMany", [withShares(storedRow())])
    fakeDb.queue("select", [])

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
        organizations: [],
        lastUsedAt: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ])
    expect(JSON.stringify(secrets)).not.toContain("stored-key-value")
  })

  test("lists the organizations of each own secret by name", async () => {
    fakeDb.queue("query.secret.findMany", [
      withShares(storedRow(), [equipo, casa]),
    ])
    fakeDb.queue("select", [])

    const { secrets } = await secretHandler.list({ context })

    expect(secrets[0]?.organizations).toEqual([
      { id: "org-casa", name: "Casa", slug: "casa" },
      { id: "org-equipo", name: "Equipo docs", slug: "equipo-docs" },
    ])
  })

  test("lists the secrets shared with the caller with their organization, owner and prefix, and no value", async () => {
    const anaSecret = secretRow({
      id: "00000000-0000-4000-8000-0000000000b1",
      userId: "ana",
      ciphertext: encryptValues(stored, {
        secretId: "00000000-0000-4000-8000-0000000000b1",
        userId: "ana",
      }),
    })
    fakeDb.queue("query.secret.findMany", [])
    fakeDb.queue("select", [
      {
        secret: anaSecret,
        organization: { id: equipo.id, name: equipo.name, slug: equipo.slug },
        ownerName: "Ana",
      },
    ])

    const { secrets, shared } = await secretHandler.list({ context })

    expect(secrets).toEqual([])
    expect(shared).toEqual([
      {
        id: anaSecret.id,
        name: "komodo",
        description: null,
        fields: ["key", "secret"],
        origins: ["https://komodo.casa.lan"],
        allowWrite: false,
        allowInUrl: false,
        allowInBody: false,
        unreadable: false,
        organization: {
          id: "org-equipo",
          name: "Equipo docs",
          slug: "equipo-docs",
        },
        ownerName: "Ana",
        prefix: "equipo-docs/",
      },
    ])
    expect(JSON.stringify(shared)).not.toContain("stored-key-value")
  })

  test("accepts an API key", async () => {
    fakeDb.queue("query.secret.findMany", [])
    fakeDb.queue("select", [])

    const listed = await call(secretRouter.list, undefined, {
      context: apiKeyContext(),
    })

    expect(listed).toEqual({ enabled: true, secrets: [], shared: [] })
  })

  test("marks a secret encrypted under another key as unreadable", async () => {
    const row = storedRow()
    testEnv.SECRETS_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString("base64")
    fakeDb.queue("query.secret.findMany", [withShares(row)])
    fakeDb.queue("select", [])

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
    fakeDb.queue("query.secret.findFirst", undefined)

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
    fakeDb.queue("query.secret.findFirst", withShares(storedRow()))
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
    fakeDb.queue(
      "query.secret.findFirst",
      withShares(storedRow({ username: "admin", password: "hunter22" }))
    )
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
    fakeDb.queue("query.secret.findFirst", withShares(row))

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
    fakeDb.queue("query.secret.findFirst", withShares(storedRow()))
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
    fakeDb.queue("query.secret.findFirst", withShares(storedRow()))
    fakeDb.queue("select", [{ id: "00000000-0000-4000-8000-000000000002" }])

    await expectErrorCode(
      secretHandler.update({ context, input: { id: SECRET_ID, name: "npm" } }),
      "CONFLICT"
    )
    expect(fakeDb.calls("update")).toEqual([])
  })

  test("renaming a shared secret onto a name shared with its organization is CONFLICT", async () => {
    fakeDb.queue("query.secret.findFirst", withShares(storedRow(), [equipo]))
    fakeDb.queue("select", [])
    fakeDb.queue("select", [{ organizationName: "Equipo docs" }])

    await expectErrorCode(
      secretHandler.update({ context, input: { id: SECRET_ID, name: "npm" } }),
      "CONFLICT"
    )
    expect(fakeDb.calls("update")).toEqual([])
  })

  test("a rename without collisions keeps the organizations", async () => {
    fakeDb.queue("query.secret.findFirst", withShares(storedRow(), [equipo]))
    fakeDb.queue("select", [])
    fakeDb.queue("select", [])
    fakeDb.queue("update", [storedRow(stored, { name: "npm" })])

    const updated = await secretHandler.update({
      context,
      input: { id: SECRET_ID, name: "npm" },
    })

    expect(updated.name).toBe("npm")
    expect(updated.organizations.map((each) => each.id)).toEqual(["org-equipo"])
  })
})

describe("secret.share", () => {
  test("only from a browser session", async () => {
    await expectErrorCode(
      call(
        secretRouter.share,
        { id: SECRET_ID, organizationIds: [] },
        { context: apiKeyContext() }
      ),
      "FORBIDDEN"
    )
    expect(fakeDb.calls()).toEqual([])
  })

  test("is SERVICE_UNAVAILABLE without the encryption key", async () => {
    testEnv.SECRETS_ENCRYPTION_KEY = undefined

    await expectErrorCode(
      secretHandler.share({
        context,
        input: { id: SECRET_ID, organizationIds: [] },
      }),
      "SERVICE_UNAVAILABLE"
    )
    expect(fakeDb.calls()).toEqual([])
  })

  test("a secret that is not the caller's is NOT_FOUND and nothing is written", async () => {
    fakeDb.queue("query.secret.findFirst", undefined)

    await expectErrorCode(
      secretHandler.share({
        context,
        input: { id: SECRET_ID, organizationIds: ["org-equipo"] },
      }),
      "NOT_FOUND"
    )
    expect(fakeDb.calls("transaction")).toEqual([])
  })

  test("an organization the owner isn't in is NOT_FOUND and the sharing stays", async () => {
    fakeDb.queue("query.secret.findFirst", withShares(storedRow()))
    fakeDb.queue("query.member.findMany", [
      { ...memberRow({ organizationId: "org-equipo" }), organization: equipo },
    ])

    await expectErrorCode(
      secretHandler.share({
        context,
        input: { id: SECRET_ID, organizationIds: ["org-equipo", "ajena"] },
      }),
      "NOT_FOUND"
    )
    expect(fakeDb.calls("transaction")).toEqual([])
    expect(fakeDb.calls("delete")).toEqual([])
  })

  test("a name another secret already shares with the organization is CONFLICT", async () => {
    fakeDb.queue("query.secret.findFirst", withShares(storedRow()))
    fakeDb.queue("query.member.findMany", [
      { ...memberRow({ organizationId: "org-equipo" }), organization: equipo },
    ])
    fakeDb.queue("select", [{ organizationName: "Equipo docs" }])

    await expectErrorCode(
      secretHandler.share({
        context,
        input: { id: SECRET_ID, organizationIds: ["org-equipo"] },
      }),
      "CONFLICT"
    )
    expect(fakeDb.calls("transaction")).toEqual([])
  })

  test("replaces the shares in one transaction and lists them by name", async () => {
    fakeDb.queue("query.secret.findFirst", withShares(storedRow(), [equipo]))
    fakeDb.queue("query.member.findMany", [
      { ...memberRow({ organizationId: "org-equipo" }), organization: equipo },
      { ...memberRow({ organizationId: "org-casa" }), organization: casa },
    ])
    fakeDb.queue("select", [])
    fakeDb.queue("delete", [])
    fakeDb.queue("insert", [])

    const shared = await secretHandler.share({
      context,
      input: { id: SECRET_ID, organizationIds: ["org-equipo", "org-casa"] },
    })

    expect(fakeDb.calls("transaction")).toHaveLength(1)
    const [insert] = fakeDb.calls("insert")
    if (!insert) throw new Error("no insert recorded")
    expect(stepArgs(insert, "values")[0]).toEqual([
      { secretId: SECRET_ID, organizationId: "org-equipo" },
      { secretId: SECRET_ID, organizationId: "org-casa" },
    ])
    expect(shared.organizations.map((each) => each.name)).toEqual([
      "Casa",
      "Equipo docs",
    ])
  })

  test("an empty list makes it private", async () => {
    fakeDb.queue("query.secret.findFirst", withShares(storedRow(), [equipo]))
    fakeDb.queue("delete", [])

    const shared = await secretHandler.share({
      context,
      input: { id: SECRET_ID, organizationIds: [] },
    })

    expect(fakeDb.calls("delete")).toHaveLength(1)
    expect(fakeDb.calls("insert")).toEqual([])
    expect(shared.organizations).toEqual([])
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
    fakeDb.queue("select", [
      { usage: first, caller: { id: USER_ID, name: "Luis" } },
      { usage: second, caller: { id: USER_ID, name: "Luis" } },
    ])

    const page = await secretHandler.usage({
      context,
      input: secretInput.usage.parse({ limit: 1 }),
    })

    expect(page.entries).toEqual([
      {
        id: first.id,
        user: { id: USER_ID, name: "Luis" },
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

  test("names who made a member's call with the caller's secret", async () => {
    const memberCall = secretUsageRow({
      userId: "luis",
      secretNames: ["equipo-docs/komodo"],
    })
    fakeDb.queue("select", [
      { usage: memberCall, caller: { id: "luis", name: "Luis" } },
    ])

    const page = await secretHandler.usage({
      context,
      input: secretInput.usage.parse({}),
    })

    expect(page.entries[0]?.user).toEqual({ id: "luis", name: "Luis" })
    expect(page.entries[0]?.secretNames).toEqual(["equipo-docs/komodo"])
  })

  test("a call by a deleted user has no user", async () => {
    fakeDb.queue("select", [{ usage: secretUsageRow(), caller: null }])

    const page = await secretHandler.usage({
      context,
      input: secretInput.usage.parse({}),
    })

    expect(page.entries[0]?.user).toBeNull()
  })

  test("the last page has no cursor", async () => {
    fakeDb.queue("select", [{ usage: secretUsageRow(), caller: null }])

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
