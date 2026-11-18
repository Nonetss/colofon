import { beforeEach, describe, expect, mock, test } from "bun:test"
import type { RemoteCheck } from "@nonete/content"
import { contentRepositoryRow, stepArgs } from "@nonete/db/testing"
import { call } from "@orpc/server"
import {
  anonymousContext,
  apiKeyContext,
  userContext,
} from "#tests/fixtures/context"
import { fakeDb } from "#tests/fixtures/db"
import { resetEnv } from "#tests/fixtures/env"
import { expectErrorCode } from "#tests/fixtures/errors"
import { createContentHandler } from "#v1/content/handler"
import { contentInput } from "#v1/content/input"
import type { ContentReader, StoredRepository } from "#v1/content/reader"
import { contentRouter } from "#v1/content/router"

// `ana` owns `apuntes` and shared it with `equipo-docs`; the caller is the
// signed-in user, a member of that organization.
const apuntes = contentRepositoryRow({
  id: "repo-apuntes",
  slug: "apuntes",
  name: "Apuntes",
  url: "https://ana:secreto@git.example/ana/apuntes.git",
  ownerId: "ana",
  contentPath: "docs",
})

/** What `sharedRepositoriesOf` reads: the repository and the organization. */
const sharedWithCaller = [
  { repositoryId: "repo-apuntes", organizationName: "Equipo docs" },
]

/** A reader whose clone has the folder asked for, or not. */
function fakeReader(hasFolder = true) {
  return {
    content: mock(async () => undefined),
    site: mock(async () => undefined),
    contentRoot: mock(
      async (_repository: StoredRepository): Promise<string | undefined> => {
        if (hasFolder) return "/clone/sitio"
        return undefined
      }
    ),
    sync: mock(async (_repository: StoredRepository) => ({
      ok: true as const,
      commit: "abc123",
    })),
    syncAll: mock(async () => []),
    syncInBackground: mock((_repository: StoredRepository) => {}),
    remove: mock(async (_repository: StoredRepository) => {}),
  } satisfies ContentReader
}

const allowed = mock(
  async (_url: string): Promise<RemoteCheck> => ({ ok: true })
)
let reader = fakeReader()
let handler = createContentHandler(reader, {
  hostedRoot: "/nonexistent/hosted",
  checkRemote: allowed,
})

function useReader(next: ReturnType<typeof fakeReader>) {
  reader = next
  handler = createContentHandler(reader, {
    hostedRoot: "/nonexistent/hosted",
    checkRemote: allowed,
  })
}

beforeEach(() => {
  fakeDb.reset()
  resetEnv()
  allowed.mockClear()
  useReader(fakeReader())
})

describe("content.listSharedRepositories", () => {
  test("without a session it is UNAUTHORIZED", async () => {
    await expectErrorCode(
      call(contentRouter.listSharedRepositories, undefined, {
        context: anonymousContext(),
      }),
      "UNAUTHORIZED"
    )
    expect(fakeDb.calls()).toEqual([])
  })

  test("nothing shared with the caller reads no repository", async () => {
    fakeDb.queue("select", [])

    const repositories = await handler.listSharedRepositories({
      context: userContext(),
    })

    expect(repositories).toEqual([])
    expect(fakeDb.calls("query.contentRepository.findMany")).toEqual([])
  })

  test("lists them with their organization and without the owner's URL or login", async () => {
    fakeDb.queue("select", sharedWithCaller)
    fakeDb.queue("query.contentRepository.findMany", [apuntes])

    const repositories = await handler.listSharedRepositories({
      context: userContext(),
    })

    const [findMany] = fakeDb.calls("query.contentRepository.findMany")
    if (!findMany) throw new Error("no query recorded")
    expect(stepArgs(findMany, "findMany")[0]).toMatchObject({
      where: { id: { in: ["repo-apuntes"] } },
    })
    expect(repositories).toHaveLength(1)
    expect(repositories[0]).toMatchObject({
      slug: "apuntes",
      name: "Apuntes",
      path: "docs",
      organization: "Equipo docs",
    })
    expect(repositories[0]).not.toHaveProperty("url")
    expect(repositories[0]).not.toHaveProperty("credentialId")
    expect(repositories[0]).not.toHaveProperty("pushUrl")
  })

  test("the caller's own repository, shared by them, is not listed here", async () => {
    fakeDb.queue("select", sharedWithCaller)
    fakeDb.queue("query.contentRepository.findMany", [
      { ...apuntes, ownerId: "user-id" },
    ])

    expect(
      await handler.listSharedRepositories({ context: userContext() })
    ).toEqual([])
  })
})

