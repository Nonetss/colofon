import type { client } from "@/lib/orpc"

type SearchInput = NonNullable<Parameters<typeof client.v1.traces.search>[0]>

export type TraceSummary = Awaited<
  ReturnType<typeof client.v1.traces.search>
>["traces"][number]

export type TraceDetail = Awaited<ReturnType<typeof client.v1.traces.get>>

export type TraceSpan = TraceDetail["spans"][number]

/** What a trace can touch: our two services and the database. */
export type TraceService = NonNullable<SearchInput["services"]>[number]
