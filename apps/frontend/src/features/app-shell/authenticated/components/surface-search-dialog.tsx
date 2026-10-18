import { useQuery } from "@tanstack/react-query"
import { type ReactNode, useEffect, useMemo, useState } from "react"
import { Text, textVariants } from "@/components/shared/brand/typography"
import { StatusDot } from "@/components/shared/data-display/status-dot"
import { MenuItemText } from "@/components/shared/navigation/menu-item-text"
import { Button } from "@/components/ui/button"
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
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Kbd } from "@/components/ui/kbd"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SurfaceSearchExcerpt } from "@/features/app-shell/authenticated/components/surface-search-excerpt"
import { SurfaceSearchFooter } from "@/features/app-shell/authenticated/components/surface-search-footer"
import { SurfaceSearchLabel } from "@/features/app-shell/authenticated/components/surface-search-label"
import { useDocsSearchMeta } from "@/features/app-shell/authenticated/hooks/use-docs-search-meta"
import { useSurfaceSearchRecords } from "@/features/app-shell/authenticated/hooks/use-surface-search-records"
import type { DocsSearchMeta } from "@/features/app-shell/authenticated/model/doc-search-entries"
import {
  RECENT_DOC_PAGES,
  resolveRecentDocPages,
} from "@/features/app-shell/authenticated/model/recent-doc-pages"
import {
  entityDescription,
  entityKeywords,
  searchItemKeywords,
} from "@/features/app-shell/authenticated/model/search-dialog-items"
import {
  scopeSwitchRepository,
  searchRepositoryOf,
} from "@/features/app-shell/authenticated/model/search-scope"
import { readScopeCookie } from "@/features/docs/shared"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { foldText } from "@/lib/fold-text"
import { getIcon } from "@/lib/icon-registry"
import { navigate } from "@/lib/navigate"
import { orpc } from "@/lib/orpc"
import { readRecentList } from "@/lib/recent-surfaces"
import { rememberSearchHighlight, searchTerms } from "@/lib/search-highlight"
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
  /** Whose recent pages the dialog suggests. */
  userId: string
}

const SearchIcon = getIcon("views", "search")
const DocIcon = getIcon("navigation", "docs")
const EntityIcon = getIcon("docSections", "data")

/** Pause after the last keystroke before the server is asked: short, since
 *  the palette is typed in short bursts and waits on it. */
const SEARCH_DEBOUNCE_MS = 150

/** Value of the scope switch that searches every repository. */
const EVERYWHERE = "todos"

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

/** The scope cookie as the browser holds it, `undefined` outside one. */
function browserScopeCookie(): string | undefined {
  if (typeof document === "undefined") return undefined
  return readScopeCookie(document.cookie)
}

/** The words a partial result lacks, struck through. */
function MissingWords({ words }: { words: string[] }) {
  return (
    <span className="mt-0.5 block">
      Sin{" "}
      {words.map((word, index) => (
        <span key={word}>
          {index > 0 ? " " : null}
          <s>{word}</s>
        </span>
      ))}
    </span>
  )
}

/**
 * A result's excerpt when the search matched its text, else its
 * description, then the words it lacks in a partial answer.
 */
