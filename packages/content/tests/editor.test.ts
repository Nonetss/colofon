import { afterEach, describe, expect, test } from "bun:test"
import {
  type EditorSchema,
  editorSchemas,
  schemaCatalog,
} from "#editor-schemas"
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

function schemaNamed(schemas: EditorSchema[], name: string) {
  const found = schemas.find((schema) => schema.name === name)
  if (found === undefined) throw new Error(`No schema "${name}"`)
  return found
}

async function loadSite(): Promise<ContentDeclarations> {
  dir = await createContentDir(VALID_SITE)
  const result = await loadContent(dir.root)
  if (!result.ok) throw new Error(JSON.stringify(result.problems))
  return result.content
}

describe("editorSchemas", () => {
  test("one schema for the config, the menu, diagrams, _tipo.yaml and one per type, by stable name", async () => {
    const schemas = editorSchemas(await loadSite())
    expect(schemas.map((schema) => schema.name)).toEqual([
      "config",
      "menu",
      "diagram",
      "type",
      "entities/maquinas",
      "entities/ubicaciones",
    ])
  })

  test("a type's schema applies to its entities and leaves its _tipo.yaml out", async () => {
    const schemas = editorSchemas(await loadSite())
    expect(schemaNamed(schemas, "entities/maquinas").patterns).toEqual([
      "catalogo/maquinas/*.yaml",
      "!catalogo/maquinas/_*.yaml",
    ])
  })

  test("ref and ficha fields list the ids and pages to choose from", async () => {
    const machines = schemaNamed(
      editorSchemas(await loadSite()),
      "entities/maquinas"
    )
    expect(machines.schema).toMatchObject({
      title: "Máquina",
      properties: {
        ubicacion: { enum: ["casa"] },
        ficha: { enum: ["red", "red/dns"] },
      },
      required: ["ip", "ubicacion"],
    })
  })

  test("in the meta-schema, `a` lists the types that exist", async () => {
    const type = schemaNamed(editorSchemas(await loadSite()), "type")
    expect(JSON.stringify(type.schema)).toContain(
      '"enum":["maquinas","ubicaciones"]'
    )
  })

  test("a menu path lists the pages, folders, the catalog and its types", async () => {
    const menu = schemaNamed(editorSchemas(await loadSite()), "menu")
    expect(menu.patterns).toEqual(["menu.yaml"])
    expect(JSON.stringify(menu.schema)).toContain(
      '"enum":["catalogo","catalogo/maquinas","catalogo/ubicaciones","red","red/dns"]'
    )
  })

  test("a diagram node's entidad lists every entity as <type>/<id>", async () => {
    const diagram = schemaNamed(editorSchemas(await loadSite()), "diagram")
    expect(diagram.patterns).toEqual(["diagramas/*.yaml"])
    expect(JSON.stringify(diagram.schema)).toContain(
      '"enum":["maquinas/nas","maquinas/pve-01","ubicaciones/casa"]'
    )
  })

  test("every icono lists the Lucide names, so a wrong one is marked", async () => {
    const schemas = editorSchemas(await loadSite())
    for (const name of ["type", "menu", "diagram"]) {
      const text = JSON.stringify(schemaNamed(schemas, name).schema)
      expect(text).toContain('"server"')
      expect(text).not.toContain('"servr"')
    }
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
      "https://doc.example/api/v1/content/schemas/menu",
      "https://doc.example/api/v1/content/schemas/diagram",
      "https://doc.example/api/v1/content/schemas/type",
      "https://doc.example/api/v1/content/schemas/entities/maquinas",
      "https://doc.example/api/v1/content/schemas/entities/ubicaciones",
    ])
    expect(catalog.schemas[3]).toMatchObject({
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
