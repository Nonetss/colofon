import type { SiteNavSearchExcerpt } from "@/lib/site-nav"

/** A run of an excerpt's text, marked when it is a matched word. */
export interface ExcerptPart {
  text: string
  marked: boolean
}

/**
 * The excerpt's text cut into plain and marked runs, in order. Highlights
 * are taken in order of their start; one that overlaps the previous, or
 * falls outside the text, is skipped.
 */
export function excerptParts({
  text,
  highlights,
}: SiteNavSearchExcerpt): ExcerptPart[] {
  const parts: ExcerptPart[] = []
  let cursor = 0
  const ordered = [...highlights].sort((a, b) => a.start - b.start)
  for (const { start, end } of ordered) {
    if (start < cursor || end <= start || end > text.length) continue
    if (start > cursor)
      parts.push({ text: text.slice(cursor, start), marked: false })
    parts.push({ text: text.slice(start, end), marked: true })
    cursor = end
  }
  if (cursor < text.length)
    parts.push({ text: text.slice(cursor), marked: false })
  return parts
}
