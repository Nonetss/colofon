import { afterEach, describe, expect, mock, test } from "bun:test"
import type { RemoteCheck } from "@nonete/content"
import {
  createContentFolder,
  createContentRemote,
  memoryRepositoryStore,
  storedRepository,
} from "#tests/fixtures/content"
import { gitSourceOf } from "#v1/content/hosting"
import {
  audienceOfUser,
  createContentReader,
  isVisibleTo,
} from "#v1/content/reader"

const cleanups: (() => Promise<void>)[] = []

afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup()
})

const casa = storedRepository({ id: "repo-casa", slug: "casa", name: "Casa" })
const apuntes = storedRepository({
  id: "repo-apuntes",
  slug: "apuntes",
  name: "Apuntes",
  ownerId: "ana",
})

describe("isVisibleTo", () => {
  test("a platform repository is visible to every audience", () => {
    expect(isVisibleTo(casa, "all")).toBe(true)
    expect(isVisibleTo(casa, "platform")).toBe(true)
    expect(isVisibleTo(casa, { userId: "luis" })).toBe(true)
  })

  test("a user's repository is visible to its owner and to a full read only", () => {
    expect(isVisibleTo(apuntes, { userId: "ana" })).toBe(true)
    expect(isVisibleTo(apuntes, "all")).toBe(true)
    expect(isVisibleTo(apuntes, { userId: "luis" })).toBe(false)
    expect(isVisibleTo(apuntes, "platform")).toBe(false)
  })

  test("a request without a user reads the platform's alone", () => {
    expect(audienceOfUser(null)).toBe("platform")
    expect(audienceOfUser({ id: "ana" })).toEqual({ userId: "ana" })
  })
})

async function readerWith(
  checkRemote: (url: string) => Promise<RemoteCheck> = async () => ({
    ok: true,
  })
) {
  const root = await createContentFolder({})
  cleanups.push(root.remove)
  const store = memoryRepositoryStore([casa, apuntes])
  const reader = createContentReader({
    cloneRoot: root.root,
    repositories: store,
    resolveSource: (stored) => gitSourceOf(stored, "/nonexistent/hosted"),
    logger: { info: mock(() => {}), warn: mock(() => {}) },
    checkRemote,
  })
  return { reader, store }
}

describe("contentReader audiences", () => {
  test("another user's repository is as unknown as a missing one", async () => {
    const { reader } = await readerWith()
    expect(await reader.site("apuntes", { userId: "luis" })).toBeUndefined()
    expect(await reader.content("apuntes", "platform")).toBeUndefined()
    expect(await reader.site("apuntes", { userId: "ana" })).toBeDefined()
  })

  test("the periodic sync reaches every repository, whoever owns it", async () => {
    const { reader } = await readerWith()
    const outcomes = await reader.syncAll()
    expect(
      outcomes.map(({ repository }) => repository.slug).toSorted()
    ).toEqual(["apuntes", "casa"])
  })
})

describe("syncing a user's repository", () => {
  test("a remote that is not allowed fails the sync without any git", async () => {
    const check = mock(
      async (_url: string): Promise<RemoteCheck> => ({
        ok: false,
        error: "The remote host is not allowed",
      })
    )
    const { reader, store } = await readerWith(check)

    const result = await reader.sync(apuntes)

    expect(result).toEqual({
      ok: false,
      error: "The remote host is not allowed",
    })
    expect(check).toHaveBeenCalledWith(apuntes.url)
    expect(store.recorded).toEqual([{ id: apuntes.id, result }])
  })

  test("a platform repository is not vetted", async () => {
    const check = mock(
      async (_url: string): Promise<RemoteCheck> => ({ ok: true })
    )
    const remote = await createContentRemote()
    cleanups.push(remote.remove)
    const { reader } = await readerWith(check)

    const result = await reader.sync({ ...casa, url: remote.url })

    expect(result.ok).toBe(true)
    expect(check).not.toHaveBeenCalled()
  })
})
