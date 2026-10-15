import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { toHtml } from "hast-util-to-html"
import type { MdxJsxFlowElement } from "mdast-util-mdx"
import { type Catalog, readCatalog } from "#catalog"
import { loadContent } from "#load"
import { type EntitiesContext, entitiesTable } from "#pages/entities"
import { type ContentDir, createContentDir } from "#tests/fixtures/content-dir"

// A catalog shaped like the example homelab: services grouped by an enum,
// machines labelled by an optional field and pointing at a location.
const FILES: Record<string, string> = {
  "doc.config.yaml": 'nombre: Homelab\nplataforma: "1"\n',
  "catalogo/locations/_tipo.yaml": [
    "nombre: Location",
    "plural: Locations",
    "etiqueta: name",
    "campos:",
    "  name: { tipo: texto }",
  ].join("\n"),
  "catalogo/locations/home.yaml": "name: Home\n",
  "catalogo/machines/_tipo.yaml": [
    "nombre: Machine",
    "plural: Machines",
    "etiqueta: name",
    "campos:",
    "  name: { tipo: texto, opcional: true }",
    "  ip: { tipo: ip }",
    "  kind: { tipo: enum, valores: [physical, vm] }",
    "  location: { tipo: ref, a: locations }",
    "  virtual: { tipo: booleano, opcional: true }",
    "  tags: { tipo: lista, opcional: true, de: { tipo: texto } }",
    "vista:",
    "  columnas: [name, ip, location]",
  ].join("\n"),
  "catalogo/machines/docker-01.yaml":
    "ip: 192.168.1.20\nkind: vm\nlocation: home\nvirtual: true\ntags: [docker, apps]\n",
  "catalogo/machines/pve-01.yaml":
    "name: PVE-01\nip: 192.168.1.10\nkind: physical\nlocation: home\n",
  "catalogo/services/_tipo.yaml": [
    "nombre: Service",
    "plural: Services",
    "etiqueta: name",
    "campos:",
    "  name: { tipo: texto }",
    "  category: { tipo: enum, valores: [network, containers, backups] }",
    "  url: { tipo: url, opcional: true }",
    "  machine: { tipo: ref, a: machines }",
    "  page: { tipo: ficha, opcional: true }",
  ].join("\n"),
  "catalogo/services/komodo.yaml":
    "name: Komodo\ncategory: containers\nurl: https://komodo.example\nmachine: docker-01\npage: containers/komodo\n",
  "catalogo/services/adguard.yaml":
    "name: AdGuard\ncategory: network\nmachine: docker-01\n",
  "catalogo/services/duplicati.yaml":
    "name: Duplicati\ncategory: backups\nmachine: docker-01\n",
  "catalogo/stacks/_tipo.yaml": [
    "nombre: Stack",
    "plural: Stacks",
    "campos:",
    "  machine: { tipo: ref, a: machines }",
  ].join("\n"),
  "catalogo/stacks/apps.yaml": "machine: docker-01\n",
  "catalogo/vlans/_tipo.yaml": [
    "nombre: VLAN",
    "plural: VLANs",
    "campos:",
    "  tag: { tipo: entero }",
  ].join("\n"),
  "docs/containers/komodo.mdx": "---\ntitulo: Komodo\n---\n",
}

let dir: ContentDir
let catalog: Catalog

beforeAll(async () => {
  dir = await createContentDir(FILES)
  const loaded = await loadContent(dir.root)
  if (!loaded.ok) throw new Error(JSON.stringify(loaded.problems))
  catalog = await readCatalog(dir.root, loaded.content)
})

afterAll(() => dir.remove())

function context(over: Partial<EntitiesContext> = {}): EntitiesContext {
  return {
    catalog,
    routeOf: (pagePath) => `/casa/${pagePath}`,
    titleOf: (pagePath) => `Título de ${pagePath}`,
    ...over,
  }
}

function attributes(
  values: Record<string, string>
): MdxJsxFlowElement["attributes"] {
  return Object.entries(values).map(([name, value]) => ({
    type: "mdxJsxAttribute",
    name,
    value,
  }))
}

function render(values: Record<string, string>, over = {}) {
  const { element, problems } = entitiesTable(attributes(values), context(over))
  return { html: toHtml(element), problems }
}

/** The text of every row of the first table, cell by cell. */
function rowsOf(html: string): string[][] {
  const body = html.slice(html.indexOf("<tbody>"), html.indexOf("</tbody>"))
  return [...body.matchAll(/<tr>(.*?)<\/tr>/g)].map((row) =>
    [...(row[1] ?? "").matchAll(/<td>(.*?)<\/td>/g)].map((cell) =>
      (cell[1] ?? "").replace(/<[^>]+>/g, "")
    )
  )
}

