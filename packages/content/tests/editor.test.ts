import { afterEach, describe, expect, test } from "bun:test"
import { editorSchemas, schemaCatalog } from "#editor-schemas"
import { type ContentDeclarations, loadContent } from "#load"
import {
  type ContentDir,
  createContentDir,
  VALID_SITE,
} from "#tests/fixtures/content-dir"

let dir: ContentDir | undefined

afterEach(async () => {
  await dir?.remove()
  dir = undefined
})

async function loadSite(): Promise<ContentDeclarations> {
  dir = await createContentDir(VALID_SITE)
  const result = await loadContent(dir.root)
  if (!result.ok) throw new Error(JSON.stringify(result.problems))
  return result.content
}

describe("editorSchemas", () => {
  test("one schema for the config, one for _tipo.yaml and one per type, by stable name", async () => {
    const schemas = editorSchemas(await loadSite())
    expect(schemas.map((schema) => schema.name)).toEqual([
      "config",
      "type",
      "entities/maquinas",
      "entities/ubicaciones",
    ])
  })

  test("a type's schema applies to its entities and leaves its _tipo.yaml out", async () => {
    const schemas = editorSchemas(await loadSite())
    expect(schemas[2]?.patterns).toEqual([
      "catalogo/maquinas/*.yaml",
      "!catalogo/maquinas/_*.yaml",
    ])
  })

  test("ref and ficha fields list the ids and pages to choose from", async () => {
    const [, , machines] = editorSchemas(await loadSite())
    expect(machines?.schema).toMatchObject({
      title: "Máquina",
      properties: {
        ubicacion: { enum: ["casa"] },
        ficha: { enum: ["red", "red/dns"] },
      },
      required: ["ip", "ubicacion"],
    })
  })

  test("in the meta-schema, `a` lists the types that exist", async () => {
    const [, type] = editorSchemas(await loadSite())
    expect(JSON.stringify(type?.schema)).toContain(
      '"enum":["maquinas","ubicaciones"]'
    )
  })

  test("no schema carries an entity's field values, only ids", async () => {
    const text = JSON.stringify(editorSchemas(await loadSite()))
    expect(text).not.toContain("192.168.1.10")
    expect(text).toContain(`"casa"`)
  })
})

describe("schemaCatalog", () => {
  test("lists each schema with its absolute URL and file patterns", async () => {
    const catalog = schemaCatalog(
      editorSchemas(await loadSite()),
      "https://doc.example/api/v1/content/schemas/"
    )
    expect(catalog.version).toBe(1)
    expect(catalog.schemas.map((schema) => schema.url)).toEqual([
      "https://doc.example/api/v1/content/schemas/config",
      "https://doc.example/api/v1/content/schemas/type",
      "https://doc.example/api/v1/content/schemas/entities/maquinas",
      "https://doc.example/api/v1/content/schemas/entities/ubicaciones",
    ])
    expect(catalog.schemas[1]).toMatchObject({
      name: "Tipo del catálogo",
      fileMatch: ["catalogo/*/_tipo.yaml"],
    })
  })

  test("an empty list gives a catalog with no schemas", () => {
    expect(schemaCatalog([], "https://doc.example")).toEqual({
      version: 1,
      schemas: [],
    })
  })
})
