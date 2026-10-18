import { afterEach, describe, expect, test } from "bun:test"
import { type LoadResult, loadContent } from "#contract/read/declarations"
import {
  contract1Path,
  translateContract1,
} from "#contract/versions/contract-1"
import { type ContentDir, createContentDir } from "#tests/fixtures/content-dir"
import { CONTRACT_1_SITE, CONTRACT_2_TWIN } from "#tests/fixtures/contract-1"
import { htmlOf, messagesOf, pageAt, readSiteOf } from "#tests/fixtures/site"

let dir: ContentDir | undefined

afterEach(async () => {
  await dir?.remove()
  dir = undefined
})

async function load(files: Record<string, string>): Promise<LoadResult> {
  dir = await createContentDir(files)
  return loadContent(dir.root)
}

function messages(result: LoadResult): string[] {
  if (result.ok) return []
  return result.problems.map((problem) => problem.message)
}

/** CONTRACT_1_SITE with `file` replaced by `lines`. */
function contract1With(file: string, lines: string[]): Record<string, string> {
  return { ...CONTRACT_1_SITE, [file]: lines.join("\n") }
}

describe("translateContract1", () => {
  test("doc.config.yaml takes the English keys, its header fields included", () => {
    const { data, foreign } = translateContract1("config", {
      nombre: "Homelab",
      descripcion: "La red",
      plataforma: "1",
      cabecera: {
        ver: { tipo: "lista", opcional: true, de: { tipo: "ficha" } },
      },
    })
    expect(data).toEqual({
      name: "Homelab",
      description: "La red",
      contract: "2",
      header: { ver: { type: "list", optional: true, of: { type: "page" } } },
    })
    expect(foreign).toEqual([])
  })

  test("etiqueta is a type's title_field and a field's label", () => {
    const { data } = translateContract1("type", {
      nombre: "Máquina",
      plural: "Máquinas",
      etiqueta: "hostname",
      vista: { columnas: ["hostname", "actualizado"] },
      campos: { hostname: { tipo: "texto", etiqueta: "Nombre" } },
    })
    expect(data).toEqual({
      name: "Máquina",
      plural: "Máquinas",
      title_field: "hostname",
      view: { columns: ["hostname", "updated"] },
      fields: { hostname: { type: "text", label: "Nombre" } },
    })
  })

  test("every kind is renamed, inside lists and objects at any depth", () => {
    const { data } = translateContract1("type", {
      campos: {
        a: { tipo: "entero" },
        b: { tipo: "numero" },
        c: { tipo: "booleano" },
        d: { tipo: "fecha" },
        e: { tipo: "enum", valores: ["x"] },
        f: { tipo: "ref", a: "centros" },
        g: {
          tipo: "lista",
          de: { tipo: "objeto", campos: { h: { tipo: "url" } } },
        },
      },
    })
    expect(data).toEqual({
      fields: {
        a: { type: "integer" },
        b: { type: "number" },
        c: { type: "boolean" },
        d: { type: "date" },
        e: { type: "enum", values: ["x"] },
        f: { type: "ref", to: "centros" },
        g: {
          type: "list",
          of: { type: "object", fields: { h: { type: "url" } } },
        },
      },
    })
  })

  test("menu.yaml renames its groups and object entries and keeps text entries", () => {
    const { data } = translateContract1("menu", {
      secciones: [
        {
          titulo: "Red",
          icono: "network",
          paginas: ["red", { ruta: "red/dns", titulo: "DNS" }],
        },
      ],
    })
    expect(data).toEqual({
      sections: [
        {
          title: "Red",
          icon: "network",
          pages: ["red", { path: "red/dns", title: "DNS" }],
        },
      ],
    })
  })

  test("names the site chose are never renamed", () => {
    expect(
      translateContract1("type", {
        campos: { titulo: { tipo: "texto" }, nombre: { tipo: "texto" } },
      }).data
    ).toEqual({
      fields: { titulo: { type: "text" }, nombre: { type: "text" } },
    })
    expect(
      translateContract1("entity", {
        nombre: "NAS",
        tipo: "fisica",
        fuente: "manual",
        actualizado: "2026-10-15",
      }).data
    ).toEqual({
      nombre: "NAS",
      tipo: "fisica",
      source: "manual",
      updated: "2026-10-15",
    })
    expect(
      translateContract1("pageHeader", { titulo: "DNS", maquinas: ["nas"] })
        .data
    ).toEqual({ title: "DNS", maquinas: ["nas"] })
  })

  test("a contract 2 key where contract 1 has its own name is left out and reported", () => {
    const { data, foreign } = translateContract1("type", {
      name: "Máquina",
      plural: "Máquinas",
      campos: { ip: { type: "ip", tipo: "ip" } },
    })
    expect(data).toEqual({ plural: "Máquinas", fields: { ip: { type: "ip" } } })
    expect(foreign).toEqual([["name"], ["campos", "ip", "type"]])
  })
})

