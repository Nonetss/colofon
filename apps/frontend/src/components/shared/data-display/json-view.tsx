import { createHighlighter } from "@tanstack/highlight/core"
import { json } from "@tanstack/highlight/languages/json"
import { textVariants } from "@/components/shared/brand/typography"
import { HighlightedTokens } from "@/components/shared/data-display/highlighted-tokens"
import { cn } from "@/lib/utils"

type JsonViewVariant = "boxed" | "flush"

interface JsonViewProps {
  value: unknown
  /**
   * `boxed` stands on its own with a border; `flush` is the quiet fill for a
   * viewer nested inside a detail sheet or a row, scrolling sideways.
   */
  variant?: JsonViewVariant
  className?: string
  id?: string
}

const surfaceClass: Record<JsonViewVariant, string> = {
  boxed: "overflow-auto rounded-lg border bg-muted/50",
  flush: "overflow-x-auto rounded-md bg-muted/40",
}

/** JSON only: this viewer ships with every page that shows logs or runs. */
const jsonHighlighter = createHighlighter({ languages: [json] })

/**
 * Syntax-highlighted JSON viewer.
 *
 * Stringifies `value` with 2-space indent and colours it with TanStack
 * Highlight's JSON tokenizer, using the `--th-*` token palette in
 * `global.css`. Falls back to a plain
 * `<pre>` when the value isn't JSON-serializable so the surface stays useful
 * for edge cases (circular refs, BigInt, …).
 */
export function JsonView({
  value,
  variant = "boxed",
  className,
  id,
}: JsonViewProps) {
  if (value === undefined) return null

  const preClass = cn(
    textVariants({ role: "data" }),
    surfaceClass[variant],
    "p-3 text-foreground/90 leading-relaxed whitespace-pre-wrap break-all",
    className
  )

  let text: string
  try {
    text = JSON.stringify(value, null, 2)
  } catch {
    return (
      <pre id={id} className={preClass}>
        {String(value)}
      </pre>
    )
  }

  return (
    <pre id={id} className={preClass}>
      <HighlightedTokens
        tokens={jsonHighlighter.tokenize(text, { lang: "json" }).tokens}
      />
    </pre>
  )
}
