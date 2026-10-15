import type { Root } from "mdast"
import { fromMarkdown } from "mdast-util-from-markdown"
import { frontmatterFromMarkdown } from "mdast-util-frontmatter"
import { gfmFromMarkdown } from "mdast-util-gfm"
import { mdxFromMarkdown } from "mdast-util-mdx"
import { frontmatter } from "micromark-extension-frontmatter"
import { gfm } from "micromark-extension-gfm"
import { mdxjs } from "micromark-extension-mdxjs"
import type { HeaderSource } from "#pages/header"

// Reads a page's MDX into a syntax tree. MDX syntax (ESM, expressions, JSX)
// is only recognised, so the transform can report it with its line; nothing
// in it is ever evaluated.

export type ParsedPage =
  | { ok: true; tree: Root; header: HeaderSource }
  | {
      ok: false
      header: HeaderSource
      line: number | null
      message: string
    }

export function parsePage(source: string): ParsedPage {
  const header = frontMatterOf(source)
  try {
    const tree = fromMarkdown(source, {
      extensions: [frontmatter(["yaml"]), gfm(), mdxjs()],
      mdastExtensions: [
        frontmatterFromMarkdown(["yaml"]),
        gfmFromMarkdown(),
        mdxFromMarkdown(),
      ],
    })
    return { ok: true, tree, header }
  } catch (error) {
    return {
      ok: false,
      header,
      line: lineOfError(error),
      message: reasonOfError(error),
    }
  }
}

const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n?---[ \t]*(?:\r?\n|$)/

/**
 * The YAML between the opening `---` lines, read apart from the body so a
 * broken body still gives the page its title.
 */
function frontMatterOf(source: string): HeaderSource {
  const match = FRONT_MATTER.exec(source)
  if (match === null) return undefined
  return { text: match[1] ?? "", startLine: 2 }
}

function lineOfError(error: unknown): number | null {
  if (typeof error !== "object" || error === null) return null
  if (!("line" in error) || typeof error.line !== "number") return null
  return error.line
}

function reasonOfError(error: unknown): string {
  if (typeof error === "object" && error !== null && "reason" in error) {
    if (typeof error.reason === "string") return error.reason
  }
  if (error instanceof Error) return error.message
  return String(error)
}
