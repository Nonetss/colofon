import { describe, expect, test } from "bun:test"
import type { Element, Root } from "hast"
import { pageMarkdown } from "@/features/docs/page/model/markdown"

function el(
  tagName: string,
  properties: Element["properties"],
  children: Element["children"] = []
): Element {
  return { type: "element", tagName, properties, children }
}

function text(value: string): Element["children"][number] {
  return { type: "text", value }
}

function root(...children: Element[]): Root {
  return { type: "root", children }
}

describe("pageMarkdown", () => {
  test("starts with the title and the description", () => {
    expect(
      pageMarkdown({ title: "DNS", description: "Cómo resuelve", tree: null })
    ).toBe("# DNS\n\nCómo resuelve\n")
  })

  test("leaves out an empty description", () => {
    expect(pageMarkdown({ title: "DNS", description: "", tree: null })).toBe(
      "# DNS\n"
    )
  })

  test("writes the body back as Markdown, links relative", () => {
    const markdown = pageMarkdown({
      title: "Inicio",
      description: "",
      tree: root(
        el("h2", { id: "red" }, [text("Red")]),
        el("ol", {}, [
          el("li", {}, [
            el("strong", {}, [text("Red:")]),
            text(" empieza por "),
            el("a", { href: "/prueba/dns" }, [text("DNS")]),
          ]),
        ]),
        el("pre", {}, [
          el("code", { className: ["language-yaml"] }, [text("a: 1\n")]),
        ])
      ),
    })
    expect(markdown).toBe(
      "# Inicio\n\n## Red\n\n1. **Red:** empieza por [DNS](/prueba/dns)\n\n```yaml\na: 1\n```\n"
    )
  })

  test("writes GFM tables", () => {
    const markdown = pageMarkdown({
      title: "T",
      description: "",
      tree: root(
        el("table", {}, [
          el("thead", {}, [el("tr", {}, [el("th", {}, [text("Nombre")])])]),
          el("tbody", {}, [el("tr", {}, [el("td", {}, [text("dns-01")])])]),
        ])
      ),
    })
    expect(markdown).toContain("| Nombre |")
    expect(markdown).toContain("| dns-01 |")
  })

  test("an entities block becomes its group label and a GFM table", () => {
    const markdown = pageMarkdown({
      title: "T",
      description: "",
      tree: root(
        el("div", { className: ["doc-entities"] }, [
          el("p", { className: ["doc-entities-group"] }, [text("network")]),
          el("table", {}, [
            el("thead", {}, [el("tr", {}, [el("th", {}, [text("name")])])]),
            el("tbody", {}, [
              el("tr", {}, [
                el("td", {}, [
                  el("a", { href: "/casa/network/dns" }, [text("AdGuard")]),
                ]),
              ]),
            ]),
          ]),
        ])
      ),
    })
    expect(markdown).toBe(
      "# T\n\nnetwork\n\n| name                         |\n| ---------------------------- |\n| [AdGuard](/casa/network/dns) |\n"
    )
  })

  test("drops the notices of components the platform doesn't provide", () => {
    const markdown = pageMarkdown({
      title: "T",
      description: "",
      tree: root(
        el("div", { className: ["doc-component-notice"] }, [
          text("El componente <Callout> no existe en la plataforma"),
        ]),
        el("p", {}, [text("Texto")])
      ),
    })
    expect(markdown).toBe("# T\n\nTexto\n")
  })

  test("an alert becomes a quote with its title in bold", () => {
    const markdown = pageMarkdown({
      title: "T",
      description: "",
      tree: root(
        el("div", { className: ["doc-alert", "doc-alert-warning"] }, [
          el("p", { className: ["doc-alert-title"] }, [text("Aviso")]),
          el("p", {}, [text("Cuidado")]),
        ])
      ),
    })
    expect(markdown).toBe("# T\n\n> **Aviso**\n>\n> Cuidado\n")
  })
})
