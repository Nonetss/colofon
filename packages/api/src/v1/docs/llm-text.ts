import type { z } from "zod"
import type { DocsNavNode, docsOutput } from "#v1/docs/output"
import {
  claudeCodeCommand,
  MCP_ADMIN_TOOL_NAMES,
  MCP_SECRET_TOOL_NAMES,
  MCP_TOOL_NAMES,
  mcpUrl,
} from "#v1/mcp/setup"
import type { skillsOutput } from "#v1/skills/output"

// `/llms.txt` and `/<repo>/llms.txt` (https://llmstxt.org): the map of the
// documentation for an AI. `/llms.txt` opens with the guide an agent reads
// when it has only been given the site's address (credentials, the MCP, the
// skills), which is all it shows without a credential; with one, every page
// follows as a link to its `llm.txt`, grouped by repository and listed as
// the sidebar orders it, with each repository's skills. The frontend serves
// it as text and the MCP's `index` tool returns it, so both answer the same.

/** A repository as `v1.docs.nav` answers it. */
export type DocsRepository = z.infer<
  typeof docsOutput.nav
>["repositories"][number]

/** A page as the index lists it. */
export type DocsPageEntry = {
  href: string
  label: string
  description: string
  /** The repository (when asked for), the group and the sections above the page. */
  trail: string[]
}

const SITE_TITLE = "Documentación"
const SITE_SUMMARY =
  "La documentación de todos los repositorios, en Markdown para leerla sin el HTML."

const HOW_TO_READ =
  "Cada página tiene su texto en Markdown en `<página>/llm.txt`, con sus enlaces como direcciones completas. Las peticiones necesitan una sesión o una API key en la cabecera `x-api-key`."

const KEY_PLACEHOLDER = "<tu API key>"

const WITH_A_KEY =
  "Con una API key, este índice lista también los repositorios, sus páginas y sus skills."

/** A skill as `v1.skills.list` answers it. */
export type DocsSkill = z.infer<typeof skillsOutput.list>["skills"][number]

/**
 * Every page of `repositories`, home included, depth first. `withRepository`
 * starts each trail with the repository's name.
 */
export function flattenPages(
  repositories: readonly DocsRepository[],
  withRepository: boolean
): DocsPageEntry[] {
  const entries: DocsPageEntry[] = []
  for (const repository of repositories) {
    const base = repositoryTrail(repository, withRepository)
    if (repository.home !== null) {
      entries.push({
        href: repository.home.href,
        label: repository.home.title,
        description: repository.home.description,
        trail: base,
      })
    }
    collect(repository.nodes, base, entries)
  }
  return entries
}

function repositoryTrail(
  repository: DocsRepository,
  withRepository: boolean
): string[] {
  if (!withRepository) return []
  return [repository.name]
}

function collect(
  nodes: readonly DocsNavNode[],
  trail: string[],
  entries: DocsPageEntry[]
) {
  for (const node of nodes) {
    if (node.kind === "group") {
      collect(node.children, [...trail, node.title], entries)
      continue
    }
    entries.push({
      href: node.href,
      label: node.title,
      description: node.description,
      trail,
    })
    if (node.kind === "section")
      collect(node.children, [...trail, node.title], entries)
  }
}

/** One page as a list entry, its label the sections above it and its title. */
function pageLine(page: DocsPageEntry, origin: string): string {
  const label = [...page.trail, page.label].join(" / ")
  const link = `- [${label}](${origin}${page.href}/llm.txt)`
  if (page.description === "") return link
  return `${link}: ${page.description}`
}

function pageLines(repository: DocsRepository, origin: string): string[] {
  return flattenPages([repository], false).map((page) => pageLine(page, origin))
}

function text(lines: string[]): string {
  return `${lines.join("\n")}\n`
}

/** The address that installs `skill`: its archive, or its SKILL.md. */
function installPath(skill: DocsSkill): string {
  if (skill.archivePath !== null) return skill.archivePath
  return skill.path
}

