import { beforeEach, describe, expect, mock, test } from "bun:test"
import type { SyncResult } from "@nonete/content"
import { contentRepositoryRow, NOW, stepArgs } from "@nonete/db/testing"
import { call } from "@orpc/server"
import { createContentRemote } from "#tests/fixtures/content"
import { anonymousContext, userContext } from "#tests/fixtures/context"
import { fakeDb } from "#tests/fixtures/db"
import { resetEnv, testEnv } from "#tests/fixtures/env"
import { expectErrorCode } from "#tests/fixtures/errors"
import { createContentHandler } from "#v1/content/handler"
import { contentInput } from "#v1/content/input"
import type { ContentReader, StoredRepository } from "#v1/content/reader"
import { contentRouter } from "#v1/content/router"

const SECRET_URL = "https://ana:secreto@git.example/org/docs.git"
const row = contentRepositoryRow()
const privateRow = contentRepositoryRow({ url: SECRET_URL })

/** A reader whose syncs and removals are recorded, never run. */
function fakeReader(result: SyncResult = { ok: true, commit: "abc123" }) {
  const reader = {
    content: mock(async (_slug: string) => undefined),
    sync: mock(async (_repository: StoredRepository) => result),
    syncAll: mock(async () => []),
    syncInBackground: mock((_repository: StoredRepository) => {}),
    remove: mock(async (_repository: StoredRepository) => {}),
  } satisfies ContentReader
  return reader
}

let reader = fakeReader()
let handler = createContentHandler(reader)

function useReader(next: ReturnType<typeof fakeReader>) {
  reader = next
  handler = createContentHandler(reader)
}

beforeEach(() => {
  fakeDb.reset()
  resetEnv()
  useReader(fakeReader())
})

describe("access", () => {
  test("without a session the repositories are UNAUTHORIZED, and FORBIDDEN for a non-admin", async () => {
    await expectErrorCode(
      call(contentRouter.listRepositories, undefined, {
        context: anonymousContext(),
      }),
      "UNAUTHORIZED"
    )
    await expectErrorCode(
      call(contentRouter.listRepositories, undefined, {
        context: userContext(),
      }),
      "FORBIDDEN"
    )
    expect(fakeDb.calls()).toEqual([])
  })
})

describe("content input", () => {
  test("a slug with spaces or capitals and a non-http URL are refused", () => {
    const base = { name: "Docs", url: "https://git.example/docs.git" }
    expect(
      contentInput.createRepository.safeParse({ ...base, slug: "Mi Repo" })
        .success
    ).toBe(false)
    expect(
      contentInput.createRepository.safeParse({
        ...base,
        slug: "docs",
        url: "file:///srv/docs.git",
      }).success
    ).toBe(false)
    expect(
      contentInput.createRepository.parse({ ...base, slug: "mis-docs-2" })
    ).toMatchObject({ slug: "mis-docs-2", ref: "main" })
  })
})

describe("content.listRepositories", () => {
  test("hides the URL's credentials and gives each repository its catalog URL", async () => {
    fakeDb.queue("query.contentRepository.findMany", [
      contentRepositoryRow({
        url: SECRET_URL,
        lastSyncedAt: NOW,
        lastCommit: "abc123",
      }),
    ])

    const [listed] = await handler.listRepositories()

    expect(listed).toMatchObject({
      slug: "documentacion",
      url: "https://***@git.example/org/docs.git",
      catalogUrl: `${testEnv.CORS_ORIGIN}/api/v1/content/schemas/documentacion`,
      lastSyncedAt: NOW.toISOString(),
      lastCommit: "abc123",
      lastSyncError: null,
    })
    expect(JSON.stringify(listed)).not.toContain("secreto")
  })
})

describe("content.createRepository", () => {
  const input = {
    slug: "documentacion",
    name: "Documentación",
    url: SECRET_URL,
    ref: "main",
  }

  test("a taken slug is CONFLICT and nothing is inserted", async () => {
    fakeDb.queue("query.contentRepository.findFirst", row)

    await expectErrorCode(handler.createRepository({ input }), "CONFLICT")
    expect(fakeDb.calls("insert")).toEqual([])
    expect(reader.syncInBackground).not.toHaveBeenCalled()
  })

  test("losing a concurrent create on the unique slug is CONFLICT", async () => {
    fakeDb.queue("query.contentRepository.findFirst", undefined)
    fakeDb.queue("insert", [])

    await expectErrorCode(handler.createRepository({ input }), "CONFLICT")
    expect(reader.syncInBackground).not.toHaveBeenCalled()
  })

  test("stores the repository, starts its sync and answers without the credentials", async () => {
    fakeDb.queue("query.contentRepository.findFirst", undefined)
    fakeDb.queue("insert", [privateRow])

    const created = await handler.createRepository({ input })

    const [insert] = fakeDb.calls("insert")
    if (!insert) throw new Error("no insert recorded")
    expect(stepArgs(insert, "values")[0]).toEqual(input)
    expect(reader.syncInBackground).toHaveBeenCalledWith(privateRow)
    expect(created.url).toBe("https://***@git.example/org/docs.git")
  })
})

