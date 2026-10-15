import { afterAll, beforeEach, describe, expect, test } from "bun:test"
import { existsSync } from "node:fs"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { ensureBareRepo, hostedFolder, type SyncResult } from "@nonete/content"
import { contentRepositoryRow } from "@nonete/db/testing"
import { call } from "@orpc/server"
import { git } from "#tests/fixtures/content"
import { anonymousContext, userContext } from "#tests/fixtures/context"
import { fakeDb } from "#tests/fixtures/db"
import { expectErrorCode } from "#tests/fixtures/errors"
import { createContentHandler } from "#v1/content/handler"
import { contentInput } from "#v1/content/input"
import type { ContentReader, StoredRepository } from "#v1/content/reader"
import { contentRouter } from "#v1/content/router"

const HOSTED_ROOT = await mkdtemp(path.join(tmpdir(), "api-browse-"))
const hosted = contentRepositoryRow({
  slug: "manual",
  name: "Manual",
  url: "/git/manual.git",
})
const external = contentRepositoryRow()

/**
 * An external repository whose URL is a readable bare repository with
 * content: only the hosted check can keep it from being browsed.
 */
async function readableExternal() {
  await pushSite(SITE)
  return { ...external, url: hostedFolder(HOSTED_ROOT, hosted.id) }
}

const SITE = {
  "doc.config.yaml": "nombre: Manual\n",
  "docs/index.mdx": "# Inicio\n",
}

/** A reader that is never asked for anything here. */
const reader: ContentReader = {
  content: async () => undefined,
  sync: async (_repository: StoredRepository): Promise<SyncResult> => ({
    ok: false,
    error: "unused",
  }),
  syncAll: async () => [],
  syncInBackground: () => {},
  remove: async () => {},
}
const handler = createContentHandler(reader, { hostedRoot: HOSTED_ROOT })

/** Pushes `files` on main to the bare repository of `hosted`. */
async function pushSite(files: Record<string, string>) {
  const bare = hostedFolder(HOSTED_ROOT, hosted.id)
  await ensureBareRepo(bare, "main")
  const work = await mkdtemp(path.join(tmpdir(), "api-browse-work-"))
  try {
    await git(work, ["init", "--quiet", "--initial-branch=main"])
    for (const [file, text] of Object.entries(files)) {
      const target = path.join(work, file)
      await mkdir(path.dirname(target), { recursive: true })
      await writeFile(target, text)
    }
    await git(work, ["add", "--all"])
    await git(work, ["commit", "--quiet", "-m", "content"])
    await git(work, ["push", "--quiet", bare, "main"])
  } finally {
    await rm(work, { recursive: true, force: true })
  }
}

beforeEach(async () => {
  fakeDb.reset()
  await rm(HOSTED_ROOT, { recursive: true, force: true })
  await mkdir(HOSTED_ROOT)
})

afterAll(() => rm(HOSTED_ROOT, { recursive: true, force: true }))

describe("access", () => {
  test("without a session it is UNAUTHORIZED, and FORBIDDEN for a non-admin", async () => {
    const input = { slug: "manual", branch: "main", path: "" }
    await expectErrorCode(
      call(contentRouter.readFolder, input, { context: anonymousContext() }),
      "UNAUTHORIZED"
    )
    await expectErrorCode(
      call(
        contentRouter.readFile,
        { ...input, path: "a.yaml" },
        {
          context: userContext(),
        }
      ),
      "FORBIDDEN"
    )
    expect(fakeDb.calls()).toEqual([])
  })
})

