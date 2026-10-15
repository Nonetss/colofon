import { afterEach, describe, expect, mock, test } from "bun:test"
import { existsSync } from "node:fs"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { hostedFolder } from "@nonete/content"
import {
  createContentRemote,
  memoryRepositoryStore,
  storedRepository,
} from "#tests/fixtures/content"
import {
  createGitHosting,
  gitSourceOf,
  hostedMarkerOf,
  isHosted,
} from "#v1/content/hosting"
import { createContentReader, type StoredRepository } from "#v1/content/reader"

const external = storedRepository()
const hosted = storedRepository({
  id: "repo-hosted",
  slug: "manual",
  url: "/git/manual.git",
})
const cleanups: (() => Promise<void>)[] = []

afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup()
})

async function tempFolder(): Promise<string> {
  const folder = await mkdtemp(path.join(tmpdir(), "api-hosted-"))
  cleanups.push(() => rm(folder, { recursive: true, force: true }))
  return folder
}

function fakeLogger() {
  return { info: mock(() => {}), warn: mock(() => {}) }
}

/** The git endpoint over `rows`, with a reader whose syncs are recorded. */
async function hosting(rows: StoredRepository[]) {
  const hostedRoot = await tempFolder()
  const reader = {
    syncInBackground: mock((_repository: StoredRepository) => {}),
  }
  const gitHttp = createGitHosting({
    hostedRoot,
    repositories: memoryRepositoryStore(rows),
    reader,
    logger: fakeLogger(),
  })
  return { hostedRoot, reader, gitHttp }
}

function advertisement(slug: string) {
  return new Request(
    `http://platform/git/${slug}.git/info/refs?service=git-upload-pack`
  )
}

/** A push that updates no ref: receive-pack still ends successfully. */
function emptyPush(slug: string) {
  return new Request(`http://platform/git/${slug}.git/git-receive-pack`, {
    method: "POST",
    body: "0000",
  })
}

describe("hosted marker", () => {
  test("a hosted repository stores its own git path as its URL", () => {
    expect(hostedMarkerOf("manual")).toBe("/git/manual.git")
    expect(isHosted(hosted)).toBe(true)
    expect(isHosted(external)).toBe(false)
  })

  test("another repository's marker doesn't make a repository hosted", () => {
    expect(isHosted({ slug: "otro", url: "/git/manual.git" })).toBe(false)
  })

  test("git reads a hosted repository from its folder and an external one from its URL", () => {
    expect(gitSourceOf(hosted, "/app/.hosted")).toBe("/app/.hosted/repo-hosted")
    expect(gitSourceOf(external, "/app/.hosted")).toBe(external.url)
  })
})

describe("syncing a hosted repository", () => {
  test("clones it from its bare repository on disk", async () => {
    const remote = await createContentRemote()
    cleanups.push(remote.remove)
    // The fixture's bare repository plays the hosted one: its folder is the
    // hosted root and its name the repository's id.
    const bare = new URL(remote.url).pathname
    const repository = { ...hosted, id: path.basename(bare) }
    const hostedRoot = path.dirname(bare)
    const cloneRoot = await tempFolder()
    const reader = createContentReader({
      cloneRoot,
      repositories: memoryRepositoryStore([repository]),
      resolveSource: (stored) => gitSourceOf(stored, hostedRoot),
      logger: fakeLogger(),
    })

    const result = await reader.sync(repository)

    expect(result).toEqual({ ok: true, commit: expect.any(String) })
    expect(
      existsSync(path.join(cloneRoot, repository.id, "doc.config.yaml"))
    ).toBe(true)
  })
})

describe("git endpoint", () => {
  test("an unknown or external repository is a 404 and no bare repository is created", async () => {
    const { hostedRoot, gitHttp } = await hosting([external])

    const responses = await Promise.all([
      gitHttp(advertisement("no-existe")),
      gitHttp(advertisement(external.slug)),
    ])

    expect(responses.map((response) => response.status)).toEqual([404, 404])
    expect(existsSync(hostedFolder(hostedRoot, external.id))).toBe(false)
  })

  test("serves a hosted repository, creating its missing bare repository", async () => {
    const { hostedRoot, gitHttp } = await hosting([hosted])

    const response = await gitHttp(advertisement(hosted.slug))

    expect(response.status).toBe(200)
    expect(
      existsSync(path.join(hostedFolder(hostedRoot, hosted.id), "HEAD"))
    ).toBe(true)
  })

  test("a push starts a sync of that repository", async () => {
    const { reader, gitHttp } = await hosting([external, hosted])

    const response = await gitHttp(emptyPush(hosted.slug))
    await response.text()
    for (let attempt = 0; attempt < 100; attempt++) {
      if (reader.syncInBackground.mock.calls.length > 0) break
      await Bun.sleep(10)
    }

    expect(response.status).toBe(200)
    expect(reader.syncInBackground.mock.calls).toEqual([[hosted]])
  })
})
