import type { DataTableFilterOption } from "@/components/shared/data-display/data-table-column-filter"
import type { TraceService } from "@/features/admin/traces/shared/model/types"

interface ServiceMeta {
  label: string
  /** Bar color in the waterfall: a categorical `--chart-*` token. */
  barClassName: string
}

const serviceMeta: Record<TraceService, ServiceMeta> = {
  "stack-frontend": { label: "Frontend", barClassName: "bg-chart-2" },
  "stack-backend": { label: "Backend", barClassName: "bg-chart-1" },
}

export const TRACE_SERVICES: readonly TraceService[] = [
  "stack-frontend",
  "stack-backend",
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

/** "Backend"/"Frontend" for our services; anything else as Tempo named it. */
export function traceServiceLabel(service: string): string {
  if (!isTraceService(service)) return service
  return serviceMeta[service].label
}

/** Bar color of a span from `service`; the last palette slot otherwise. */
export function traceServiceBarClass(service: string): string {
  if (!isTraceService(service)) return "bg-chart-6"
  return serviceMeta[service].barClassName
}

/** The services kept in the URL that name a real one; unknown ones are
 *  dropped instead of emptying the list. */
export function traceServicesOf(values: readonly string[]): TraceService[] {
  return TRACE_SERVICES.filter((service) => values.includes(service))
}
