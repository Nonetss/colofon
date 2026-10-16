import { describe, expect, test } from "bun:test"
import { htmlOf, page, pageAt, siteOf } from "#tests/fixtures/site"

// A catalog shaped like the example homelab: a VM hosted on a machine, a
// stack on the VM, and pages that cite them in their header or with links.
const FILES: Record<string, string> = {
  "doc.config.yaml": [
    "nombre: Casa",
    'plataforma: "1"',
    "cabecera:",
    "  machines:",
    "    tipo: lista",
    "    opcional: true",
    "    de: { tipo: ref, a: machines }",
  ].join("\n"),
  "catalogo/machines/_tipo.yaml": [
    "nombre: Machine",
    "plural: Machines",
    "icono: server",
    "descripcion: Servers and VMs",
    "etiqueta: name",
    "campos:",
    "  name: { tipo: texto, opcional: true }",
    "  ip: { tipo: ip, etiqueta: Dirección IP }",
    "  host: { tipo: ref, a: machines, opcional: true }",
    "  page: { tipo: ficha, opcional: true }",
    "vista:",
    "  columnas: [name, ip]",
  ].join("\n"),
  "catalogo/machines/pve-01.yaml":
    "name: PVE-01\nip: 192.168.1.10\npage: red/dns\n",
  "catalogo/machines/docker-01.yaml":
    "ip: 192.168.1.20\nhost: pve-01\nfuente: komodo\nactualizado: 2026-10-01\n",
  "catalogo/machines/broken.yaml": "name: Broken\n",
  "catalogo/stacks/_tipo.yaml": [
    "nombre: Stack",
    "plural: Stacks",
    "campos:",
    "  services:",
    "    tipo: lista",
    "    de:",
    "      tipo: objeto",
    "      campos:",
    "        name: { tipo: texto }",
    "        machine: { tipo: ref, a: machines }",
  ].join("\n"),
  "catalogo/stacks/docker-01-adguard.yaml":
    "services:\n  - name: adguard\n    machine: docker-01\n",
  "docs/red/dns.mdx": page("DNS", "", "machines: [docker-01]\n"),
  "docs/copias.mdx": page(
    "Copias",
    "Van al [VM](catalogo:machines/docker-01)."
  ),
}

describe("generated catalog pages", () => {
  test("the catalog page lists every type with its counts", async () => {
    const site = await siteOf(FILES)
    const catalog = pageAt(site, "catalogo")
    expect(catalog.header.titulo).toBe("Catálogo")
    const html = htmlOf(catalog.tree)
    expect(html).toContain(
      '<tr><td><a href="/casa/catalogo/machines">Machines</a></td><td>Servers and VMs</td><td>2</td><td>1</td></tr>'
    )
    expect(html).toContain(
      '<tr><td><a href="/casa/catalogo/stacks">Stacks</a></td><td></td><td>1</td><td>0</td></tr>'
    )
  })

  test("a type's page is its table, titled and iconed by the type, with its invalid entities as problems", async () => {
    const site = await siteOf(FILES)
    const machines = pageAt(site, "catalogo/machines")
    expect(machines.header).toMatchObject({
      titulo: "Machines",
      descripcion: "Servers and VMs",
      icono: "server",
    })
    const html = htmlOf(machines.tree)
    expect(html).toContain("<th>name</th><th>Dirección IP</th>")
    expect(html).toContain(
      '<td><a href="/casa/catalogo/machines/docker-01">docker-01</a></td>'
    )
    expect(html).toContain('<td><a href="/casa/red/dns">PVE-01</a></td>')
    expect(machines.problems.map((problem) => problem.file)).toEqual([
      "catalogo/machines/broken.yaml",
    ])
    expect(machines.headings).toEqual([])
  })

  test("an entity's page is dated with its file's last commit; the generated index and type pages are not", async () => {
    const site = await siteOf(
      FILES,
      new Map([
        ["catalogo/machines/docker-01.yaml", "2026-09-30"],
        ["catalogo/machines/pve-01.yaml", "2026-08-01"],
        ["catalogo/machines/_tipo.yaml", "2026-07-01"],
      ])
    )
    expect(pageAt(site, "catalogo/machines/docker-01").header).toMatchObject({
      actualizado: "2026-10-01",
      editado: "2026-09-30",
    })
    expect(pageAt(site, "catalogo/machines/pve-01").header.editado).toBe(
      "2026-08-01"
    )
    expect(pageAt(site, "catalogo/machines").header.editado).toBeNull()
    expect(pageAt(site, "catalogo").header.editado).toBeNull()
  })

  test("a type without a description gets one from its plural", async () => {
    const site = await siteOf(FILES)
    expect(pageAt(site, "catalogo/stacks").header.descripcion).toBe(
      "Datos de Stacks"
    )
  })

  test("an entity's page shows its fields, who cites it and who points at it", async () => {
    const site = await siteOf(FILES)
    const docker = pageAt(site, "catalogo/machines/docker-01")
    expect(docker.header).toMatchObject({
      titulo: "docker-01",
      descripcion: "Machine",
      icono: "server",
      actualizado: "2026-10-01",
    })
    expect(docker.breadcrumbs).toEqual([
      { path: "catalogo", title: "Catálogo" },
      { path: "catalogo/machines", title: "Machines" },
    ])
    const html = htmlOf(docker.tree)
    expect(html).toContain(
      '<tr><td>host</td><td><a href="/casa/red/dns">PVE-01</a></td></tr>'
    )
    expect(html).toContain(
      "<tr><td>Dirección IP</td><td>192.168.1.20</td></tr>"
    )
    expect(html).not.toContain("<td>fuente</td>")
    expect(html).not.toContain("<td>actualizado</td>")
    expect(html).toContain(
      '</table><p class="doc-entity-source">Fuente: komodo</p>'
    )
    expect(html).toContain(
      '<h2 id="páginas-que-la-citan">Páginas que la citan</h2><ul><li><a href="/casa/copias">Copias</a></li><li><a href="/casa/red/dns">DNS</a></li></ul>'
    )
    expect(html).toContain('<h3 id="stacks">Stacks</h3>')
    expect(html).toContain(
      '<a href="/casa/catalogo/stacks/docker-01-adguard">docker-01-adguard</a>'
    )
    expect(docker.headings.map((heading) => heading.text)).toEqual([
      "Páginas que la citan",
      "Referencias",
      "Stacks",
    ])
  })

  test("an entity with a page links to it, and empty sections are left out", async () => {
    const site = await siteOf(FILES)
    const html = htmlOf(pageAt(site, "catalogo/machines/pve-01").tree)
    expect(html).toContain('<p>Página: <a href="/casa/red/dns">DNS</a></p>')
    expect(html).not.toContain("Páginas que la citan")
    expect(html).toContain('<h3 id="machines">Machines</h3>')
    expect(html).toContain(
      '<a href="/casa/catalogo/machines/docker-01">docker-01</a>'
    )
  })

  test("an invalid entity has no page", async () => {
    const site = await siteOf(FILES)
    expect(site.pages.has("catalogo/machines/broken")).toBe(false)
  })
})
