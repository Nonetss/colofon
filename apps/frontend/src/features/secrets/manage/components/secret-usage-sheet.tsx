import { useState } from "react"
import { Text } from "@/components/shared/brand/typography"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useSecretUsage } from "@/features/secrets/manage/hooks/use-secrets"
import type {
  SecretListItem,
  SecretUsageEntry,
} from "@/features/secrets/manage/model/types"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { formatDateTime, formatDurationMs } from "@/lib/format"

const OUTCOME_LABELS = {
  sent: "Enviada",
  refused: "Rechazada",
  failed: "Fallida",
} satisfies Record<SecretUsageEntry["outcome"], string>

function resultLabel(entry: SecretUsageEntry): string {
  if (entry.status !== null)
    return `${OUTCOME_LABELS[entry.outcome]} · ${entry.status}`
  return OUTCOME_LABELS[entry.outcome]
}

function timing(entry: SecretUsageEntry): string {
  const when = formatDateTime(entry.createdAt)
  if (entry.durationMs === null) return when
  return `${when} · ${formatDurationMs(entry.durationMs)}`
}

function callerLabel(entry: SecretUsageEntry): string {
  if (entry.user === null) return "Usuario eliminado"
  return `Por ${entry.user.name}`
}

function originLabel(entry: SecretUsageEntry): string {
  if (entry.apiKeyId === null) return "Sesión web"
  return "API key"
}

function UsageRow({ entry }: { entry: SecretUsageEntry }) {
  const tone = entry.outcome === "sent" ? "muted" : "destructive"
  return (
    <li className="flex flex-col gap-1 py-3">
      <Text variant="data" className="break-all">
        {entry.method} {entry.url}
      </Text>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        <Text variant="meta-sm" tone={tone}>
          {resultLabel(entry)}
        </Text>
        <Text variant="meta-sm" tone="muted">
          {timing(entry)}
        </Text>
        <Text variant="meta-sm" tone="muted">
          {callerLabel(entry)}
        </Text>
        <Text variant="meta-sm" tone="muted">
          {originLabel(entry)}
        </Text>
      </div>
      {entry.detail !== null && (
        <Text as="p" variant="meta-sm" tone="muted" className="wrap-break-word">
          {entry.detail}
        </Text>
      )}
    </li>
  )
}

function UsageList({ secretId }: { secretId: string | null }) {
  const usage = useSecretUsage(secretId)
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null)
  const entries = usage.data?.pages.flatMap((page) => page.entries) ?? []
  const loadMore = () => {
    if (usage.hasNextPage && !usage.isFetchingNextPage) {
      void usage.fetchNextPage()
    }
  }
  const sentinelRef = useInfiniteScroll(
    scroller,
    loadMore,
    usage.hasNextPage === true
  )

  if (usage.isPending) {
    return (
      <Text as="p" variant="compact" tone="muted">
        Cargando el uso...
      </Text>
    )
  }
  if (usage.isError) {
    return (
      <Text as="p" variant="compact" tone="destructive">
        No se pudo cargar el uso.
      </Text>
    )
  }
  if (entries.length === 0) {
    return (
      <Text as="p" variant="compact" tone="muted">
        Ningún agente lo ha usado todavía.
      </Text>
    )
  }
  return (
    <div ref={setScroller} className="min-h-0 flex-1 overflow-y-auto">
      <ul className="divide-y">
        {entries.map((entry) => (
          <UsageRow key={entry.id} entry={entry} />
        ))}
      </ul>
      <div ref={sentinelRef} />
    </div>
  )
}

/** A secret's recent calls through the MCP, newest first. */
export function SecretUsageSheet({
  open,
  onOpenChange,
  secret,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  secret: SecretListItem | null
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Uso de {secret?.name}</SheetTitle>
          <SheetDescription>
            Las peticiones de los agentes con este secreto en los últimos 90
            días, también las de los miembros de las organizaciones con las que
            lo compartes. Sin cabeceras, cuerpos ni valores.
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
          <UsageList secretId={secret?.id ?? null} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
