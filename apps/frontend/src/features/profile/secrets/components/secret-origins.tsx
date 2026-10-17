import { useState } from "react"
import { Text } from "@/components/shared/brand/typography"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** Origins shown before the rest fold behind "Ver N más". */
const COLLAPSED_ORIGINS = 3

function toggleLabel(expanded: boolean, hidden: number): string {
  if (expanded) return "Ver menos"
  return `Ver ${hidden} más`
}

/**
 * The origins a secret may be sent to. A long list folds to its first few;
 * expanding shows them all, wrapped so none is cut off.
 */
export function SecretOrigins({ origins }: { origins: string[] }) {
  const [expanded, setExpanded] = useState(false)
  const hidden = origins.length - COLLAPSED_ORIGINS
  const folds = hidden > 0
  const shown =
    expanded || !folds ? origins : origins.slice(0, COLLAPSED_ORIGINS)

  return (
    <div className="flex flex-col gap-1">
      <ul className="flex flex-col">
        {shown.map((origin) => (
          <li key={origin} className="min-w-0">
            <Text
              variant="data"
              tone="muted"
              className={cn("block", expanded ? "break-all" : "truncate")}
            >
              {origin}
            </Text>
          </li>
        ))}
      </ul>
      {folds && (
        <Button
          type="button"
          variant="link"
          size="xs"
          className="h-auto self-start px-0"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          {toggleLabel(expanded, hidden)}
        </Button>
      )}
    </div>
  )
}
