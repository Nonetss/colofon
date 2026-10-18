import { Text } from "@/components/shared/brand/typography"
import { CommandFooter } from "@/components/ui/command"
import { Kbd, KbdGroup } from "@/components/ui/kbd"

const KEY_HINTS = [
  { keys: ["↑", "↓"], label: "navegar" },
  { keys: ["↵"], label: "abrir" },
  { keys: ["esc"], label: "cerrar" },
]

const SCOPE_HINT = { keys: ["tab"], label: "dónde buscar" }

export interface SurfaceSearchFooterProps {
  /** Whether Tab switches where the search looks, so it gets a hint too. */
  scopeHint?: boolean
}

/** The legend's keys: Tab's only when the dialog offers the scope switch. */
function keyHints(scopeHint: boolean) {
  if (!scopeHint) return KEY_HINTS
  return [...KEY_HINTS.slice(0, 2), SCOPE_HINT, ...KEY_HINTS.slice(2)]
}

/**
 * Keyboard legend under the surface search results. Hidden on small
 * screens, where the palette is driven by touch.
 */
export function SurfaceSearchFooter({
  scopeHint = false,
}: SurfaceSearchFooterProps) {
  return (
    <CommandFooter aria-hidden className="hidden sm:flex">
      {keyHints(scopeHint).map((hint) => (
        <span key={hint.label} className="inline-flex items-center gap-1.5">
          <KbdGroup>
            {hint.keys.map((key) => (
              <Kbd key={key}>{key}</Kbd>
            ))}
          </KbdGroup>
          <Text variant="compact" tone="muted">
            {hint.label}
          </Text>
        </span>
      ))}
    </CommandFooter>
  )
}
