import { z } from "zod"

import { errors } from "#errors"

/**
 * Tempo's HTTP API, as the trace viewer reads it: `GET /api/search` (TraceQL),
 * `GET /api/v2/search/tag/<tag>/values` and `GET /api/v2/traces/<id>` (OTLP
 * JSON). Every response is validated
 * before use; a body that doesn't match is a `BAD_GATEWAY`, like an
 * unreachable Tempo. Shapes checked against `grafana/tempo:3.1.0`.
 */

export interface OtlpAnyValue {
  stringValue?: string
  boolValue?: boolean
  /** int64, sent as a decimal string by the JSON mapping. */
  intValue?: string | number
  doubleValue?: number
  bytesValue?: string
  arrayValue?: { values?: OtlpAnyValue[] }
  kvlistValue?: { values?: OtlpKeyValue[] }
}

export interface OtlpKeyValue {
  key: string
  value?: OtlpAnyValue
}

const anyValue: z.ZodType<OtlpAnyValue> = z.lazy(() =>
  z.object({
    stringValue: z.string().optional(),
    boolValue: z.boolean().optional(),
    intValue: z.union([z.string(), z.number()]).optional(),
    doubleValue: z.number().optional(),
    bytesValue: z.string().optional(),
    arrayValue: z.object({ values: z.array(anyValue).optional() }).optional(),
    kvlistValue: z.object({ values: z.array(keyValue).optional() }).optional(),
  })
)

const keyValue: z.ZodType<OtlpKeyValue> = z.lazy(() =>
  z.object({ key: z.string(), value: anyValue.optional() })
)

const otlpSpan = z.object({
  /** Base64 in Tempo's v2 JSON (proto3 mapping); hex is accepted too. */
  spanId: z.string(),
  parentSpanId: z.string().optional(),
  name: z.string(),
  kind: z.string().optional(),
  startTimeUnixNano: z.string(),
  endTimeUnixNano: z.string(),
  attributes: z.array(keyValue).optional(),
  events: z
    .array(
      z.object({
        timeUnixNano: z.string(),
        name: z.string(),
        attributes: z.array(keyValue).optional(),
      })
    )
    .optional(),
  status: z
    .object({ code: z.string().optional(), message: z.string().optional() })
    .optional(),
})

export type OtlpSpan = z.infer<typeof otlpSpan>

const traceByIdResponse = z.object({
  trace: z
    .object({
      resourceSpans: z
        .array(
          z.object({
            resource: z
              .object({ attributes: z.array(keyValue).optional() })
              .optional(),
            scopeSpans: z
              .array(z.object({ spans: z.array(otlpSpan).optional() }))
              .optional(),
          })
        )
        .optional(),
    })
    .optional(),
})

const searchResponse = z.object({
  traces: z
    .array(
      z.object({
        /** Hex, with leading zeros sometimes trimmed. */
        traceID: z.string(),
        rootServiceName: z.string().optional(),
        rootTraceName: z.string().optional(),
        startTimeUnixNano: z.string(),
        /** Omitted for traces shorter than a millisecond. */
        durationMs: z.number().optional(),
        serviceStats: z
          .record(z.string(), z.object({ errorCount: z.number().optional() }))
          .optional(),
      })
    )
    .optional(),
})

// Tempo serializes like protobuf's JSON mapping, which leaves empty fields
// out: the empty value of a trace whose root span hasn't arrived comes as
// `{ "type": "string" }`, and no values at all may come as `null`.
const tagValuesResponse = z.object({
  tagValues: z
    .array(
      z.object({ type: z.string().optional(), value: z.string().default("") })
    )
    .nullish(),
})

export type TempoSearchTrace = NonNullable<
  z.infer<typeof searchResponse>["traces"]
>[number]

/** A span with the `service.name` of the resource that emitted it. */
export interface ServiceSpan {
  span: OtlpSpan
  service: string
}

async function fetchTempo(tempoUrl: string, url: URL): Promise<Response> {
  try {
    return await fetch(url)
  } catch {
    throw errors.BAD_GATEWAY({
      message: `No se pudo contactar con Tempo en ${tempoUrl}`,
    })
  }
}

async function parseBody<T>(response: Response, schema: z.ZodType<T>) {
  const body: unknown = await response.json().catch(() => undefined)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw errors.BAD_GATEWAY({
      message: "Tempo devolvió una respuesta inesperada",
    })
  }
  return parsed.data
}

function assertOk(response: Response) {
  if (!response.ok) {
    throw errors.BAD_GATEWAY({
      message: `Tempo respondió ${response.status} a la consulta`,
    })
  }
}

export async function searchTempo(
  tempoUrl: string,
  params: { query: string; start: number; end: number; limit: number }
): Promise<TempoSearchTrace[]> {
  const url = new URL("/api/search", tempoUrl)
  url.searchParams.set("q", params.query)
  url.searchParams.set("start", String(params.start))
  url.searchParams.set("end", String(params.end))
  url.searchParams.set("limit", String(params.limit))

  const response = await fetchTempo(tempoUrl, url)
  assertOk(response)
  const body = await parseBody(response, searchResponse)
  return body.traces ?? []
}

/** The distinct values `tag` (a TraceQL identifier) took in the window,
 *  in the traces matching `query` (TraceQL) when it is given. */
export async function fetchTagValues(
  tempoUrl: string,
  tag: string,
  params: { start: number; end: number; limit: number; query?: string }
): Promise<string[]> {
  const url = new URL(`/api/v2/search/tag/${tag}/values`, tempoUrl)
  url.searchParams.set("start", String(params.start))
  url.searchParams.set("end", String(params.end))
  url.searchParams.set("limit", String(params.limit))
  if (params.query !== undefined) url.searchParams.set("q", params.query)

  const response = await fetchTempo(tempoUrl, url)
  assertOk(response)
  const body = await parseBody(response, tagValuesResponse)
  return (body.tagValues ?? []).map((tagValue) => tagValue.value)
}

function resourceService(attributes: OtlpKeyValue[] | undefined): string {
  const service = attributes?.find((attribute) => {
    return attribute.key === "service.name"
  })
  return service?.value?.stringValue ?? ""
}

/**
 * Every span of the trace with its service, or `null` when Tempo has no
 * such trace. Tempo 3 answers an unknown id with `200 {"trace":{}}`; older
 * versions with `404`. Both mean not found.
 */
export async function fetchTrace(
  tempoUrl: string,
  traceId: string
): Promise<ServiceSpan[] | null> {
  const url = new URL(`/api/v2/traces/${traceId}`, tempoUrl)
  const response = await fetchTempo(tempoUrl, url)
  if (response.status === 404) return null
  assertOk(response)
  const body = await parseBody(response, traceByIdResponse)

  const spans: ServiceSpan[] = []
  for (const resourceSpans of body.trace?.resourceSpans ?? []) {
    const service = resourceService(resourceSpans.resource?.attributes)
    for (const scopeSpans of resourceSpans.scopeSpans ?? []) {
      for (const span of scopeSpans.spans ?? []) spans.push({ span, service })
    }
  }
  if (spans.length === 0) return null
  return spans
}
