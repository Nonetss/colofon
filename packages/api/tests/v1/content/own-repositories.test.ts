import { beforeEach, describe, expect, mock, test } from "bun:test"
import type { RemoteCheck } from "@nonete/content"
import { contentRepositoryRow, stepArgs } from "@nonete/db/testing"
import { call } from "@orpc/server"
import {
  adminContext,
  anonymousContext,
  userContext,
} from "#tests/fixtures/context"
import { fakeDb } from "#tests/fixtures/db"
import { resetEnv } from "#tests/fixtures/env"
import { expectErrorCode } from "#tests/fixtures/errors"
import {
  audienceFilter,
  createContentHandler,
  MAX_USER_REPOSITORIES,
} from "#v1/content/handler"
import { contentInput } from "#v1/content/input"
import type { ContentReader, StoredRepository } from "#v1/content/reader"
import { contentRouter } from "#v1/content/router"

const SECRET_URL = "https://ana:secreto@git.example/ana/apuntes.git"
const owned = contentRepositoryRow({
  slug: "apuntes",
  name: "Apuntes",
  url: SECRET_URL,
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

let reader = fakeReader()
const allowed = mock(
  async (_url: string): Promise<RemoteCheck> => ({ ok: true })
)
let handler = createContentHandler(reader, {
  hostedRoot: "/nonexistent/hosted",
  checkRemote: allowed,
})

beforeEach(() => {
  fakeDb.reset()
  resetEnv()
  reader = fakeReader()
  allowed.mockClear()
  handler = createContentHandler(reader, {
    hostedRoot: "/nonexistent/hosted",
    checkRemote: allowed,
  })
})

describe("audienceFilter", () => {
  test("every repository has no filter", () => {
    expect(audienceFilter("all")).toEqual({})
  })

  test("the platform's are the ones without an owner", () => {
    expect(audienceFilter("platform")).toEqual({ ownerId: { isNull: true } })
  })

  test("a user reads the platform's and their own", () => {
    expect(audienceFilter({ userId: "ana" })).toEqual({
      OR: [{ ownerId: { isNull: true } }, { ownerId: "ana" }],
    })
  })
})

describe("access to the owner procedures", () => {
  test("without a session they are UNAUTHORIZED, and any signed-in user may use them", async () => {
    await expectErrorCode(
      call(contentRouter.listMyRepositories, undefined, {
        context: anonymousContext(),
      }),
      "UNAUTHORIZED"
    )
    expect(fakeDb.calls()).toEqual([])

    fakeDb.queue("query.contentRepository.findMany", [])
    const answer = await call(contentRouter.listMyRepositories, undefined, {
      context: userContext(),
    })
    expect(answer).toEqual({ limit: MAX_USER_REPOSITORIES, repositories: [] })
  })
})

describe("content.listMyRepositories", () => {
  test("lists the caller's repositories without credentials or hosting fields", async () => {
    fakeDb.queue("query.contentRepository.findMany", [owned])

    const { repositories } = await handler.listMyRepositories({
      context: userContext(),
    })

    const [findMany] = fakeDb.calls("query.contentRepository.findMany")
    if (!findMany) throw new Error("no query recorded")
    expect(stepArgs(findMany, "findMany")[0]).toMatchObject({
      where: { ownerId: "user-id" },
    })
    expect(repositories).toHaveLength(1)
    expect(repositories[0]?.url).toBe("https://***@git.example/ana/apuntes.git")
    expect(repositories[0]).not.toHaveProperty("pushUrl")
    expect(repositories[0]).not.toHaveProperty("catalogUrl")
  })
})

describe("content.createMyRepository", () => {
  const input = {
    slug: "apuntes",
    name: "Apuntes",
    url: SECRET_URL,
    ref: "main",
    path: "",
  }

  test("the eleventh repository is BAD_REQUEST and nothing is inserted", async () => {
    fakeDb.queue("select", [{ total: MAX_USER_REPOSITORIES }])

    await expectErrorCode(
      handler.createMyRepository({ context: userContext(), input }),
      "BAD_REQUEST"
    )
    expect(fakeDb.calls("insert")).toEqual([])
  })

  test("a slug used by anyone is CONFLICT", async () => {
    fakeDb.queue("select", [{ total: 0 }])
    fakeDb.queue(
      "query.contentRepository.findFirst",
      contentRepositoryRow({ slug: "apuntes", ownerId: "other-id" })
    )

    await expectErrorCode(
      handler.createMyRepository({ context: userContext(), input }),
      "CONFLICT"
    )
    expect(fakeDb.calls("insert")).toEqual([])
    expect(reader.syncInBackground).not.toHaveBeenCalled()
  })

  test("stores it as the caller's, starts its sync and hides the token", async () => {
    fakeDb.queue("select", [{ total: 0 }])
    fakeDb.queue("query.contentRepository.findFirst", undefined)
    fakeDb.queue("insert", [owned])

    const created = await handler.createMyRepository({
      context: userContext(),
      input,
    })

    const [insert] = fakeDb.calls("insert")
    if (!insert) throw new Error("no insert recorded")
    expect(stepArgs(insert, "values")[0]).toEqual({
      slug: "apuntes",
      name: "Apuntes",
      url: SECRET_URL,
      ref: "main",
      contentPath: "",
      ownerId: "user-id",
    })
    expect(reader.syncInBackground).toHaveBeenCalledWith(owned)
    expect(created.url).toBe("https://***@git.example/ana/apuntes.git")
  })
})

describe("the content folder of an own repository", () => {
  test("it is stored on create and shown in the answer", async () => {
    fakeDb.queue("select", [{ total: 0 }])
    fakeDb.queue("query.contentRepository.findFirst", undefined)
    fakeDb.queue("insert", [{ ...owned, contentPath: "docs" }])

    const created = await handler.createMyRepository({
      context: userContext(),
      input: {
        slug: "apuntes",
        name: "Apuntes",
        url: SECRET_URL,
        ref: "main",
        path: "docs",
      },
    })

    const [insert] = fakeDb.calls("insert")
    if (!insert) throw new Error("no insert recorded")
    expect(stepArgs(insert, "values")[0]).toMatchObject({ contentPath: "docs" })
    expect(created.path).toBe("docs")
  })

  test("editing only the folder is saved and starts no sync", async () => {
    fakeDb.queue("query.contentRepository.findFirst", owned)
    fakeDb.queue("update", [{ ...owned, contentPath: "sitio" }])

    const saved = await handler.updateMyRepository({
      context: userContext(),
      input: { slug: "apuntes", path: "sitio" },
    })

    const [update] = fakeDb.calls("update")
    if (!update) throw new Error("no update recorded")
    expect(stepArgs(update, "set")[0]).toEqual({ contentPath: "sitio" })
    expect(saved.path).toBe("sitio")
    expect(reader.syncInBackground).not.toHaveBeenCalled()
  })

  test.each(["../fuera", "/etc", "docs//x", ".git"])(
    "the folder %s is refused",
    (path) => {
      expect(
        contentInput.createMyRepository.safeParse({
          slug: "apuntes",
          name: "x",
          url: "https://github.com/ana/x.git",
          path,
        }).success
      ).toBe(false)
      expect(
        contentInput.updateMyRepository.safeParse({ slug: "apuntes", path })
          .success
      ).toBe(false)
    }
  )

  test("the folder defaults to the root", () => {
    const parsed = contentInput.createMyRepository.parse({
      slug: "apuntes",
      name: "x",
      url: "https://github.com/ana/x.git",
    })
    expect(parsed.path).toBe("")
  })
})

describe("content.updateMyRepository", () => {
  test("a repository that is not the caller's is NOT_FOUND and nothing is written", async () => {
    fakeDb.queue("query.contentRepository.findFirst", undefined)

    await expectErrorCode(
      handler.updateMyRepository({
        context: userContext(),
        input: { slug: "casa", name: "Mía" },
      }),
      "NOT_FOUND"
    )
    const [find] = fakeDb.calls("query.contentRepository.findFirst")
    if (!find) throw new Error("no query recorded")
    expect(stepArgs(find, "findFirst")[0]).toEqual({
      where: { slug: "casa", ownerId: "user-id" },
    })
    expect(fakeDb.calls("update")).toEqual([])
  })

  test("a new ref starts a sync and keeps the stored URL", async () => {
    fakeDb.queue("query.contentRepository.findFirst", owned)
    const moved = contentRepositoryRow({ ...owned, ref: "produccion" })
    fakeDb.queue("update", [moved])

    await handler.updateMyRepository({
      context: userContext(),
      input: { slug: "apuntes", ref: "produccion" },
    })

    const [update] = fakeDb.calls("update")
    if (!update) throw new Error("no update recorded")
    expect(stepArgs(update, "set")[0]).toEqual({ ref: "produccion" })
    expect(reader.syncInBackground).toHaveBeenCalledWith(moved)
  })

  test("a new name alone starts no sync", async () => {
    fakeDb.queue("query.contentRepository.findFirst", owned)
    fakeDb.queue("update", [contentRepositoryRow({ ...owned, name: "Notas" })])

    await handler.updateMyRepository({
      context: userContext(),
      input: { slug: "apuntes", name: "Notas" },
    })

    expect(reader.syncInBackground).not.toHaveBeenCalled()
  })
})

describe("content.deleteMyRepository", () => {
  test("someone else's repository is NOT_FOUND and nothing is deleted", async () => {
    fakeDb.queue("query.contentRepository.findFirst", undefined)

    await expectErrorCode(
      handler.deleteMyRepository({
        context: adminContext(),
        input: { slug: "apuntes" },
      }),
      "NOT_FOUND"
    )
    expect(fakeDb.calls("delete")).toEqual([])
    expect(reader.remove).not.toHaveBeenCalled()
  })

  test("deletes the row and its clone", async () => {
    fakeDb.queue("query.contentRepository.findFirst", owned)
    fakeDb.queue("delete", [])

    const result = await handler.deleteMyRepository({
      context: userContext(),
      input: { slug: "apuntes" },
    })

    expect(result).toEqual({ id: owned.id, success: true })
    expect(reader.remove).toHaveBeenCalledWith(owned)
  })
})

describe("content.listMyBranches", () => {
  test("an address that is not allowed is BAD_REQUEST and nothing is read", async () => {
    allowed.mockResolvedValueOnce({ ok: false, error: "not allowed" })

    await expectErrorCode(
      handler.listMyBranches({
        context: userContext(),
        input: { url: "https://git.example/ana/x.git" },
      }),
      "BAD_REQUEST"
    )
  })

  test("a slug that is not the caller's is NOT_FOUND", async () => {
    fakeDb.queue("query.contentRepository.findFirst", undefined)

    await expectErrorCode(
      handler.listMyBranches({
        context: userContext(),
        input: { slug: "casa" },
      }),
      "NOT_FOUND"
    )
    expect(allowed).not.toHaveBeenCalled()
  })
})

describe("syncing a repository", () => {
  test("a user's repository is looked up within the caller's audience", async () => {
    fakeDb.queue("query.contentRepository.findFirst", undefined)

    await expectErrorCode(
      handler.syncRepository({
        context: adminContext(),
        input: { slug: "apuntes" },
      }),
      "NOT_FOUND"
    )
    const [find] = fakeDb.calls("query.contentRepository.findFirst")
    if (!find) throw new Error("no query recorded")
    expect(stepArgs(find, "findFirst")[0]).toEqual({
      where: {
        slug: "apuntes",
        OR: [{ ownerId: { isNull: true } }, { ownerId: "admin-id" }],
      },
    })
  })
})

describe("admin procedures leave the users' repositories alone", () => {
  test("they only look at the platform's rows", async () => {
    fakeDb.queue("query.contentRepository.findFirst", undefined)

    await expectErrorCode(
      handler.deleteRepository({ input: { slug: "apuntes" } }),
      "NOT_FOUND"
    )
    const [find] = fakeDb.calls("query.contentRepository.findFirst")
    if (!find) throw new Error("no query recorded")
    expect(stepArgs(find, "findFirst")[0]).toEqual({
      where: { slug: "apuntes", ownerId: { isNull: true } },
    })
  })

  test("a taken slug counts whoever owns it", async () => {
    fakeDb.queue("query.contentRepository.findFirst", owned)

    await expectErrorCode(
      handler.createRepository({
        input: {
          slug: "apuntes",
          name: "Apuntes",
          url: "https://git.example/x.git",
          ref: "main",
          path: "",
        },
      }),
      "CONFLICT"
    )
    const [find] = fakeDb.calls("query.contentRepository.findFirst")
    if (!find) throw new Error("no query recorded")
    expect(stepArgs(find, "findFirst")[0]).toEqual({
      where: { slug: "apuntes" },
    })
  })

  test("the editor schemas of a user's repository are looked up on the platform's rows only", async () => {
    await handler
      .schemaCatalog({ input: { repository: "apuntes" } })
      .catch(() => undefined)
    expect(reader.content).toHaveBeenCalledWith("apuntes", "platform")
  })
})

describe("user repository input", () => {
  const base = { slug: "apuntes", name: "Apuntes" }

  test.each([
    "http://github.com/ana/x.git",
    "https://192.168.1.10/x.git",
    "https://localhost/x.git",
    "https://[::1]/x.git",
  ])("%s is refused", (url) => {
    expect(
      contentInput.createMyRepository.safeParse({ ...base, url }).success
    ).toBe(false)
  })

  test("a public https URL is accepted and the ref defaults to main", () => {
    const parsed = contentInput.createMyRepository.parse({
      ...base,
      url: "https://github.com/ana/x.git",
    })
    expect(parsed.ref).toBe("main")
  })

  test("a reserved slug is refused", () => {
    expect(
      contentInput.createMyRepository.safeParse({
        slug: "admin",
        name: "x",
        url: "https://github.com/ana/x.git",
      }).success
    ).toBe(false)
  })

  test("hosting is not an input", () => {
    const parsed = contentInput.createMyRepository.parse({
      ...base,
      url: "https://github.com/ana/x.git",
      hosted: true,
    })
    expect(parsed).not.toHaveProperty("hosted")
  })
})
