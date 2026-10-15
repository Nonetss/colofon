import {
  type HighlightLanguage,
  type HighlightToken,
  normalizeLanguage,
  tokenize,
} from "@tanstack/highlight"

/** Fence names the highlighter has no alias for. */
const FENCE_LANGUAGE = new Map<string, HighlightLanguage>([["mdx", "markdown"]])

/** A leading `---` block of YAML metadata, closing fence and newline included. */
const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/

/**
 * The language a fenced block is highlighted as. `mdx` is Markdown; anything
 * the highlighter does not know is plain text.
 */
export function codeLanguage(name: string | null): HighlightLanguage {
  if (name === null) return "plaintext"
  const fence = FENCE_LANGUAGE.get(name.toLowerCase())
  if (fence !== undefined) return fence
  return normalizeLanguage(name)
}

/**
 * A block's text split into highlighted tokens that join back to the exact
 * text. Markdown and MDX frontmatter is tokenized as YAML: the Markdown
 * tokenizer reads its closing `---` as a heading underline.
 */
export function codeTokens(
  code: string,
  language: string | null
): HighlightToken[] {
  const lang = codeLanguage(language)
  const frontmatter = FRONTMATTER.exec(code)
  if (lang !== "markdown" || frontmatter === null) {
    return tokenize(code, { lang }).tokens
  }

  const head = frontmatter[0]
  return [
    ...tokenize(head, { lang: "yaml" }).tokens,
    ...tokenize(code.slice(head.length), { lang }).tokens,
  ]
}
