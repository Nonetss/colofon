import { Fragment } from "react"
import { RowActionsMenu } from "@/components/shared/data-display/row-actions-menu"
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { type IconRef, resolveIconRef } from "@/lib/icon-registry"

export interface RowActionDescriptor<TItem, TContext> {
  key: string
  /** Static label, or a function for state-dependent copy (e.g. "Banear" vs "Quitar baneo"). */
  label: string | ((item: TItem, context: TContext) => string)
  /** Static icon, or a function for a state-dependent icon (e.g. Shield vs ShieldOff). */
  icon?: IconRef | ((item: TItem, context: TContext) => IconRef | undefined)
  destructive?: boolean
  disabled?: (item: TItem, context: TContext) => boolean
  hidden?: (item: TItem, context: TContext) => boolean
  onSelect: (item: TItem, context: TContext) => void
}

function labelOf<TItem, TContext>(
  action: RowActionDescriptor<TItem, TContext>,
  item: TItem,
  context: TContext
): string {
  if (typeof action.label === "function") return action.label(item, context)
  return action.label
}

function iconOf<TItem, TContext>(
  action: RowActionDescriptor<TItem, TContext>,
  item: TItem,
  context: TContext
): IconRef | undefined {
  if (typeof action.icon === "function") return action.icon(item, context)
  return action.icon
}

/** The descriptors a row shows: those whose `hidden` doesn't match it. */
export function visibleRowActions<TItem, TContext>(
  actions: readonly RowActionDescriptor<TItem, TContext>[],
  item: TItem,
  context: TContext
): RowActionDescriptor<TItem, TContext>[] {
  return actions.filter((action) => !action.hidden?.(item, context))
}

/**
 * A row's action-menu items from typed descriptors: state-dependent labels
 * and icons, a separator before the first destructive item that follows a
 * non-destructive one, and each item named after the row
 * (`"<label> <row>"`) when the row has an accessible label. Pass only the
 * visible descriptors (`visibleRowActions`).
 */
export function RowActionItems<TItem, TContext>({
  actions,
  item,
  context,
  accessibleLabel,
}: {
  actions: readonly RowActionDescriptor<TItem, TContext>[]
  item: TItem
  context: TContext
  accessibleLabel?: string
}) {
  return (
    <>
      {actions.map((action, index) => {
        const iconRef = iconOf(action, item, context)
        const Icon = iconRef ? resolveIconRef(iconRef) : null
        const label = labelOf(action, item, context)
        const needsSeparator =
          action.destructive === true &&
          index > 0 &&
          actions[index - 1]?.destructive !== true
        const itemLabel = accessibleLabel
          ? `${label} ${accessibleLabel}`
          : undefined
        const variant = action.destructive ? "destructive" : undefined

        return (
          <Fragment key={action.key}>
            {needsSeparator ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem
              variant={variant}
              disabled={action.disabled?.(item, context)}
              aria-label={itemLabel}
              onClick={() => action.onSelect(item, context)}
            >
              {Icon ? <Icon className="size-4" /> : null}
              {label}
            </DropdownMenuItem>
          </Fragment>
        )
      })}
    </>
  )
}

/**
 * A row's kebab menu built from descriptors: nothing when no descriptor is
 * visible for the row, otherwise `RowActionsMenu` named "Acciones para
 * <row>" holding `RowActionItems`. The actions column of a data table
 * renders it.
 */
export function RowActions<TItem, TContext>({
  actions,
  item,
  context,
  accessibleLabel,
  disabled,
}: {
  actions: readonly RowActionDescriptor<TItem, TContext>[]
  item: TItem
  context: TContext
  accessibleLabel?: string
  disabled?: boolean
}) {
  const visible = visibleRowActions(actions, item, context)
  if (visible.length === 0) return null
  const menuLabel = accessibleLabel
    ? `Acciones para ${accessibleLabel}`
    : undefined
  return (
    <RowActionsMenu label={menuLabel} disabled={disabled}>
      <RowActionItems
        actions={visible}
        item={item}
        context={context}
        accessibleLabel={accessibleLabel}
      />
    </RowActionsMenu>
  )
}
