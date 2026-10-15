import { dynamicIconImports } from "lucide-react/dynamic"
import type { ComponentType } from "react"

// The page header draws its `icono` on the server: each Lucide icon is its
// own module, loaded by name only for the page that uses it.

type IconComponent = ComponentType<{ className?: string }>

const loaders: ReadonlyMap<string, () => Promise<{ default: IconComponent }>> =
  new Map(Object.entries(dynamicIconImports))

/** The Lucide icon named `name`, `null` without a name or for an unknown one. */
export async function loadIcon(
  name: string | null
): Promise<IconComponent | null> {
  if (name === null) return null
  const load = loaders.get(name)
  if (load === undefined) return null
  const module = await load()
  return module.default
}
