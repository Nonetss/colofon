import { describe, expect, test } from "bun:test"
import {
  agentGuide,
  type DocsRepository,
  type DocsSkill,
  flattenPages,
  llmsGuide,
  llmsIndex,
  repositoryLlmsIndex,
} from "#v1/docs/llm-text"
import {
  claudeCodeCommand,
  MCP_ADMIN_TOOL_NAMES,
  MCP_SECRET_TOOL_NAMES,
  MCP_TOOL_NAMES,
} from "#v1/mcp/setup"

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

const colofon: DocsSkill = {
  name: "colofon",
  repository: null,
  description: "Cómo usar el sitio.",
  type: "skill-md",
  path: "/.well-known/agent-skills/colofon/SKILL.md",
  archivePath: null,
  files: [],
  digest: "sha256:0",
}

const colofonDocs: DocsSkill = {
  name: "colofon-docs",
  repository: null,
  description: "Cómo escribir páginas.",
  type: "archive",
  path: "/.well-known/agent-skills/colofon-docs/SKILL.md",
  archivePath: "/.well-known/agent-skills/colofon-docs.tar.gz",
  files: ["references/header.md"],
  digest: "sha256:2",
}

const casaDeploy: DocsSkill = {
  name: "casa-deploy",
  repository: { slug: "casa", name: "Casa" },
  description: "Cómo se despliega.",
  type: "skill-md",
  path: "/.well-known/agent-skills/casa-deploy/SKILL.md",
  archivePath: null,
  files: [],
  digest: "sha256:1",
}

const GUIDE_HEADINGS = new Set([
  "## Para agentes",
  "## Configurar tu agente",
  "## El MCP",
  "## Skills de la plataforma",
])

/** The lines of the repository sections, after the guide. */
function afterGuide(text: string): string[] {
  const lines = text.split("\n")
  const start = lines.findIndex(
    (line, at) => at > 0 && line.startsWith("## ") && !GUIDE_HEADINGS.has(line)
  )
  if (start === -1) return []
  return lines.slice(start)
}

describe("agentGuide", () => {
  const guide = agentGuide([colofon, colofonDocs, casaDeploy], origin).join(
    "\n"
  )

  test("says where to get the key and how to send it", () => {
    expect(guide).toContain("https://docs.example.org/me")
    expect(guide).toContain("`x-api-key`")
    expect(guide).toContain("`<página>/llm.txt`")
  })

  test("gives the MCP's address, the dialog's Claude Code command and the tools", () => {
    expect(guide).toContain("https://docs.example.org/mcp")
    expect(guide).toContain(claudeCodeCommand(origin, "<tu API key>"))
    for (const name of MCP_TOOL_NAMES) expect(guide).toContain(`\`${name}\``)
  })

  test("names the secrets tools as served only when secrets are on", () => {
    for (const name of MCP_SECRET_TOOL_NAMES) {
      expect(guide).toContain(`\`${name}\``)
    }
    expect(guide).toContain("si el servidor tiene activados los secretos")
  })

  test("names the admin tools as served only to an admin", () => {
    for (const name of MCP_ADMIN_TOOL_NAMES) {
      expect(guide).toContain(`\`${name}\``)
    }
    expect(guide).toContain("a un administrador")
  })

  test("has the setup procedure: index, both install types with digests, optional MCP", () => {
    expect(guide).toContain("## Configurar tu agente")
    expect(guide).toContain(
      'curl -fsS -H "x-api-key: <tu API key>" https://docs.example.org/.well-known/agent-skills/index.json'
    )
    expect(guide).toContain(
      'curl -fsS -H "x-api-key: <tu API key>" https://docs.example.org/.well-known/agent-skills/colofon/SKILL.md -o ~/.claude/skills/colofon/SKILL.md'
    )
    expect(guide).toContain(
      'curl -fsS -H "x-api-key: <tu API key>" https://docs.example.org/.well-known/agent-skills/colofon-docs.tar.gz -o /tmp/colofon-docs.tar.gz'
    )
    expect(guide).toContain(
      "tar -xzf /tmp/colofon-docs.tar.gz -C ~/.claude/skills/colofon-docs"
    )
    expect(guide).toContain("`digest`")
    expect(guide).toContain("Solo si el usuario quiere")
    expect(guide.indexOf("## Configurar tu agente")).toBeLessThan(
      guide.indexOf("## El MCP")
    )
  })

  test("lists only the platform's skills, an archive by its archive", () => {
    expect(guide).toContain(
      "- [colofon](https://docs.example.org/.well-known/agent-skills/colofon/SKILL.md): Cómo usar el sitio."
    )
    expect(guide).toContain(
      "- [colofon-docs](https://docs.example.org/.well-known/agent-skills/colofon-docs.tar.gz): Cómo escribir páginas."
    )
    expect(guide).not.toContain("casa-deploy")
  })
})

