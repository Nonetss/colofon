import { type ComponentType, lazy, type ReactElement, Suspense } from "react"
import { getIcon } from "@/lib/icon-registry"

// A page's `icono` in the sidebar. Not `IconGlyph` from entity-icons: that
// one paints every icon in an entity palette color, and the reader keeps its
// icons monochrome with the accent only on the current page.

const DocumentIcon = getIcon("entities", "file")

interface GlyphProps {
  name: string
  className: string
  fallback: () => ReactElement
}

/** Lucide's dynamic loader is fetched only once an icon is drawn. */
const LucideGlyph = lazy(async () => {
  const { DynamicIcon, iconNames } = await import("lucide-react/dynamic")
  const known: ReadonlySet<string> = new Set(iconNames)
  const isIconName = (name: string): name is (typeof iconNames)[number] =>
    known.has(name)

  function Glyph({ name, className, fallback }: GlyphProps) {
    if (!isIconName(name)) return fallback()
    return (
      <DynamicIcon
        name={name}
        aria-hidden
        className={className}
        fallback={fallback}
      />
    )
  }

  return { default: Glyph }
})

export function DocIcon({
  name,
  className = "",
  fallback: Fallback = DocumentIcon,
}: {
  name: string | null
  className?: string
  fallback?: ComponentType<{ className?: string }>
}) {
  const renderFallback = () => <Fallback aria-hidden className={className} />
  if (name === null) return renderFallback()
  return (
    <Suspense fallback={renderFallback()}>
      <LucideGlyph
        name={name}
        className={className}
        fallback={renderFallback}
      />
    </Suspense>
  )
}
