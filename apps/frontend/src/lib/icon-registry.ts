/**
 * Centralised icon registry for the frontend.
 *
 * Components resolve icons through `getIcon(group, key)`. Keep Lucide names
 * and visual decisions here so product code only depends on semantic groups.
 *
 * Example:
 *   const DeleteIcon = getIcon("actions", "delete")
 */

import * as Lucide from "lucide-react"
import type { ComponentType } from "react"

const navigationIcons = {
  home: Lucide.Home,
  docs: Lucide.BookOpen,
  admin: Lucide.BrickWallFire,
  back: Lucide.ArrowLeft,
  forward: Lucide.ArrowRight,
  openSection: Lucide.ArrowUpRight,
  scrollToTop: Lucide.ArrowUp,
} as const

const authIcons = {
  loginAction: Lucide.LogIn,
  signup: Lucide.UserPlus,
  sso: Lucide.Fingerprint,
} as const

const adminIcons = {
  dashboard: Lucide.LayoutDashboard,
  plugins: Lucide.Blocks,
  sparkle: Lucide.Sparkles,
  users: Lucide.Users,
  teams: Lucide.UsersRound,
  sessions: Lucide.History,
} as const

const entityIcons = {
  organization: Lucide.Building2,
  apiKey: Lucide.KeyRound,
  contentRepository: Lucide.FolderGit2,
  gitBranch: Lucide.GitBranch,
  folder: Lucide.Folder,
  file: Lucide.FileText,
  submodule: Lucide.FolderSymlink,
} as const

const identityIcons = {
  email: Lucide.Mail,
  user: Lucide.UserRound,
  userCircle: Lucide.UserCircle2,
  addUser: Lucide.UserPlus,
  userX: Lucide.UserX,
  userIcon: Lucide.User,
} as const

const securityIcons = {
  security: Lucide.Shield,
  warning: Lucide.ShieldAlert,
  restricted: Lucide.ShieldOff,
  verified: Lucide.ShieldCheck,
  grant: Lucide.ShieldPlus,
  locked: Lucide.Lock,
} as const

const actionIcons = {
  add: Lucide.Plus,
  edit: Lucide.Pencil,
  delete: Lucide.Trash2,
  copy: Lucide.Copy,
  send: Lucide.Send,
  logout: Lucide.LogOut,
  openExternal: Lucide.ExternalLink,
  settings: Lucide.Settings,
  stop: Lucide.Square,
  refresh: Lucide.RotateCw,
  run: Lucide.Play,
  pause: Lucide.Pause,
  pickIcon: Lucide.SmilePlus,
  reorder: Lucide.GripVertical,
  reset: Lucide.RotateCcw,
} as const

const controlIcons = {
  close: Lucide.X,
  x: Lucide.X,
  menu: Lucide.Menu,
  previous: Lucide.ChevronLeft,
  next: Lucide.ChevronRight,
  expand: Lucide.ChevronDown,
  collapse: Lucide.ChevronUp,
  check: Lucide.Check,
  checkIcon: Lucide.Check,
  indeterminate: Lucide.Minus,
  chevronDown: Lucide.ChevronDown,
  chevronDownIcon: Lucide.ChevronDown,
  chevronLeft: Lucide.ChevronLeft,
  chevronLeftIcon: Lucide.ChevronLeft,
  chevronRight: Lucide.ChevronRight,
  chevronRightIcon: Lucide.ChevronRight,
  circle: Lucide.Circle,
  exclude: Lucide.Ban,
  grip: Lucide.GripVertical,
} as const

const statusIcons = {
  loading: Lucide.Loader2,
  success: Lucide.CircleCheck,
  info: Lucide.Info,
  error: Lucide.OctagonX,
} as const

