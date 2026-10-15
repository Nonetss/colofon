import type { HighlightToken } from "@tanstack/highlight/core"
import type { ReactNode } from "react"

/**
 * TanStack Highlight tokens as React spans, coloured by the `--th-*` palette
 * in `global.css`. Unclassed tokens stay plain text, so no highlighter HTML
 * is ever injected. Goes inside the caller's `<pre>`.
 */
export function HighlightedTokens({
  tokens,
}: {
  tokens: ReadonlyArray<HighlightToken>
}) {
  const nodes: ReactNode[] = []
  let offset = 0

  for (const token of tokens) {
    if (token.className) {
      nodes.push(
        <span key={offset} className={`th-token th-${token.className}`}>
          {token.value}
        </span>
      )
    } else {
      nodes.push(token.value)
    }
    offset += token.value.length
  }

  return nodes
}
