import { Text } from "@/components/shared/brand/typography"
import { JsonView } from "@/components/shared/data-display/json-view"
import { MetadataDefinitionList } from "@/components/shared/data-display/metadata-cell"
import {
  type TraceSpan,
  traceServiceLabel,
} from "@/features/admin/traces/shared"
import { formatDurationMs } from "@/lib/format"

const kindLabel: Record<TraceSpan["kind"], string> = {
  unspecified: "Sin tipo",
  internal: "Interno",
  server: "Servidor",
  client: "Cliente",
  producer: "Productor",
  consumer: "Consumidor",
}

const statusLabel: Record<TraceSpan["status"], string> = {
  unset: "Sin estado",
  ok: "Correcto",
  error: "Error",
}

/** The selected span: where it sits in the trace, its status, attributes
 *  (`db.query.text`, `http.route`...) and events (recorded exceptions). */
export function TraceSpanDetail({ span }: { span: TraceSpan }) {
  return (
    <section
      aria-label={`Detalle del span ${span.name}`}
      className="flex flex-col gap-4"
    >
      <Text as="h2" variant="title" className="break-all">
        {span.name}
      </Text>
      {/* Short values: two per row even in a phone-wide sheet. */}
      <MetadataDefinitionList
        columns={5}
        className="grid-cols-2"
        context={span}
        fields={[
          {
            key: "service",
            label: "Servicio",
            value: (current) => traceServiceLabel(current.service),
          },
          {
            key: "kind",
            label: "Tipo",
            value: (current) => kindLabel[current.kind],
          },
          {
            key: "start",
            label: "Empieza en",
            value: (current) => (
              <span className="tabular-nums">
                {formatDurationMs(current.offsetMs)}
              </span>
            ),
          },
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
            key: "status",
            label: "Estado",
            // Its message can be long: the whole row while there are two.
            className: "col-span-2 @xl:col-span-1",
            tone: (current) => {
              if (current.status === "error") return "destructive"
              return "default"
            },
            value: (current) => {
              if (current.statusMessage === null) {
                return statusLabel[current.status]
              }
              return `${statusLabel[current.status]}: ${current.statusMessage}`
            },
          },
        ]}
      />
      <div className="flex flex-col gap-2">
        <Text variant="label" tone="muted">
          Atributos
        </Text>
        <JsonView
          value={span.attributes}
          className="overflow-x-auto rounded-md border-0 bg-muted/40"
        />
      </div>
      {span.events.length > 0 ? (
        <div className="flex flex-col gap-2">
          <Text variant="label" tone="muted">
            Eventos
          </Text>
          <ul className="flex flex-col gap-3">
            {span.events.map((event, index) => (
              <li
                key={`${event.name}-${index}`}
                className="flex flex-col gap-1"
              >
                <Text variant="data">
                  {event.name} · {formatDurationMs(event.offsetMs)}
                </Text>
                <JsonView
                  value={event.attributes}
                  className="overflow-x-auto rounded-md border-0 bg-muted/40"
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
