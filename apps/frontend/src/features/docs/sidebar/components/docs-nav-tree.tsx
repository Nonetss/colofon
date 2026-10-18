import { textVariants } from "@/components/shared/brand/typography"
import { AppLink } from "@/components/ui/app-link"
import {
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import type {
  DocsNavGroup,
  DocsNavLink,
  DocsNavNode,
} from "@/features/docs/shared/public"
import { DocIcon } from "@/features/docs/sidebar/components/doc-icon"
import { getIcon } from "@/lib/icon-registry"
import { cn } from "@/lib/utils"

const ChevronRight = getIcon("controls", "chevronRight")

export interface NavTreeProps {
  nodes: readonly DocsNavNode[]
  /** The href the sidebar marks as current (`currentHref`), `""` for none. */
  current: string
  open: ReadonlySet<string>
  onToggle: (href: string) => void
}

function foldLabel(open: boolean, title: string): string {
  if (open) return `Plegar ${title}`
  return `Desplegar ${title}`
}

/** A page or subsection under a section: smaller and muted until current. */
const subButton = cn(
  textVariants({ role: "meta", tone: "muted" }),
  "h-auto min-h-7 py-1 hover:bg-sidebar-accent/60 hover:text-foreground data-active:font-medium data-active:text-sidebar-accent-foreground"
)

/** Top-level rows lighten on hover; the current one takes the accent. */
const rowButton = "hover:bg-sidebar-accent/60"

function iconClass(active: boolean): string {
  if (active) return "text-primary"
  return "text-muted-foreground"
}

/** The chevron that folds a section; the section's title is a link. */
function FoldButton({
  node,
  open,
  onToggle,
  className,
}: {
  node: DocsNavLink
  open: boolean
  onToggle: (href: string) => void
  className?: string
}) {
  return (
    <button
      type="button"
      aria-label={foldLabel(open, node.title)}
      aria-expanded={open}
      onClick={() => onToggle(node.href)}
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-hidden hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        className
      )}
    >
      <ChevronRight
        aria-hidden
        className={cn("size-3.5 transition-transform", open && "rotate-90")}
      />
    </button>
  )
}

/** Where the guide line sits: under the section's icon, or a level deeper. */
function guideIndent(nested: boolean): string {
  if (nested) return "ml-3"
  return "ml-4.25"
}

/** Pages and subsections inside a section, with the guide line on the left. */
function SubTree({
  nodes,
  current,
  open,
  onToggle,
  nested = false,
}: NavTreeProps & { nested?: boolean }) {
  return (
    <SidebarMenuSub
      className={cn(
        "mx-0 mt-0.5 mb-1 translate-x-0 gap-0.5 pr-0 pl-2",
        guideIndent(nested)
      )}
    >
      {nodes.map((node) => {
        // Groups of the menu are top-level only; a section never holds one.
        if (node.kind === "group") return null
        const active = node.href === current
        if (node.kind === "page" || node.children.length === 0) {
          return (
            <SidebarMenuSubItem key={node.href}>
              <SidebarMenuSubButton
                isActive={active}
                className={subButton}
                render={<AppLink href={node.href} />}
              >
                {node.icon !== null ? (
                  <DocIcon name={node.icon} className={iconClass(active)} />
                ) : null}
                <span>{node.title}</span>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          )
        }
        const isOpen = open.has(node.href)
        return (
          <SidebarMenuSubItem key={node.href}>
            <div className="flex items-center gap-0.5">
              <SidebarMenuSubButton
                isActive={active}
                className={cn(subButton, "flex-1")}
                render={<AppLink href={node.href} />}
              >
                <span>{node.title}</span>
              </SidebarMenuSubButton>
              <FoldButton node={node} open={isOpen} onToggle={onToggle} />
            </div>
            {isOpen ? (
              <SubTree
                nodes={node.children}
                current={current}
                open={open}
                onToggle={onToggle}
                nested
              />
            ) : null}
          </SidebarMenuSubItem>
        )
      })}
    </SidebarMenuSub>
  )
}

/** A group of the menu: a heading with its icon, its entries below it. */
function GroupItem({
  group,
  current,
  open,
  onToggle,
}: Omit<NavTreeProps, "nodes"> & { group: DocsNavGroup }) {
  return (
    <SidebarMenuItem className="mt-3 first:mt-0">
      <div
        className={cn(
          textVariants({ role: "label", tone: "muted" }),
          "flex h-7 items-center gap-2 px-2"
        )}
      >
        {group.icon !== null ? (
          <DocIcon
            name={group.icon}
            className="size-3.5 text-muted-foreground"
          />
        ) : null}
        <span className="truncate">{group.title}</span>
      </div>
      <DocsNavTree
        nodes={group.children}
        current={current}
        open={open}
        onToggle={onToggle}
      />
    </SidebarMenuItem>
  )
}

/**
 * A repository's top-level groups, sections and pages, each with its icon. A
 * group of the menu holds the same rows, under its heading.
 */
export function DocsNavTree({ nodes, current, open, onToggle }: NavTreeProps) {
  return (
    <SidebarMenu>
      {nodes.map((node) => {
        if (node.kind === "group")
          return (
            <GroupItem
              key={`group:${node.title}`}
              group={node}
              current={current}
              open={open}
              onToggle={onToggle}
            />
          )
        const active = node.href === current
        const inside = current.startsWith(`${node.href}/`)
        if (node.kind === "page" || node.children.length === 0) {
          return (
            <SidebarMenuItem key={node.href}>
              <SidebarMenuButton
                isActive={active}
                className={rowButton}
                render={<AppLink href={node.href} />}
              >
                <DocIcon name={node.icon} className={iconClass(active)} />
                <span>{node.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        }
        const isOpen = open.has(node.href)
        return (
          <SidebarMenuItem key={node.href}>
            <SidebarMenuButton
              isActive={active}
              className={cn(rowButton, inside && "font-medium text-foreground")}
              render={<AppLink href={node.href} />}
            >
              <DocIcon
                name={node.icon}
                className={iconClass(active || inside)}
              />
              <span>{node.title}</span>
            </SidebarMenuButton>
            <SidebarMenuAction
              aria-label={foldLabel(isOpen, node.title)}
              aria-expanded={isOpen}
              onClick={() => onToggle(node.href)}
            >
              <ChevronRight
                aria-hidden
                className={cn(
                  "text-muted-foreground transition-transform",
                  isOpen && "rotate-90"
                )}
              />
            </SidebarMenuAction>
            {isOpen ? (
              <SubTree
                nodes={node.children}
                current={current}
                open={open}
                onToggle={onToggle}
              />
            ) : null}
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  )
}
