import { afterEach, describe, expect, test } from "bun:test"
import {
  type ContentProblem,
  type LoadResult,
  loadContent,
  parseJson,
} from "#load"
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

  test("folder paths list every folder holding a page; docs/catalogo is left out", async () => {
    const result = await load({
      ...VALID_SITE,
      "docs/contenedores/komodo/nuevo-stack.mdx": "---\ntitulo: Nuevo\n---\n",
      "docs/catalogo/index.mdx": "---\ntitulo: Mío\n---\n",
    })
    if (!result.ok) throw new Error(JSON.stringify(result.problems))
    expect(result.content.index.folderPaths).toEqual([
      "contenedores",
      "contenedores/komodo",
      "red",
    ])
    expect(result.content.index.pagePaths).not.toContain("catalogo")
  })
})

describe("menu.yaml", () => {
  const MENU = [
    "secciones:",
    "  - titulo: Red",
    "    icono: network",
    "    descripcion: El DNS",
    "    paginas:",
    "      - red",
    "      - { ruta: red/dns, titulo: Nombres, icono: globe }",
  ].join("\n")

  test("a valid menu is read as written", async () => {
    const result = await load({ ...VALID_SITE, "menu.yaml": MENU })
    if (!result.ok) throw new Error(JSON.stringify(result.problems))
    expect(result.content.menu).toEqual({
      secciones: [
        {
          titulo: "Red",
          icono: "network",
          descripcion: "El DNS",
          paginas: [
            "red",
            { ruta: "red/dns", titulo: "Nombres", icono: "globe" },
          ],
        },
      ],
    })
  })

  test("without menu.yaml the menu is null and nothing is reported", async () => {
    const result = await load(VALID_SITE)
    if (!result.ok) throw new Error(JSON.stringify(result.problems))
    expect(result.content.menu).toBeNull()
  })

  test("an unknown key and a bad icon make the declarations invalid, with their paths", async () => {
    const result = await load({
      ...VALID_SITE,
      "menu.yaml": [
        "secciones:",
        "  - titulo: Red",
        "    icono: netwrok",
        "    orden: 2",
        "    paginas: [red]",
      ].join("\n"),
    })
    expect(result.ok).toBe(false)
    const messages = problemsOf(result).map((problem) => problem.message)
    expect(messages).toContain(
      "secciones.0.icono: `netwrok` no es un nombre de icono de Lucide (server, map-pin, network…)"
    )
    expect(messages.some((message) => message.includes("orden"))).toBe(true)
    expect(problemsOf(result).every((p) => p.file === "menu.yaml")).toBe(true)
  })

  test("a path that names no page is not a declaration problem", async () => {
    const result = await load({
      ...VALID_SITE,
      "menu.yaml": "secciones:\n  - titulo: Red\n    paginas: [red/vpn]\n",
    })
    expect(result.ok).toBe(true)
  })
})

describe("parseJson", () => {
  function parsed(text: string) {
    const problems: ContentProblem[] = []
    const data = parseJson(text, "diagramas/red.json", problems)
    return { data, problems }
  }

  test("a valid object is returned as it is, with no problem", () => {
    expect(parsed('{ "title": "Red", "nodes": [1, 2] }')).toEqual({
      data: { title: "Red", nodes: [1, 2] },
      problems: [],
    })
  })

  test("a syntax error is reported with its line and column", () => {
    const { data, problems } = parsed('{\n  "title": "Red"\n  "desc": "x"\n}')
    expect(data).toBeUndefined()
    expect(problems).toEqual([
      {
        file: "diagramas/red.json",
        message:
          "JSON no válido en la línea 3, columna 3: falta una coma entre dos elementos",
      },
    ])
  })

  test("a trailing comma is refused", () => {
    const { data, problems } = parsed('{ "nodes": [1, 2,] }')
    expect(data).toBeUndefined()
    expect(problems[0]?.message).toContain("línea 1, columna 18")
  })

  test("a comment is refused", () => {
    const { problems } = parsed('{ // red\n "title": "Red" }')
    expect(problems[0]?.message).toContain("JSON no admite comentarios")
  })

  test("an empty file is reported as empty", () => {
    expect(parsed("  \n").problems).toEqual([
      { file: "diagramas/red.json", message: "Está vacío" },
    ])
  })
})
