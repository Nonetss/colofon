import { getIcon } from "@/lib/icon-registry"

const ChartGantt = getIcon("admin", "traces")
const OctagonX = getIcon("status", "error")
const ScrollText = getIcon("admin", "logs")

import { useState } from "react"
import { Text } from "@/components/shared/brand/typography"
import { MetadataDefinitionList } from "@/components/shared/data-display/metadata-cell"
import { StatusTag } from "@/components/shared/data-display/status-dot"
import { StateCard } from "@/components/shared/feedback/state-card"
import { PageHero } from "@/components/shared/layout/page-hero"
import { AppLink } from "@/components/ui/app-link"
import { Button, buttonVariants } from "@/components/ui/button"
import { TraceSpanDetail } from "@/features/admin/traces/detail/components/trace-span-detail"
import { TraceWaterfall } from "@/features/admin/traces/detail/components/trace-waterfall"
import { useTrace } from "@/features/admin/traces/detail/hooks/use-trace"
import { traceErrorKind } from "@/features/admin/traces/detail/model/trace-layout"
import {
  type TraceDetail,
  type TraceSpan,
  traceServiceLabel,
} from "@/features/admin/traces/shared"
import { formatDateTime, formatDurationMs } from "@/lib/format"

function errorsLabel(count: number): string {
  if (count === 1) return "1 error"
  return `${count} errores`
}

/** The root span's name; the id while the root hasn't arrived. */
function traceTitle(trace: TraceDetail): string {
  const root = trace.spans[0]
  if (root === undefined) return trace.traceId
  return root.name
}

function traceDescription(trace: TraceDetail): string {
  const startedAt = formatDateTime(trace.startTime, {
    includeSeconds: true,
    includeYear: true,
  })
  const root = trace.spans[0]
  if (root === undefined) return startedAt
  return `${traceServiceLabel(root.service)} · ${startedAt}`
}

/** The span the page shows: the one picked, else the root. */
function selectedSpanOf(
  trace: TraceDetail,
  selectedSpanId: string | null
): TraceSpan | undefined {
  const picked = trace.spans.find((span) => span.spanId === selectedSpanId)
  if (picked) return picked
  return trace.spans[0]
}

function TraceError({
  error,
  onRetry,
}: {
  error: unknown
  onRetry: () => void
}) {
  const kind = traceErrorKind(error)
  if (kind === "not-found") {
    return (
      <StateCard
        icon={<ChartGantt className="size-6" />}
        title="Traza no encontrada"
        description="Puede que aún no haya llegado al almacén (tarda unos segundos), que no se muestreara o que ya haya caducado (se guardan 7 días)."
        action={
          <Button variant="outline" onClick={onRetry}>
            Reintentar
          </Button>
        }
      />
    )
  }
  if (kind === "unconfigured") {
    return (
      <StateCard
        icon={<ChartGantt className="size-6" />}
        title="El almacén de trazas no está configurado"
        description="Configura TEMPO_URL en el backend para consultar trazas."
      />
    )
  }
  return (
    <StateCard
      icon={<OctagonX className="size-6" />}
      title="No se pudo cargar la traza"
      description="Comprueba tu conexión y que Tempo esté disponible; después, vuelve a intentarlo."
      tone="destructive"
      action={
        <Button variant="outline" onClick={onRetry}>
          Reintentar
        </Button>
      }
    />
  )
}

export function TraceContent({ traceId }: { traceId: string }) {
  const { data: trace, isPending, isError, error, refetch } = useTrace(traceId)
  const [selectedSpanId, setSelectedSpanId] = useState<string | null>(null)

  if (isError) {
    return <TraceError error={error} onRetry={() => refetch()} />
  }
  if (isPending) {
    return <StateCard spinner title="Cargando traza..." />
  }

  const selected = selectedSpanOf(trace, selectedSpanId)

  return (
    <div className="flex flex-col gap-8">
      <PageHero
        surface="admin-trace"
        title={traceTitle(trace)}
        description={traceDescription(trace)}
        status={
          trace.errorCount > 0 ? (
            <StatusTag dotTone="destructive">
              {errorsLabel(trace.errorCount)}
            </StatusTag>
          ) : null
        }
        action={
          <AppLink
            href={`/admin/logs?trace=${traceId}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <ScrollText className="size-3.5" />
            Ver en el registro de actividad
          </AppLink>
        }
      />

      <MetadataDefinitionList
        columns={4}
        context={trace}
        fields={[
          {
            key: "duration",
            label: "Duración",
            value: (current) => (
              <span className="tabular-nums">
                {formatDurationMs(current.durationMs)}
              </span>
            ),
          },
          {
            key: "spans",
            label: "Spans",
            value: (current) => (
              <span className="tabular-nums">{current.spanCount}</span>
            ),
          },
          {
            key: "errors",
            label: "Errores",
            tone: (current) => {
              if (current.errorCount > 0) return "destructive"
              return "default"
            },
            value: (current) => (
              <span className="tabular-nums">{current.errorCount}</span>
            ),
          },
          {
            key: "traceId",
            label: "Id de traza",
            value: (current) => (
              <Text as="code" variant="data" className="break-all">
                {current.traceId}
              </Text>
            ),
          },
        ]}
      />

      {trace.truncated ? (
        <Text variant="compact" tone="muted">
          La traza tiene {trace.spanCount} spans; se muestran los primeros{" "}
          {trace.spans.length}.
        </Text>
      ) : null}

      <TraceWaterfall
        spans={trace.spans}
        durationMs={trace.durationMs}
        selectedSpanId={selected?.spanId ?? null}
        onSelect={setSelectedSpanId}
      />

      {selected ? <TraceSpanDetail span={selected} /> : null}
    </div>
  )
}
