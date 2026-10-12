import type { ReactNode } from "react"
import { Text } from "@/components/shared/brand/typography"
import {
  StatusDot,
  type StatusDotTone,
  StatusTag,
} from "@/components/shared/data-display/status-dot"
import { AppLink } from "@/components/ui/app-link"

export interface DataTableStatus {
  tone: StatusDotTone
  label: ReactNode
  /** Hover hint, e.g. a ban reason. */
  title?: string
  pulse?: boolean
}

/**
 * The identifying cell of a data-table row: the primary value over an
 * optional secondary one, both truncated. With `href` it is the row's
 * route link (`AppLink`), with `onOpen` a button (a detail sheet); without
 * either, or while `disabled`, plain text. `label` names the open control
 * when the primary value isn't plain text. `leading` sets an avatar, icon
 * or tile before the text, outside the open control.
 */
export function DataTableIdentityCell({
  primary,
  secondary,
  href,
  onOpen,
  label,
  disabled,
  leading,
}: {
  primary: ReactNode
  secondary?: ReactNode
  leading?: ReactNode
  href?: string
  onOpen?: () => void
  label?: string
  disabled?: boolean
}) {
  const content = (
    <span className="block min-w-0">
      <Text as="span" variant="title" className="block truncate">
        {primary}
      </Text>
      {secondary ? (
        <Text
          as="span"
          variant="compact"
          tone="muted"
          className="mt-0.5 block truncate"
        >
          {secondary}
        </Text>
      ) : null}
    </span>
  )

  const identity = identityControl({ content, href, onOpen, label, disabled })
  if (!leading) return identity
  return (
    <span className="flex min-w-0 items-center gap-3">
      <span className="flex shrink-0 items-center">{leading}</span>
      {identity}
    </span>
  )
}

function identityControl({
  content,
  href,
  onOpen,
  label,
  disabled,
}: {
  content: ReactNode
  href?: string
  onOpen?: () => void
  label?: string
  disabled?: boolean
}) {
  if (disabled) return content
  if (href) {
    return (
      <AppLink
        href={href}
        aria-label={label}
        className="block min-w-0 rounded-sm text-left outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        {content}
      </AppLink>
    )
  }
  if (onOpen) {
    return (
      <button
        type="button"
        onClick={onOpen}
        aria-label={label}
        className="block w-full min-w-0 rounded-sm text-left outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        {content}
      </button>
    )
  }
  return content
}

/** A data-table status cell: the status dot and its tag. */
export function DataTableStatusCell({ status }: { status: DataTableStatus }) {
  return (
    <span className="inline-flex items-center gap-2">
      <StatusDot tone={status.tone} pulse={status.pulse} className="shrink-0" />
      <StatusTag title={status.title}>{status.label}</StatusTag>
    </span>
  )
}
