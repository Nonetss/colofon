import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test"
import { existsSync } from "node:fs"
import { mkdir } from "node:fs/promises"
import path from "node:path"
import { contentRepositoryRow } from "@nonete/db/testing"
import {
  CONTENT_SITE,
  type ContentFolder,
  createContentFolder,
  createContentRemote,
  type MemoryRepositoryStore,
  memoryRepositoryStore,
  storedRepository,
} from "#tests/fixtures/content"
import { resetEnv, testEnv } from "#tests/fixtures/env"
import { expectErrorCode } from "#tests/fixtures/errors"
import {
  createContentHandler,
  SCHEMAS_PATH,
  syncFields,
} from "#v1/content/handler"
import { gitSourceOf } from "#v1/content/hosting"
import { createContentReader } from "#v1/content/reader"

const repository = storedRepository()
// No test here reads a hosted repository through the handler's options.
const HOSTED_ROOT = "/nonexistent/hosted"
const cleanups: (() => Promise<void>)[] = []

beforeEach(() => resetEnv())

afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup()
})

function fakeLogger() {
  return { info: mock(() => {}), warn: mock(() => {}) }
}

/** A clone root, removed after the test. */
async function cloneRoot(): Promise<ContentFolder> {
  const folder = await createContentFolder({})
  cleanups.push(folder.remove)
  return folder
}

/** `files` placed in the clone folder of the repository with `id`. */
function inClone(id: string, files: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(files).map(([file, text]) => [`${id}/${file}`, text])
  )
}

type Setup = {
  root: ContentFolder
  store: MemoryRepositoryStore
  logger: ReturnType<typeof fakeLogger>
  handler: ReturnType<typeof createContentHandler>
}

/** A handler over a clone root holding a checkout of `repository`. */
async function setup(
  repositories = [repository],
  files: Record<string, string> = inClone(repository.id, CONTENT_SITE)
): Promise<Setup> {
  const root = await cloneRoot()
  await root.write(files)
  const store = memoryRepositoryStore(repositories)
  const logger = fakeLogger()
  const reader = createContentReader({
    cloneRoot: root.root,
    repositories: store,
    resolveSource: (stored) => gitSourceOf(stored, HOSTED_ROOT),
    logger,
  })
  return {
    root,
    store,
    logger,
    handler: createContentHandler(reader, { hostedRoot: HOSTED_ROOT }),
  }
}

const input = { repository: repository.slug }

describe("content.schemaCatalog", () => {
  test("lists the config, the menu, diagrams, the type and one schema per type, at absolute URLs under the repository's slug", async () => {
    const { handler } = await setup()
    const catalog = await handler.schemaCatalog({ input })
    const base = `${testEnv.CORS_ORIGIN}${SCHEMAS_PATH}/documentacion`
    expect(catalog.schemas.map((schema) => schema.url)).toEqual([
      `${base}/config`,
      `${base}/menu`,
      `${base}/diagram`,
      `${base}/type`,
      `${base}/entities/maquinas`,
      `${base}/entities/ubicaciones`,
    ])
  })

  test("an unknown repository is NOT_FOUND", async () => {
    const { handler } = await setup()
    await expectErrorCode(
      handler.schemaCatalog({ input: { repository: "inexistente" } }),
      "NOT_FOUND"
    )
  })

  test("a repository not cloned yet has an empty catalog and logs nothing", async () => {
    const { handler, logger } = await setup([repository], {})
    expect(await handler.schemaCatalog({ input })).toEqual({
      version: 1,
      schemas: [],
    })
    expect(logger.warn).not.toHaveBeenCalled()
  })

  test("a new type in the checkout shows on the next request, without regenerating anything", async () => {
    const { handler, root } = await setup()
    await root.write(
      inClone(repository.id, {
        "catalogo/proveedores/_tipo.yaml":
          "nombre: Proveedor\nplural: Proveedores\ncampos:\n  nombre: { tipo: texto }\n",
      })
    )
    const catalog = await handler.schemaCatalog({ input })
    expect(catalog.schemas.map((schema) => schema.name)).toContain(
      "Proveedores"
    )
  })
})

describe("content.entitySchema", () => {
  test("references accept the ids of the referenced type and ficha the page paths", async () => {
    const { handler } = await setup()
    const schema = await handler.entitySchema({
      input: { ...input, type: "maquinas" },
    })
    expect(schema).toMatchObject({
      title: "Máquina",
      properties: {
        ubicacion: { enum: ["casa"] },
        ficha: { enum: ["red/dns"] },
      },
    })
  })

  test("an unknown type is NOT_FOUND", async () => {
    const { handler } = await setup()
    await expectErrorCode(
      handler.entitySchema({ input: { ...input, type: "frutas" } }),
      "NOT_FOUND"
    )
  })

  test("repositories stay apart: a type of one is NOT_FOUND in another", async () => {
    const homelab = storedRepository({ id: "repo-2", slug: "homelab" })
    const { handler } = await setup([repository, homelab], {
      ...inClone(repository.id, CONTENT_SITE),
      ...inClone(homelab.id, {
        "doc.config.yaml": 'nombre: Homelab\nplataforma: "1"\n',
      }),
    })
    await expectErrorCode(
      handler.entitySchema({
        input: { repository: "homelab", type: "maquinas" },
      }),
      "NOT_FOUND"
    )
  })

  test("no schema carries an entity's field values or the repository's URL", async () => {
    const secret = storedRepository({
      url: "https://ana:secreto@git.example/doc.git",
    })
    const { handler } = await setup([secret])
    const all = [
      await handler.schemaCatalog({ input }),
      await handler.configSchema({ input }),
      await handler.menuSchema({ input }),
      await handler.diagramSchema({ input }),
      await handler.typeSchema({ input }),
      await handler.entitySchema({ input: { ...input, type: "maquinas" } }),
    ]
    const text = JSON.stringify(all)
    expect(text).not.toContain("192.168.1.30")
    expect(text).not.toContain("git.example")
    expect(text).not.toContain("secreto")
  })
})

