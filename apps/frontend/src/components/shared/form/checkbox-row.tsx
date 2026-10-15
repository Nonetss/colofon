import type { ReactNode } from "react"
import { Text } from "@/components/shared/brand/typography"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

export interface CheckboxRowProps {
  /** Ties the checkbox to its label; unique on the page. */
  id: string
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  /** A technical value under the label that tells options apart (an email,
   *  an id), in the mono `data` role. */
  detail?: string
  /** A remark about the row under the label ("Siempre visible"). */
  note?: string
  /** How many records carry this value, right-aligned in tabular digits. */
  count?: number
  /** Sets the label in the `title` role, for a row that acts on the others
   *  ("Seleccionar todo"). */
  emphasis?: boolean
  /** A control after the label, outside it (a drag handle). */
  action?: ReactNode
  /** `li` inside a list (the default), `div` where a wrapper owns the item. */
  as?: "li" | "div"
  className?: string
}

/**
 * One ticked option in a popover checklist: the checkbox, its label (the
 * whole label toggles it and names it), an optional detail or note line and
 * count, and an optional trailing control. Owns the row's padding, hover fill
 * and disabled state so every checklist in the product reads the same.
 */
export function CheckboxRow({
  id,
  label,
  checked,
  onCheckedChange,
  disabled = false,
  detail,
  note,
  count,
  emphasis = false,
  action,
  as: Row = "li",
  className,
}: CheckboxRowProps) {
  const labelRole = emphasis ? "title" : "body"
  return (
    <Row
      className={cn(
        "flex items-center gap-2 rounded-md py-1.5 pr-2 pl-2",
        action !== undefined && "py-1 pr-1",
        !disabled && "hover:bg-muted/50",
        className
      )}
    >
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(next) => onCheckedChange(next)}
      />
      <label
        htmlFor={id}
        className={cn(
          "flex min-w-0 flex-1 cursor-pointer items-center gap-2",
          disabled && "cursor-default"
        )}
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <Text variant={labelRole} className="truncate">
            {label}
          </Text>
          {detail ? (
            <Text variant="data" tone="muted" className="truncate">
              {detail}
            </Text>
          ) : null}
          {note ? (
            <Text variant="compact" tone="muted">
              {note}
            </Text>
          ) : null}
        </span>
        {count === undefined ? null : (
          <Text variant="compact" tone="muted" className="tabular-nums">
            {count}
          </Text>
        )}
      </label>
      {action}
    </Row>
  )
}
