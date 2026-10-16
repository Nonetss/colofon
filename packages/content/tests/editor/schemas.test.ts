import { afterEach, describe, expect, test } from "bun:test"
import { type ContentDeclarations, loadContent } from "#contract/load"
import {
  type EditorSchema,
  editorSchemas,
  schemaCatalog,
} from "#editor/schemas"
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
  test("one schema for the config, the menu, diagrams, _type.yaml and one per type, by stable name", async () => {
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

  test("a type's schema applies to its entities and leaves its _type.yaml out", async () => {
    const schemas = editorSchemas(await loadSite())
    expect(schemaNamed(schemas, "entities/maquinas").patterns).toEqual([
      "catalog/maquinas/*.yaml",
      "!catalog/maquinas/_*.yaml",
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

  test("a field with etiqueta is titled with it, and the meta-schema accepts it", async () => {
    const schemas = editorSchemas(await loadSite())
    const machines = schemaNamed(schemas, "entities/maquinas")
    expect(machines.schema).toMatchObject({
      properties: { ip: { title: "Dirección IP" } },
    })
    expect(JSON.stringify(schemaNamed(schemas, "type").schema)).toContain(
      '"etiqueta":{'
    )
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
      '"enum":["catalog","catalog/maquinas","catalog/ubicaciones","red","red/dns"]'
    )
  })

  test("a diagram box's entity lists every entity as <type>/<id>, its page the pages, its hue the ten hues", async () => {
    const diagram = schemaNamed(editorSchemas(await loadSite()), "diagram")
    expect(diagram.patterns).toEqual(["diagrams/*.json"])
    const text = JSON.stringify(diagram.schema)
    expect(text).toContain(
      '"enum":["maquinas/nas","maquinas/pve-01","ubicaciones/casa"]'
    )
    expect(text).toContain('"enum":["red","red/dns"]')
    expect(text).toContain(
      '"enum":["rose","blue","cyan","violet","green","indigo","fuchsia","slate","teal","lime"]'
    )
    expect(text).toContain('"$schema"')
  })

  test("each typed form is its own branch of the diagram schema, told apart by its type, with its own keys only", async () => {
    const diagram = schemaNamed(editorSchemas(await loadSite()), "diagram")
    const branches = diagram.schema.anyOf
    if (!Array.isArray(branches)) throw new Error("no anyOf")
    const flowchart = branches.find((branch) =>
      JSON.stringify(branch).includes('"const":"flowchart"')
    )
    if (flowchart === undefined) throw new Error("no flowchart branch")
    const text = JSON.stringify(flowchart)
    expect(text).toContain('"steps"')
    expect(text).toContain('"links"')
    expect(text).not.toContain('"nodes"')
    expect(text).toContain('"additionalProperties":false')
    expect(text).toContain(
      '"enum":["maquinas/nas","maquinas/pve-01","ubicaciones/casa"]'
    )
    const drawn = branches[0]
    expect(JSON.stringify(drawn)).toContain('"type":{"not":{}}')
  })

  test("a Gantt file gets its own keys and refuses a drawn diagram's, and a task's entity lists the catalog", async () => {
    const diagram = schemaNamed(editorSchemas(await loadSite()), "diagram")
    const branches = diagram.schema.anyOf
    if (!Array.isArray(branches)) throw new Error("no anyOf")
    const gantt = branches.find((branch) =>
      JSON.stringify(branch).includes('"const":"gantt"')
    )
    if (gantt === undefined) throw new Error("no gantt branch")
    const text = JSON.stringify(gantt)
    expect(text).toContain('"phases"')
    expect(text).toContain('"today"')
    expect(text).not.toContain('"nodes"')
    expect(text).toContain('"additionalProperties":false')
    expect(text).toContain(
      '"enum":["maquinas/nas","maquinas/pve-01","ubicaciones/casa"]'
    )
  })

  test("every icono lists the Lucide names, so a wrong one is marked", async () => {
    const schemas = editorSchemas(await loadSite())
    for (const name of ["type", "menu"]) {
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
    expect(catalog.schemas[2]?.fileMatch).toEqual(["diagrams/*.json"])
    expect(catalog.schemas[3]).toMatchObject({
      name: "Tipo del catálogo",
      fileMatch: ["catalog/*/_type.yaml"],
    })
  })

  test("an empty list gives a catalog with no schemas", () => {
    expect(schemaCatalog([], "https://doc.example")).toEqual({
      version: 1,
      schemas: [],
    })
  })
})
