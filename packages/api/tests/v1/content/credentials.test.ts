import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test"
import type { RemoteCheck } from "@nonete/content"
import {
  contentRepositoryRow,
  type GitCredentialRow,
  gitCredentialRow,
  stepArgs,
} from "@nonete/db/testing"
import {
  createContentFolder,
  memoryRepositoryStore,
  storedRepository,
} from "#tests/fixtures/content"
import { userContext } from "#tests/fixtures/context"
import { fakeDb } from "#tests/fixtures/db"
import { resetEnv, testEnv } from "#tests/fixtures/env"
import { expectErrorCode } from "#tests/fixtures/errors"
import { createContentHandler } from "#v1/content/handler"
import type { ContentReader, StoredRepository } from "#v1/content/reader"
import { createContentReader } from "#v1/content/reader"
import { UNREADABLE_MESSAGE, withSavedAccess } from "#v1/git-credential/access"
import { encryptValues } from "#v1/secret/cipher"

const KEY = Buffer.alloc(32, 7).toString("base64")
const CREDENTIAL_ID = "00000000-0000-4000-8000-0000000000c1"
const TOKEN = "s3cr3t-token"
const context = userContext()

function credential(
  overrides: Partial<GitCredentialRow> = {}
): GitCredentialRow {
  return gitCredentialRow({
    ciphertext: encryptValues(
      { token: TOKEN },
      { secretId: CREDENTIAL_ID, userId: "user-id" }
    ),
    ...overrides,
  })
}

const owned = contentRepositoryRow({
  slug: "apuntes",
  name: "Apuntes",
  url: "https://git.example.com/ana/apuntes.git",
  ownerId: "user-id",
})

function fakeReader() {
  return {
    content: mock(async () => undefined),
    site: mock(async () => undefined),
    contentRoot: mock(async (_repository: StoredRepository) => undefined),
    sync: mock(async (_repository: StoredRepository) => ({
      ok: true as const,
      commit: "abc123",
    })),
    syncAll: mock(async () => []),
    syncInBackground: mock((_repository: StoredRepository) => {}),
    remove: mock(async (_repository: StoredRepository) => {}),
  } satisfies ContentReader
}

const refused = mock(
  async (_url: string): Promise<RemoteCheck> => ({ ok: false, error: "no" })
)
let reader = fakeReader()
let handler = createContentHandler(reader, {
  hostedRoot: "/nonexistent/hosted",
  checkRemote: refused,
})

beforeEach(() => {
  fakeDb.reset()
  resetEnv()
  testEnv.SECRETS_ENCRYPTION_KEY = KEY
  reader = fakeReader()
  refused.mockClear()
  handler = createContentHandler(reader, {
    hostedRoot: "/nonexistent/hosted",
    checkRemote: refused,
  })
})

const create = {
  slug: "apuntes",
  name: "Apuntes",
  url: "https://git.example.com/ana/apuntes.git",
  ref: "main",
  path: "",
  credentialId: CREDENTIAL_ID,
}

describe("createMyRepository with a saved credential", () => {
  test("another user's credential is NOT_FOUND and nothing is inserted", async () => {
    fakeDb.queue("select", [])

    await expectErrorCode(
      handler.createMyRepository({ context, input: create }),
      "NOT_FOUND"
    )
    expect(fakeDb.calls("insert")).toEqual([])
  })

  test("a credential for another host is BAD_REQUEST and nothing is inserted", async () => {
    fakeDb.queue("select", [credential({ host: "other.example.com" })])

    await expectErrorCode(
      handler.createMyRepository({ context, input: create }),
      "BAD_REQUEST"
    )
    expect(fakeDb.calls("insert")).toEqual([])
  })

  test("stores the clean URL and the credential id, and answers no credentials", async () => {
    fakeDb.queue("select", [credential()])
    fakeDb.queue("query.contentRepository.findFirst", undefined)
    fakeDb.queue("insert", [{ ...owned, credentialId: CREDENTIAL_ID }])

    const created = await handler.createMyRepository({ context, input: create })

    const [insert] = fakeDb.calls("insert")
    if (!insert) throw new Error("no insert recorded")
    expect(stepArgs(insert, "values")[0]).toMatchObject({
      url: "https://git.example.com/ana/apuntes.git",
      credentialId: CREDENTIAL_ID,
    })
    expect(created.credentialId).toBe(CREDENTIAL_ID)
    expect(JSON.stringify(created)).not.toContain(TOKEN)
  })
})