describe("content input: readFolder / readFile", () => {
  const parseFolder = (input: object) =>
    contentInput.readFolder.safeParse({
      slug: "manual",
      branch: "main",
      ...input,
    }).success

  test("a path can't climb, start or end with / or hold empty segments", () => {
    expect(parseFolder({})).toBe(true)
    expect(parseFolder({ path: "docs/red" })).toBe(true)
    expect(parseFolder({ path: "docs/../.." })).toBe(false)
    expect(parseFolder({ path: "/etc" })).toBe(false)
    expect(parseFolder({ path: "docs/" })).toBe(false)
    expect(parseFolder({ path: "docs//red" })).toBe(false)
    expect(parseFolder({ path: "./docs" })).toBe(false)
  })

  test("a branch can't look like an option or carry a path", () => {
    expect(parseFolder({ branch: "--output=x" })).toBe(false)
    expect(parseFolder({ branch: "main:docs" })).toBe(false)
    expect(parseFolder({ branch: "feature/nueva" })).toBe(true)
  })

  test("a file needs a path", () => {
    expect(
      contentInput.readFile.safeParse({
        slug: "manual",
        branch: "main",
        path: "",
      }).success
    ).toBe(false)
  })
})

describe("content.readFolder", () => {
  test("an unknown or external repository is NOT_FOUND", async () => {
    fakeDb.queue("query.contentRepository.findFirst", undefined)
    await expectErrorCode(
      handler.readFolder({
        input: { slug: "nada", branch: "main", path: "" },
      }),
      "NOT_FOUND"
    )

    fakeDb.queue("query.contentRepository.findFirst", await readableExternal())
    await expectErrorCode(
      handler.readFolder({
        input: { slug: external.slug, branch: "main", path: "" },
      }),
      "NOT_FOUND"
    )
  })

  test("lists a hosted repository's folder from its bare repository", async () => {
    await pushSite(SITE)
    fakeDb.queue("query.contentRepository.findFirst", hosted)

    expect(
      await handler.readFolder({
        input: { slug: "manual", branch: "main", path: "" },
      })
    ).toEqual({
      entries: [
        { name: "docs", path: "docs", kind: "folder", size: null },
        {
          name: "doc.config.yaml",
          path: "doc.config.yaml",
          kind: "file",
          size: 15,
        },
      ],
    })
  })

  test("an unknown branch or path is NOT_FOUND", async () => {
    await pushSite(SITE)
    fakeDb.queue("query.contentRepository.findFirst", hosted)
    await expectErrorCode(
      handler.readFolder({
        input: { slug: "manual", branch: "otra", path: "" },
      }),
      "NOT_FOUND"
    )

    fakeDb.queue("query.contentRepository.findFirst", hosted)
    await expectErrorCode(
      handler.readFolder({
        input: { slug: "manual", branch: "main", path: "no-existe" },
      }),
      "NOT_FOUND"
    )
  })

  test("a hosted repository without its bare repository is NOT_FOUND and nothing is created", async () => {
    fakeDb.queue("query.contentRepository.findFirst", hosted)

    await expectErrorCode(
      handler.readFolder({
        input: { slug: "manual", branch: "main", path: "" },
      }),
      "NOT_FOUND"
    )
    expect(existsSync(hostedFolder(HOSTED_ROOT, hosted.id))).toBe(false)
    expect(fakeDb.calls("insert")).toEqual([])
    expect(fakeDb.calls("update")).toEqual([])
  })
})

describe("content.readFile", () => {
  test("reads a hosted repository's text file with its size", async () => {
    await pushSite(SITE)
    fakeDb.queue("query.contentRepository.findFirst", hosted)

    expect(
      await handler.readFile({
        input: { slug: "manual", branch: "main", path: "docs/index.mdx" },
      })
    ).toEqual({
      path: "docs/index.mdx",
      size: 9,
      kind: "text",
      content: "# Inicio\n",
    })
  })

  test("a folder is NOT_FOUND", async () => {
    await pushSite(SITE)
    fakeDb.queue("query.contentRepository.findFirst", hosted)

    await expectErrorCode(
      handler.readFile({
        input: { slug: "manual", branch: "main", path: "docs" },
      }),
      "NOT_FOUND"
    )
  })

  test("an external repository is NOT_FOUND", async () => {
    fakeDb.queue("query.contentRepository.findFirst", await readableExternal())

    await expectErrorCode(
      handler.readFile({
        input: { slug: external.slug, branch: "main", path: "doc.config.yaml" },
      }),
      "NOT_FOUND"
    )
  })
})
