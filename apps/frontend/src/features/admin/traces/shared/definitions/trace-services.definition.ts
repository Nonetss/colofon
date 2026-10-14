import type { DataTableFilterOption } from "@/components/shared/data-display/data-table-column-filter"
import type { TraceService } from "@/features/admin/traces/shared/model/types"

interface ServiceMeta {
  label: string
  /** Bar color in the waterfall: a categorical `--chart-*` token. */
  barClassName: string
}

/** Our two services, plus the database: `traces.get` puts a query span
 *  under it, and the search tells which traces queried it. */
const serviceMeta: Record<TraceService, ServiceMeta> = {
  "stack-frontend": { label: "Frontend", barClassName: "bg-chart-2" },
  "stack-backend": { label: "Backend", barClassName: "bg-chart-1" },
  postgresql: { label: "PostgreSQL", barClassName: "bg-chart-6" },
}

export const TRACE_SERVICES: readonly TraceService[] = [
  "stack-frontend",
  "stack-backend",
  "postgresql",
]

export const TRACE_SERVICE_OPTIONS: DataTableFilterOption[] =
  TRACE_SERVICES.map((service) => ({
    value: service,
    label: serviceMeta[service].label,
    detail: service,
  }))

function isTraceService(service: string): service is TraceService {
  return Object.hasOwn(serviceMeta, service)
}

function metaOf(service: string): ServiceMeta | undefined {
  if (isTraceService(service)) return serviceMeta[service]
  return undefined
}

/** "Backend", "Frontend", "PostgreSQL"; anything else as Tempo named it. */
export function traceServiceLabel(service: string): string {
  const meta = metaOf(service)
  if (meta === undefined) return service
  return meta.label
}

/** Bar color of a span's service; a spare palette slot otherwise. */
export function traceServiceBarClass(service: string): string {
  const meta = metaOf(service)
  if (meta === undefined) return "bg-chart-5"
  return meta.barClassName
}

/** The services kept in the URL that name a real one; unknown ones are
 *  dropped instead of emptying the list. */
export function traceServicesOf(values: readonly string[]): TraceService[] {
  return TRACE_SERVICES.filter((service) => values.includes(service))
}

/** Every service a trace touched, as labels in one line. */
export function traceServicesLabel(services: readonly string[]): string {
  return services.map(traceServiceLabel).join(" · ")
}
