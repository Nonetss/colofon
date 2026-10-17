import { useEffect } from "react"
import { AppLink } from "@/components/ui/app-link"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { usePathname } from "@/hooks/use-pathname"
import { appSurfaces } from "@/lib/app-surfaces"
import { getIcon, resolveIconRef } from "@/lib/icon-registry"
import { PAGE_SIDEBAR_TOGGLE_EVENT } from "@/lib/page-sidebar"
import {
  currentNavHref,
  type SidebarSection,
  sectionSidebars,
} from "@/lib/site-nav"

const PanelLeftIcon = getIcon("views", "sidebar")

/** The element id `WithSidebar.astro` marks <body> with for the navbar. */
export const SECTION_SIDEBAR_ID = "section-sidebar"

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

function collapseLabel(state: "expanded" | "collapsed"): string {
  if (state === "collapsed") return "Extender menú"
  return "Contraer menú"
}

interface SectionSidebarProps {
  section: SidebarSection
}

/**
 * A section's sidebar: the section's surface as header, then one row per
 * link from `site-nav.ts` (labels and icons come from the registry, never
 * from here). The island is persisted, so the current row is read from the
 * URL rather than from a prop frozen on the first page.
 */
function SectionSidebarBody({ section }: SectionSidebarProps) {
  const pathname = usePathname()
  const { state, toggleSidebar } = useSidebar()
  useMobileSheet(pathname)

  const surface = appSurfaces[section]
  const SectionIcon = resolveIconRef(surface.icon)
  const links = sectionSidebars[section]
  const current = currentNavHref(
    pathname,
    links.map((link) => link.href)
  )

  return (
    <Sidebar
      id={SECTION_SIDEBAR_ID}
      collapsible="icon"
      className="top-(--navbar-height) h-[calc(100svh-var(--navbar-height))]!"
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip={surface.label}
              render={
                <AppLink
                  href={surface.path}
                  className="gap-2.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
                />
              }
            >
              <SectionIcon className="size-4 shrink-0 text-primary" />
              <span className="truncate font-semibold group-data-[collapsible=icon]:hidden">
                {surface.label}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {links.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    isActive={href === current}
                    tooltip={label}
                    render={<AppLink href={href} />}
                  >
                    <Icon />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Below `md` the sidebar is a sheet; the collapse control is desktop-only. */}
      <SidebarFooter className="hidden md:flex">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              type="button"
              tooltip={collapseLabel(state)}
              className="text-muted-foreground"
              onClick={toggleSidebar}
            >
              <PanelLeftIcon />
              <span>{collapseLabel(state)}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

interface SectionSidebarChromeProps extends SectionSidebarProps {
  /** Expanded or collapsed, from the `sidebar_state` cookie. */
  defaultOpen?: boolean
}

/**
 * Persist island of `WithSidebar.astro`: provider and sidebar. The page is a
 * sibling slot so it fades on navigation without remounting this chrome.
 */
export function SectionSidebarChrome({
  section,
  defaultOpen = true,
}: SectionSidebarChromeProps) {
  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      className="min-h-0 w-auto shrink-0"
    >
      <SectionSidebarBody section={section} />
    </SidebarProvider>
  )
}
