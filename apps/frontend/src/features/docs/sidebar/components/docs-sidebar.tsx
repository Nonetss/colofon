import { useQuery } from "@tanstack/react-query"
import { useEffect, useRef } from "react"
import { Text, textVariants } from "@/components/shared/brand/typography"
import { AppLink } from "@/components/ui/app-link"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  currentHref,
  type DocsNav,
  type DocsRepository,
  sectionsAbove,
} from "@/features/docs/shared/model/nav"
import {
  type DocsScope,
  inScope,
  resolveScope,
  scopeCookie,
} from "@/features/docs/shared/model/scope"
import { DocsNavTree } from "@/features/docs/sidebar/components/docs-nav-tree"
import { RepositorySelect } from "@/features/docs/sidebar/components/repository-select"
import {
  DOCS_SCOPE_CHANGE_EVENT,
  useStoredScope,
} from "@/features/docs/sidebar/hooks/use-docs-scope"
import { useSidebarMemory } from "@/features/docs/sidebar/hooks/use-sidebar-memory"
import { useIsMobile } from "@/hooks/use-mobile"
import { usePathname } from "@/hooks/use-pathname"
import { getIcon } from "@/lib/icon-registry"
import { navigate } from "@/lib/navigate"
import { orpc } from "@/lib/orpc"
import { PAGE_SIDEBAR_TOGGLE_EVENT } from "@/lib/page-sidebar"
import { cn } from "@/lib/utils"
import { QueryProvider } from "@/providers/query-provider"

const HomeIcon = getIcon("navigation", "home")

export interface DocsSidebarProps {
  /** The navigation the page was rendered with, so nothing is fetched. */
  initialNav: DocsNav
  /** The scope cookie the server saw (`todos` or a slug). */
  initialScope: string | undefined
}

/** Where "Inicio" leads in a scope. */
function homeHref(scope: DocsScope): string {
  if (scope.kind === "all") return "/"
  return `/${scope.slug}`
}

function iconTone(active: boolean): string {
  if (active) return "text-primary"
  return "text-muted-foreground"
}

/** The shadcn sidebar is a sheet on phones and a plain column elsewhere. */
function collapsibleFor(isMobile: boolean): "offcanvas" | "none" {
  if (isMobile) return "offcanvas"
  return "none"
}

/** Opens the sheet on the navbar's request and closes it after navigating. */
function useMobileSheet(pathname: string) {
  const { setOpenMobile, toggleSidebar } = useSidebar()
  useEffect(() => {
    const onToggle = () => toggleSidebar()
    window.addEventListener(PAGE_SIDEBAR_TOGGLE_EVENT, onToggle)
    return () => window.removeEventListener(PAGE_SIDEBAR_TOGGLE_EVENT, onToggle)
  }, [toggleSidebar])
  useEffect(() => {
    if (pathname !== "") setOpenMobile(false)
  }, [pathname, setOpenMobile])
}

/** Scrolls the current row into view only when it is out of sight. */
function useCurrentInView(
  scroller: React.RefObject<HTMLDivElement | null>,
  pathname: string
) {
  useEffect(() => {
    const element = scroller.current
    if (element === null || pathname === "") return
    const current = element.querySelector("[data-active], [aria-current]")
    if (current === null) return
    const box = element.getBoundingClientRect()
    const item = current.getBoundingClientRect()
    if (item.top < box.top || item.bottom > box.bottom)
      element.scrollTop += item.top - box.top - element.clientHeight / 3
  }, [scroller, pathname])
}

function SidebarBody({ initialNav, initialScope }: DocsSidebarProps) {
  const { data: nav } = useQuery({
    ...orpc.v1.docs.nav.queryOptions(),
    initialData: initialNav,
  })
  const pathname = usePathname()
  const stored = useStoredScope(initialScope)
  const repositories = nav.repositories
  const scope = resolveScope(
    stored,
    repositories.map((repository) => repository.slug)
  )
  const shown = repositories.filter((repository) =>
    inScope(scope, repository.slug)
  )
  const required = shown.flatMap((repository) =>
    sectionsAbove(repository.nodes, pathname)
  )
  const scroller = useRef<HTMLDivElement>(null)
  const { open, toggle } = useSidebarMemory(scroller, required)
  useCurrentInView(scroller, pathname)

  const choose = (value: string) => {
    const next = resolveScope(
      value,
      repositories.map((repository) => repository.slug)
    )
    // biome-ignore lint/suspicious/noDocumentCookie: the server reads this cookie on the next request, and the Cookie Store API isn't in every browser yet.
    document.cookie = scopeCookie(next)
    window.dispatchEvent(new Event(DOCS_SCOPE_CHANGE_EVENT))
    navigate(homeHref(next))
  }

  const home = homeHref(scope)
  return (
    <>
      {repositories.length > 1 ? (
        <SidebarHeader className="border-sidebar-border border-b p-3">
          <RepositorySelect
            repositories={repositories}
            scope={scope}
            onChange={choose}
          />
        </SidebarHeader>
      ) : null}
      <SidebarContent ref={scroller} className="gap-0 py-2">
        <SidebarGroup className="py-1">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname === home}
                className="hover:bg-sidebar-accent/60"
                render={<AppLink href={home} />}
              >
                <HomeIcon aria-hidden className={iconTone(pathname === home)} />
                <span>Inicio</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        {shown.map((repository) => (
          <RepositoryGroup
            key={repository.slug}
            repository={repository}
            withHeading={scope.kind === "all"}
            pathname={pathname}
            open={open}
            onToggle={toggle}
          />
        ))}
      </SidebarContent>
    </>
  )
}

function RepositoryGroup({
  repository,
  withHeading,
  pathname,
  open,
  onToggle,
}: {
  repository: DocsRepository
  withHeading: boolean
  pathname: string
  open: ReadonlySet<string>
  onToggle: (href: string) => void
}) {
  return (
    <SidebarGroup className="py-1">
      {withHeading ? (
        <SidebarGroupLabel
          render={<AppLink href={`/${repository.slug}`} />}
          className={cn(
            textVariants({ role: "label", tone: "muted" }),
            "h-7 hover:text-foreground"
          )}
        >
          {repository.name}
        </SidebarGroupLabel>
      ) : null}
      {repository.available ? (
        <DocsNavTree
          nodes={repository.nodes}
          current={currentHref(repository.nodes, pathname) ?? ""}
          open={open}
          onToggle={onToggle}
        />
      ) : (
        <Text as="p" variant="meta" tone="muted" className="px-2 py-1">
          Sin contenido todavía
        </Text>
      )}
    </SidebarGroup>
  )
}

function ResponsiveSidebar(props: DocsSidebarProps) {
  // On phones the shadcn sidebar becomes a sheet; on wider screens it is a
  // plain column that the layout keeps in place below the navbar. The sheet
  // doesn't mount its body while closed, so the navbar's request is heard
  // here, outside it.
  const isMobile = useIsMobile()
  useMobileSheet(usePathname())
  return (
    <Sidebar
      id="docs-sidebar"
      collapsible={collapsibleFor(isMobile)}
      className="h-full w-full bg-transparent"
    >
      <SidebarBody {...props} />
    </Sidebar>
  )
}

/** The reader's sidebar: repository selector and the scope's navigation. */
export function DocsSidebar(props: DocsSidebarProps) {
  return (
    <QueryProvider>
      <SidebarProvider className="min-h-0 h-full">
        <ResponsiveSidebar {...props} />
      </SidebarProvider>
    </QueryProvider>
  )
}
