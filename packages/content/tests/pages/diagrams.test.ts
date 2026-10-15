import { describe, expect, test } from "bun:test"
import { htmlOf, messagesOf, page, pageAt, siteOf } from "#tests/fixtures/site"

// The fixture catalog has the type `maquinas` with the entity `nas`, which
// has no page of its own.
const KOMODO = [
  "titulo: Cómo despliega Komodo",
  "descripcion: Komodo manda a Periphery, que levanta los stacks",
  "nodos:",
  "  komodo: { entidad: maquinas/nas, icono: layers }",
  "  periphery: { nombre: Periphery, sub: agente, tipo: entrada }",
  "  stacks: Stacks",
  "conexiones:",
  "  - komodo -> periphery: deploy",
  "  - periphery -> stacks",
  "zonas:",
  "  casa: { titulo: Casa, nodos: [komodo, periphery] }",
].join("\n")

function diagramProblems(
  site: Awaited<ReturnType<typeof siteOf>>,
  file: string
): string[] {
  return pageAt(site, "")
    .problems.filter((problem) => problem.file === file)
    .map((problem) => problem.message)
}

describe("diagram files", () => {
  test("a valid diagram reports nothing and renders as text in every page that shows it", async () => {
    const site = await siteOf({
      "diagramas/komodo.yaml": KOMODO,
      "docs/index.mdx": page("Casa", '<Diagram id="komodo" />'),
      "docs/komodo.mdx": page("Komodo", 'Así:\n\n<Diagram id="komodo" />'),
    })
    expect(pageAt(site, "").problems).toEqual([])
    expect(pageAt(site, "komodo").problems).toEqual([])
    const html = htmlOf(pageAt(site, "komodo").tree)
    expect(html).toContain(
      '<figure class="doc-diagram" data-diagram="komodo"><figcaption><strong>Cómo despliega Komodo</strong>. Komodo manda a Periphery, que levanta los stacks</figcaption>'
    )
    expect(html).toContain(
      '<ul class="doc-diagram-zones"><li>Casa: <a href="/casa/catalogo/maquinas/nas">nas</a>, Periphery</li></ul>'
    )
    expect(html).toContain(
      '<li><a href="/casa/catalogo/maquinas/nas">nas</a> → Periphery: deploy</li>'
    )
    expect(html).toContain("<li>Periphery → Stacks</li>")
    expect(htmlOf(pageAt(site, "").tree)).toContain("<figure")
  })

  test("a missing description and an unknown key are reported with their paths", async () => {
    const site = await siteOf({
      "diagramas/red.yaml": "titulo: Red\norden: 1\nnodos: { a: A }\n",
    })
    expect(diagramProblems(site, "diagramas/red.yaml")).toEqual([
      "`orden` no es una clave de un diagrama (titulo, descripcion, direccion, nodos, conexiones, zonas)",
      "descripcion: Falta: es obligatorio",
    ])
  })

  test("an entity that does not exist is reported and the node keeps its id as name", async () => {
    const site = await siteOf({
      "diagramas/red.yaml": [
        "titulo: Red",
        "descripcion: La red",
        "nodos:",
        "  viejo: { entidad: maquinas/old-01 }",
        "  nas: { entidad: maquinas/nas }",
        "conexiones:",
        "  - viejo -> nas: copia",
      ].join("\n"),
      "docs/red.mdx": page("Red", '<Diagram id="red" />'),
    })
    expect(diagramProblems(site, "diagramas/red.yaml")).toEqual([
      "nodos.viejo.entidad: `maquinas/old-01` no es ninguna entidad del catálogo",
    ])
    expect(htmlOf(pageAt(site, "red").tree)).toContain(
      '<li>viejo → <a href="/casa/catalogo/maquinas/nas">nas</a>: copia</li>'
    )
    expect(messagesOf(pageAt(site, "red"))).toEqual([
      "diagramas/red.yaml: nodos.viejo.entidad: `maquinas/old-01` no es ninguna entidad del catálogo",
    ])
  })

  test("a connection to an undeclared node is reported and left out", async () => {
    const site = await siteOf({
      "diagramas/komodo.yaml": [
        "titulo: Komodo",
        "descripcion: Despliegue",
        "nodos: { komodo: Komodo }",
        "conexiones:",
        "  - komodo -> stacks: compose up",
        "  - no es una conexión",
      ].join("\n"),
      "docs/k.mdx": page("K", '<Diagram id="komodo" />'),
    })
    expect(diagramProblems(site, "diagramas/komodo.yaml")).toEqual([
      "conexiones.0: `stacks` no es ninguno de los nodos",
      "conexiones.1: `no es una conexión` no es `origen -> destino`",
    ])
    expect(htmlOf(pageAt(site, "k").tree)).not.toContain("compose up")
  })

  test("a node in two zones is reported naming both zones", async () => {
    const site = await siteOf({
      "diagramas/red.yaml": [
        "titulo: Red",
        "descripcion: La red",
        "nodos: { nas: NAS, vps: VPS }",
        "zonas:",
        "  casa: { titulo: Casa, nodos: [nas] }",
        "  fuera: { titulo: Fuera, nodos: [nas, vps] }",
      ].join("\n"),
    })
    expect(diagramProblems(site, "diagramas/red.yaml")).toEqual([
      "zonas.fuera.nodos: `nas` ya está en la zona `casa`: un nodo va en una zona como mucho",
    ])
  })

  test("a bad icon, a .yml file and a badly named file are reported", async () => {
    const site = await siteOf({
      "diagramas/red.yaml":
        "titulo: Red\ndescripcion: La red\nnodos: { a: { nombre: A, icono: cohete } }\n",
      "diagramas/viejo.yml": "titulo: Viejo\n",
      "diagramas/Mapa.yaml": "titulo: Mapa\n",
    })
    expect(diagramProblems(site, "diagramas/red.yaml")).toEqual([
      "nodos.a: icono: `cohete` no es un nombre de icono de Lucide (server, map-pin, network…)",
    ])
    expect(diagramProblems(site, "diagramas/viejo.yml")).toEqual([
      "La extensión es .yaml, no .yml",
    ])
    expect(diagramProblems(site, "diagramas/Mapa.yaml")).toHaveLength(1)
  })

  test("a YAML syntax error is reported with its line, and pages showing it get a notice", async () => {
    const site = await siteOf({
      "diagramas/red.yaml": "titulo: Red: la de casa\n",
      "diagramas/komodo.yaml": KOMODO,
      "docs/red.mdx": page("Red", '<Diagram id="red" />'),
      "docs/k.mdx": page("K", '<Diagram id="komodo" />'),
    })
    expect(diagramProblems(site, "diagramas/red.yaml")[0]).toStartWith(
      "YAML no válido en la línea 1"
    )
    expect(htmlOf(pageAt(site, "red").tree)).toContain(
      'class="doc-component-notice" data-component="Diagram"'
    )
    expect(htmlOf(pageAt(site, "k").tree)).toContain("<figure")
  })
})

