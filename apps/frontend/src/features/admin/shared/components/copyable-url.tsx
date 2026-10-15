import { Text } from "@/components/shared/brand/typography"
import { CopyButton } from "@/components/shared/form/copy-button"
import { cn } from "@/lib/utils"

interface CopyableUrlProps {
  url: string
  /** Names the copy control ("Copiar la URL de git de Manual"). */
  copyLabel: string
  /** What the URL is ("URL de git"); none for a well that its context names. */
  label?: string
  /** `stacked` sets the label above the well, `inline` inside it before the
   *  URL, for a well that stands alone on a page. */
  labelPlacement?: "stacked" | "inline"
  className?: string
}

/**
 * A URL someone pastes elsewhere (a git remote, the editor's catalog): set in
 * mono inside a muted well, truncated to one line, with a control that copies
 * it whole.
 */
export function CopyableUrl({
  url,
  copyLabel,
  label,
  labelPlacement = "stacked",
  className,
}: CopyableUrlProps) {
  const inlineLabel = labelPlacement === "inline" && label !== undefined
  const stackedLabel = labelPlacement === "stacked" && label !== undefined

  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      {stackedLabel ? (
        <Text as="p" variant="label" tone="muted">
          {label}
        </Text>
      ) : null}
      <div className="flex min-w-0 items-center gap-2 rounded-md bg-muted py-1 pr-1 pl-2.5">
        {inlineLabel ? (
          <Text variant="label" tone="muted" className="shrink-0">
            {label}
          </Text>
        ) : null}
        <Text variant="data" className="min-w-0 flex-1 truncate">
          {url}
        </Text>
        <CopyButton
          text={url}
          label={copyLabel}
          copiedLabel="URL copiada"
          className="shrink-0"
        />
      </div>
    </div>
  )
}
