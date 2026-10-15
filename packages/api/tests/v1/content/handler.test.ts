import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test"
import type { ContentSource } from "@nonete/content"
import {
  type ContentFolder,
  createContentFolder,
} from "#tests/fixtures/content"
import { resetEnv, testEnv } from "#tests/fixtures/env"
import { expectErrorCode } from "#tests/fixtures/errors"
import {
  createContentHandler,
  currentContentSource,
  SCHEMAS_PATH,
} from "#v1/content/handler"
import { createContentReader } from "#v1/content/reader"

let folder: ContentFolder | undefined

beforeEach(() => resetEnv())

afterEach(async () => {
  await folder?.remove()
  folder = undefined
})

function fakeLogger() {
  return { info: mock(() => {}), warn: mock(() => {}) }
}

function handlerFor(source: ContentSource, logger = fakeLogger()) {
  const reader = createContentReader({ source: () => source, logger })
  return createContentHandler(reader)
}

async function folderHandler(logger = fakeLogger()) {
  folder = await createContentFolder()
  return handlerFor({ kind: "dir", root: folder.root }, logger)
}

describe("content.schemaCatalog", () => {
  test("lists the config, the type and one schema per type, at absolute URLs from CORS_ORIGIN", async () => {
    const handler = await folderHandler()
    const catalog = await handler.schemaCatalog()
    const base = `${testEnv.CORS_ORIGIN}${SCHEMAS_PATH}`
    expect(catalog.schemas.map((schema) => schema.url)).toEqual([
      `${base}/config`,
      `${base}/type`,
      `${base}/entities/maquinas`,
      `${base}/entities/ubicaciones`,
    ])
  })

  test("without a source the catalog has no schemas", async () => {
    const handler = handlerFor({ kind: "none" })
    expect(await handler.schemaCatalog()).toEqual({ version: 1, schemas: [] })
  })

  test("a new type shows on the next request, without regenerating anything", async () => {
    const handler = await folderHandler()
    await folder?.write({
      "catalogo/proveedores/_tipo.yaml":
        "nombre: Proveedor\nplural: Proveedores\ncampos:\n  nombre: { tipo: texto }\n",
    })
    const catalog = await handler.schemaCatalog()
    expect(catalog.schemas.map((schema) => schema.name)).toContain(
      "Proveedores"
    )
  })
})

describe("content.entitySchema", () => {
  test("references accept the ids of the referenced type and ficha the page paths", async () => {
    const handler = await folderHandler()
    const schema = await handler.entitySchema({ input: { type: "maquinas" } })
    expect(schema).toMatchObject({
      title: "Máquina",
      properties: {
        ubicacion: { enum: ["casa"] },
        ficha: { enum: ["red/dns"] },
      },
    })
  })

  test("an unknown type is NOT_FOUND", async () => {
    const handler = await folderHandler()
    await expectErrorCode(
      handler.entitySchema({ input: { type: "frutas" } }),
      "NOT_FOUND"
    )
  })

  test("no schema carries an entity's field values", async () => {
    const handler = await folderHandler()
    const all = [
      await handler.schemaCatalog(),
      await handler.configSchema(),
      await handler.typeSchema(),
      await handler.entitySchema({ input: { type: "maquinas" } }),
    ]
    expect(JSON.stringify(all)).not.toContain("192.168.1.30")
  })
})

describe("content.configSchema / content.typeSchema", () => {
  test("without a source both are NOT_FOUND", async () => {
    const handler = handlerFor({ kind: "none" })
    await expectErrorCode(handler.configSchema(), "NOT_FOUND")
    await expectErrorCode(handler.typeSchema(), "NOT_FOUND")
  })
})

describe("last valid content", () => {
  test("a broken _tipo.yaml after a valid read keeps the previous schemas and warns once", async () => {
    const logger = fakeLogger()
    const handler = await folderHandler(logger)
    await handler.schemaCatalog()

    await folder?.write({ "catalogo/maquinas/_tipo.yaml": "nombre: Máquina\n" })
    const schema = await handler.entitySchema({ input: { type: "maquinas" } })
    await handler.schemaCatalog()

    expect(schema).toMatchObject({ properties: { ip: {} } })
    expect(logger.warn).toHaveBeenCalledTimes(1)
  })

  test("content that was never valid behaves as no content", async () => {
    folder = await createContentFolder({ "doc.config.yaml": "nombre: X\n" })
    const handler = handlerFor({ kind: "dir", root: folder.root })
    expect(await handler.schemaCatalog()).toEqual({ version: 1, schemas: [] })
  })
})

describe("content.sync", () => {
  test("a folder or no source has nothing to sync", async () => {
    const handler = await folderHandler()
    expect(await handler.sync()).toEqual({ source: "dir", commit: null })
    expect(await handlerFor({ kind: "none" }).sync()).toEqual({
      source: "none",
      commit: null,
    })
  })

  test("an unreachable repository is BAD_GATEWAY and the error has no credentials", async () => {
    folder = await createContentFolder({})
    const handler = handlerFor({
      kind: "repo",
      url: "https://user:s3cret@127.0.0.1:1/doc.git",
      ref: "main",
      root: folder.root,
    })
    const error = await handler.sync().then(
      () => undefined,
      (caught: unknown) => caught
    )
    expect(error).toMatchObject({ code: "BAD_GATEWAY" })
    expect(String(error instanceof Error && error.message)).not.toContain(
      "s3cret"
    )
  })
})

describe("currentContentSource", () => {
  test("reads CONTENT_DIR from the environment", () => {
    testEnv.CONTENT_DIR = "/srv/documentacion"
    expect(currentContentSource()).toEqual({
      kind: "dir",
      root: "/srv/documentacion",
    })
  })

  test("reads CONTENT_REPO and CONTENT_REF from the environment", () => {
    testEnv.CONTENT_REPO = "https://git.example/doc.git"
    testEnv.CONTENT_REF = "v2"
    expect(currentContentSource()).toMatchObject({
      kind: "repo",
      url: "https://git.example/doc.git",
      ref: "v2",
    })
  })
})
