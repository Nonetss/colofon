import { describe, expect, test } from "bun:test"
import type { Element, Root } from "hast"
import { isStale } from "@/features/docs/page/model/dates"
import { renderPage } from "@/features/docs/page/model/render"

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

describe("renderPage", () => {
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
      '<div class="doc-code"><div class="doc-code-bar" data-md-skip><span class="doc-code-language">yaml</span><button type="button" class="doc-code-copy" data-copy>Copiar</button></div><pre><code class="language-yaml">a: 1\n</code></pre></div>'
    )
  })

  test("a code block without language still gets the copy button", () => {
    const html = renderPage(root(el("pre", {}, [el("code", {}, [])])))
    expect(html).toContain("data-copy")
    expect(html).not.toContain("doc-code-language")
  })

  test("tables scroll inside a frame", () => {
    expect(renderPage(root(el("table", {})))).toBe(
      '<div class="typeset-scroll"><table></table></div>'
    )
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

  test("images load lazily", () => {
    expect(renderPage(root(el("img", { src: "/x.png" })))).toBe(
      '<img src="/x.png" loading="lazy">'
    )
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
