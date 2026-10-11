import { textVariants } from "@/components/shared/brand/typography"
import { cn } from "@/lib/utils"

/**
 * Cell classes for the data tables (admin and cron lists), applied to the
 * `components/ui/table` primitives. The head is the `label` text role at
 * `h-9`; body cells share one padding so every table lines up column for
 * column.
 */
export const denseTableHead = cn(
  "h-9 px-3",
  textVariants({ role: "label", tone: "muted" })
)

/** Head for a table whose own scroller keeps the header pinned. The inset
 *  1px `--border` shadow draws the header's bottom line on the sticky cells,
 *  since the row's own border stays behind when the rows scroll. */
export const denseTableStickyHead = cn(
  denseTableHead,
  "sticky top-0 z-10 bg-background shadow-[inset_0_-1px_0_0_var(--border)]"
)

export const denseTableCell = "px-3 py-2.5"

/** Body cell for rows whose cells wrap to several lines (expandable
 *  inventory rows), so short cells stay on the first line. */
export const denseTableCellTop = cn(denseTableCell, "align-top")

/** Right-aligned tabular numbers: counters, rates, sizes, percentages. */
export const denseTableNumeric = cn(denseTableCell, "text-right tabular-nums")
