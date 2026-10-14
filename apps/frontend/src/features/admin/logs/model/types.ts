import type { client } from "@/lib/orpc"

export type ActivityLogEntry = Awaited<
  ReturnType<typeof client.v1.logs.query>
>["entries"][number]

type LogsQueryInput = NonNullable<Parameters<typeof client.v1.logs.query>[0]>

export type LogType = NonNullable<LogsQueryInput["types"]>[number]

export type LogMethod = NonNullable<LogsQueryInput["methods"]>[number]

export type LogStatusClass = NonNullable<LogsQueryInput["statuses"]>[number]

export interface ActivityLogFilters {
  userIds: readonly string[]
  types: readonly LogType[]
  methods: readonly LogMethod[]
  statuses: readonly LogStatusClass[]
  /** Substring of the path, already debounced. */
  path: string
  /** Calendar day lower bound, interpreted as 00:00 local. */
  from: Date | undefined
  /** Calendar day upper bound, interpreted as 23:59:59.999 local (inclusive). */
  to: Date | undefined
  /** Only entries written inside this trace; `""` for any. */
  traceId: string
}
