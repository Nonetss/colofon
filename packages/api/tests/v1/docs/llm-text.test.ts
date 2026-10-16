import { describe, expect, test } from "bun:test"
import {
  type DocsRepository,
  flattenPages,
  llmsIndex,
  repositoryLlmsIndex,
} from "#v1/docs/llm-text"

const origin = "https://docs.example.org"

function entry(slug: string, path: string, title: string, description = "") {
  return {
    path,
    href: `/${slug}/${path}`,
    title,
    description,
    icon: null,
  }
}

const casa: DocsRepository = {
  slug: "casa",
  name: "Casa",
  title: "Homelab",
  description: "Lo que corre en casa",
  available: true,
  home: { ...entry("casa", "", "Inicio", "Portada"), href: "/casa" },
  nodes: [
    {
      kind: "section",
      ...entry("casa", "red", "Red"),
      children: [
        {
          kind: "page",
          ...entry("casa", "red/dns", "DNS", "Resolución de nombres"),
        },
        {
          kind: "section",
          ...entry("casa", "red/vpn", "VPN"),
          children: [
            { kind: "page", ...entry("casa", "red/vpn/wg", "WireGuard") },
          ],
        },
      ],
    },
  ],
}

const trabajo: DocsRepository = {
  slug: "trabajo",
  name: "Trabajo",
  title: null,
  description: null,
  available: true,
  home: null,
  nodes: [{ kind: "page", ...entry("trabajo", "correo", "Correo") }],
}

const nuevo: DocsRepository = {
  slug: "nuevo",
  name: "Nuevo",
  title: null,
  description: null,
  available: false,
  home: null,
  nodes: [],
}

function sections(text: string): string[] {
  return text.split("\n").filter((line) => line.startsWith("## "))
}

describe("flattenPages", () => {
  test("lists the home and every page depth first with the sections above it", () => {
    expect(
      flattenPages([casa], false).map((page) => [page.href, page.trail])
    ).toEqual([
      ["/casa", []],
      ["/casa/red", []],
      ["/casa/red/dns", ["Red"]],
      ["/casa/red/vpn", ["Red"]],
      ["/casa/red/vpn/wg", ["Red", "VPN"]],
    ])
  })

  test("with the repository, every trail starts with its name", () => {
    const [, red] = flattenPages([casa], true)
    expect(red?.trail).toEqual(["Casa"])
  })

  test("a repository without content lists nothing", () => {
    expect(flattenPages([nuevo], true)).toEqual([])
  })

  test("a menu group starts the trails of its pages and is not listed", () => {
    const grouped: DocsRepository = {
      ...casa,
      nodes: [
        {
          kind: "group",
          title: "Infraestructura",
          description: "",
          icon: null,
          children: casa.nodes,
        },
      ],
    }
    expect(
      flattenPages([grouped], false).map((page) => [page.href, page.trail])
    ).toEqual([
      ["/casa", []],
      ["/casa/red", ["Infraestructura"]],
      ["/casa/red/dns", ["Infraestructura", "Red"]],
      ["/casa/red/vpn", ["Infraestructura", "Red"]],
      ["/casa/red/vpn/wg", ["Infraestructura", "Red", "VPN"]],
    ])
  })
})

describe("llmsIndex", () => {
  test("opens with the heading, the summary and how to read the pages", () => {
    const [heading, , summary, , howTo] = llmsIndex([], origin).split("\n")
    expect(heading).toBe("# Documentación")
    expect(summary?.startsWith("> ")).toBe(true)
    expect(howTo).toContain("`<página>/llm.txt`")
    expect(howTo).toContain("`x-api-key`")
  })

  test("has one section per repository with content, in the given order", () => {
    expect(sections(llmsIndex([casa, nuevo, trabajo], origin))).toEqual([
      "## Casa",
      "## Trabajo",
    ])
  })

  test("lists the home first, then sections and pages depth first", () => {
    const text = llmsIndex([casa], origin)
    const lines = text.split("\n").filter((line) => line.startsWith("- "))
    expect(lines).toEqual([
      "- [Inicio](https://docs.example.org/casa/llm.txt): Portada",
      "- [Red](https://docs.example.org/casa/red/llm.txt)",
      "- [Red / DNS](https://docs.example.org/casa/red/dns/llm.txt): Resolución de nombres",
      "- [Red / VPN](https://docs.example.org/casa/red/vpn/llm.txt)",
      "- [Red / VPN / WireGuard](https://docs.example.org/casa/red/vpn/wg/llm.txt)",
    ])
  })

  test("a repository without a home starts with its pages", () => {
    expect(llmsIndex([trabajo], origin)).toContain(
      "## Trabajo\n\n- [Correo](https://docs.example.org/trabajo/correo/llm.txt)\n"
    )
  })
})

describe("repositoryLlmsIndex", () => {
  test("is headed by the repository with its description as the summary", () => {
    const text = repositoryLlmsIndex(casa, origin)
    expect(text.startsWith("# Casa\n\n> Lo que corre en casa\n\n")).toBe(true)
    expect(sections(text)).toEqual([])
    expect(text).toContain(
      "- [Red / DNS](https://docs.example.org/casa/red/dns/llm.txt)"
    )
  })

  test("leaves out the summary when the repository has no description", () => {
    const text = repositoryLlmsIndex(trabajo, origin)
    expect(text.startsWith("# Trabajo\n\nCada página")).toBe(true)
  })

  test("labels a page with its menu group, which gets no line of its own", () => {
    const grouped: DocsRepository = {
      ...casa,
      nodes: [
        {
          kind: "group",
          title: "Infraestructura",
          description: "",
          icon: null,
          children: casa.nodes,
        },
      ],
    }
    const index = repositoryLlmsIndex(grouped, origin)
    expect(index).toContain(
      "- [Infraestructura / Red / DNS](https://docs.example.org/casa/red/dns/llm.txt): Resolución de nombres"
    )
    expect(index).not.toContain("[Infraestructura](")
  })
})