describe("content.updateRepository", () => {
  test("an unknown repository is NOT_FOUND and nothing is written", async () => {
    fakeDb.queue("query.contentRepository.findFirst", undefined)

    await expectErrorCode(
      handler.updateRepository({ input: { slug: "nada", name: "X" } }),
      "NOT_FOUND"
    )
    expect(fakeDb.calls("update")).toEqual([])
  })

  test("changing only the ref keeps the rest and starts a sync", async () => {
    const updated = { ...privateRow, ref: "produccion" }
    fakeDb.queue("query.contentRepository.findFirst", privateRow)
    fakeDb.queue("update", [updated])

    const result = await handler.updateRepository({
      input: { slug: "documentacion", ref: "produccion" },
    })

    const [update] = fakeDb.calls("update")
    if (!update) throw new Error("no update recorded")
    expect(stepArgs(update, "set")[0]).toEqual({ ref: "produccion" })
    expect(reader.syncInBackground).toHaveBeenCalledWith(updated)
    expect(result.ref).toBe("produccion")
  })

  test("changing only the name keeps the stored URL, credentials included, and doesn't sync", async () => {
    fakeDb.queue("query.contentRepository.findFirst", privateRow)
    fakeDb.queue("update", [{ ...privateRow, name: "Docs" }])

    await handler.updateRepository({
      input: { slug: "documentacion", name: "Docs" },
    })

    const [update] = fakeDb.calls("update")
    if (!update) throw new Error("no update recorded")
    expect(stepArgs(update, "set")[0]).toEqual({ name: "Docs" })
    expect(reader.syncInBackground).not.toHaveBeenCalled()
  })

  test("an empty patch writes nothing and returns the repository", async () => {
    fakeDb.queue("query.contentRepository.findFirst", row)

    const result = await handler.updateRepository({
      input: { slug: "documentacion" },
    })

    expect(fakeDb.calls("update")).toEqual([])
    expect(result.slug).toBe("documentacion")
  })
})

describe("content.deleteRepository", () => {
  test("an unknown repository is NOT_FOUND and nothing is deleted", async () => {
    fakeDb.queue("query.contentRepository.findFirst", undefined)

    await expectErrorCode(
      handler.deleteRepository({ input: { slug: "nada" } }),
      "NOT_FOUND"
    )
    expect(fakeDb.calls("delete")).toEqual([])
    expect(reader.remove).not.toHaveBeenCalled()
  })

  test("deletes the row, then removes its clone", async () => {
    fakeDb.queue("query.contentRepository.findFirst", row)
    fakeDb.queue("delete", undefined)

    expect(
      await handler.deleteRepository({ input: { slug: "documentacion" } })
    ).toEqual({ id: row.id, success: true })
    expect(fakeDb.calls("delete")).toHaveLength(1)
    expect(reader.remove).toHaveBeenCalledWith(row)
  })
})

describe("content.syncRepository", () => {
  test("an unknown repository is NOT_FOUND and nothing is synced", async () => {
    fakeDb.queue("query.contentRepository.findFirst", undefined)

    await expectErrorCode(
      handler.syncRepository({ input: { slug: "nada" } }),
      "NOT_FOUND"
    )
    expect(reader.sync).not.toHaveBeenCalled()
  })

  test("a failed sync is BAD_GATEWAY with the git error", async () => {
    useReader(fakeReader({ ok: false, error: "fatal: *** rejected" }))
    fakeDb.queue("query.contentRepository.findFirst", privateRow)

    const error = await handler
      .syncRepository({ input: { slug: "documentacion" } })
      .then(
        () => undefined,
        (caught: unknown) => caught
      )

    expect(error).toMatchObject({
      code: "BAD_GATEWAY",
      message: "fatal: *** rejected",
    })
  })

  test("returns the repository with the outcome the sync stored", async () => {
    fakeDb.queue("query.contentRepository.findFirst", row)
    fakeDb.queue(
      "query.contentRepository.findFirst",
      contentRepositoryRow({ lastSyncedAt: NOW, lastCommit: "abc123" })
    )

    const result = await handler.syncRepository({
      input: { slug: "documentacion" },
    })

    expect(reader.sync).toHaveBeenCalledWith(row)
    expect(result).toMatchObject({
      lastCommit: "abc123",
      lastSyncedAt: NOW.toISOString(),
    })
  })
})

describe("content input: listBranches", () => {
  test("takes either a URL or a slug, never both or neither", () => {
    const url = "https://git.example/docs.git"
    expect(contentInput.listBranches.safeParse({ url }).success).toBe(true)
    expect(
      contentInput.listBranches.safeParse({ slug: "documentacion" }).success
    ).toBe(true)
    expect(
      contentInput.listBranches.safeParse({ url, slug: "documentacion" })
        .success
    ).toBe(false)
    expect(contentInput.listBranches.safeParse({}).success).toBe(false)
  })
})

describe("content.listBranches", () => {
  test("reads the branches of the URL sent, without touching the database", async () => {
    const remote = await createContentRemote()
    try {
      expect(
        await handler.listBranches({ input: { url: remote.url } })
      ).toEqual({ branches: ["main"], defaultBranch: "main" })
      expect(fakeDb.calls()).toEqual([])
    } finally {
      await remote.remove()
    }
  })

  test("reads a stored repository at its stored URL", async () => {
    const remote = await createContentRemote()
    try {
      fakeDb.queue(
        "query.contentRepository.findFirst",
        contentRepositoryRow({ url: remote.url })
      )
      expect(
        await handler.listBranches({ input: { slug: "documentacion" } })
      ).toEqual({ branches: ["main"], defaultBranch: "main" })
    } finally {
      await remote.remove()
    }
  })

  test("an unknown stored repository is NOT_FOUND", async () => {
    fakeDb.queue("query.contentRepository.findFirst", undefined)
    await expectErrorCode(
      handler.listBranches({ input: { slug: "nada" } }),
      "NOT_FOUND"
    )
  })

  test("an unreachable remote is BAD_GATEWAY and the error has no credentials", async () => {
    const error = await handler
      .listBranches({
        input: { url: "https://user:s3cret@127.0.0.1:1/doc.git" },
      })
      .then(
        () => undefined,
        (caught: unknown) => caught
      )
    expect(error).toMatchObject({ code: "BAD_GATEWAY" })
    expect(String(error instanceof Error && error.message)).not.toContain(
      "s3cret"
    )
  })
})