describe("updateMyRepository and the credential", () => {
  const withCredential = { ...owned, credentialId: CREDENTIAL_ID }

  test("null removes the credential and starts a sync", async () => {
    fakeDb.queue("query.contentRepository.findFirst", withCredential)
    fakeDb.queue("update", [owned])

    await handler.updateMyRepository({
      context,
      input: { slug: "apuntes", credentialId: null },
    })

    const [update] = fakeDb.calls("update")
    if (!update) throw new Error("no update recorded")
    expect(stepArgs(update, "set")[0]).toEqual({ credentialId: null })
    expect(reader.syncInBackground).toHaveBeenCalledTimes(1)
  })

  test("a new URL on another host refuses to keep the credential", async () => {
    fakeDb.queue("query.contentRepository.findFirst", withCredential)
    fakeDb.queue("select", [credential()])

    await expectErrorCode(
      handler.updateMyRepository({
        context,
        input: { slug: "apuntes", url: "https://evil.example.org/x.git" },
      }),
      "BAD_REQUEST"
    )
    expect(fakeDb.calls("update")).toEqual([])
  })

  test("a new URL on the same host keeps it", async () => {
    fakeDb.queue("query.contentRepository.findFirst", withCredential)
    fakeDb.queue("select", [credential()])
    fakeDb.queue("update", [withCredential])

    await handler.updateMyRepository({
      context,
      input: { slug: "apuntes", url: "https://git.example.com/ana/otro.git" },
    })

    const [update] = fakeDb.calls("update")
    if (!update) throw new Error("no update recorded")
    expect(stepArgs(update, "set")[0]).toEqual({
      url: "https://git.example.com/ana/otro.git",
    })
  })
})

describe("reading the branches with a saved credential", () => {
  test("a typed URL is read with the chosen credential's token", async () => {
    fakeDb.queue("select", [credential()])

    await expectErrorCode(
      handler.listMyBranches({
        context,
        input: { url: create.url, credentialId: CREDENTIAL_ID },
      }),
      "BAD_REQUEST"
    )
    expect(refused).toHaveBeenCalledWith(
      `https://ana:${TOKEN}@git.example.com/ana/apuntes.git`
    )
  })

  test("a stored repository is read with its own credential", async () => {
    fakeDb.queue("query.contentRepository.findFirst", {
      ...owned,
      credentialId: CREDENTIAL_ID,
    })
    fakeDb.queue("select", [credential()])

    await expectErrorCode(
      handler.listMyBranches({ context, input: { slug: "apuntes" } }),
      "BAD_REQUEST"
    )
    expect(refused).toHaveBeenCalledWith(
      `https://ana:${TOKEN}@git.example.com/ana/apuntes.git`
    )
  })

  test("a credential that can't be decrypted is PRECONDITION_FAILED", async () => {
    fakeDb.queue("select", [credential({ ciphertext: "garbage" })])

    await expectErrorCode(
      handler.listMyBranches({
        context,
        input: { url: create.url, credentialId: CREDENTIAL_ID },
      }),
      "PRECONDITION_FAILED"
    )
    expect(refused).not.toHaveBeenCalled()
  })
})

describe("withSavedAccess", () => {
  test("returns a repository without a credential as it is", async () => {
    const same = storedRepository()
    expect(await withSavedAccess(same)).toBe(same)
    expect(fakeDb.calls()).toEqual([])
  })

  test("puts the credential's username and token in the URL", async () => {
    fakeDb.queue("select", [credential()])
    const access = await withSavedAccess(
      storedRepository({
        url: "https://git.example.com/ana/apuntes.git",
        credentialId: CREDENTIAL_ID,
      })
    )
    expect(access.url).toBe(
      `https://ana:${TOKEN}@git.example.com/ana/apuntes.git`
    )
  })

  test("throws when the credential is gone", async () => {
    fakeDb.queue("select", [])
    await expect(
      withSavedAccess(storedRepository({ credentialId: CREDENTIAL_ID }))
    ).rejects.toThrow(UNREADABLE_MESSAGE)
  })
})

describe("the reader and a saved credential", () => {
  const cleanups: (() => Promise<void>)[] = []
  afterEach(async () => {
    for (const cleanup of cleanups.splice(0)) await cleanup()
  })

  async function readerOver(
    withAccess: (repository: StoredRepository) => Promise<StoredRepository>
  ) {
    const clones = await createContentFolder({})
    cleanups.push(clones.remove)
    const repository = storedRepository({ credentialId: CREDENTIAL_ID })
    const store = memoryRepositoryStore([repository])
    const sources: string[] = []
    const syncing = createContentReader({
      cloneRoot: clones.root,
      repositories: store,
      resolveSource: (stored) => {
        sources.push(stored.url)
        return "/nonexistent/remote"
      },
      withAccess,
      logger: { info: mock(() => {}), warn: mock(() => {}) },
    })
    return { syncing, repository, sources }
  }

  test("clones from the URL with the credential, and a failure shows none", async () => {
    const composed = `https://ana:${TOKEN}@git.example/documentacion.git`
    const { syncing, repository, sources } = await readerOver(
      async (stored) => ({ ...stored, url: composed })
    )

    const result = await syncing.sync(repository)

    expect(sources).toEqual([composed])
    expect(result.ok).toBe(false)
    expect(JSON.stringify(result)).not.toContain(TOKEN)
  })

  test("a credential that can't be used fails the sync with its message", async () => {
    const { syncing, repository, sources } = await readerOver(async () => {
      throw new Error(UNREADABLE_MESSAGE)
    })

    expect(await syncing.sync(repository)).toEqual({
      ok: false,
      error: UNREADABLE_MESSAGE,
    })
    expect(sources).toEqual([])
  })
})
