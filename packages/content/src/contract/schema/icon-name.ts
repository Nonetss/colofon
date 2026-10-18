import { z } from "zod"
import { LUCIDE_ICON_NAMES } from "#contract/lucide-icons.generated"

// Every `icon` of a content repository (page headers, `_type.yaml`,
// `menu.yaml`, diagram nodes) names a Lucide icon the reader can draw. The
// list is generated from the web's lucide-react (`bun run icons:catalog`).

export { LUCIDE_ICON_NAMES }

/** A Lucide icon name, listed in full in the editor schemas. */
export const iconName = z
  .enum(LUCIDE_ICON_NAMES, {
    error: (issue) =>
      `\`${String(issue.input)}\` no es un nombre de icono de Lucide (server, map-pin, network…)`,
  })
  .meta({ description: "Icono de Lucide (server, map-pin, network…)" })
