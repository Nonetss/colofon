import type { z } from "zod"
import type { DocsNavNode, docsOutput } from "#v1/docs/output"

// `/llms.txt` and `/<repo>/llms.txt` (https://llmstxt.org): the map of the
// documentation for an AI. Every page is a link to its `llm.txt`, the page
// as Markdown, grouped by repository and listed as the sidebar orders it.
// The frontend serves it as text and the MCP's `index` tool returns it, so
// both answer the same.

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

/** `/llms.txt`: every repository with content, one section each. */
export function llmsIndex(
  repositories: readonly DocsRepository[],
  origin: string
): string {
  const lines = [`# ${SITE_TITLE}`, "", `> ${SITE_SUMMARY}`, "", HOW_TO_READ]
  for (const repository of repositories) {
    if (!repository.available) continue
    lines.push(
      "",
      `## ${repository.name}`,
      "",
      ...pageLines(repository, origin)
    )
  }
  return text(lines)
}

/** `/<repo>/llms.txt`: the pages of one repository. */
export function repositoryLlmsIndex(
  repository: DocsRepository,
  origin: string
): string {
  const lines = [`# ${repository.name}`, ""]
  if (repository.description !== null && repository.description !== "")
    lines.push(`> ${repository.description}`, "")
  lines.push(HOW_TO_READ, "", ...pageLines(repository, origin))
  return text(lines)
}
