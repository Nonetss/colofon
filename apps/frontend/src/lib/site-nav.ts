import type { ComponentType } from "react"
import {
  type AppSurface,
  appSurfaceList,
  appSurfaces,
  getChildSurfaces,
  isSurfacePathActive,
  type SurfaceId,
} from "@/lib/app-surfaces"
import { resolveIconRef } from "@/lib/icon-registry"

export type SiteNavIconComponent = ComponentType<{ className?: string }>

export interface SiteNavSubItem {
  href: string
  label: string
  description: string
  icon: SiteNavIconComponent
}

export interface SiteNavItem {
  href: string
  label: string
  description: string
  icon: SiteNavIconComponent
  /** Hidden from the navbar/overview cards unless the user is an admin. */
  adminOnly?: boolean
  /**
   * Rendered inline in the segmented navbar row at `lg` (1024–1279px).
   * Non-primary items collapse into the "Más" overflow trigger at `lg` and
   * rejoin the row at `xl+`, once there's enough room for everything.
   */
  primary?: boolean
  /** Subroutes of this section: navbar dropdown, section sidebar and cards. */
  subItems?: SiteNavSubItem[]
}

/** True when `pathname` is exactly `href` or a nested route under it. */
export const isNavLinkActive = isSurfacePathActive

/**
 * The most specific href in `hrefs` that matches `pathname`. A child like
 * `/admin/users` wins over its parent `/admin`, so only one
 * row in a section is current at a time.
 */
export function currentNavHref(pathname: string, hrefs: readonly string[]) {
  let current: string | undefined
  for (const href of hrefs) {
    if (!isNavLinkActive(href, pathname)) continue
    if (current == null || href.length > current.length) current = href
  }
  return current
}

function toSubItem(surface: AppSurface): SiteNavSubItem {
  return {
    href: surface.path,
    label: surface.label,
    description: surface.description,
    icon: resolveIconRef(surface.icon),
  }
}

function toNavItem(surface: AppSurface): SiteNavItem {
  const children = getChildSurfaces(surface.id)
  return {
    href: surface.path,
    label: surface.label,
    description: surface.description,
    icon: resolveIconRef(surface.icon),
    adminOnly: surface.adminOnly,
    primary: surface.nav?.primary,
    subItems: children.length > 0 ? children.map(toSubItem) : undefined,
  }
}

/**
 * Sections for the section landing pages (`SectionNavOverview`), projected
 * from `app-surfaces.ts` — register a new navigable surface there, not here.
 * The navbar lists no sections: the documentation sidebar is the app's
 * navigation and admin has its own shell (`adminSidebarLinks`).
 *
 * Icons are React components, so they cannot cross the Astro island boundary as
 * props — consumers mounted with `client:only` must import this module directly
 * and receive only primitives (`currentPath`, `isAdmin`) from the layout.
 */
export const siteNavItems: SiteNavItem[] = appSurfaceList
  .filter((surface) => surface.nav)
  .map(toNavItem)

export function getSiteNavItemByHref(href: string) {
  return siteNavItems.find((item) => item.href === href)
}

export interface SiteNavSearchItem {
  href: string
  label: string
  description: string
  icon: SiteNavIconComponent
  /** Label of the group the item is listed under, matched like its own text. */
  section: string
  /**
   * Labels of the sections above the item, outermost first, shown before its
   * label (`Configuración › Apariencia`) and matched like its own text.
   */
  trail?: string[]
  /** Extra terms matched like its own text (e.g. a record's surface label). */
  keywords?: string[]
  /** Text around where a full-text search matched, shown instead of the description. */
  excerpt?: SiteNavSearchExcerpt
}

/** A stretch of text with the matched words, as offsets into `text`. */
export interface SiteNavSearchExcerpt {
  text: string
  highlights: { start: number; end: number }[]
}

export interface SiteNavSearchGroup {
  label: string
  items: SiteNavSearchItem[]
}

const GENERAL_SEARCH_GROUP = "General"

