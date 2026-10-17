import { Text } from "@/components/shared/brand/typography"
import { MetadataCell } from "@/components/shared/data-display/metadata-cell"
import {
  type StatusDotTone,
  StatusTag,
} from "@/components/shared/data-display/status-dot"
import {
  type LastSync,
  lastSyncOf,
  type SyncRecord,
} from "@/features/content-repositories/manage/model/last-sync"
import { formatDateTime } from "@/lib/format"

interface RepositorySyncStatusProps {
  repository: SyncRecord
  /** The repository lives on the platform, so it waits for its first push. */
  hosted?: boolean
  className?: string
}

function lastSyncTag(lastSync: LastSync): {
  tone: StatusDotTone
  label: string
} {
  if (lastSync.state === "never") {
    return { tone: "border", label: "Sin sincronizar" }
  }
  if (lastSync.state === "failed") {
    return { tone: "destructive", label: "Error al sincronizar" }
  }
  return { tone: "foreground", label: "Sincronizado" }
}

function lastSyncDetail(lastSync: LastSync, hosted: boolean): string {
  if (lastSync.state === "never" && hosted) {
    return "Se publica con el primer push"
  }
  if (lastSync.state === "never") return "Todavía no se ha descargado"
  const when = formatDateTime(lastSync.at)
  if (lastSync.state === "ok" && lastSync.commit !== null) {
    return `${when} · ${lastSync.commit}`
  }
  return when
}

/** How a repository's last sync went: a tag, and when and at which commit. */
export function RepositorySyncStatus({
  repository,
  hosted = false,
  className,
}: RepositorySyncStatusProps) {
  const lastSync = lastSyncOf(repository)
  const tag = lastSyncTag(lastSync)
  return (
    <MetadataCell as="dl" label="Última sincronización" className={className}>
      <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <StatusTag dotTone={tag.tone}>{tag.label}</StatusTag>
        <Text variant="compact" tone="muted" className="tabular-nums">
          {lastSyncDetail(lastSync, hosted)}
        </Text>
      </span>
    </MetadataCell>
  )
}

/** The git error of a failed last sync; nothing when it didn't fail. */
export function RepositorySyncError({
  repository,
}: {
  repository: SyncRecord
}) {
  const lastSync = lastSyncOf(repository)
  if (lastSync.state !== "failed") return null
  return (
    <Text
      as="p"
      variant="data"
      tone="destructive"
      className="mt-3 line-clamp-3 rounded-md bg-destructive/5 px-3 py-2 break-all"
    >
      {lastSync.error}
    </Text>
  )
}
