import {
  type DocsPageEntry,
  type DocsRepository,
  flattenPages,
} from "@/features/docs/shared"

// `/llms.txt` and `/<repo>/llms.txt` (https://llmstxt.org): the map of the
// documentation for an AI. Every page is a link to its `llm.txt`, the page
// as Markdown, grouped by repository and listed as the sidebar orders it.

const SITE_TITLE = "Documentación"
const SITE_SUMMARY =
  "La documentación de todos los repositorios, en Markdown para leerla sin el HTML."

const HOW_TO_READ =
  "Cada página tiene su texto en Markdown en `<página>/llm.txt`, con sus enlaces como direcciones completas. Las peticiones necesitan una sesión o una API key en la cabecera `x-api-key`."

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
