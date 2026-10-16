import { useEffect, useState } from "react"
import { Text, textVariants } from "@/components/shared/brand/typography"
import { StatusDot } from "@/components/shared/data-display/status-dot"
import { MenuItemText } from "@/components/shared/navigation/menu-item-text"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { DialogClose } from "@/components/ui/dialog"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Kbd } from "@/components/ui/kbd"
import { SurfaceSearchExcerpt } from "@/features/app-shell/authenticated/components/surface-search-excerpt"
import { SurfaceSearchFooter } from "@/features/app-shell/authenticated/components/surface-search-footer"
import { SurfaceSearchLabel } from "@/features/app-shell/authenticated/components/surface-search-label"
import { useSurfaceSearchRecords } from "@/features/app-shell/authenticated/hooks/use-surface-search-records"
import { foldText } from "@/lib/fold-text"
import { getIcon } from "@/lib/icon-registry"
import { navigate } from "@/lib/navigate"
import {
  getCurrentSearchHref,
  pageHrefOf,
  type SiteNavSearchItem,
} from "@/lib/site-nav"

export interface SurfaceSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isAdmin: boolean
  currentPath: string
}

const SearchIcon = getIcon("views", "search")

/** Group headings stay pinned while their group scrolls under them. */
const GROUP_CLASS =
  "overflow-visible **:[[cmdk-group-heading]]:sticky **:[[cmdk-group-heading]]:top-0 **:[[cmdk-group-heading]]:z-10 **:[[cmdk-group-heading]]:bg-popover"

function groupHeading(label: string) {
  return (
    <Text variant="label" tone="muted">
      {label}
    </Text>
  )
}

/** A result's excerpt when the search matched its text, else its description. */
function descriptionOf(item: SiteNavSearchItem) {
  if (item.excerpt === undefined) return item.description
  return <SurfaceSearchExcerpt excerpt={item.excerpt} />
}

/**
 * Every word of the query must be a substring of one of the item's folded
 * keywords (label, description, section, trail, extra keywords), so
 * "red dns" finds that page. The score stays binary so cmdk keeps the
 * render order, and with it the order a server search returned.
 */
function matchSurface(_value: string, search: string, keywords?: string[]) {
  const words = foldText(search).split(/\s+/).filter(Boolean)
  if (words.length === 0) return 1
  const folded = (keywords ?? []).map(foldText)
  return words.every((word) => folded.some((keyword) => keyword.includes(word)))
    ? 1
    : 0
}

/**
 * Command palette for the documentation, opened from the navbar or with
 * ⌘K / Ctrl+K. Owns the shortcut listener so the navbar mounts exactly one
 * per page. It lists the pages of the content repositories, found by their
 * text and ranked by the documentation search, and nothing else: not the
 * home, the profile or the admin screens. Pages appear once the user types;
 * a match in a page's body shows its excerpt in place of the description.
 */
export function SurfaceSearchDialog({
  open,
  onOpenChange,
  isAdmin,
  currentPath,
}: SurfaceSearchDialogProps) {
  const [search, setSearch] = useState("")
  const recordGroups = useSurfaceSearchRecords({
    isAdmin,
    enabled: open,
    search,
  })
  const currentHref = getCurrentSearchHref(currentPath, recordGroups)
  const hasQuery = search.trim() !== ""

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "k") return
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return
      event.preventDefault()
      handleOpenChange(!open)
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  })

  function handleOpenChange(next: boolean) {
    if (!next) setSearch("")
    onOpenChange(next)
  }

  function handleSelect(href: string) {
    // Close first so the dialog's portal is gone before the View Transition
    // swaps the page.
    handleOpenChange(false)
    if (href !== currentHref) navigate(href)
  }

  function renderItem(item: SiteNavSearchItem, value: string) {
    const current = pageHrefOf(item.href) === currentHref
    return (
      <CommandItem
        key={value}
        value={value}
        keywords={[
          item.label,
          item.description,
          item.section,
          ...(item.trail ?? []),
          ...(item.keywords ?? []),
        ]}
        onSelect={handleSelect}
        className="group gap-3"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 transition-colors group-data-[selected=true]:bg-primary">
          <item.icon
            aria-hidden
            className="size-4 text-primary transition-colors group-data-[selected=true]:text-primary-foreground"
          />
        </span>
        <MenuItemText
          label={<SurfaceSearchLabel label={item.label} trail={item.trail} />}
          description={descriptionOf(item)}
        />
        {current ? (
          <>
            <StatusDot tone="primary" className="shrink-0" />
            <span className="sr-only">(página actual)</span>
          </>
        ) : null}
        <Kbd
          aria-hidden
          className="hidden group-data-[selected=true]:inline-flex"
        >
          ↵
        </Kbd>
      </CommandItem>
    )
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Buscar en la documentación"
      description="Escribe para encontrar una ficha y pulsa Intro para ir a ella."
      filter={matchSurface}
      showCloseButton={false}
    >
      <CommandInput
        placeholder="Buscar en la documentación…"
        value={search}
        onValueChange={setSearch}
      >
        <DialogClose
          aria-label="Cerrar búsqueda"
          className="shrink-0 rounded outline-none focus-visible:ring-2 focus-visible:ring-ring/50 hover:[&>kbd]:text-foreground"
        >
          <Kbd>esc</Kbd>
        </DialogClose>
      </CommandInput>
      <CommandList className="max-h-[min(60vh,440px)] scroll-pt-9 p-1">
        {hasQuery ? (
          <CommandEmpty className="py-10">
            <Empty className="gap-0 p-0 md:p-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchIcon aria-hidden className="size-5" />
                </EmptyMedia>
                <EmptyTitle className={textVariants({ role: "title" })}>
                  Sin resultados para «{search.trim()}»
                </EmptyTitle>
                <EmptyDescription
                  className={textVariants({ role: "meta", tone: "muted" })}
                >
                  Prueba con el título de una ficha, su sección o el
                  repositorio.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CommandEmpty>
        ) : (
          <Text variant="meta" tone="muted" className="px-3 py-6 text-center">
            Escribe para buscar en la documentación.
          </Text>
        )}
        {hasQuery
          ? recordGroups.map((group) => (
              <CommandGroup
                key={group.label}
                heading={groupHeading(group.label)}
                className={GROUP_CLASS}
              >
                {group.items.map((item) => renderItem(item, item.href))}
              </CommandGroup>
            ))
          : null}
      </CommandList>
      <SurfaceSearchFooter />
    </CommandDialog>
  )
}