function skillLine(skill: DocsSkill, origin: string): string {
  return `- [${skill.name}](${origin}${installPath(skill)}): ${skill.description}`
}

function skillsIndexUrl(origin: string): string {
  return `${origin}/.well-known/agent-skills/index.json`
}

const SKILLS_FOLDER = "~/.claude/skills"

function curl(url: string): string {
  return `curl -fsS -H "x-api-key: ${KEY_PLACEHOLDER}" ${url}`
}

/** Installs a `skill-md` skill in Claude Code's personal skills. */
function skillMdCommands(skill: DocsSkill, origin: string): string[] {
  const folder = `${SKILLS_FOLDER}/${skill.name}`
  return [
    `mkdir -p ${folder}`,
    `${curl(`${origin}${skill.path}`)} -o ${folder}/SKILL.md`,
    `sha256sum ${folder}/SKILL.md   # debe ser el digest del índice`,
  ]
}

/** Installs an `archive` skill, checking the digest before extracting. */
function archiveCommands(
  skill: DocsSkill,
  archivePath: string,
  origin: string
): string[] {
  const folder = `${SKILLS_FOLDER}/${skill.name}`
  const download = `/tmp/${skill.name}.tar.gz`
  return [
    `${curl(`${origin}${archivePath}`)} -o ${download}`,
    `sha256sum ${download}   # debe ser el digest del índice`,
    `rm -rf ${folder} && mkdir -p ${folder} && tar -xzf ${download} -C ${folder}`,
  ]
}

function fenced(commands: string[]): string[] {
  return ["```sh", ...commands, "```"]
}

/** One example per install type among `skills`, the index's first. */
function installExamples(
  skills: readonly DocsSkill[],
  origin: string
): string[] {
  const lines = [...fenced([curl(skillsIndexUrl(origin))])]
  const single = skills.find((skill) => skill.archivePath === null)
  if (single !== undefined)
    lines.push("", ...fenced(skillMdCommands(single, origin)))
  for (const skill of skills) {
    if (skill.archivePath === null) continue
    lines.push("", ...fenced(archiveCommands(skill, skill.archivePath, origin)))
    break
  }
  return lines
}

/**
 * The procedure an AI follows to install every skill the index lists, the
 * one the setup prompt on `/me` points at.
 */
function setupProcedure(
  skills: readonly DocsSkill[],
  origin: string
): string[] {
  return [
    "## Configurar tu agente",
    "",
    "Sigue estos pasos sin pedir nada más al usuario:",
    "",
    `1. Lee el índice de skills, ${skillsIndexUrl(origin)} (formato Agent Skills discovery), enviando la API key en \`x-api-key\` si el usuario te ha dado una. Sin ella solo verás las skills de la plataforma.`,
    `2. Instala cada skill que liste en tu carpeta personal de skills (en Claude Code, \`${SKILLS_FOLDER}/\`), sustituyendo la copia anterior. Si su \`type\` es \`skill-md\`, descarga su \`url\` y guárdala como \`<nombre>/SKILL.md\`. Si es \`archive\`, descarga su \`url\` (un \`.tar.gz\`) y extráelo en \`<nombre>/\`. Antes de guardar o extraer, comprueba que el SHA-256 de lo descargado coincide con su \`digest\`; si no coincide, sáltala y díselo al usuario. Borra las skills que instalaste desde este sitio y el índice ya no lista.`,
    "3. Dile al usuario qué skills has instalado. Repetir estos pasos las actualiza cuando el índice muestre otro digest.",
    "4. Solo si el usuario quiere que uses las herramientas de la documentación (buscar, leer páginas, llamar a sus servicios), conecta el MCP como se explica abajo.",
    "",
    "No escribas la API key en ningún fichero que no sea la configuración de tu agente. Por ejemplo, en Claude Code:",
    "",
    ...installExamples(skills, origin),
  ]
}

/**
 * What an agent needs from the site's address alone: how to authenticate,
 * read the pages, connect the MCP and install the skills, with the
 * platform's skills listed.
 */
