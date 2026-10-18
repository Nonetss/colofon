import { afterEach, describe, expect, test } from "bun:test"
import { type Catalog, readCatalog } from "#contract/catalog"
import { loadContent } from "#contract/load"
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

async function catalogOf(files: Record<string, string>): Promise<Catalog> {
  dir = await createContentDir({ ...VALID_SITE, ...files })
  const loaded = await loadContent(dir.root)
  if (!loaded.ok) throw new Error(JSON.stringify(loaded.problems))
  return readCatalog(dir.root, loaded.content)
}

function typeOf(catalog: Catalog, id: string) {
  const type = catalog.get(id)
  if (type === undefined) throw new Error(`No type "${id}"`)
  return type
}

describe("readCatalog", () => {
  test("reads every valid entity of every type, by id", async () => {
    const catalog = await catalogOf({})
    expect([...catalog.keys()]).toEqual(["maquinas", "ubicaciones"])
    const maquinas = typeOf(catalog, "maquinas")
    expect([...maquinas.entities.keys()]).toEqual(["nas", "pve-01"])
    expect(maquinas.entities.get("nas")?.values).toEqual({
      ip: "192.168.1.30",
      ubicacion: "casa",
    })
    expect(maquinas.problems).toEqual([])
  })

  test("the label is the title_field value, or the id when it is left out", async () => {
    const catalog = await catalogOf({
      "catalog/maquinas/_type.yaml": [
        "name: Máquina",
        "plural: Máquinas",
        "title_field: name",
        "fields:",
        "  name: { type: text, optional: true }",
        "  ip: { type: ip }",
        "  ubicacion: { type: ref, to: ubicaciones }",
      ].join("\n"),
      "catalog/maquinas/pve-01.yaml":
        "name: PVE-01\nip: 192.168.1.10\nubicacion: casa\n",
    })
    const entities = typeOf(catalog, "maquinas").entities
    expect(entities.get("pve-01")?.label).toBe("PVE-01")
    expect(entities.get("nas")?.label).toBe("nas")
  })

  test("without title_field the label is the id", async () => {
    const catalog = await catalogOf({})
    expect(typeOf(catalog, "ubicaciones").entities.get("casa")?.label).toBe(
      "casa"
    )
  })

  test("the page is the value of the first ficha field", async () => {
    const catalog = await catalogOf({
      "catalog/maquinas/nas.yaml":
        "ip: 192.168.1.30\nubicacion: casa\nficha: red/dns\n",
    })
    const entities = typeOf(catalog, "maquinas").entities
    expect(entities.get("nas")?.page).toBe("red/dns")
    expect(entities.get("pve-01")?.page).toBeNull()
  })

  test("an invalid file is left out and kept as a problem of its type", async () => {
    const catalog = await catalogOf({
      "catalog/maquinas/nas.yaml": "ubicacion: casa\n",
    })
    const maquinas = typeOf(catalog, "maquinas")
    expect([...maquinas.entities.keys()]).toEqual(["pve-01"])
    expect(maquinas.problems).toHaveLength(1)
    expect(maquinas.problems[0]?.file).toBe("catalog/maquinas/nas.yaml")
    expect(maquinas.problems[0]?.message).toStartWith("ip: ")
  })

  test("an empty file is a problem", async () => {
    const catalog = await catalogOf({ "catalog/maquinas/nas.yaml": "" })
    expect(typeOf(catalog, "maquinas").problems).toEqual([
      { file: "catalog/maquinas/nas.yaml", message: "Está vacío" },
    ])
  })
})
