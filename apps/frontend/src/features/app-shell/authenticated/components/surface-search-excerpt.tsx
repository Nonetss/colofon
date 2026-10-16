import { excerptParts } from "@/features/app-shell/authenticated/model/excerpt-parts"
import type { SiteNavSearchExcerpt } from "@/lib/site-nav"

export interface SurfaceSearchExcerptProps {
  excerpt: SiteNavSearchExcerpt
}

/**
 * The text around where the documentation search matched a page, with the
 * matched words marked. Goes where a result shows its description.
 */
export function SurfaceSearchExcerpt({ excerpt }: SurfaceSearchExcerptProps) {
  return excerptParts(excerpt).map((part, index) => {
    const key = `${index}-${part.text}`
    if (!part.marked) return <span key={key}>{part.text}</span>
    return (
      <mark
        key={key}
        className="rounded-sm bg-primary/15 px-0.5 font-medium text-foreground"
      >
        {part.text}
      </mark>
    )
  })
}
