import {
  type HighlightLanguage,
  type HighlightToken,
  normalizeLanguage,
  tokenize,
} from "@tanstack/highlight"

/** Files known by their whole name rather than their extension. */
const LANGUAGE_BY_NAME = new Map<string, HighlightLanguage>([
  ["dockerfile", "dockerfile"],
  ["containerfile", "dockerfile"],
  ["cmakelists.txt", "cmake"],
  [".htaccess", "apache"],
  ["nginx.conf", "nginx"],
  [".env", "env"],
])

/** Extensions the highlighter has no alias for. */
const LANGUAGE_BY_EXTENSION = new Map<string, HighlightLanguage>([
  ["mdx", "markdown"],
  ["mts", "ts"],
  ["cts", "ts"],
  ["astro", "html"],
  ["svg", "html"],
  ["c", "cpp"],
  ["h", "cpp"],
])

/** A leading `---` block of YAML metadata, closing fence and newline included. */
const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/

/**
 * The language a repository file is highlighted as, from its name: whole
 * names first (`Dockerfile`, `.env.local`), then the extension through the
 * highlighter's aliases. Anything unknown is plain text.
 */
export function fileLanguage(filePath: string): HighlightLanguage {
  const name = filePath.slice(filePath.lastIndexOf("/") + 1).toLowerCase()
  const byName = LANGUAGE_BY_NAME.get(name)
  if (byName !== undefined) return byName
  if (name.startsWith(".env.")) return "env"
  if (name.startsWith("dockerfile.")) return "dockerfile"

  const dot = name.lastIndexOf(".")
  if (dot <= 0) return "plaintext"
  const extension = name.slice(dot + 1)
  const byExtension = LANGUAGE_BY_EXTENSION.get(extension)
  if (byExtension !== undefined) return byExtension
  return normalizeLanguage(extension)
}

/**
 * A file's text split into highlighted tokens that join back to the exact
 * text. A Markdown file's frontmatter is tokenized as YAML: the Markdown
 * tokenizer reads its closing `---` as a heading underline.
 */
export function fileTokens(
  content: string,
  filePath: string
): HighlightToken[] {
  const lang = fileLanguage(filePath)
  const frontmatter = FRONTMATTER.exec(content)
  if (lang !== "markdown" || frontmatter === null) {
    return tokenize(content, { lang }).tokens
  }

  const head = frontmatter[0]
  return [
    ...tokenize(head, { lang: "yaml" }).tokens,
    ...tokenize(content.slice(head.length), { lang }).tokens,
  ]
}
