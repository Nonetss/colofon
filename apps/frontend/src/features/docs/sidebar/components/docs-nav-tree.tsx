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
import type { DocsNavNode } from "@/features/docs/shared/model/nav"
import { DocIcon } from "@/features/docs/sidebar/components/doc-icon"
import { getIcon } from "@/lib/icon-registry"
import { cn } from "@/lib/utils"

const ChevronRight = getIcon("controls", "chevronRight")

export interface NavTreeProps {
  nodes: readonly DocsNavNode[]
  pathname: string
  open: ReadonlySet<string>
  onToggle: (href: string) => void
}

function foldLabel(open: boolean, title: string): string {
  if (open) return `Plegar ${title}`
  return `Desplegar ${title}`
}

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
  node: DocsNavNode
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

/** Pages and subsections inside a section, with the guide line on the left. */
function SubTree({ nodes, pathname, open, onToggle }: NavTreeProps) {
  return (
    <SidebarMenuSub className="mr-0 pr-0">
      {nodes.map((node) => {
        const active = node.href === pathname
        if (node.kind === "page") {
          return (
            <SidebarMenuSubItem key={node.href}>
              <SidebarMenuSubButton
                isActive={active}
                render={<AppLink href={node.href} />}
              >
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
                className="flex-1"
                render={<AppLink href={node.href} />}
              >
                <span>{node.title}</span>
              </SidebarMenuSubButton>
              <FoldButton node={node} open={isOpen} onToggle={onToggle} />
            </div>
            {isOpen ? (
              <SubTree
                nodes={node.children}
                pathname={pathname}
                open={open}
                onToggle={onToggle}
              />
            ) : null}
          </SidebarMenuSubItem>
        )
      })}
    </SidebarMenuSub>
  )
}

/** A repository's top-level sections and pages, each with its icon. */
export function DocsNavTree({ nodes, pathname, open, onToggle }: NavTreeProps) {
  return (
    <SidebarMenu>
      {nodes.map((node) => {
        const active = node.href === pathname
        const inside = pathname.startsWith(`${node.href}/`)
        if (node.kind === "page") {
          return (
            <SidebarMenuItem key={node.href}>
              <SidebarMenuButton
                isActive={active}
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
              className={cn(inside && "font-medium")}
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
                pathname={pathname}
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
