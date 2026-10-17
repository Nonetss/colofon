import { afterEach, describe, expect, mock, test } from "bun:test"
import {
  CONTENT_SITE,
  createContentFolder,
  createContentRemote,
  memoryRepositoryStore,
  storedRepository,
} from "#tests/fixtures/content"
import { gitSourceOf } from "#v1/content/hosting"
import { createContentReader, readerRoutesOf } from "#v1/content/reader"

const cleanups: (() => Promise<void>)[] = []

afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup()
})

function fakeLogger() {
  return { info: mock(() => {}), warn: mock(() => {}) }
}

/** A reader over a clone root holding `files` in the folder of each repository. */
async function readerWith(
  repositories = [storedRepository()],
  files: Record<string, string> = {}
) {
  const root = await createContentFolder(files)
  cleanups.push(root.remove)
  const logger = fakeLogger()
  const reader = createContentReader({
    cloneRoot: root.root,
    repositories: memoryRepositoryStore(repositories),
    resolveSource: (stored) => gitSourceOf(stored, "/nonexistent/hosted"),
    logger,
  })
  return { reader, root, logger }
}

function inClone(id: string, files: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(files).map(([file, text]) => [`${id}/${file}`, text])
  )
}

async function remote(files: Record<string, string>, date?: string) {
  const created = await createContentRemote(files, date)
  cleanups.push(created.remove)
  return created.url
}

describe("contentReader.site", () => {
  test("an unknown slug is undefined", async () => {
    const { reader } = await readerWith()
    expect(await reader.site("inexistente", "all")).toBeUndefined()
  })

  test("a repository not cloned yet has no pages", async () => {
    const { reader } = await readerWith()
    const read = await reader.site("documentacion", "all")
    expect(read?.site).toBeUndefined()
  })

  test("the pages of a checkout are read once", async () => {
    const repository = storedRepository()
    const { reader } = await readerWith(
      [repository],
      inClone(repository.id, CONTENT_SITE)
    )
    const first = await reader.site("documentacion", "all")
    const second = await reader.site("documentacion", "all")
    expect(first?.site).toBeDefined()
    expect(second?.site).toBe(first?.site)
  })

  test("a successful sync drops the pages, so the next read sees the new checkout", async () => {
    const before = await remote(CONTENT_SITE)
    const after = await remote({
      ...CONTENT_SITE,
      "docs/red/vpn.mdx": "---\ntitulo: VPN\ndescripcion: Túnel\n---\n",
    })
    const repository = storedRepository({ url: before })
    const { reader } = await readerWith([repository])

    await reader.sync(repository)
    const first = await reader.site("documentacion", "all")
    expect(first?.site?.pages.has("red/vpn")).toBe(false)

    await reader.sync({ ...repository, url: after })
    const second = await reader.site("documentacion", "all")
    expect(second?.site?.pages.has("red/vpn")).toBe(true)
  })

  test("page problems are logged once per checkout, naming the repository", async () => {
    const repository = storedRepository()
    const { reader, logger } = await readerWith(
      [repository],
      inClone(repository.id, CONTENT_SITE)
    )
    await reader.site("documentacion", "all")
    await reader.site("documentacion", "all")
    const pageWarnings = logger.warn.mock.calls.filter((args: unknown[]) =>
      args.includes("Content pages have problems")
    )
    expect(pageWarnings).toHaveLength(1)
    expect(JSON.stringify(pageWarnings[0])).toContain("documentacion")
  })

  test("a broken diagram is logged with the page problems, once per checkout", async () => {
    const repository = storedRepository()
    const { reader, logger } = await readerWith(
      [repository],
      inClone(repository.id, {
        ...CONTENT_SITE,
        "diagrams/red.json": '{ "title": "Red" "desc": "x" }',
      })
    )
    await reader.site("documentacion", "all")
    await reader.site("documentacion", "all")
    const pageWarnings = logger.warn.mock.calls.filter((args: unknown[]) =>
      args.includes("Content pages have problems")
    )
    expect(pageWarnings).toHaveLength(1)
    expect(JSON.stringify(pageWarnings[0])).toContain("diagrams/red.json")
  })
})

describe("contentReader edit dates", () => {
  test("a synced repository's pages are dated with their files' last commit", async () => {
    const url = await remote(CONTENT_SITE, "2026-03-02T10:00:00+01:00")
    const repository = storedRepository({ url })
    const { reader, logger } = await readerWith([repository])

    await reader.sync(repository)
    const read = await reader.site("documentacion", "all")
    expect(read?.site?.pages.get("red/dns")?.header.editado).toBe("2026-03-02")
    const dateWarnings = logger.warn.mock.calls.filter((args: unknown[]) =>
      args.includes("Edit dates could not be read; pages have none")
    )
    expect(dateWarnings).toHaveLength(0)
  })

  test("a folder git can't read still gives pages, without dates, and logs it naming the repository", async () => {
    const repository = storedRepository()
    const { reader, logger } = await readerWith(
      [repository],
      inClone(repository.id, CONTENT_SITE)
    )
    const read = await reader.site("documentacion", "all")
    expect(read?.site?.pages.get("red/dns")?.header.editado).toBeNull()
    const dateWarnings = logger.warn.mock.calls.filter((args: unknown[]) =>
      args.includes("Edit dates could not be read; pages have none")
    )
    expect(dateWarnings).toHaveLength(1)
    expect(JSON.stringify(dateWarnings[0])).toContain("documentacion")
  })
})

describe("readerRoutesOf", () => {
  test("pages go under the slug and files under the docs API, encoded", () => {
    const routes = readerRoutesOf("casa")
    expect(routes.routeOf("")).toBe("/casa")
    expect(routes.routeOf("red/dns")).toBe("/casa/red/dns")
    expect(routes.fileUrlOf("red/img/mapa de red.svg")).toBe(
      "/api/v1/docs/casa/files/red/img/mapa%20de%20red.svg"
    )
  })
})
