// How wide a diagram's text is drawn, without a DOM: an average advance per
// font at 1px, as the reference site's scheme drawer (`lib.mjs`) measures
// it, so a scheme that fitted there fits here. The reader's CSS sets the
// same faces and sizes on the drawing's classes.

/** Rough advance of each font at 1px. */
const ADVANCE = { mono: 0.62, sans: 0.58 }

export type DiagramFont = keyof typeof ADVANCE

/** The width of `text` at `size` px in `font`, with `tracking` em apart. */
export function textWidth(
  text: string,
  size: number,
  font: DiagramFont = "mono",
  tracking = 0
): number {
  return [...text].length * size * (ADVANCE[font] + tracking)
}

/** The width of a box's framed tag. */
export function tagWidth(tag: string): number {
  return Math.ceil(textWidth(tag, 7, "mono", 0.08) + 12)
}

/** The width of a badge's chip. */
export function badgeWidth(badge: string): number {
  return Math.ceil(textWidth(badge, 7, "mono", 0.08) + 10)
}

/**
 * The height of a table box with `rows` columns, plus its "more" line and,
 * under a hairline, its `ops` rows.
 */
export function tableHeight(rows: number, more: boolean, ops = 0): number {
  const moreLine = more ? 14 : 0
  const opsBlock = ops > 0 ? 10 + 14 * ops : 0
  return 36 + 14 * rows + moreLine + opsBlock + 6
}

/** The width that fits a box's longest line, rounded up to the 4px grid. */
export function fit(
  name: string,
  sub: readonly string[],
  tag: string | null,
  min = 120
): number {
  const widest = Math.max(
    textWidth(name, 12, "sans"),
    ...sub.map((line) => textWidth(line, 9, "mono")),
    tagLineWidth(tag)
  )
  return Math.max(min, Math.ceil((widest + 32) / 4) * 4)
}

function tagLineWidth(tag: string | null): number {
  if (tag === null) return 0
  return textWidth(tag, 7, "mono", 0.08) + 12
}

/** The gap a chain leaves between two boxes for an arrow with `label`. */
export function chainGap(label: string | null): number {
  if (label === null) return 48
  return Math.max(
    48,
    Math.ceil((textWidth(label, 8, "mono", 0.06) + 32) / 4) * 4
  )
}
