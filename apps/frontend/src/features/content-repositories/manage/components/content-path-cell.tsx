import { Text } from "@/components/shared/brand/typography"
import { MetadataCell } from "@/components/shared/data-display/metadata-cell"

/** The folder a repository's content is read from; nothing for the root. */
export function ContentPathCell({ path }: { path: string }) {
  if (path === "") return null
  return (
    <MetadataCell as="dl" label="Carpeta del contenido">
      <Text variant="data" className="block truncate">
        {path}
      </Text>
    </MetadataCell>
  )
}