describe("content.configSchema / menuSchema / diagramSchema / typeSchema", () => {
  test("a repository without valid content has none", async () => {
    const { handler } = await setup([repository], {})
    await expectErrorCode(handler.configSchema({ input }), "NOT_FOUND")
    await expectErrorCode(handler.menuSchema({ input }), "NOT_FOUND")
    await expectErrorCode(handler.diagramSchema({ input }), "NOT_FOUND")
    await expectErrorCode(handler.typeSchema({ input }), "NOT_FOUND")
  })

  test("the menu schema lists the repository's paths and the diagram schema its entities", async () => {
    const { handler } = await setup()
    const menu = JSON.stringify(await handler.menuSchema({ input }))
    expect(menu).toContain('"catalogo/maquinas"')
    const diagram = JSON.stringify(await handler.diagramSchema({ input }))
    expect(diagram).toContain('"maquinas/nas"')
  })
})

describe("last valid content", () => {
  test("a broken _tipo.yaml after a valid read keeps the previous schemas and warns once, naming the repository", async () => {
    const { handler, root, logger } = await setup()
    await handler.schemaCatalog({ input })

    await root.write(
      inClone(repository.id, {
        "catalogo/maquinas/_tipo.yaml": "nombre: Máquina\n",
      })
    )
    const schema = await handler.entitySchema({
      input: { ...input, type: "maquinas" },
    })
    await handler.schemaCatalog({ input })

    expect(schema).toMatchObject({ properties: { ip: {} } })
    expect(logger.warn).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(logger.warn.mock.calls)).toContain("documentacion")
  })

  test("content that was never valid behaves as no content", async () => {
    const { handler } = await setup(
      [repository],
      inClone(repository.id, { "doc.config.yaml": "nombre: X\n" })
    )
    expect(await handler.schemaCatalog({ input })).toEqual({
      version: 1,
      schemas: [],
    })
  })
})

describe("content.sync", () => {
  test("clones every repository, records each commit and returns them", async () => {
    const remote = await createContentRemote()
    cleanups.push(remote.remove)
    const cloned = storedRepository({ url: remote.url })
    const { handler, store, root } = await setup([cloned], {})

    const result = await handler.sync()

    expect(result.repositories).toEqual([
      { slug: "documentacion", commit: expect.any(String) },
    ])
    expect(store.recorded).toEqual([
      { id: cloned.id, result: { ok: true, commit: expect.any(String) } },
    ])
    expect(existsSync(path.join(root.root, cloned.id, "doc.config.yaml"))).toBe(
      true
    )
    expect(
      (await handler.schemaCatalog({ input })).schemas.length
    ).toBeGreaterThan(0)
  })

  test("one unreachable repository doesn't stop the next, and the run fails without credentials", async () => {
    const remote = await createContentRemote()
    cleanups.push(remote.remove)
    const broken = storedRepository({
      id: "repo-a",
      slug: "roto",
      url: "https://user:s3cret@127.0.0.1:1/doc.git",
    })
    const working = storedRepository({ id: "repo-b", url: remote.url })
    const { handler, store } = await setup([broken, working], {})

    const error = await handler.sync().then(
      () => undefined,
      (caught: unknown) => caught
    )

    expect(error).toMatchObject({ code: "BAD_GATEWAY" })
    expect(String(error instanceof Error && error.message)).toContain("roto")
    expect(JSON.stringify(store.recorded)).not.toContain("s3cret")
    expect(store.recorded.map((entry) => [entry.id, entry.result.ok])).toEqual([
      ["repo-a", false],
      ["repo-b", true],
    ])
  })

  test("removes the clones of repositories that no longer exist, and a clone left at the root", async () => {
    const { handler, root } = await setup([], {
      ...inClone("deleted-repo", { "doc.config.yaml": "nombre: X\n" }),
      "doc.config.yaml": "nombre: Antiguo\n",
    })
    await mkdir(path.join(root.root, ".git"))

    expect(await handler.sync()).toEqual({ repositories: [] })
    expect(existsSync(path.join(root.root, "deleted-repo"))).toBe(false)
    expect(existsSync(path.join(root.root, ".git"))).toBe(false)
    expect(existsSync(path.join(root.root, "doc.config.yaml"))).toBe(false)
  })
})

describe("syncFields", () => {
  const at = new Date("2026-02-01T00:00:00.000Z")

  test("a successful sync stores its commit and clears the last error", () => {
    expect(syncFields({ ok: true, commit: "abc" }, at)).toEqual({
      lastSyncedAt: at,
      lastCommit: "abc",
      lastSyncError: null,
    })
  })

  test("a failed sync stores its error and keeps the last commit", () => {
    const fields = syncFields({ ok: false, error: "fatal" }, at)
    expect(fields).toEqual({ lastSyncedAt: at, lastSyncError: "fatal" })
    expect({
      ...contentRepositoryRow({ lastCommit: "abc" }),
      ...fields,
    }).toMatchObject({ lastCommit: "abc", lastSyncError: "fatal" })
  })
})