export function agentGuide(
  skills: readonly DocsSkill[],
  origin: string
): string[] {
  const platform = skills.filter((skill) => skill.repository === null)
  const tools = MCP_TOOL_NAMES.map((name) => `\`${name}\``).join(", ")
  const secretTools = MCP_SECRET_TOOL_NAMES.map((name) => `\`${name}\``).join(
    " y "
  )
  const adminTools = MCP_ADMIN_TOOL_NAMES.map((name) => `\`${name}\``).join(
    ", "
  )
  const lines = [
    "## Para agentes",
    "",
    `Las páginas, el índice de cada repositorio, el MCP y las skills de los proyectos necesitan una sesión o una API key en la cabecera \`x-api-key\`. Cada usuario crea sus keys en ${origin}/me.`,
    "",
    "Cada página tiene su texto en Markdown en `<página>/llm.txt`, con sus enlaces como direcciones completas.",
    "",
    "Las skills de la plataforma enseñan a usar el sitio (`colofon`) y a escribir documentación para él (`colofon-*`); las de cada proyecto se llaman `<repositorio>-<nombre>` y solo aparecen con la key.",
    "",
    ...setupProcedure(platform, origin),
    "",
    "## El MCP",
    "",
    `El MCP de la documentación está en ${mcpUrl(origin)}, con la key en \`x-api-key\`. Sus herramientas: ${tools}; si el servidor tiene activados los secretos, también ${secretTools}, para llamar a las APIs de tus servicios con los secretos que guardes en ${origin}/me sin que el agente vea sus valores; y a un administrador, ${adminTools}, para sincronizar un repositorio con su remoto al momento. En Claude Code:`,
    "",
    ...fenced([claudeCodeCommand(origin, KEY_PLACEHOLDER)]),
  ]
  if (platform.length === 0) return lines
  lines.push(
    "",
    "## Skills de la plataforma",
    "",
    ...platform.map((skill) => skillLine(skill, origin))
  )
  return lines
}

/** The skills of `repository`, under their own heading; none without. */
function repositorySkillLines(
  repository: DocsRepository,
  skills: readonly DocsSkill[],
  origin: string
): string[] {
  const own = skills.filter(
    (skill) => skill.repository?.slug === repository.slug
  )
  if (own.length === 0) return []
  return ["", "### Skills", "", ...own.map((skill) => skillLine(skill, origin))]
}

function opening(): string[] {
  return [`# ${SITE_TITLE}`, "", `> ${SITE_SUMMARY}`, ""]
}

/** `/llms.txt` without a credential: the guide, and what a key adds. */
export function llmsGuide(
  skills: readonly DocsSkill[],
  origin: string
): string {
  return text([...opening(), ...agentGuide(skills, origin), "", WITH_A_KEY])
}

/**
 * `/llms.txt` with a credential: the guide, then every repository with
 * content, one section each with its pages and its skills.
 */
export function llmsIndex(
  repositories: readonly DocsRepository[],
  skills: readonly DocsSkill[],
  origin: string
): string {
  const lines = [...opening(), ...agentGuide(skills, origin)]
  for (const repository of repositories) {
    if (!repository.available) continue
    lines.push(
      "",
      `## ${repository.name}`,
      "",
      ...pageLines(repository, origin),
      ...repositorySkillLines(repository, skills, origin)
    )
  }
  return text(lines)
}

/** `/<repo>/llms.txt`: the pages and skills of one repository. */
export function repositoryLlmsIndex(
  repository: DocsRepository,
  skills: readonly DocsSkill[],
  origin: string
): string {
  const lines = [`# ${repository.name}`, ""]
  if (repository.description !== null && repository.description !== "")
    lines.push(`> ${repository.description}`, "")
  lines.push(
    `${HOW_TO_READ} La guía para agentes, con el MCP y las skills, está en ${origin}/llms.txt.`,
    "",
    ...pageLines(repository, origin),
    ...repositorySkillLines(repository, skills, origin)
  )
  return text(lines)
}
