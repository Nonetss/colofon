import { type IconRef, iconRef } from "@/lib/icon-registry"

/**
 * Stable identifier for every registered application surface. A surface is
 * anything with a route and an identity (title/label/description/icon) —
 * not every surface is a navigation item (see `nav` below).
 */
export type SurfaceId =
  | "home"
  | "crons"
  | "cron-detail"
  | "admin"
  | "admin-users"
  | "admin-api-keys"
  | "admin-content"
  | "admin-git"
  | "admin-git-repository"
  | "config-api-keys"
  | "profile"
  | "login"
  | "signup"
  | "not-found"
/**
 * Key of a navbar-search source: how to enumerate the records behind a dynamic
 * `[param]` surface. Resolved by the registry in
 * `features/app-shell/authenticated/model/surface-search-sources.ts`.
 */
export type SurfaceSearchSourceId = "cron-jobs"

/** Navigation placement for a surface that appears in the navbar/sidebars. */
export interface SurfaceNavConfig {
  /**
   * Rendered inline in the segmented navbar row at `lg` (1024–1279px).
   * Non-primary items collapse into the "Más" overflow trigger at `lg` and
   * rejoin the row at `xl+`.
   */
  primary?: boolean
}

export interface AppSurface {
  id: SurfaceId
  /** Route path. Dynamic segments use the Astro bracket form, e.g. `/crons/[id]`. */
  path: string
  /** Browser tab `<title>`. Static — detail pages override the on-page hero
   *  title/description with runtime data, but keep this generic. */
  title: string
  /** Navigation label / hero title / overview-card title. */
  label: string
  /** Short copy for navigation items, page heroes and overview cards. */
  description: string
  icon: IconRef
  /**
   * Hidden from navigation and overview cards unless the user is an admin.
   */
  adminOnly?: boolean
  /** Parent surface for a subsection (drives navbar dropdown, section sidebar, section overview cards). */
  parentId?: SurfaceId
  /** Present only for surfaces that should appear in navbar/sidebar navigation. */
  nav?: SurfaceNavConfig
  /**
   * `false` keeps a concrete-path surface out of the navbar surface search
   * (`getSearchableSurfaces` in `site-nav.ts`) — for routes that are not a
   * destination for a signed-in user. Dynamic `[param]` routes are never
   * listed as surfaces and don't need it (see `searchSource`).
   */
  search?: false
  /**
   * Makes a dynamic `[param]` surface reachable from the navbar search by
   * listing its records (each cron job). A plain-data
   * key — like `icon` — so this module stays safe to import from Astro
   * frontmatter; ignored on concrete paths.
   */
  searchSource?: SurfaceSearchSourceId
}

/**
 * Authoring shape: a parent surface nests its children inline instead of
 * declaring them as flat sibling entries linked by a repeated `parentId`.
 * `flattenSurfaces` below expands this into the flat `AppSurface` records
 * every consumer (`getAppSurface`, `getChildSurfaces`, `site-nav.ts`, ...)
 * actually reads — `id` and `parentId` are derived, not authored twice.
 */
interface SurfaceDefinition extends Omit<AppSurface, "parentId"> {
  children?: Partial<Record<SurfaceId, Omit<AppSurface, "id" | "parentId">>>
}

function flattenSurfaces(
  definitions: Partial<Record<SurfaceId, SurfaceDefinition>>
): Record<SurfaceId, AppSurface> {
  const flat = {} as Record<SurfaceId, AppSurface>
  for (const { children, ...surface } of Object.values(
    definitions
  ) as SurfaceDefinition[]) {
    flat[surface.id] = surface
    for (const [childId, child] of Object.entries(children ?? {}) as Array<
      [SurfaceId, Omit<AppSurface, "id" | "parentId">]
    >) {
      flat[childId] = { ...child, id: childId, parentId: surface.id }
    }
  }
  return flat
}

/**
 * Single source of truth for application-surface identity: route metadata,
 * static document title, label, description, icon and navigation placement.
 * `site-nav.ts` and `PageHero`'s surface-ID mode both
 * project from this registry instead of declaring independent copies.
 *
 * Icons are stored as plain-data `IconRef`s (not resolved components) so this
 * module stays safe to import from Astro frontmatter; resolve them with
 * `resolveIconRef` inside React rendering code.
 */