describe("llmsGuide", () => {
  test("is the guide and what a key adds, without any repository", () => {
    const text = llmsGuide([colofon], origin)
    expect(text.startsWith("# Documentación\n\n> ")).toBe(true)
    expect(text).toContain("## Para agentes")
    expect(text.trimEnd().endsWith("sus páginas y sus skills.")).toBe(true)
    expect(afterGuide(text)).toEqual([])
  })
})

describe("llmsIndex", () => {
  test("opens with the heading, the summary and the guide", () => {
    const text = llmsIndex([], [colofon], origin)
    const [heading, , summary, , guide] = text.split("\n")
    expect(heading).toBe("# Documentación")
    expect(summary?.startsWith("> ")).toBe(true)
    expect(guide).toBe("## Para agentes")
    expect(text).not.toContain("sus páginas y sus skills.")
  })

  test("has one section per repository with content, in the given order", () => {
    const text = llmsIndex([casa, nuevo, trabajo], [], origin)
    expect(sections(afterGuide(text).join("\n"))).toEqual([
      "## Casa",
      "## Trabajo",
    ])
  })

  test("lists the home first, then sections and pages depth first", () => {
    const lines = afterGuide(llmsIndex([casa], [], origin)).filter((line) =>
      line.startsWith("- ")
    )
    expect(lines).toEqual([
      "- [Inicio](https://docs.example.org/casa/llm.txt): Portada",
      "- [Red](https://docs.example.org/casa/red/llm.txt)",
      "- [Red / DNS](https://docs.example.org/casa/red/dns/llm.txt): Resolución de nombres",
      "- [Red / VPN](https://docs.example.org/casa/red/vpn/llm.txt)",
      "- [Red / VPN / WireGuard](https://docs.example.org/casa/red/vpn/wg/llm.txt)",
    ])
  })

  test("a repository without a home starts with its pages", () => {
    expect(llmsIndex([trabajo], [], origin)).toContain(
      "## Trabajo\n\n- [Correo](https://docs.example.org/trabajo/correo/llm.txt)\n"
    )
  })

  test("a repository's skills close its section; one without has none", () => {
    const text = llmsIndex([casa, trabajo], [colofon, casaDeploy], origin)
    expect(text).toContain(
      "- [Red / VPN / WireGuard](https://docs.example.org/casa/red/vpn/wg/llm.txt)\n\n### Skills\n\n- [casa-deploy](https://docs.example.org/.well-known/agent-skills/casa-deploy/SKILL.md): Cómo se despliega.\n\n## Trabajo"
    )
    expect(text.split("### Skills")).toHaveLength(2)
  })
})

describe("repositoryLlmsIndex", () => {
  test("is headed by the repository with its description as the summary", () => {
    const text = repositoryLlmsIndex(casa, [], origin)
    expect(text.startsWith("# Casa\n\n> Lo que corre en casa\n\n")).toBe(true)
    expect(sections(text)).toEqual([])
    expect(text).toContain(
      "- [Red / DNS](https://docs.example.org/casa/red/dns/llm.txt)"
    )
  })

  test("leaves out the summary when the repository has no description", () => {
    const text = repositoryLlmsIndex(trabajo, [], origin)
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
    const index = repositoryLlmsIndex(grouped, [], origin)
    expect(index).toContain(
      "- [Infraestructura / Red / DNS](https://docs.example.org/casa/red/dns/llm.txt): Resolución de nombres"
    )
    expect(index).not.toContain("[Infraestructura](")
  })
})

describe("repositoryLlmsIndex with skills", () => {
  test("lists the repository's skills and points at /llms.txt for the rest", () => {
    const text = repositoryLlmsIndex(casa, [colofon, casaDeploy], origin)
    expect(text).toContain("https://docs.example.org/llms.txt")
    expect(text).toContain("### Skills\n\n- [casa-deploy]")
    expect(text).not.toContain("[colofon]")
  })
})
