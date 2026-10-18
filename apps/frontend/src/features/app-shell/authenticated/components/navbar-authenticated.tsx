import type { User } from "better-auth"
import { useEffect, useState } from "react"
import { AppLogo } from "@/components/shared/brand/app-logo"
import { Hint } from "@/components/shared/feedback/hint"
import { NavbarAction } from "@/components/shared/navigation/navbar-action"
import { ThemeToggle } from "@/components/shared/navigation/theme-toggle"
import { AppLink } from "@/components/ui/app-link"
import { NavbarSearchTrigger } from "@/features/app-shell/authenticated/components/navbar-search-trigger"
import { SurfaceSearchDialog } from "@/features/app-shell/authenticated/components/surface-search-dialog"
import { UserNav } from "@/features/app-shell/authenticated/components/user-nav"
import {
  RECENT_DOC_PAGES,
  recordableDocPath,
} from "@/features/app-shell/authenticated/model/recent-doc-pages"
import { usePageSidebarId } from "@/hooks/use-page-sidebar"
import { usePathname } from "@/hooks/use-pathname"
import { useScrolled } from "@/hooks/use-scrolled"
import { getIcon } from "@/lib/icon-registry"
import { togglePageSidebar } from "@/lib/page-sidebar"
import { recordRecent } from "@/lib/recent-surfaces"
import { cn } from "@/lib/utils"
import { QueryProvider } from "@/providers/query-provider"

const MenuIcon = getIcon("controls", "menu")

export interface NavbarAuthenticatedProps {
  user: User
  nameApp: string
  isAdmin?: boolean
}

/** Opens the page sidebar's sheet on phones; hidden on pages without one. */
function PageSidebarMenuButton() {
  const sidebarId = usePageSidebarId()
  if (sidebarId === null) return null
  return (
    <Hint label="Abrir menú" side="bottom">
      <NavbarAction
        aria-label="Abrir menú"
        aria-controls={sidebarId}
        className="-ml-1 md:hidden"
        onClick={togglePageSidebar}
      >
        <MenuIcon className="size-4 shrink-0" aria-hidden />
      </NavbarAction>
    </Hint>
  )
}

export function NavbarAuthenticated({
  user,
  nameApp,
  isAdmin = false,
}: NavbarAuthenticatedProps) {
  const currentPath = usePathname()
  const scrolled = useScrolled()
  const [searchOpen, setSearchOpen] = useState(false)
  const openSearch = () => setSearchOpen(true)

  // Remember the documentation pages the user reads, for the search's
  // "Recientes".
  useEffect(() => {
    const path = recordableDocPath(currentPath)
    if (path !== null) recordRecent(RECENT_DOC_PAGES, user.id, path)
  }, [currentPath, user.id])

  // The account menu and the search read through the browser-wide query
  // client, sharing its cache with the page islands.
  return (
    <QueryProvider>
      <header
        className={cn(
          "fixed top-0 z-40 w-full border-b bg-background/80 backdrop-blur transition-shadow duration-300 supports-backdrop-filter:bg-background/60",
          scrolled ? "border-border shadow-sm" : "border-border/40"
        )}
      >
        <nav
          aria-label="Navegación principal"
          className="flex h-navbar w-full items-center justify-between gap-3 px-4 md:gap-4 md:px-6"
        >
          <div className="flex shrink-0 items-center gap-2">
            <PageSidebarMenuButton />
            <AppLink
              href="/"
              className="group flex shrink-0 items-center gap-2 font-semibold text-foreground text-sm tracking-tight"
            >
              <AppLogo
                alt={nameApp}
                className="transition-transform duration-300 group-hover:scale-110"
              />
              <span className="hidden sm:inline">{nameApp}</span>
            </AppLink>
          </div>

          <div className="flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2">
            <div className="flex lg:hidden">
              <NavbarSearchTrigger variant="icon" onOpen={openSearch} />
            </div>
            <div className="hidden lg:flex">
              <NavbarSearchTrigger variant="field" onOpen={openSearch} />
            </div>
            <ThemeToggle />
            <UserNav user={user} isAdmin={isAdmin} />
          </div>
        </nav>
        <SurfaceSearchDialog
          open={searchOpen}
          onOpenChange={setSearchOpen}
          isAdmin={isAdmin}
          currentPath={currentPath}
          userId={user.id}
        />
      </header>
    </QueryProvider>
  )
}