describe("contract1Path", () => {
  test("maps a contract 2 path back to the keys the file holds", () => {
    expect(contract1Path("type", ["title_field"])).toEqual(["etiqueta"])
    expect(contract1Path("type", ["fields", "ip", "label"])).toEqual([
      "campos",
      "ip",
      "etiqueta",
    ])
    expect(contract1Path("type", ["fields", "p", "of", "type"])).toEqual([
      "campos",
      "p",
      "de",
      "tipo",
    ])
    expect(contract1Path("type", ["view", "columns", 1])).toEqual([
      "vista",
      "columnas",
      1,
    ])
    expect(contract1Path("menu", ["sections", 0, "pages", 1, "icon"])).toEqual([
      "secciones",
      0,
      "paginas",
      1,
      "icono",
    ])
    expect(contract1Path("config", ["header", "name", "label"])).toEqual([
      "cabecera",
      "name",
      "etiqueta",
    ])
  })

  test("what it cannot place is kept as is", () => {
    expect(contract1Path("type", ["otra", "cosa"])).toEqual(["otra", "cosa"])
  })
})

describe("a contract 1 repository", () => {
  test("loads to the same declarations as its contract 2 twin", async () => {
    const one = await load(CONTRACT_1_SITE)
    if (!one.ok) throw new Error(JSON.stringify(one.problems))
    await dir?.remove()
    const two = await load(CONTRACT_2_TWIN)
    if (!two.ok) throw new Error(JSON.stringify(two.problems))
    expect(one.content.contract).toBe("1")
    expect(two.content.contract).toBe("2")
    expect(one.content.config).toEqual(two.content.config)
    expect(one.content.menu).toEqual(two.content.menu)
    expect(one.content.types).toEqual(two.content.types)
    expect(one.content.index).toEqual(two.content.index)
  })

  test("reads to the same pages, navigation and catalog as its twin", async () => {
    const one = await readSiteOf(CONTRACT_1_SITE)
    const two = await readSiteOf(CONTRACT_2_TWIN)
    expect([...one.pages.keys()]).toEqual([...two.pages.keys()])
    for (const [pagePath, page] of two.pages) {
      const same = pageAt(one, pagePath)
      expect(same.header).toEqual(page.header)
      expect(htmlOf(same.tree)).toBe(htmlOf(page.tree))
    }
    expect(one.nav).toEqual(two.nav)
    expect(pageAt(one, "catalog/maquinas/nas").header.updated).toBe(
      "2026-10-15"
    )
    expect(htmlOf(pageAt(one, "catalog/maquinas/nas").tree)).toContain(
      "Fuente: manual"
    )
  })

  test("its problems name the keys as its files write them", async () => {
    const one = await readSiteOf(CONTRACT_1_SITE)
    const two = await readSiteOf(CONTRACT_2_TWIN)
    expect(messagesOf(pageAt(one, "red"))).toEqual([
      "titulo: la cabecera dice «Red», pero manda menu.yaml («Redes»)",
    ])
    expect(messagesOf(pageAt(two, "red"))).toEqual([
      "title: la cabecera dice «Red», pero manda menu.yaml («Redes»)",
    ])
  })

  test("is reported once as superseded on its home, and its twin is not", async () => {
    const one = await readSiteOf(CONTRACT_1_SITE)
    const two = await readSiteOf(CONTRACT_2_TWIN)
    expect(pageAt(one, "").problems).toEqual([
      {
        file: "doc.config.yaml",
        line: null,
        message:
          'Este repositorio sigue el contrato 1, con las claves en español (`plataforma: "1"`). Se sigue leyendo, pero el contrato 2 las nombra en inglés (`contract: "2"`): la guía «Escribir documentación» explica el cambio en «Pasar del contrato 1 al 2»',
      },
    ])
    expect(pageAt(two, "").problems).toEqual([])
  })

  test("declaration problems are on the Spanish keys", async () => {
    const result = await load(
      contract1With("catalog/maquinas/_type.yaml", [
        "nombre: Máquina",
        "plural: Máquinas",
        "etiqueta: nada",
        "vista: { columnas: [ip, uso] }",
        "campos:",
        "  ip: { tipo: ip }",
        "  ubicacion: { tipo: ref, a: ubicaciones }",
      ])
    )
    expect(messages(result)).toEqual([
      "etiqueta: `nada` no es ninguno de los campos",
      "vista.columnas.1: `uso` no es ninguno de los campos",
    ])
  })

  test("an unknown kind is reported on campos and tipo", async () => {
    const result = await load(
      contract1With("catalog/ubicaciones/_type.yaml", [
        "nombre: Ubicación",
        "plural: Ubicaciones",
        "campos:",
        "  lugar: { tipo: ipp }",
      ])
    )
    expect(messages(result)).toEqual(["campos.lugar.tipo: Entrada inválida"])
  })

  test("a reference to a missing type names `a` and `de`", async () => {
    const result = await load(
      contract1With("catalog/ubicaciones/_type.yaml", [
        "nombre: Ubicación",
        "plural: Ubicaciones",
        "campos:",
        "  lugar: { tipo: texto }",
        "  redes: { tipo: lista, de: { tipo: ref, a: redes } }",
      ])
    )
    expect(messages(result)).toEqual([
      "redes.de: `a: redes` no es ningún tipo de catalog/ (hay: maquinas, ubicaciones)",
    ])
  })

  test("a menu problem is on secciones and icono", async () => {
    const result = await load(
      contract1With("menu.yaml", [
        "secciones:",
        "  - titulo: Red",
        "    icono: netwrok",
        "    paginas: [red]",
      ])
    )
    expect(messages(result)).toEqual([
      "secciones.0.icono: `netwrok` no es un nombre de icono de Lucide (server, map-pin, network…)",
    ])
  })

  test("a contract 2 key in a contract 1 file is reported, and its own key is missing", async () => {
    const result = await load(
      contract1With("catalog/ubicaciones/_type.yaml", [
        "name: Ubicación",
        "plural: Ubicaciones",
        "campos:",
        "  lugar: { tipo: texto }",
      ])
    )
    expect(messages(result)).toEqual([
      'name: `name` es una clave del contrato 2, y este repositorio sigue el contrato 1 (`plataforma: "1"`)',
      "nombre: Entrada inválida: se esperaba texto, recibido indefinido",
    ])
  })

  test("a field named like a contract 2 reserved field is refused", async () => {
    const result = await load(
      contract1With("catalog/ubicaciones/_type.yaml", [
        "nombre: Ubicación",
        "plural: Ubicaciones",
        "campos:",
        "  lugar: { tipo: texto }",
        "  source: { tipo: texto }",
      ])
    )
    expect(messages(result)).toEqual([
      "campos.source: `source` no se puede declarar: toda entidad lo admite sin declararlo",
    ])
  })

  test("an entity problem is on the Spanish keys", async () => {
    const dated = await readSiteOf({
      ...CONTRACT_1_SITE,
      "catalog/maquinas/pve-01.yaml":
        "hostname: pve-01\nip: 192.168.1.10\nubicacion: casa\nactualizado: ayer\nsource: x\n",
    })
    expect(messagesOf(pageAt(dated, "catalog/maquinas"))).toEqual([
      'source: `source` es una clave del contrato 2, y este repositorio sigue el contrato 1 (`plataforma: "1"`)',
      "actualizado: Una fecha AAAA-MM-DD (2026-10-15)",
    ])
  })

  test("a page header problem names the Spanish key and finds its line", async () => {
    const site = await readSiteOf({
      ...CONTRACT_1_SITE,
      "docs/red/vpn.mdx":
        "---\ntitulo: VPN\ndescripcion: Túnel\nicono: netwrok\ntitle: VPN\n---\n",
      "docs/red/sin.mdx": "---\nicono: router\n---\n",
    })
    expect(pageAt(site, "red/vpn").problems).toEqual([
      {
        file: "docs/red/vpn.mdx",
        line: 4,
        message:
          "icono: `netwrok` no es un nombre de icono de Lucide (server, map-pin, network…)",
      },
      {
        file: "docs/red/vpn.mdx",
        line: 5,
        message:
          'title: `title` es una clave del contrato 2, y este repositorio sigue el contrato 1 (`plataforma: "1"`)',
      },
    ])
    expect(messagesOf(pageAt(site, "red/sin"))).toEqual([
      "titulo: Entrada inválida: se esperaba texto, recibido indefinido",
      "descripcion: Entrada inválida: se esperaba texto, recibido indefinido",
    ])
  })

  test("an unknown header key lists the Spanish fixed keys", async () => {
    const site = await readSiteOf({
      ...CONTRACT_1_SITE,
      "docs/red/vpn.mdx":
        "---\ntitulo: VPN\ndescripcion: Túnel\notro: 1\n---\n",
    })
    expect(messagesOf(pageAt(site, "red/vpn"))).toEqual([
      "La cabecera no admite `otro`: solo titulo, descripcion, icono, orden, actualizado y los campos de cabecera de doc.config.yaml",
    ])
  })
})

describe("the contract version", () => {
  test("an unquoted plataforma is reported under its own name", async () => {
    const result = await load(
      contract1With("doc.config.yaml", ["nombre: Homelab", "plataforma: 1"])
    )
    expect(messages(result)).toContain(
      'plataforma: `plataforma` es la versión del contrato, entre comillas: "1"'
    )
  })

  test("with both keys the repository is version 2 and plataforma is refused", async () => {
    const result = await load({
      ...CONTRACT_2_TWIN,
      "doc.config.yaml": 'name: Homelab\ncontract: "2"\nplataforma: "1"\n',
    })
    expect(messages(result)).toEqual(['Llave desconocida: "plataforma"'])
  })

  test("without either key, contract is missing", async () => {
    const result = await load({
      ...CONTRACT_2_TWIN,
      "doc.config.yaml": "name: Homelab\n",
    })
    expect(messages(result)).toEqual([
      'contract: `contract` es la versión del contrato, entre comillas: "2"',
    ])
  })
})
