import { describe, expect, test } from "bun:test"
import { sanitize } from "hast-util-sanitize"
import { toHtml } from "hast-util-to-html"
import { diagramFigure } from "#diagrams/figure"
import { illustrationFile } from "#diagrams/read"
import { SANITIZE_SCHEMA } from "#pages/to-hast"
import { htmlOf, page, pageAt, siteOf } from "#tests/fixtures/site"

function svg(
  body: string,
  head = "<title>Despiece</title><desc>Las piezas del NAS</desc>"
) {
  return `<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">${head}${body}</svg>`
}

function read(text: string) {
  return illustrationFile("despiece", "diagramas/despiece.svg", text)
}

function messages(text: string): string[] {
  return read(text).problems.map((problem) => problem.message)
}

/** The figure of an illustration after the page sanitizer. */
function figureHtml(text: string): string {
  const { diagram } = read(text)
  if (diagram === null) throw new Error("not drawn")
  const figure = diagramFigure(diagram, (pagePath) => `/casa/${pagePath}`)
  return toHtml(sanitize({ type: "root", children: [figure] }, SANITIZE_SCHEMA))
}

describe("illustrations", () => {
  test("a valid illustration keeps its shapes and turns its role classes into the theme's", () => {
    const text = svg(
      '<g transform="translate(10 20)"><path class="ink" d="M0 0 L10 10" stroke-width="2" fill="none"/><rect class="accent" x="1" y="2" width="3" height="4"/><circle class="teal" cx="5" cy="5" r="2"/><text x="4" y="8" font-size="12">Disco</text></g>'
    )
    expect(messages(text)).toEqual([])
    const html = figureHtml(text)
    expect(html).toContain(
      '<svg class="doc-diagram-svg doc-diagram-illustration" viewBox="0 0 400 300" width="400" role="img" aria-label="Despiece. Las piezas del NAS"><title>Despiece</title>'
    )
    expect(html).toContain('<g transform="translate(10 20)">')
    expect(html).toContain(
      '<path class="doc-diagram-ill-ink" d="M0 0 L10 10" stroke-width="2" fill="none">'
    )
    expect(html).toContain('<rect class="doc-diagram-ill-accent"')
    expect(html).toContain(
      '<circle class="doc-diagram-ill-hue doc-diagram-hue-teal"'
    )
    expect(html).toContain('font-size="12">Disco</text>')
  })

  test("stroke details are kept as written", () => {
    const text = svg(
      '<line class="soft" x1="0" y1="0" x2="0" y2="9" stroke-width="1" stroke-dasharray="3 4" stroke-linecap="round" stroke-linejoin="bevel"/>'
    )
    expect(messages(text)).toEqual([])
    expect(figureHtml(text)).toContain(
      '<line class="doc-diagram-ill-soft" x1="0" y1="0" x2="0" y2="9" stroke-width="1" stroke-dasharray="3 4" stroke-linecap="round" stroke-linejoin="bevel">'
    )
  })

  test("hex colours are removed and reported once per value with how often they appeared", () => {
    const path = '<path fill="#eb6c36" d="M0 0"/>'
    const text = svg(path.repeat(14))
    expect(messages(text)).toEqual([
      'Se ha quitado fill="#eb6c36" 14 veces: los colores van con las clases ink, muted, soft, paper, accent, accent-soft o un tono (rose, blue, cyan, violet, green, indigo, fuchsia, slate, teal, lime)',
    ])
    expect(figureHtml(text)).toContain('<path d="M0 0"></path>')
  })

  test("scripts, handlers, styles, references and foreign classes never reach the page", () => {
    const text = svg(
      '<script>alert(1)</script><path onclick="alert(1)" style="fill:red" class="evil ink" d="M0 0"/><use href="#x"/><foreignObject><div>x</div></foreignObject><image href="javascript:alert(1)"/>'
    )
    expect(messages(text)).toEqual([
      "Se ha quitado <script> 1 vez",
      "Se ha quitado el atributo onclick 1 vez",
      "Se ha quitado el atributo style 1 vez",
      "Se ha quitado la clase evil 1 vez",
      "Se ha quitado <use> 1 vez",
      "Se ha quitado <foreignObject> 1 vez",
      "Se ha quitado <image> 1 vez",
    ])
    const html = figureHtml(text)
    for (const removed of [
      "script",
      "alert",
      "style",
      "evil",
      "<use",
      "foreign",
      "image",
    ])
      expect(html).not.toContain(removed)
    expect(html).toContain('<path class="doc-diagram-ill-ink" d="M0 0">')
  })

  test("an illustration without its desc, title or viewBox is reported and not drawn", () => {
    const noDesc = read(svg("<path d='M0 0'/>", "<title>Despiece</title>"))
    expect(noDesc.diagram).toBeNull()
    expect(noDesc.problems.map((problem) => problem.message)).toEqual([
      "Falta <desc> en <svg>: qué muestra, es su texto alternativo",
    ])
    expect(messages("<svg><title>A</title><desc>B</desc></svg>")).toEqual([
      "Falta viewBox en <svg>: cuatro números, como 0 0 800 600",
    ])
  })

  test("a file that is not an SVG is reported", () => {
    expect(messages("hola")).toEqual([
      "No es un SVG que se pueda leer: el fichero empieza por <svg …>",
    ])
  })

  test("a page shows an illustration by its id, with no text version, and a JSON of the same id wins", async () => {
    const site = await siteOf({
      "diagramas/despiece.svg": svg("<path class='ink' d='M0 0'/>"),
      "diagramas/planta.svg": svg("<path d='M0 0'/>"),
      "diagramas/planta.json": JSON.stringify({
        title: "Planta",
        desc: "La planta",
        type: "flowchart",
        steps: [{ id: "a", name: "A" }],
      }),
      "docs/index.mdx": page(
        "Casa",
        '<Diagram id="despiece" />\n\n<Diagram id="planta" />'
      ),
    })
    const home = pageAt(site, "")
    expect(
      home.problems
        .filter((problem) => problem.file === "diagramas/planta.svg")
        .map((problem) => problem.message)
    ).toEqual([
      "diagramas/planta.json ya es el diagrama planta: este fichero no se usa",
    ])
    const html = htmlOf(home.tree)
    expect(html).toContain(
      '<svg class="doc-diagram-svg doc-diagram-illustration"'
    )
    expect(html).toContain('<div class="doc-diagram-text"></div>')
    expect(html).toContain('data-diagram="planta"')
    expect(html).toContain(">A</text>")
  })
})
