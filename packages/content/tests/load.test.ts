import { afterEach, describe, expect, test } from "bun:test"
import { type LoadResult, loadContent } from "#load"
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

async function load(files: Record<string, string>): Promise<LoadResult> {
  dir = await createContentDir(files)
  return loadContent(dir.root)
}

function problemsOf(result: LoadResult) {
  if (result.ok) return []
  return result.problems
}

describe("loadContent", () => {
  test("a valid site gives its types, entity ids and pages, sorted", async () => {
    const result = await load(VALID_SITE)
    if (!result.ok) throw new Error(JSON.stringify(result.problems))
    expect([...result.content.types.keys()]).toEqual([
      "maquinas",
      "ubicaciones",
    ])
    expect(result.content.index.entityIds.get("maquinas")).toEqual([
      "nas",
      "pve-01",
    ])
    expect(result.content.index.pagePaths).toEqual(["red", "red/dns"])
    expect(result.content.config.nombre).toBe("Homelab")
  })

  test("a missing doc.config.yaml or _tipo.yaml is a problem", async () => {
    const {
      "doc.config.yaml": _config,
      "catalogo/ubicaciones/_tipo.yaml": _type,
      ...rest
    } = VALID_SITE
    expect(problemsOf(await load(rest))).toEqual([
      { file: "doc.config.yaml", message: "No existe" },
      { file: "catalogo/ubicaciones/_tipo.yaml", message: "No existe" },
    ])
  })

  test("a ref to a type that does not exist names the field and the types", async () => {
    const result = await load({
      ...VALID_SITE,
      "catalogo/ubicaciones/_tipo.yaml": [
        "nombre: Ubicación",
        "plural: Ubicaciones",
        "campos:",
        "  centro: { tipo: lista, de: { tipo: ref, a: centros } }",
      ].join("\n"),
    })
    expect(problemsOf(result)).toEqual([
      {
        file: "catalogo/ubicaciones/_tipo.yaml",
        message:
          "centro.de: `a: centros` no es ningún tipo de catalogo/ (hay: maquinas, ubicaciones)",
      },
    ])
  })

  test("a YAML syntax error gives the line and, for an unquoted colon, the fix", async () => {
    const result = await load({
      ...VALID_SITE,
      "doc.config.yaml": 'plataforma: "1"\nnombre: Casa: la red\n',
    })
    expect(problemsOf(result)).toEqual([
      {
        file: "doc.config.yaml",
        message:
          'YAML no válido en la línea 2, columna 9: un texto con ": " dentro tiene que ir entre comillas',
      },
    ])
  })

  test("schema problems carry the path of the field, in Spanish", async () => {
    const result = await load({
      ...VALID_SITE,
      "catalogo/ubicaciones/_tipo.yaml": "nombre: Ubicación\ncampos: {}\n",
    })
    const messages = problemsOf(result).map((problem) => problem.message)
    expect(messages).toContain("campos: Declara al menos un campo")
    expect(messages.some((message) => message.startsWith("plural: "))).toBe(
      true
    )
  })

  test("badly named types and entity files are problems; .yml is refused", async () => {
    const result = await load({
      ...VALID_SITE,
      "catalogo/Equipos/_tipo.yaml": "nombre: Equipo\n",
      "catalogo/maquinas/PVE-02.yaml": "ip: 192.168.1.11\n",
      "catalogo/maquinas/vps.yml": "ip: 203.0.113.42\n",
    })
    expect(problemsOf(result).map((problem) => problem.file)).toEqual([
      "catalogo/Equipos",
      "catalogo/maquinas/PVE-02.yaml",
      "catalogo/maquinas/vps.yml",
    ])
  })
})