/** Labels of `surface`'s parent chain, outermost first. */
function getParentTrail(surface: AppSurface): string[] {
  const trail: string[] = []
  let parentId = surface.parentId
  while (parentId != null) {
    const parent = appSurfaces[parentId]
    trail.unshift(parent.label)
    parentId = parent.parentId
  }
  return trail
}

function isSearchableSurface(surface: AppSurface, isAdmin: boolean) {
  if (surface.path.includes("[")) return false
  if (surface.search === false) return false
  return !surface.adminOnly || isAdmin
}

/**
 * Destinations for the navbar surface search, projected from `app-surfaces`:
 * every concrete-path surface the user may see (no dynamic `[param]` routes,
 * no `search: false`, `adminOnly` only for admins). Top-level surfaces
 * without children share a leading "General" group; each section with
 * children gets its own group, hub first, in registry order.
 */
export function getSearchableSurfaces(isAdmin: boolean): SiteNavSearchGroup[] {
  const general: SiteNavSearchGroup = { label: GENERAL_SEARCH_GROUP, items: [] }
  const sections = new Map<string, SiteNavSearchGroup>()

  for (const surface of appSurfaceList) {
    if (!isSearchableSurface(surface, isAdmin)) continue
    const sectionId = surface.parentId ?? surface.id
    const hasGroup =
      surface.parentId != null || getChildSurfaces(surface.id).length > 0
    let group = general
    if (hasGroup) {
      const label = appSurfaces[sectionId].label
      group = sections.get(sectionId) ?? { label, items: [] }
      sections.set(sectionId, group)
    }
    group.items.push({
      href: surface.path,
      label: surface.label,
      description: surface.description,
      icon: resolveIconRef(surface.icon),
      section: group.label,
      trail: getParentTrail(surface),
    })
  }

  return [general, ...sections.values()].filter(
    (group) => group.items.length > 0
  )
}

/**
 * The most specific searchable href that matches `pathname`, so the search
 * marks `/admin/users` — not also `/admin` — as current. Hrefs are compared
 * without their `#fragment` (`pageHrefOf`), so a result at a section of the
 * current page is current too.
 */
export function getCurrentSearchHref(
  pathname: string,
  groups: readonly SiteNavSearchGroup[]
) {
  return currentNavHref(
    pathname,
    groups.flatMap((group) => group.items.map((item) => pageHrefOf(item.href)))
  )
}

/** `href` without its `#fragment`: the page it opens. */
export function pageHrefOf(href: string): string {
  const hash = href.indexOf("#")
  if (hash === -1) return href
  return href.slice(0, hash)
}

export interface SectionSidebarLink {
  href: string
  label: string
  icon: SiteNavIconComponent
}

/**
 * Rows of a section's sidebar (the admin shell, `WithSidebar.astro`): the
 * section's own page under `overviewLabel`, since it isn't a child surface,
 * followed by its child surfaces in registry order. Routes, labels and icons
 * come from `app-surfaces.ts`, so a new page is only a new child there.
 */
export function sectionSidebarLinks(
  id: SurfaceId,
  overviewLabel: string
): SectionSidebarLink[] {
  const section = appSurfaces[id]
  return [
    {
      href: section.path,
      label: overviewLabel,
      icon: resolveIconRef(section.icon),
    },
    ...getChildSurfaces(id).map(toSubItem),
  ]
}

/** Rows of the `/admin` shell's sidebar (`features/admin/shell`). */
export const adminSidebarLinks = sectionSidebarLinks("admin", "Resumen")

/** Rows of the profile's sidebar (`/me`, `features/app-shell/sidebar`). */
export const profileSidebarLinks = sectionSidebarLinks("profile", "Cuenta")

/** Sections shown with `WithSidebar.astro`, each with its sidebar's rows. */
export const sectionSidebars = {
  profile: profileSidebarLinks,
} satisfies Partial<Record<SurfaceId, SectionSidebarLink[]>>

export type SidebarSection = keyof typeof sectionSidebars