describe("entitiesTable", () => {
  test("columns from the type's view; the label falls back to the id and a ref shows its label", () => {
    const { html, problems } = render({ type: "machines" })
    expect(problems).toEqual([])
    expect(html).toContain(
      "<thead><tr><th>name</th><th>ip</th><th>location</th></tr></thead>"
    )
    expect(rowsOf(html)).toEqual([
      ["docker-01", "192.168.1.20", "Home"],
      ["PVE-01", "192.168.1.10", "Home"],
    ])
  })

  test("without a view the columns are the label, then every other field", () => {
    const { html } = render({ type: "services" })
    expect(html).toContain(
      "<tr><th>name</th><th>category</th><th>url</th><th>machine</th><th>page</th></tr>"
    )
  })

  test("without etiqueta the label column is the id", () => {
    const { html } = render({ type: "stacks" })
    expect(html).toContain("<tr><th>id</th><th>machine</th></tr>")
    expect(rowsOf(html)).toEqual([["apps", "docker-01"]])
  })

  test("a type without entities says so", () => {
    const { html } = render({ type: "vlans" })
    expect(html).toBe(
      '<div class="doc-entities"><p class="doc-entities-empty">No hay entradas en VLANs</p></div>'
    )
  })

  test("grouped by an enum, in valores order, without the group column", () => {
    const { html, problems } = render({
      type: "services",
      group: "category",
      columns: "name,category,machine",
    })
    expect(problems).toEqual([])
    const labels = [
      ...html.matchAll(/<p class="doc-entities-group">(.*?)<\/p>/g),
    ].map((match) => match[1])
    expect(labels).toEqual(["network", "containers", "backups"])
    expect(html).not.toContain("<th>category</th>")
    expect(html).toContain("<th>name</th><th>machine</th>")
  })

  test("the entity with a page links to it; one without is plain text", () => {
    const { html } = render({ type: "services", columns: "name" })
    expect(html).toContain(
      '<td><a href="/casa/containers/komodo">Komodo</a></td>'
    )
    expect(html).toContain("<td>AdGuard</td>")
  })

  test("cells by kind: url, ficha, booleano and lista", () => {
    const services = render({ type: "services", columns: "name,url,page" })
    expect(services.html).toContain(
      '<a href="https://komodo.example">https://komodo.example</a>'
    )
    expect(services.html).toContain(
      '<a href="/casa/containers/komodo">Título de containers/komodo</a>'
    )
    const machines = render({ type: "machines", columns: "id,virtual,tags" })
    expect(rowsOf(machines.html)).toEqual([
      ["docker-01", "Sí", "docker, apps"],
      ["pve-01", "", ""],
    ])
  })

  test("rows are ordered by label", () => {
    const { html } = render({ type: "services", columns: "name" })
    expect(rowsOf(html).map(([name]) => name)).toEqual([
      "AdGuard",
      "Duplicati",
      "Komodo",
    ])
  })

  test("an unknown column is reported and left out", () => {
    const { html, problems } = render({
      type: "services",
      columns: "name,owner",
    })
    expect(problems).toEqual([
      '<Entities type="services">: services no tiene el campo owner',
    ])
    expect(html).toContain("<tr><th>name</th></tr>")
  })

  test("an unknown group is reported and the table is not split", () => {
    const { html, problems } = render({ type: "services", group: "team" })
    expect(problems).toEqual([
      '<Entities type="services">: services no tiene el campo team',
    ])
    expect(html).not.toContain("doc-entities-group")
  })

  test("an unknown or missing type is a notice naming the types", () => {
    const unknown = render({ type: "servers" })
    expect(unknown.problems).toEqual([
      '<Entities type="servers">: no hay ese tipo en catalogo/ (hay: locations, machines, services, stacks, vlans)',
    ])
    expect(unknown.html).toContain('class="doc-component-notice"')
    const missing = render({})
    expect(missing.problems).toEqual([
      "<Entities> necesita type, uno de: locations, machines, services, stacks, vlans",
    ])
  })

  test("unknown attributes and values in braces are reported, and it still renders", () => {
    const { element, problems } = entitiesTable(
      [
        ...attributes({ type: "services", color: "red" }),
        { type: "mdxJsxAttribute", name: "columns", value: null },
        { type: "mdxJsxExpressionAttribute", value: "...x" },
      ],
      context()
    )
    expect(problems).toEqual([
      "<Entities> no tiene el atributo color",
      "El atributo columns de <Entities> va entre comillas",
      "<Entities> no admite atributos entre llaves {…}",
    ])
    expect(toHtml(element)).toContain("<table>")
  })

  test("a missing optional value leaves the cell empty", () => {
    const { html } = render({ type: "services", columns: "name,url" })
    expect(rowsOf(html)[0]).toEqual(["AdGuard", ""])
  })
})

describe("entitiesTable with an invalid entity", () => {
  let broken: ContentDir

  afterAll(() => broken.remove())

  test("the file is reported and the rest of the table renders", async () => {
    broken = await createContentDir({
      ...FILES,
      "catalogo/machines/nas.yaml": "kind: physical\nlocation: home\n",
    })
    const loaded = await loadContent(broken.root)
    if (!loaded.ok) throw new Error(JSON.stringify(loaded.problems))
    const withNas = await readCatalog(broken.root, loaded.content)
    const { element, problems } = entitiesTable(
      attributes({ type: "machines" }),
      context({ catalog: withNas })
    )
    expect(problems).toHaveLength(1)
    expect(problems[0]).toStartWith("catalogo/machines/nas.yaml: ip: ")
    expect(rowsOf(toHtml(element)).map(([name]) => name)).toEqual([
      "docker-01",
      "PVE-01",
    ])
  })
})