describe("content.updateSharedRepositoryPath", () => {
  test("only from a browser session", async () => {
    await expectErrorCode(
      call(
        contentRouter.updateSharedRepositoryPath,
        { slug: "apuntes", path: "sitio" },
        { context: apiKeyContext() }
      ),
      "FORBIDDEN"
    )
    expect(fakeDb.calls()).toEqual([])
  })

  test("a member sets the folder, which is the only thing written", async () => {
    fakeDb.queue("select", sharedWithCaller)
    fakeDb.queue("query.contentRepository.findFirst", apuntes)
    fakeDb.queue("update", [{ ...apuntes, contentPath: "sitio" }])

    const saved = await handler.updateSharedRepositoryPath({
      context: userContext(),
      input: { slug: "apuntes", path: "sitio" },
    })

    const [update] = fakeDb.calls("update")
    if (!update) throw new Error("no update recorded")
    expect(stepArgs(update, "set")[0]).toEqual({ contentPath: "sitio" })
    expect(saved).toMatchObject({ path: "sitio", organization: "Equipo docs" })
    expect(reader.contentRoot).toHaveBeenCalledTimes(1)
    expect(reader.contentRoot).toHaveBeenCalledWith(
      expect.objectContaining({ id: "repo-apuntes", contentPath: "sitio" })
    )
    expect(reader.syncInBackground).not.toHaveBeenCalled()
  })

  test("a folder the clone doesn't have is BAD_REQUEST and nothing is written", async () => {
    useReader(fakeReader(false))
    fakeDb.queue("select", sharedWithCaller)
    fakeDb.queue("query.contentRepository.findFirst", apuntes)

    await expectErrorCode(
      handler.updateSharedRepositoryPath({
        context: userContext(),
        input: { slug: "apuntes", path: "no-existe" },
      }),
      "BAD_REQUEST"
    )
    expect(fakeDb.calls("update")).toEqual([])
  })

  test("the same folder changes nothing", async () => {
    fakeDb.queue("select", sharedWithCaller)
    fakeDb.queue("query.contentRepository.findFirst", apuntes)

    const saved = await handler.updateSharedRepositoryPath({
      context: userContext(),
      input: { slug: "apuntes", path: "docs" },
    })

    expect(saved.path).toBe("docs")
    expect(fakeDb.calls("update")).toEqual([])
    expect(reader.contentRoot).not.toHaveBeenCalled()
  })

  test("a repository nobody shared with the caller is NOT_FOUND", async () => {
    fakeDb.queue("select", [])

    await expectErrorCode(
      handler.updateSharedRepositoryPath({
        context: userContext(),
        input: { slug: "apuntes", path: "sitio" },
      }),
      "NOT_FOUND"
    )
    expect(fakeDb.calls("update")).toEqual([])
  })

  test("a repository shared with someone else is NOT_FOUND", async () => {
    fakeDb.queue("select", sharedWithCaller)
    fakeDb.queue("query.contentRepository.findFirst", undefined)

    await expectErrorCode(
      handler.updateSharedRepositoryPath({
        context: userContext(),
        input: { slug: "otro", path: "sitio" },
      }),
      "NOT_FOUND"
    )
    expect(fakeDb.calls("update")).toEqual([])
  })

  test("the owner has the owner procedures, not this one", async () => {
    fakeDb.queue("select", sharedWithCaller)
    fakeDb.queue("query.contentRepository.findFirst", {
      ...apuntes,
      ownerId: "user-id",
    })

    await expectErrorCode(
      handler.updateSharedRepositoryPath({
        context: userContext(),
        input: { slug: "apuntes", path: "sitio" },
      }),
      "NOT_FOUND"
    )
    expect(fakeDb.calls("update")).toEqual([])
  })

  test.each(["../fuera", "/etc", "docs//x", ".git"])(
    "the folder %s is refused",
    (path) => {
      expect(
        contentInput.updateSharedRepositoryPath.safeParse({
          slug: "apuntes",
          path,
        }).success
      ).toBe(false)
    }
  )

  test("the folder is required", () => {
    expect(
      contentInput.updateSharedRepositoryPath.safeParse({ slug: "apuntes" })
        .success
    ).toBe(false)
  })
})

describe("content.listSharedContentFolders", () => {
  test("a repository that is not shared with the caller is NOT_FOUND and nothing is read", async () => {
    fakeDb.queue("select", [])

    await expectErrorCode(
      handler.listSharedContentFolders({
        context: userContext(),
        input: { slug: "apuntes" },
      }),
      "NOT_FOUND"
    )
    expect(allowed).not.toHaveBeenCalled()
  })

  test("its remote is vetted before it is read", async () => {
    allowed.mockResolvedValueOnce({ ok: false, error: "not allowed" })
    fakeDb.queue("select", sharedWithCaller)
    fakeDb.queue("query.contentRepository.findFirst", apuntes)

    await expectErrorCode(
      handler.listSharedContentFolders({
        context: userContext(),
        input: { slug: "apuntes" },
      }),
      "BAD_REQUEST"
    )
  })
})
