import type { ImageMetadata } from "astro"
import agents from "@/assets/screenshots/agents.webp"
import agentsDark from "@/assets/screenshots/agents-dark.webp"
import catalog from "@/assets/screenshots/catalog.webp"
import catalogDark from "@/assets/screenshots/catalog-dark.webp"
import diagram from "@/assets/screenshots/diagram.webp"
import diagramDark from "@/assets/screenshots/diagram-dark.webp"
import home from "@/assets/screenshots/home.webp"
import homeDark from "@/assets/screenshots/home-dark.webp"
import repositories from "@/assets/screenshots/repositories.webp"
import repositoriesDark from "@/assets/screenshots/repositories-dark.webp"
import search from "@/assets/screenshots/search.webp"
import searchDark from "@/assets/screenshots/search-dark.webp"
import type { TourStopId } from "@/i18n/ui"

// Captures of the running app reading the doc-example repository. Astro
// resizes them to WebP at build time. Every screen comes in both themes:
// `<name>.webp` and `<name>-dark.webp`.

export interface Screen {
  id: "dashboard" | TourStopId
  route: string
  image: ImageMetadata
  /** The same screen in the dark theme. */
  dark: ImageMetadata
}

export const dashboard: Screen = {
  id: "dashboard",
  route: "/doc-example",
  image: home,
  dark: homeDark,
}

export const tourScreens: (Screen & { id: TourStopId })[] = [
  {
    id: "diagrams",
    route: "/doc-example/diagrams/graphs",
    image: diagram,
    dark: diagramDark,
  },
  {
    id: "catalog",
    route: "/doc-example/catalog/diagram-types",
    image: catalog,
    dark: catalogDark,
  },
  {
    id: "search",
    route: "/doc-example/pages",
    image: search,
    dark: searchDark,
  },
  { id: "agents", route: "/me/skills", image: agents, dark: agentsDark },
  {
    id: "repositories",
    route: "/admin/content",
    image: repositories,
    dark: repositoriesDark,
  },
]

// The widest step serves the full-screen viewer on large and dense displays.
export const screenWidths = [720, 1200, 1800, 2400]
