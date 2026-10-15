import { describe, expect, test } from "bun:test"
import {
  llmsIndex,
  repositoryLlmsIndex,
} from "@/features/docs/llm-text/model/llms"
import type { DocsRepository } from "@/features/docs/shared/model/nav"

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
})
