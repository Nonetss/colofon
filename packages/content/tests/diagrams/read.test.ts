import { describe, expect, test } from "bun:test"
import { htmlOf, messagesOf, page, pageAt, siteOf } from "#tests/fixtures/site"

// The fixture catalog has the type `maquinas` with the entity `nas`, which
// has no page of its own.
const KOMODO = {
  title: "Cómo despliega Komodo",
  desc: "Komodo manda a Periphery, que levanta los stacks",
  width: 600,
  height: 200,
  zones: [{ id: "casa", x: 16, y: 16, w: 400, h: 120, label: "CASA" }],
  nodes: [
    {
      id: "komodo",
      entity: "maquinas/nas",
      kind: "focal",
      tag: "Core",
      x: 24,
      y: 40,
      w: 160,
      h: 72,
      zone: "casa",
    },
    {
      id: "periphery",
      name: "Periphery",
      sub: "agente",
      kind: "input",
      x: 240,
      y: 40,
      w: 160,
      h: 72,
      zone: "casa",
    },
    { id: "stacks", name: "Stacks", x: 440, y: 40, w: 140, h: 72 },
  ],
  edges: [
    {
      from: "komodo",
      to: "periphery",
      points: [
        [184, 76],
        [240, 76],
      ],
      label: "DEPLOY",
      at: [212, 66],
    },
    {
      from: "periphery",
      to: "stacks",
      kind: "accent",
      points: [
        [400, 76],
        [440, 76],
      ],
    },
  ],
}

const json = (value: unknown) => JSON.stringify(value, null, 2)

/** KOMODO with `change` applied to a copy. */
function komodoWith(change: (diagram: typeof KOMODO) => void): string {
  const copy: typeof KOMODO = structuredClone(KOMODO)
  change(copy)
  return json(copy)
}

/** A small diagram with `nodes` and `edges`, sized 400×200. */
function drawn(extra: Record<string, unknown>): string {
  return json({
    title: "Red",
    desc: "La red",
    width: 400,
    height: 200,
    ...extra,
  })
}

function box(id: string, x: number, extra: Record<string, unknown> = {}) {
  return { id, name: id.toUpperCase(), x, y: 40, w: 120, h: 72, ...extra }
}

function diagramProblems(
  site: Awaited<ReturnType<typeof siteOf>>,
  file: string
): string[] {
  return pageAt(site, "")
    .problems.filter((problem) => problem.file === file)
    .map((problem) => problem.message)
}

