import { describe, expect, test } from "bun:test"
import type { Element, Root } from "hast"
import { isStale } from "@/features/docs/page/model/dates"
import { renderBlocks } from "@/features/docs/page/model/render"

function el(
  tagName: string,
  properties: Element["properties"],
  children: Element["children"] = []
): Element {
  return { type: "element", tagName, properties, children }
}

function root(...children: Element[]): Root {
  return { type: "root", children }
}

function h2(text: string): Element {
  return el("h2", {}, [{ type: "text", value: text }])
}

function p(text: string): Element {
  return el("p", {}, [{ type: "text", value: text }])
}

/** The whole page as one string, the way a page without sections reads. */
function renderPage(tree: Root): string {
  return renderBlocks(tree)
    .map((block) => block.html)
    .join("")
}

describe("renderBlocks", () => {
  test("a code block gets a frame with its language and a copy button", () => {
    const html = renderPage(
      root(
        el("pre", {}, [
          el("code", { className: ["language-yaml"] }, [
            { type: "text", value: "a: 1\n" },
          ]),
        ])
      )
    )
    expect(html).toBe(
      '<div class="doc-code"><div class="doc-code-bar" data-md-skip><span class="doc-code-language">yaml</span><button type="button" aria-label="Copiar código" data-hint="Copiar" class="doc-code-copy" data-copy><svg class="doc-icon" aria-hidden="true" focusable="false"><use href="#doc-icon-copy"></use></svg><svg class="doc-icon" aria-hidden="true" focusable="false"><use href="#doc-icon-check"></use></svg></button></div><pre><code class="language-yaml"><span class="th-token th-property">a</span>: <span class="th-token th-string">1</span>\n</code></pre></div>'
    )
  })

  test("a yaml comment is coloured and the text stays in the block", () => {
    const html = renderPage(
      root(
        el("pre", {}, [
          el("code", { className: ["language-yaml"] }, [
            { type: "text", value: "a: 1 # nota\n" },
          ]),
        ])
      )
    )
    expect(html).toContain('<span class="th-token th-property">a</span>')
    expect(html).toContain('<span class="th-token th-comment"># nota</span>')
  })

  test("a code block without language still gets the copy button", () => {
    const html = renderPage(root(el("pre", {}, [el("code", {}, [])])))
    expect(html).toContain("data-copy")
    expect(html).not.toContain("doc-code-language")
  })

  test("a drawn diagram gets the button that enlarges it", () => {
    const figure = el("figure", { className: ["doc-diagram"], dataDrawn: "" }, [
      el("div", { className: ["doc-diagram-canvas"] }),
    ])
    expect(renderPage(root(figure))).toBe(
      '<figure class="doc-diagram" data-drawn=""><div class="doc-diagram-canvas"></div><button type="button" aria-label="Ampliar diagrama" data-hint="Ampliar" class="doc-diagram-expand" data-diagram-expand data-md-skip><svg class="doc-icon" aria-hidden="true" focusable="false"><use href="#doc-icon-expand"></use></svg></button></figure>'
    )
  })

  test("a diagram that is not drawn has no enlarge button", () => {
    const figure = el("figure", { className: ["doc-diagram"] }, [p("Texto")])
    expect(renderPage(root(figure))).not.toContain("data-diagram-expand")
  })

  test("tables scroll inside a frame", () => {
    expect(renderPage(root(el("table", {})))).toBe(
      '<div class="typeset-scroll doc-table"><table></table></div>'
    )
  })

  test("a table whose first header cell is empty is a key/value one", () => {
    const table = (head: string) =>
      el("table", {}, [
        el("thead", {}, [
          el("tr", {}, [el("th", {}, [{ type: "text", value: head }])]),
        ]),
      ])
    expect(renderPage(root(table(" ")))).toContain("data-table-kv")
    expect(renderPage(root(table("Puerto")))).not.toContain("data-table-kv")
  })

  test("headings with an id get an anchor link", () => {
    const html = renderPage(
      root(el("h2", { id: "zonas" }, [{ type: "text", value: "Zonas" }]))
    )
    expect(html).toBe(
      '<h2 id="zonas">Zonas<a href="#zonas" class="doc-anchor" aria-label="Enlace a esta sección">#</a></h2>'
    )
  })

  test("external links open in a new tab and internal ones don't", () => {
    const html = renderPage(
      root(
        el("p", {}, [
          el("a", { href: "https://example.com" }, []),
          el("a", { href: "/casa/red" }, []),
        ])
      )
    )
    expect(html).toBe(
      '<p><a href="https://example.com" target="_blank" rel="noopener noreferrer"></a><a href="/casa/red"></a></p>'
    )
  })

  test("images load lazily and can be enlarged", () => {
    expect(renderPage(root(el("img", { src: "/x.png" })))).toBe(
      '<img src="/x.png" loading="lazy" data-zoomable>'
    )
  })

  test("a page without known sections is one plain block", () => {
    const blocks = renderBlocks(root(p("Hola"), h2("Zonas"), p("Más")))
    expect(blocks.map((block) => block.kind)).toEqual([null])
  })

  test("a known section runs from its heading to the next ##", () => {
    const blocks = renderBlocks(
      root(
        p("Intro"),
        h2("¿Dónde busco…?"),
        p("Aquí"),
        h2("Trampas y decisiones"),
        p("Ojo"),
        h2("Notas sueltas"),
        p("Fin")
      )
    )
    expect(blocks.map((block) => block.kind)).toEqual([
      null,
      "where",
      "pitfalls",
      null,
    ])
    expect(blocks[1]?.html).toContain("Aquí")
    expect(blocks[1]?.html).not.toContain("Ojo")
    expect(blocks[3]?.html).toContain("Notas sueltas")
  })

  test("the same sections are known by their English headings", () => {
    const kinds = renderBlocks(
      root(h2("Where do I find…?"), p("Here"), h2("How it all fits together"))
    ).map((block) => block.kind)
    expect(kinds).toEqual(["where", "fit"])
  })

  test("headings match whatever their case and spacing", () => {
    const [block] = renderBlocks(root(h2("  QUÉ ES "), p("Un servicio")))
    expect(block?.kind).toBe("about")
  })
})

describe("isStale", () => {
  const now = new Date("2026-10-15T12:00:00")

  test("data older than six months is stale", () => {
    expect(isStale("2026-01-10", now)).toBe(true)
  })

  test("recent data is not", () => {
    expect(isStale("2026-06-01", now)).toBe(false)
  })

  test("a date that can't be read is not marked", () => {
    expect(isStale("ayer", now)).toBe(false)
  })
})
