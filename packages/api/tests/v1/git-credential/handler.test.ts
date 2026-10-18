import { beforeEach, describe, expect, test } from "bun:test"
import {
  type FakeDbCall,
  type GitCredentialRow,
  gitCredentialRow,
  stepArgs,
} from "@nonete/db/testing"
import { call } from "@orpc/server"
import { z } from "zod"
import { decryptValues, encryptValues } from "#lib/cipher"
import { apiKeyContext, userContext } from "#tests/fixtures/context"
import { fakeDb } from "#tests/fixtures/db"
import { resetEnv, testEnv } from "#tests/fixtures/env"
import { expectErrorCode } from "#tests/fixtures/errors"
import { gitCredentialHandler } from "#v1/git-credential/handler"
import { gitCredentialInput } from "#v1/git-credential/input"
import { gitCredentialRouter } from "#v1/git-credential/router"

const KEY = Buffer.alloc(32, 7).toString("base64")
const context = userContext()
const USER_ID = "user-id"
const CREDENTIAL_ID = "00000000-0000-4000-8000-0000000000c1"
const TOKEN = "stored-token-value"

function storedRow(
  overrides: Partial<GitCredentialRow> = {}
): GitCredentialRow {
  return gitCredentialRow({
    ciphertext: encryptValues(
      { token: TOKEN },
      { secretId: CREDENTIAL_ID, userId: USER_ID }
    ),
    ...overrides,
  })
}

const writtenCredential = z.object({
  id: z.string().optional(),
  ciphertext: z.string(),
})

function written(call: FakeDbCall | undefined, step: "values" | "set") {
  if (!call) throw new Error("no write recorded")
  return writtenCredential.parse(stepArgs(call, step)[0])
}

beforeEach(() => {
  fakeDb.reset()
  resetEnv()
  testEnv.SECRETS_ENCRYPTION_KEY = KEY
})

describe("gitCredential.list", () => {
  test("without the encryption key, says so and reads nothing", async () => {
    testEnv.SECRETS_ENCRYPTION_KEY = undefined

    expect(await gitCredentialHandler.list({ context })).toEqual({
      enabled: false,
      credentials: [],
    })
    expect(fakeDb.calls()).toEqual([])
  })

  test("lists host and username, flags the ones in use, and never the token", async () => {
    fakeDb.queue("select", [storedRow()])
    fakeDb.queue("select", [{ credentialId: CREDENTIAL_ID }])

    const { enabled, credentials } = await gitCredentialHandler.list({
      context,
    })

    expect(enabled).toBe(true)
    expect(credentials).toEqual([
      {
        id: CREDENTIAL_ID,
        host: "git.example.com",
        username: "ana",
        inUse: true,
        unreadable: false,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ])
    expect(JSON.stringify(credentials)).not.toContain(TOKEN)
  })

  test("marks a token encrypted under another key as unreadable", async () => {
    const row = storedRow()
    testEnv.SECRETS_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString("base64")
    fakeDb.queue("select", [row])
    fakeDb.queue("select", [])

    const { credentials } = await gitCredentialHandler.list({ context })

    expect(credentials[0]?.unreadable).toBe(true)
  })
})

describe("gitCredential.save", () => {
  const input = gitCredentialInput.save.parse({
    host: " Git.Example.com ",
    username: "ana",
    token: "new-token-value",
  })

  test("normalizes the host", () => {
    expect(input.host).toBe("git.example.com")
  })

  test("rejects a host written as a URL", () => {
    expect(
      gitCredentialInput.save.safeParse({
        host: "https://git.example.com/org",
        username: "ana",
        token: "t",
      }).success
    ).toBe(false)
  })

  test("is SERVICE_UNAVAILABLE without the encryption key, writing nothing", async () => {
    testEnv.SECRETS_ENCRYPTION_KEY = undefined

    await expectErrorCode(
      gitCredentialHandler.save({ context, input }),
      "SERVICE_UNAVAILABLE"
    )
    expect(fakeDb.calls()).toEqual([])
  })

  test("stores a new credential with the token encrypted for its row", async () => {
    fakeDb.queue("select", [])
    fakeDb.queue("insert", [storedRow()])

    const saved = await gitCredentialHandler.save({ context, input })

    const values = written(fakeDb.calls("insert")[0], "values")
    expect(values.ciphertext).not.toContain("new-token-value")
    expect(
      decryptValues(values.ciphertext, {
        secretId: values.id ?? "",
        userId: USER_ID,
      })
    ).toEqual({ token: "new-token-value" })
    expect(JSON.stringify(saved)).not.toContain("new-token-value")
  })

  test("saving again for the same host and username replaces the token", async () => {
    fakeDb.queue("select", [storedRow()])
    fakeDb.queue("update", [storedRow()])
    fakeDb.queue("select", [{ credentialId: CREDENTIAL_ID }])

    const saved = await gitCredentialHandler.save({ context, input })

    expect(fakeDb.calls("insert")).toEqual([])
    const set = written(fakeDb.calls("update")[0], "set")
    expect(
      decryptValues(set.ciphertext, {
        secretId: CREDENTIAL_ID,
        userId: USER_ID,
      })
    ).toEqual({ token: "new-token-value" })
    expect(saved.inUse).toBe(true)
  })
})

describe("gitCredential.delete", () => {
  test("another user's credential is NOT_FOUND and nothing is deleted", async () => {
    fakeDb.queue("select", [])

    await expectErrorCode(
      gitCredentialHandler.delete({ context, input: { id: CREDENTIAL_ID } }),
      "NOT_FOUND"
    )
    expect(fakeDb.calls("delete")).toEqual([])
  })

  test("a credential a repository uses is CONFLICT and stays", async () => {
    fakeDb.queue("select", [storedRow()])
    fakeDb.queue("select", [{ credentialId: CREDENTIAL_ID }])

    await expectErrorCode(
      gitCredentialHandler.delete({ context, input: { id: CREDENTIAL_ID } }),
      "CONFLICT"
    )
    expect(fakeDb.calls("delete")).toEqual([])
  })

  test("deletes one nothing uses", async () => {
    fakeDb.queue("select", [storedRow()])
    fakeDb.queue("select", [])
    fakeDb.queue("delete", [])

    expect(
      await gitCredentialHandler.delete({
        context,
        input: { id: CREDENTIAL_ID },
      })
    ).toEqual({ id: CREDENTIAL_ID, success: true })
    expect(fakeDb.calls("delete")).toHaveLength(1)
  })
})

describe("gitCredential access with an API key", () => {
  const options = { context: apiKeyContext() }

  test("list answers the caller's hosts and usernames, without tokens", async () => {
    fakeDb.queue("select", [storedRow()])
    fakeDb.queue("select", [])

    const { credentials } = await call(
      gitCredentialRouter.list,
      undefined,
      options
    )

    expect(
      credentials.map(({ host, username }) => ({ host, username }))
    ).toEqual([{ host: "git.example.com", username: "ana" }])
    expect(JSON.stringify(credentials)).not.toContain(TOKEN)
  })

  test("save is FORBIDDEN and writes nothing", async () => {
    await expectErrorCode(
      call(
        gitCredentialRouter.save,
        { host: "git.example.com", username: "ana", token: "new-token" },
        options
      ),
      "FORBIDDEN"
    )
    expect(fakeDb.calls()).toEqual([])
  })

  test("delete is FORBIDDEN and deletes nothing", async () => {
    await expectErrorCode(
      call(gitCredentialRouter.delete, { id: CREDENTIAL_ID }, options),
      "FORBIDDEN"
    )
    expect(fakeDb.calls()).toEqual([])
  })
})