describe("diagram files", () => {
  test("a valid diagram reports nothing and renders, with its caption and text, in every page that shows it", async () => {
    const site = await siteOf({
      "diagrams/komodo.json": json(KOMODO),
      "docs/index.mdx": page("Casa", '<Diagram id="komodo" />'),
      "docs/komodo.mdx": page("Komodo", 'Así:\n\n<Diagram id="komodo" />'),
    })
    expect(pageAt(site, "").problems).toEqual([])
    expect(pageAt(site, "komodo").problems).toEqual([])
    const html = htmlOf(pageAt(site, "komodo").tree)
    expect(html).toContain(
      '<figure class="doc-diagram" data-diagram="komodo" data-drawn=""><figcaption><strong>Cómo despliega Komodo</strong>. Komodo manda a Periphery, que levanta los stacks</figcaption>'
    )
    expect(html).toContain(
      '<ul class="doc-diagram-zones"><li>CASA: <a href="/casa/catalog/maquinas/nas">nas</a>, Periphery</li></ul>'
    )
    expect(html).toContain(
      '<li><a href="/casa/catalog/maquinas/nas">nas</a> → Periphery: DEPLOY</li>'
    )
    expect(html).toContain("<li>Periphery → Stacks</li>")
    expect(htmlOf(pageAt(site, "").tree)).toContain("<figure")
  })

  test("a diagram is drawn at its positions, with its legend, and its text kept off screen", async () => {
    const site = await siteOf({
      "diagrams/komodo.json": json(KOMODO),
      "docs/index.mdx": page("Casa", '<Diagram id="komodo" />'),
    })
    const html = htmlOf(pageAt(site, "").tree)
    expect(html).toContain(
      '<div class="doc-diagram-canvas"><svg class="doc-diagram-svg" viewBox="0 0 600 '
    )
    expect(html).toContain(
      'role="img" aria-label="Cómo despliega Komodo. Komodo manda a Periphery, que levanta los stacks"><title>Cómo despliega Komodo</title>'
    )
    expect(html.match(/class="doc-diagram-box/g)).toHaveLength(3)
    expect(
      html.match(/<path class="doc-diagram-edge[^"]*" data-edge/g)
    ).toHaveLength(2)
    expect(html).toContain(
      '<rect class="doc-diagram-zone" data-zone="casa" x="16" y="16" width="400" height="120" rx="8">'
    )
    expect(html).toContain(">DEPLOY</text>")
    expect(html).toContain(">CORE</text>")
    expect(html).toContain(
      '<rect class="doc-diagram-node doc-diagram-focal" x="24" y="40"'
    )
    expect(html).toContain(">agente</text>")
    expect(html).toContain(">LEYENDA</text>")
    for (const name of [
      "Pieza central",
      "Servicio",
      "Usuario / origen",
      "Conexión",
      "Camino principal",
    ])
      expect(html).toContain(`>${name}</text>`)
    expect(html).not.toContain(">Datos / destino</text>")
    expect(html).toContain(
      '<div class="doc-diagram-text"><ul class="doc-diagram-zones">'
    )
  })

  test("an entity box links to the entity's page, carries its data and content text stays text", async () => {
    const site = await siteOf({
      "diagrams/komodo.json": komodoWith((diagram) => {
        const [, , stacks] = diagram.nodes
        if (stacks !== undefined) stacks.name = "<script>alert(1)</script>"
      }),
      "docs/index.mdx": page("Casa", '<Diagram id="komodo" />'),
    })
    const html = htmlOf(pageAt(site, "").tree)
    expect(html).toContain(
      '<a class="doc-diagram-box doc-diagram-link" href="/casa/catalog/maquinas/nas" data-node="komodo" data-zone="casa">'
    )
    expect(html).toContain(
      '<path class="doc-diagram-hit" data-edge="0" data-from="komodo" data-to="periphery" data-label="DEPLOY"'
    )
    expect(html).not.toContain("<script>")
    expect(html).toContain("&#x3C;script>alert(1)&#x3C;/script>")
  })

  test("a box can link to a page, and one that does not exist is reported", async () => {
    const site = await siteOf({
      "diagrams/red.json": drawn({
        nodes: [
          box("a", 24, { page: "notas" }),
          box("b", 200, { page: "red/vpn" }),
        ],
      }),
      "docs/notas.mdx": page("Notas", '<Diagram id="red" />'),
    })
    expect(diagramProblems(site, "diagrams/red.json")).toEqual([
      "nodes.1.page: `red/vpn` no es ninguna página de docs/",
    ])
    const html = htmlOf(pageAt(site, "notas").tree)
    expect(html).toContain('href="/casa/notas" data-node="a"')
    expect(html).toContain('<g class="doc-diagram-box" data-node="b">')
  })

  test("a missing description and an unknown key are reported with their paths", async () => {
    const site = await siteOf({
      "diagrams/red.json": json({
        title: "Red",
        orden: 1,
        width: 100,
        height: 100,
        nodes: [box("a", 0)],
      }),
    })
    expect(diagramProblems(site, "diagrams/red.json")).toEqual([
      "`orden` no es una clave de un diagrama ($schema, title, desc, kindNames, edgeNames, badgeName, shapes, colorEdges, width, height, nodes, edges, zones, notes)",
      "desc: Falta: es obligatorio",
    ])
  })

  test("an entity that does not exist is reported and the box keeps its id as name, unlinked", async () => {
    const site = await siteOf({
      "diagrams/red.json": drawn({
        nodes: [
          { id: "viejo", entity: "maquinas/old-01", x: 0, y: 0, w: 120, h: 60 },
          { id: "nas", entity: "maquinas/nas", x: 200, y: 0, w: 120, h: 60 },
        ],
        edges: [
          {
            from: "viejo",
            to: "nas",
            points: [
              [120, 30],
              [200, 30],
            ],
            label: "COPIA",
            at: [160, 20],
          },
        ],
      }),
      "docs/red.mdx": page("Red", '<Diagram id="red" />'),
    })
    expect(diagramProblems(site, "diagrams/red.json")).toEqual([
      "nodes.0.entity: `maquinas/old-01` no es ninguna entidad del catálogo",
    ])
    expect(htmlOf(pageAt(site, "red").tree)).toContain(
      '<li>viejo → <a href="/casa/catalog/maquinas/nas">nas</a>: COPIA</li>'
    )
    expect(messagesOf(pageAt(site, "red"))).toEqual([
      "diagrams/red.json: nodes.0.entity: `maquinas/old-01` no es ninguna entidad del catálogo",
    ])
  })

  test("an arrow to an undeclared box is reported and drawn without that end", async () => {
    const site = await siteOf({
      "diagrams/komodo.json": drawn({
        nodes: [box("komodo", 24)],
        edges: [
          {
            from: "komodo",
            to: "stacks",
            points: [
              [144, 76],
              [240, 76],
            ],
          },
        ],
      }),
      "docs/k.mdx": page("K", '<Diagram id="komodo" />'),
    })
    expect(diagramProblems(site, "diagrams/komodo.json")).toEqual([
      "edges.0.to: `stacks` no es ninguna de las cajas",
    ])
    const html = htmlOf(pageAt(site, "k").tree)
    expect(html).toContain(
      '<path class="doc-diagram-edge" data-edge="0" data-from="komodo" d="M144 76 L240 76">'
    )
    expect(html).not.toContain("<li>KOMODO →")
  })

  test("a diagonal segment is reported and its arrow left out", async () => {
    const site = await siteOf({
      "diagrams/red.json": drawn({
        nodes: [box("a", 0)],
        edges: [
          {
            points: [
              [100, 40],
              [200, 80],
            ],
          },
        ],
      }),
      "docs/red.mdx": page("Red", '<Diagram id="red" />'),
    })
    expect(diagramProblems(site, "diagrams/red.json")).toEqual([
      "edges.0.points: tramo en diagonal 100,40 → 200,80",
    ])
    expect(htmlOf(pageAt(site, "red").tree)).not.toContain("doc-diagram-edge")
  })

  test("a box in two zones, an unknown zone and a repeated id are reported", async () => {
    const site = await siteOf({
      "diagrams/red.json": drawn({
        zones: [{ id: "home", x: 0, y: 0, w: 300, h: 150, label: "HOME" }],
        nodes: [
          box("nas", 0, { zone: ["home", "outside"] }),
          box("vps", 140, { zone: "casa" }),
          box("nas", 280),
        ],
      }),
    })
    expect(diagramProblems(site, "diagrams/red.json")).toEqual([
      "nodes.0.zone: Una caja está en una zona: el id de esa zona",
      "nodes.1.zone: `casa` no es ninguna de las zonas",
      "nodes.2.id: `nas` ya es el id de otra caja",
    ])
  })

  test("a label without `at` is reported and its arrow drawn without it", async () => {
    const site = await siteOf({
      "diagrams/red.json": drawn({
        nodes: [box("a", 0), box("b", 200)],
        edges: [
          {
            from: "a",
            to: "b",
            label: "PULL",
            points: [
              [120, 76],
              [200, 76],
            ],
          },
        ],
      }),
      "docs/red.mdx": page("Red", '<Diagram id="red" />'),
    })
    expect(diagramProblems(site, "diagrams/red.json")).toEqual([
      "edges.0: Una etiqueta (label) necesita at: dónde va",
    ])
    const html = htmlOf(pageAt(site, "red").tree)
    expect(html).toContain("doc-diagram-edge")
    expect(html).not.toContain(">PULL</text>")
  })

  test("a badge is a chip on its from box in its to box's hue, named in the legend", async () => {
    const site = await siteOf({
      "diagrams/red.json": drawn({
        zones: [
          {
            id: "auth",
            x: 180,
            y: 20,
            w: 200,
            h: 120,
            label: "AUTH",
            hue: "teal",
          },
        ],
        nodes: [box("grafana", 0), box("authentik", 200, { zone: "auth" })],
        edges: [{ from: "grafana", to: "authentik", badge: "SSO" }],
      }),
      "docs/red.mdx": page("Red", '<Diagram id="red" />'),
    })
    expect(diagramProblems(site, "diagrams/red.json")).toEqual([])
    const html = htmlOf(pageAt(site, "red").tree)
    expect(html).toContain(
      '<g class="doc-diagram-badge doc-diagram-hued doc-diagram-hue-teal" data-edge="0" data-from="grafana" data-to="authentik" data-label="SSO">'
    )
    expect(html).not.toContain('<path class="doc-diagram-edge')
    expect(html).toContain(">Conexión con una pieza lejana</text>")
    expect(html).toContain(
      '<g class="doc-diagram-box doc-diagram-hued doc-diagram-hue-teal" data-node="authentik" data-zone="auth">'
    )
    expect(html).toContain("<li>GRAFANA → AUTHENTIK: SSO</li>")
  })

  test("a badge without both ends is reported and left out", async () => {
    const site = await siteOf({
      "diagrams/red.json": drawn({
        nodes: [box("grafana", 0)],
        edges: [{ from: "grafana", badge: "SSO" }],
      }),
    })
    expect(diagramProblems(site, "diagrams/red.json")).toEqual([
      "edges.0: Una insignia (badge) lleva from y to, dos cajas que existan",
    ])
  })

  test("a name too wide for its box is reported and the box still renders", async () => {
    const site = await siteOf({
      "diagrams/red.json": drawn({
        nodes: [box("a", 0, { name: "Registro de contenedores de Gitea" })],
      }),
      "docs/red.mdx": page("Red", '<Diagram id="red" />'),
    })
    expect(diagramProblems(site, "diagrams/red.json")).toEqual([
      'nodes.0: "Registro de contenedores de Gitea" (230px) no cabe en 120px',
    ])
    expect(htmlOf(pageAt(site, "red").tree)).toContain(
      ">Registro de contenedores de Gitea</text>"
    )
  })

  test("a box without h that is not a table is reported and left out", async () => {
    const site = await siteOf({
      "diagrams/red.json": drawn({
        nodes: [{ id: "a", name: "A", x: 0, y: 0, w: 120 }],
      }),
    })
    expect(diagramProblems(site, "diagrams/red.json")).toEqual([
      "nodes.0.h: Falta: una caja que no es una tabla lleva h",
    ])
  })

  test("a chain lays its items in a row joined by its links", async () => {
    const site = await siteOf({
      "diagrams/copias.json": json({
        title: "Copias",
        desc: "De la máquina al NAS y a la nube",
        items: [
          { id: "vm", name: "VM" },
          { id: "pbs", name: "PBS", kind: "store" },
          { id: "nube", name: "Nube", kind: "external" },
        ],
        links: ["SNAPSHOT", null],
        accent: [0],
      }),
      "docs/copias.mdx": page("Copias", '<Diagram id="copias" />'),
    })
    expect(diagramProblems(site, "diagrams/copias.json")).toEqual([])
    const html = htmlOf(pageAt(site, "copias").tree)
    // 24 + 120 + 76 (the label's gap) + 120 + 48 + 120 + 24
    expect(html).toContain('viewBox="0 0 532 ')
    expect(html).toContain(
      '<path class="doc-diagram-edge doc-diagram-edge-accent" data-edge="0" data-from="vm" data-to="pbs" d="M144 76 L220 76">'
    )
    expect(html).toContain(">SNAPSHOT</text>")
    expect(html).toContain("<li>VM → PBS: SNAPSHOT</li>")
    expect(html).toContain("<li>PBS → Nube</li>")
  })

  test("a YAML diagram, a .yml file and a badly named file are reported", async () => {
    const site = await siteOf({
      "diagrams/pipeline.yaml": "titulo: Pipeline\n",
      "diagrams/viejo.yml": "titulo: Viejo\n",
      "diagrams/Mapa.json": "{}",
    })
    expect(diagramProblems(site, "diagrams/pipeline.yaml")).toEqual([
      "Los diagramas se escriben ahora en JSON: pásalo a diagrams/pipeline.json",
    ])
    expect(diagramProblems(site, "diagrams/viejo.yml")).toEqual([
      "Los diagramas se escriben ahora en JSON: pásalo a diagrams/viejo.json",
    ])
    expect(diagramProblems(site, "diagrams/Mapa.json")).toHaveLength(1)
  })

  test("a JSON syntax error is reported with its line and column, and pages showing it get a notice", async () => {
    const site = await siteOf({
      "diagrams/red.json": '{\n  "title": "Red"\n  "desc": "x"\n}',
      "diagrams/komodo.json": json(KOMODO),
      "docs/red.mdx": page("Red", '<Diagram id="red" />'),
      "docs/k.mdx": page("K", '<Diagram id="komodo" />'),
    })
    expect(diagramProblems(site, "diagrams/red.json")).toEqual([
      "JSON no válido en la línea 3, columna 3: falta una coma entre dos elementos",
    ])
    expect(htmlOf(pageAt(site, "red").tree)).toContain(
      'class="doc-component-notice" data-component="Diagram"'
    )
    expect(htmlOf(pageAt(site, "k").tree)).toContain("<figure")
  })

  test("a diagram without a valid size shows its caption and text instead of a drawing", async () => {
    const site = await siteOf({
      "diagrams/red.json": json({
        title: "Red",
        desc: "La red",
        nodes: [box("a", 0)],
      }),
      "docs/red.mdx": page("Red", '<Diagram id="red" />'),
    })
    expect(diagramProblems(site, "diagrams/red.json")).toEqual([
      "width: Falta: es obligatorio",
      "height: Falta: es obligatorio",
    ])
    const html = htmlOf(pageAt(site, "red").tree)
    expect(html).toContain(
      '<figure class="doc-diagram" data-diagram="red"><figcaption>'
    )
    expect(html).not.toContain("<svg")
  })
})

describe("<Diagram> and ```diagram", () => {
  test("an unknown id, a missing id and an unknown attribute are reported on the line", async () => {
    const site = await siteOf({
      "diagrams/komodo.json": json(KOMODO),
      "docs/notas.mdx": page(
        "Notas",
        '<Diagram id="mapa" />\n\n<Diagram />\n\n<Diagram id="komodo" size="big" />'
      ),
    })
    const notas = pageAt(site, "notas")
    expect(messagesOf(notas)).toEqual([
      '<Diagram id="mapa">: no hay ningún diagrams/mapa.json ni diagrams/mapa.svg que se pueda leer (hay: komodo)',
      "<Diagram> necesita id, el nombre de un fichero de diagrams/ (hay: komodo)",
      "<Diagram> no tiene el atributo size",
    ])
    expect(notas.problems.map((problem) => problem.line)).toEqual([6, 8, 10])
    expect(htmlOf(notas.tree)).toContain("<figure")
  })

  test("a <Diagram> inside a paragraph needs its own block", async () => {
    const site = await siteOf({
      "diagrams/komodo.json": json(KOMODO),
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
          'Los diagramas van en diagrams/<id>.json y se muestran con <Diagram id="…" />',
      },
    ])
    expect(htmlOf(notas.tree)).toBe(
      '<div class="doc-component-notice">Los diagramas van en diagrams/&#x3C;id>.json y se muestran con &#x3C;Diagram id="…" /></div>'
    )
  })

  test("an entity's catalog page lists the diagrams it is a box of", async () => {
    const site = await siteOf({ "diagrams/komodo.json": json(KOMODO) })
    const nas = pageAt(site, "catalog/maquinas/nas")
    expect(nas.headings.map((heading) => heading.text)).toEqual(["Diagramas"])
    expect(htmlOf(nas.tree)).toContain('data-diagram="komodo"')
  })

  test("ops without rows are reported and the box drawn without them", async () => {
    const site = await siteOf({
      "diagrams/red.json": drawn({
        nodes: [box("a", 24, { ops: [{ name: "login()" }] })],
      }),
      "docs/index.mdx": page("Casa", '<Diagram id="red" />'),
    })
    expect(diagramProblems(site, "diagrams/red.json")).toEqual([
      "nodes.0.ops: ops va bajo las filas de una tabla: lleva rows",
    ])
  })

  test("an entity that is an item of a typed diagram lists that diagram too", async () => {
    const site = await siteOf({
      "diagrams/flujo.json": json({
        type: "flowchart",
        title: "Flujo",
        desc: "El flujo",
        steps: [
          { id: "a", entity: "maquinas/nas" },
          { id: "b", name: "Fin" },
        ],
        links: [{ from: "a", to: "b" }],
      }),
    })
    const nas = pageAt(site, "catalog/maquinas/nas")
    expect(htmlOf(nas.tree)).toContain('data-diagram="flujo"')
  })
})