const appSurfaceDefinitions: Partial<Record<SurfaceId, SurfaceDefinition>> = {
  home: {
    id: "home",
    path: "/",
    title: "Inicio",
    label: "Inicio",
    description: "Revisa las tareas programadas.",
    icon: iconRef("navigation", "home"),
  },
  crons: {
    id: "crons",
    path: "/crons",
    title: "Crons",
    label: "Crons",
    description: "Consulta y gestiona tareas que se ejecutan automáticamente.",
    icon: iconRef("navigation", "crons"),
    nav: { primary: true },
  },
  "admin-git-repository": {
    id: "admin-git-repository",
    path: "/admin/git/[repo]",
    title: "Admin · Repositorio git",
    label: "Repositorio",
    description: "Ramas, carpetas y ficheros de un repositorio alojado.",
    icon: iconRef("entities", "gitBranch"),
    adminOnly: true,
  },
  "cron-detail": {
    id: "cron-detail",
    path: "/crons/[id]",
    title: "Cron",
    label: "Cron",
    description: "Detalle e historial de ejecuciones de la tarea.",
    icon: iconRef("navigation", "crons"),
    searchSource: "cron-jobs",
  },
  admin: {
    id: "admin",
    path: "/admin",
    title: "Resumen",
    label: "Admin",
    description: "Panel de administración de la aplicación.",
    icon: iconRef("navigation", "admin"),
    adminOnly: true,
    nav: { primary: false },
    children: {
      "admin-users": {
        path: "/admin/users",
        title: "Usuarios",
        label: "Usuarios",
        description: "Crea, banea o elimina cuentas.",
        icon: iconRef("admin", "users"),
        adminOnly: true,
      },
      "admin-api-keys": {
        path: "/admin/api-keys",
        title: "Admin · API keys",
        label: "API keys",
        description: "Crea y revoca credenciales para conectar servicios.",
        icon: iconRef("entities", "apiKey"),
        adminOnly: true,
      },
      "admin-content": {
        path: "/admin/content",
        title: "Admin · Contenido",
        label: "Contenido",
        description:
          "Conecta los repositorios de documentación que lee la plataforma.",
        icon: iconRef("entities", "contentRepository"),
        adminOnly: true,
      },
      "admin-git": {
        path: "/admin/git",
        title: "Admin · Git",
        label: "Git",
        description:
          "Navega por las ramas y los ficheros de los repositorios alojados.",
        icon: iconRef("entities", "gitBranch"),
        adminOnly: true,
      },
    },
  },
  profile: {
    id: "profile",
    path: "/me",
    title: "Mi perfil",
    label: "Mi perfil",
    description: "Gestiona tu nombre, correo y contraseña.",
    icon: iconRef("identity", "userCircle"),
  },
  login: {
    id: "login",
    path: "/login",
    title: "Iniciar sesión",
    label: "Iniciar sesión",
    description: "Accede con tu cuenta para continuar.",
    icon: iconRef("auth", "loginAction"),
    search: false,
  },
  signup: {
    id: "signup",
    path: "/signup",
    title: "Crear cuenta",
    label: "Crear cuenta",
    description: "Crea una cuenta nueva para empezar.",
    icon: iconRef("auth", "signup"),
    search: false,
  },
  "not-found": {
    id: "not-found",
    path: "/404",
    title: "Página no encontrada",
    label: "Página no encontrada",
    description:
      "El enlace que has seguido está roto o el contenido se ha movido.",
    icon: iconRef("status", "error"),
    search: false,
  },
}

export const appSurfaces: Record<SurfaceId, AppSurface> = flattenSurfaces(
  appSurfaceDefinitions
)

export const appSurfaceList: AppSurface[] = Object.values(appSurfaces)

export function getAppSurface(id: SurfaceId): AppSurface {
  return appSurfaces[id]
}

export function getAppSurfaceByPath(path: string): AppSurface | undefined {
  return appSurfaceList.find((surface) => surface.path === path)
}

/** Every surface registered with `parentId === id`, in registry order. */
export function getChildSurfaces(id: SurfaceId): AppSurface[] {
  return appSurfaceList.filter((surface) => surface.parentId === id)
}

/** Top-level surfaces that carry navigation placement, filtered by admin visibility. */
export function getNavigableSurfaces(isAdmin: boolean): AppSurface[] {
  return appSurfaceList.filter(
    (surface) => surface.nav && (!surface.adminOnly || isAdmin)
  )
}

/** True when `pathname` is exactly `path` or a nested route under it. */
export function isSurfacePathActive(path: string, pathname: string) {
  if (path === "/") return pathname === "/"
  return pathname === path || pathname.startsWith(`${path}/`)
}