function descriptionOf(item: SiteNavSearchItem): ReactNode {
  const text =
    item.excerpt === undefined ? (
      item.description
    ) : (
      <SurfaceSearchExcerpt excerpt={item.excerpt} />
    )
  if (!item.missing?.length) return text
  return (
    <>
      {text}
      <MissingWords words={item.missing} />
    </>
  )
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
 * text and ranked by the documentation search, with their other matching
 * sections under them, and the catalog entities that match; nothing else:
 * not the home, the profile or the admin screens. With an empty query it
 * suggests the pages read most recently. It searches the reader's scope,
 * which the user can widen to every repository for this search only.
 */
export function SurfaceSearchDialog({
  open,
  onOpenChange,
  isAdmin,
  currentPath,
  userId,
}: SurfaceSearchDialogProps) {
  const [search, setSearch] = useState("")
  const [everywhere, setEverywhere] = useState(false)
  const settledSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS)
  const storedScope = open ? browserScopeCookie() : undefined
  const scope = searchRepositoryOf(storedScope, everywhere)
  const searchOptions = { isAdmin, enabled: open, settledSearch, scope }
  const recordGroups = useSurfaceSearchRecords(searchOptions)
  const meta = useDocsSearchMeta(searchOptions)
  const { data: nav } = useQuery(
    orpc.v1.docs.nav.queryOptions({ enabled: open })
  )
  const repositories = nav?.repositories ?? []
  const switchRepository = scopeSwitchRepository(storedScope, repositories)
  const currentHref = getCurrentSearchHref(currentPath, recordGroups)
  const hasQuery = search.trim() !== ""
  const recentPages = useMemo(() => {
    if (!open || nav === undefined) return []
    return resolveRecentDocPages(
      readRecentList(RECENT_DOC_PAGES, userId),
      nav.repositories,
      currentPath
    )
  }, [open, nav, userId, currentPath])

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
    if (!next) {
      setSearch("")
      setEverywhere(false)
    }
    onOpenChange(next)
  }

  function handleSelect(href: string) {
    if (hasQuery) rememberSearchHighlight(href, searchTerms(search))
    // Close first so the dialog's portal is gone before the View Transition
    // swaps the page.
    handleOpenChange(false)
    if (href !== currentHref) navigate(href)
  }

  function renderItem(item: SiteNavSearchItem) {
    const current = pageHrefOf(item.href) === currentHref
    const keywords = searchItemKeywords(item)
    return [
      <CommandItem
        key={item.href}
        value={item.href}
        keywords={keywords}
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
      </CommandItem>,
      ...(item.sections ?? []).map((section) => (
        <CommandItem
          key={section.href}
          value={section.href}
          keywords={keywords}
          onSelect={handleSelect}
          className="group ml-11 gap-3 border-border border-l"
        >
          <MenuItemText
            label={section.label}
            description={<SurfaceSearchExcerpt excerpt={section.excerpt} />}
          />
          <Kbd
            aria-hidden
            className="hidden group-data-[selected=true]:inline-flex"
          >
            ↵
          </Kbd>
        </CommandItem>
      )),
    ]
  }

  function renderCatalog(found: DocsSearchMeta) {
    if (found.entities.length === 0) return null
    const terms = searchTerms(settledSearch)
    return (
      <CommandGroup
        key="catalog"
        heading={groupHeading("Catálogo")}
        className={GROUP_CLASS}
      >
        {found.entities.map((entity) => (
          <CommandItem
            key={entity.href}
            value={entity.href}
            keywords={entityKeywords(entity, terms)}
            onSelect={handleSelect}
            className="group gap-3"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 transition-colors group-data-[selected=true]:bg-primary">
              <EntityIcon
                aria-hidden
                className="size-4 text-primary transition-colors group-data-[selected=true]:text-primary-foreground"
              />
            </span>
            <MenuItemText
              label={entity.label}
              description={entityDescription(entity, found.allRepositories)}
            />
            <Kbd
              aria-hidden
              className="hidden group-data-[selected=true]:inline-flex"
            >
              ↵
            </Kbd>
          </CommandItem>
        ))}
      </CommandGroup>
    )
  }

  function renderResults() {
    const pages = recordGroups.map((group) => (
      <CommandGroup
        key={group.label}
        heading={groupHeading(group.label)}
        className={GROUP_CLASS}
      >
        {group.items.flatMap(renderItem)}
      </CommandGroup>
    ))
    if (meta === undefined) return pages
    const catalog = renderCatalog(meta)
    if (meta.entitiesFirst) return [catalog, ...pages]
    return [...pages, catalog]
  }

  function renderRecent() {
    if (recentPages.length === 0)
      return (
        <Text variant="meta" tone="muted" className="px-3 py-6 text-center">
          Escribe para buscar en la documentación.
        </Text>
      )
    return (
      <CommandGroup heading={groupHeading("Recientes")} className={GROUP_CLASS}>
        {recentPages.map((page) => (
          <CommandItem
            key={page.href}
            value={page.href}
            onSelect={handleSelect}
            className="group gap-3"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 transition-colors group-data-[selected=true]:bg-primary">
              <DocIcon
                aria-hidden
                className="size-4 text-primary transition-colors group-data-[selected=true]:text-primary-foreground"
              />
            </span>
            <MenuItemText
              label={
                <SurfaceSearchLabel label={page.label} trail={page.trail} />
              }
            />
            <Kbd
              aria-hidden
              className="hidden group-data-[selected=true]:inline-flex"
            >
              ↵
            </Kbd>
          </CommandItem>
        ))}
      </CommandGroup>
    )
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Buscar en la documentación"
      description="Escribe para encontrar una ficha o un dato del catálogo y pulsa Intro para ir a él."
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
      {switchRepository === null ? null : (
        <Tabs
          value={everywhere ? EVERYWHERE : switchRepository.slug}
          onValueChange={(value) => setEverywhere(value === EVERYWHERE)}
          className="border-b px-3 py-2"
        >
          <TabsList aria-label="Dónde buscar">
            <TabsTrigger value={switchRepository.slug}>
              {switchRepository.name}
            </TabsTrigger>
            <TabsTrigger value={EVERYWHERE}>Todos</TabsTrigger>
          </TabsList>
        </Tabs>
      )}
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
                  Prueba con el título de una ficha, su sección, el repositorio
                  o el nombre de un dato del catálogo.
                </EmptyDescription>
              </EmptyHeader>
              {switchRepository !== null && !everywhere ? (
                <EmptyContent>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEverywhere(true)}
                  >
                    Buscar en todos los repositorios
                  </Button>
                </EmptyContent>
              ) : null}
            </Empty>
          </CommandEmpty>
        ) : (
          renderRecent()
        )}
        {hasQuery && meta?.partial ? (
          <Text variant="meta" tone="muted" className="px-3 pt-2 pb-1">
            Ninguna ficha contiene todas las palabras: estas contienen alguna.
          </Text>
        ) : null}
        {hasQuery ? renderResults() : null}
      </CommandList>
      <SurfaceSearchFooter />
    </CommandDialog>
  )
}