describe("<Diagram> and ```diagram", () => {
  test("an unknown id, a missing id and an unknown attribute are reported on the line", async () => {
    const site = await siteOf({
      "diagramas/komodo.yaml": KOMODO,
      "docs/notas.mdx": page(
        "Notas",
        '<Diagram id="mapa" />\n\n<Diagram />\n\n<Diagram id="komodo" size="big" />'
      ),
    })
    const notas = pageAt(site, "notas")
    expect(messagesOf(notas)).toEqual([
      '<Diagram id="mapa">: no hay ningún diagramas/mapa.yaml que se pueda leer (hay: komodo)',
      "<Diagram> necesita id, el nombre de un fichero de diagramas/ (hay: komodo)",
      "<Diagram> no tiene el atributo size",
    ])
    expect(notas.problems.map((problem) => problem.line)).toEqual([6, 8, 10])
    expect(htmlOf(notas.tree)).toContain("<figure")
  })

  test("a <Diagram> inside a paragraph needs its own block", async () => {
    const site = await siteOf({
      "diagramas/komodo.yaml": KOMODO,
      "docs/notas.mdx": page("Notas", 'Mira <Diagram id="komodo" /> aquí'),
    })
    expect(messagesOf(pageAt(site, "notas"))).toEqual([
      "El componente <Diagram> va en su propio bloque, con una línea en blanco antes y después",
    ])
  })

  test("a ```diagram block is reported and shown as a notice", async () => {
    const site = await siteOf({
      "docs/notas.mdx": page("Notas", "```diagram\nnodes: { a: A }\n```"),
    })
    const notas = pageAt(site, "notas")
    expect(notas.problems).toEqual([
      {
        file: "docs/notas.mdx",
        line: 6,
        message:
          'Los diagramas van en diagramas/<id>.yaml y se muestran con <Diagram id="…" />',
      },
    ])
    expect(htmlOf(notas.tree)).toBe(
      '<div class="doc-component-notice">Los diagramas van en diagramas/&#x3C;id>.yaml y se muestran con &#x3C;Diagram id="…" /></div>'
    )
  })

  test("an entity's catalog page lists the diagrams it is a node of", async () => {
    const site = await siteOf({ "diagramas/komodo.yaml": KOMODO })
    const nas = pageAt(site, "catalogo/maquinas/nas")
    expect(nas.headings.map((heading) => heading.text)).toEqual(["Diagramas"])
    expect(htmlOf(nas.tree)).toContain('data-diagram="komodo"')
  })
})
