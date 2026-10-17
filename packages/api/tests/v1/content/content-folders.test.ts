import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test"
import type { RemoteCheck } from "@nonete/content"
import { contentRepositoryRow } from "@nonete/db/testing"
import { call } from "@orpc/server"
import { createContentRemote } from "#tests/fixtures/content"
import {
  adminContext,
  anonymousContext,
  userContext,
} from "#tests/fixtures/context"
import { fakeDb } from "#tests/fixtures/db"
import { resetEnv } from "#tests/fixtures/env"
import { expectErrorCode } from "#tests/fixtures/errors"
import { createContentHandler } from "#v1/content/handler"
import { contentInput } from "#v1/content/input"
import type { ContentReader, StoredRepository } from "#v1/content/reader"
import { contentRouter } from "#v1/content/router"

const cleanups: (() => Promise<void>)[] = []

afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup()
})

const SITE = { "docs/doc.config.yaml": 'nombre: Sitio\nplataforma: "1"\n' }

async function remote(files: Record<string, string> = SITE) {
  const created = await createContentRemote(files)
  cleanups.push(created.remove)
  return created.url
}

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

const checkRemote = mock(
  async (_url: string): Promise<RemoteCheck> => ({ ok: true })
)
const handler = createContentHandler(fakeReader(), {
  hostedRoot: "/nonexistent/hosted",
  checkRemote,
})

beforeEach(() => {
  fakeDb.reset()
  resetEnv()
  checkRemote.mockClear()
})

describe("content.listContentFolders", () => {
  test("a typed URL lists the folders holding a site", async () => {
    const url = await remote()
    expect(
      await handler.listContentFolders({
        context: adminContext(),
        input: { url },
      })
    ).toEqual({
      folders: ["docs"],
    })
  })

  test("a stored repository is read at its stored URL", async () => {
    const url = await remote()
    fakeDb.queue(
      "query.contentRepository.findFirst",
      contentRepositoryRow({ url })
    )
    expect(
      await handler.listContentFolders({
        context: adminContext(),
        input: { slug: "documentacion" },
      })
    ).toEqual({ folders: ["docs"] })
  })

  test("an unknown repository is NOT_FOUND", async () => {
    fakeDb.queue("query.contentRepository.findFirst", undefined)
    await expectErrorCode(
      handler.listContentFolders({
        context: adminContext(),
        input: { slug: "nada" },
      }),
      "NOT_FOUND"
    )
  })

  test("a ref the remote lacks is BAD_GATEWAY", async () => {
    const url = await remote()
    await expectErrorCode(
      handler.listContentFolders({
        context: adminContext(),
        input: { url, ref: "nada" },
      }),
      "BAD_GATEWAY"
    )
  })

  test("the folders follow the ref sent", async () => {
    const url = await remote()
    expect(
      await handler.listContentFolders({
        context: adminContext(),
        input: { url, ref: "main" },
      })
    ).toEqual({ folders: ["docs"] })
  })

  test("an error never carries the credentials", async () => {
    const error = await handler
      .listContentFolders({
        context: adminContext(),
        input: { url: "https://ana:secreto@127.0.0.1:9/x.git" },
      })
      .then(
        () => undefined,
        (caught: unknown) => caught
      )
    expect(error).toMatchObject({ code: "BAD_GATEWAY" })
    expect(JSON.stringify(error)).not.toContain("secreto")
  })

  test("it is for admins", async () => {
    await expectErrorCode(
      call(
        contentRouter.listContentFolders,
        { slug: "documentacion" },
        { context: anonymousContext() }
      ),
      "UNAUTHORIZED"
    )
    await expectErrorCode(
      call(
        contentRouter.listContentFolders,
        { slug: "documentacion" },
        { context: userContext() }
      ),
      "FORBIDDEN"
    )
    expect(fakeDb.calls()).toEqual([])
  })

  test("the input needs a URL or a slug, not both", () => {
    expect(contentInput.listContentFolders.safeParse({}).success).toBe(false)
    expect(
      contentInput.listContentFolders.safeParse({
        url: "https://git.example/x.git",
        slug: "documentacion",
      }).success
    ).toBe(false)
  })
})

describe("content.listMyContentFolders", () => {
  test("any signed-in user may ask, an anonymous one may not", async () => {
    await expectErrorCode(
      call(
        contentRouter.listMyContentFolders,
        { slug: "apuntes" },
        { context: anonymousContext() }
      ),
      "UNAUTHORIZED"
    )
    fakeDb.queue("query.contentRepository.findFirst", undefined)
    await expectErrorCode(
      call(
        contentRouter.listMyContentFolders,
        { slug: "apuntes" },
        { context: adminContext() }
      ),
      "NOT_FOUND"
    )
  })

  test("a slug that is not the caller's is NOT_FOUND and nothing is read", async () => {
    fakeDb.queue("query.contentRepository.findFirst", undefined)
    await expectErrorCode(
      handler.listMyContentFolders({
        context: userContext(),
        input: { slug: "casa" },
      }),
      "NOT_FOUND"
    )
    expect(checkRemote).not.toHaveBeenCalled()
  })

  test("an address that is not allowed is BAD_REQUEST and nothing is read", async () => {
    checkRemote.mockResolvedValueOnce({ ok: false, error: "not allowed" })
    await expectErrorCode(
      handler.listMyContentFolders({
        context: userContext(),
        input: { url: "https://git.example/ana/x.git" },
      }),
      "BAD_REQUEST"
    )
  })

  test("a user's remote is read over https only", async () => {
    const url = await remote()
    await expectErrorCode(
      handler.listMyContentFolders({ context: userContext(), input: { url } }),
      "BAD_GATEWAY"
    )
    expect(checkRemote).toHaveBeenCalledWith(url)
  })

  test("an internal address fails input validation before any read", () => {
    expect(
      contentInput.listMyContentFolders.safeParse({
        url: "https://192.168.1.10/x.git",
      }).success
    ).toBe(false)
  })
})