const viewIcons = {
  search: Lucide.Search,
  clearFilters: Lucide.FilterX,
  filters: Lucide.SlidersHorizontal,
  sidebar: Lucide.PanelLeft,
  overflowMenu: Lucide.MoreHorizontal,
  scrollDown: Lucide.ArrowDown,
  columns: Lucide.Columns3,
  filterByValue: Lucide.Filter,
  sortable: Lucide.ArrowUpDown,
  sortAscending: Lucide.ArrowUp,
  sortDescending: Lucide.ArrowDown,
  fullWidth: Lucide.UnfoldHorizontal,
  readingWidth: Lucide.FoldHorizontal,
  zoomIn: Lucide.ZoomIn,
  zoomOut: Lucide.ZoomOut,
} as const

const communicationIcons = {
  help: Lucide.CircleHelp,
  conversation: Lucide.MessageCircle,
  reply: Lucide.MessageSquareReply,
} as const

const schedulingIcons = {
  calendar: Lucide.Calendar,
  schedule: Lucide.CalendarClock,
} as const

const themeIcons = {
  lightTheme: Lucide.Sun,
  darkTheme: Lucide.Moon,
  systemTheme: Lucide.Monitor,
} as const

const configIcons = {
  config: Lucide.Settings,
  appearance: Lucide.Palette,
} as const

/** The repeated sections of a documentation page (`docs/page/model/sections.ts`). */
const docSectionIcons = {
  where: Lucide.Compass,
  about: Lucide.BookOpen,
  config: Lucide.SlidersHorizontal,
  notes: Lucide.ClipboardList,
  fit: Lucide.Network,
  works: Lucide.Cog,
  parts: Lucide.FolderTree,
  extend: Lucide.Puzzle,
  pitfalls: Lucide.TriangleAlert,
  specs: Lucide.FileText,
  data: Lucide.Database,
} as const

export const iconRegistry = {
  navigation: navigationIcons,
  auth: authIcons,
  admin: adminIcons,
  entities: entityIcons,
  identity: identityIcons,
  security: securityIcons,
  actions: actionIcons,
  controls: controlIcons,
  status: statusIcons,
  views: viewIcons,
  communication: communicationIcons,
  scheduling: schedulingIcons,
  theme: themeIcons,
  config: configIcons,
  docSections: docSectionIcons,
} as const

export type IconGroup = keyof typeof iconRegistry
export type IconKey<G extends IconGroup> = keyof (typeof iconRegistry)[G]

export function getIcon<G extends IconGroup, K extends IconKey<G>>(
  group: G,
  key: K
): (typeof iconRegistry)[G][K] {
  return iconRegistry[group][key] as (typeof iconRegistry)[G][K]
}

/**
 * Plain-data reference to a registry icon (group + key strings, no component
 * value). Unlike the resolved component `getIcon` returns, this is safe to
 * store in data that crosses the Astro island boundary (e.g. `app-surfaces.ts`)
 * — resolve it back to the Lucide component with `resolveIconRef` inside a
 * React rendering module.
 *
 * Built as `{ [K in G]: { group: K; key: IconKey<K> } }[G]` rather than a
 * plain `{ group: G; key: IconKey<G> }` interface: `keyof` does not
 * distribute over a union the way index access does, so a naive interface
 * used at its default (bare `IconRef`, `G` = the full `IconGroup` union)
 * collapses `IconKey<G>` to the *intersection* of every group's keys —
 * `never`, since no key name is shared by all groups. The mapped-then-indexed
 * form distributes per-group first, producing the intended discriminated
 * union of every valid (group, key) pair.
 */
export type IconRef<G extends IconGroup = IconGroup> = {
  [K in G]: { group: K; key: IconKey<K> }
}[G]

/** Build a typed `IconRef` with the same group/key safety as `getIcon`. */
export function iconRef<G extends IconGroup, K extends IconKey<G>>(
  group: G,
  key: K
): IconRef<G> {
  return { group, key } as IconRef<G>
}

/** Resolve an `IconRef` produced by `iconRef` back to its Lucide component. */
export function resolveIconRef(
  ref: IconRef
): ComponentType<{ className?: string }> {
  const group = iconRegistry[ref.group] as Record<
    string,
    ComponentType<{ className?: string }>
  >
  return group[ref.key as string]
}
