import { createColumnHelper } from "@tanstack/react-table"
import { Text, textVariants } from "@/components/shared/brand/typography"
import type { DataTableFilterOption } from "@/components/shared/data-display/data-table-column-filter"
import { DATA_TABLE_EXPAND_COLUMN } from "@/components/shared/data-display/data-table-view"
import { StatusDot } from "@/components/shared/data-display/status-dot"
import type {
  ActivityLogEntry,
  LogMethod,
  LogStatusClass,
  LogType,
} from "@/features/admin/logs/model/types"
import { useAdminUser } from "@/hooks/use-admin-user"
import { columnLayoutOf, type DataTableFeatures } from "@/hooks/use-data-table"
import type { SortOrdering } from "@/hooks/use-sort-query-param"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

/** A log entry with the key its table row uses: entries carry no id, so
 *  the key is the timestamp plus the entry's position. */
export type ActivityLogRow = ActivityLogEntry & { rowKey: string }

/** `logs.query` orders by time only. */
export const LOG_SORT_KEYS = ["timestamp"] as const

export type LogSortKey = (typeof LOG_SORT_KEYS)[number]

export const LOG_DEFAULT_SORT: SortOrdering<LogSortKey> = {
  sort: "timestamp",
  order: "desc",
}

const typeLabel: Record<string, string> = {
  page_view: "Frontend",
  api_call: "Backend",
}

export const LOG_TYPE_OPTIONS: DataTableFilterOption[] = [
  { value: "page_view", label: "Frontend" },
  { value: "api_call", label: "Backend" },
]

const LOG_TYPES: readonly LogType[] = ["page_view", "api_call"]

const LOG_METHODS: readonly LogMethod[] = [
  "GET",
  "QUERY",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
]

export const LOG_METHOD_OPTIONS: DataTableFilterOption[] = LOG_METHODS.map(
  (method) => ({ value: method, label: method })
)

const LOG_STATUS_CLASSES: readonly LogStatusClass[] = [
  "2xx",
  "3xx",
  "4xx",
  "5xx",
]

export const LOG_STATUS_OPTIONS: DataTableFilterOption[] = [
  { value: "2xx", label: "2xx", detail: "Correcta" },
  { value: "3xx", label: "3xx", detail: "Redirección" },
  { value: "4xx", label: "4xx", detail: "Error del cliente" },
  { value: "5xx", label: "5xx", detail: "Error del servidor" },
]

/** The values kept in the URL that name a real value of `allowed`, in its
 *  order; unknown ones are dropped instead of emptying the list. */
function knownValuesOf<T extends string>(
  allowed: readonly T[],
  values: readonly string[]
): T[] {
  return allowed.filter((value) => values.includes(value))
}

export function logTypesOf(values: readonly string[]): LogType[] {
  return knownValuesOf(LOG_TYPES, values)
}

export function logMethodsOf(values: readonly string[]): LogMethod[] {
  return knownValuesOf(LOG_METHODS, values)
}

export function logStatusClassesOf(
  values: readonly string[]
): LogStatusClass[] {
  return knownValuesOf(LOG_STATUS_CLASSES, values)
}

function typeLabelOf(entry: ActivityLogEntry): string {
  if (!Object.hasOwn(typeLabel, entry.type)) return entry.type
  return typeLabel[entry.type]
}

export function isErrorEntry(entry: ActivityLogEntry): boolean {
  return entry.level === "error" || entry.level === "fatal"
}

export function logDateTime(entry: ActivityLogEntry): string {
  return formatDateTime(entry.timestamp, { includeSeconds: true })
}

function userLabel(
  user: { email?: string | null; name?: string | null } | null | undefined,
  userId: string
): string {
  if (user?.email) return user.email
  if (user?.name) return user.name
  return userId
}

/** The id to look up only when the entry carries no email of its own. */
function lookupIdOf(entry: Pick<ActivityLogEntry, "userId" | "email">) {
  if (entry.email) return null
  return entry.userId
}

/** The user an entry is attributed to, by the email logged with it, or by
 *  looking the user up for older lines that carry only the id. */
export function LogUser({
  entry,
}: {
  entry: Pick<ActivityLogEntry, "userId" | "email">
}) {
  const { data: user } = useAdminUser(lookupIdOf(entry))
  if (entry.email) return <span className="truncate">{entry.email}</span>
  if (!entry.userId) {
    return <span className="text-muted-foreground italic">Anónimo</span>
  }
  return <span className="truncate">{userLabel(user, entry.userId)}</span>
}

function LogRequest({ entry }: { entry: ActivityLogEntry }) {
  const dotTone = isErrorEntry(entry) ? "destructive" : "foreground"
  return (
    <span className="flex min-w-0 items-center gap-3">
      <StatusDot tone={dotTone} className="shrink-0" />
      <Text variant="data" className="min-w-0 truncate">
        {entry.path ?? entry.message}
      </Text>
    </span>
  )
}

function LogStatusCode({ entry }: { entry: ActivityLogEntry }) {
  const tone = isErrorEntry(entry)
    ? "text-destructive"
    : "text-muted-foreground"
  return (
    <span className={cn(textVariants({ role: "data" }), tone)}>
      {entry.statusCode ?? "—"}
    </span>
  )
}

const helper = createColumnHelper<DataTableFeatures, ActivityLogRow>()

export const logColumns = helper.columns([
  helper.accessor((entry) => entry.path ?? entry.message, {
    id: "request",
    header: "Petición",
    size: 360,
    minSize: 200,
    meta: { label: "Petición", reorderable: false, compact: "primary" },
    cell: (info) => <LogRequest entry={info.row.original} />,
  }),
  helper.accessor((entry) => entry.userId, {
    id: "user",
    header: "Usuario",
    size: 200,
    meta: { label: "Usuario", reorderable: true },
    cell: (info) => (
      <Text variant="compact" tone="muted" className="block truncate">
        <LogUser entry={info.row.original} />
      </Text>
    ),
  }),
  helper.accessor((entry) => entry.method, {
    id: "method",
    header: "Método",
    size: 100,
    meta: { label: "Método", reorderable: true },
    cell: (info) => (
      <Text variant="data" tone="muted">
        {info.getValue() ?? "—"}
      </Text>
    ),
  }),
  helper.accessor(typeLabelOf, {
    id: "type",
    header: "Tipo",
    size: 110,
    meta: { label: "Tipo", reorderable: true },
    cell: (info) => (
      <Text variant="status" tone="muted">
        {info.getValue()}
      </Text>
    ),
  }),
  helper.accessor((entry) => entry.statusCode, {
    id: "statusCode",
    header: "Estado",
    size: 90,
    meta: {
      label: "Estado",
      reorderable: true,
      cellClassName: "text-right",
      headerClassName: "text-right",
    },
    cell: (info) => <LogStatusCode entry={info.row.original} />,
  }),
  helper.accessor((entry) => entry.timestamp, {
    id: "timestamp",
    header: "Fecha",
    size: 190,
    enableSorting: true,
    meta: { label: "Fecha", reorderable: true },
    cell: (info) => (
      <Text variant="data" tone="muted" className="whitespace-nowrap">
        {logDateTime(info.row.original)}
      </Text>
    ),
  }),
  helper.display({
    id: DATA_TABLE_EXPAND_COLUMN,
    header: () => <span className="sr-only">Detalle</span>,
    size: 48,
    enableResizing: false,
    meta: { label: "Detalle", reorderable: false },
  }),
])

export const logColumnLayout = columnLayoutOf(logColumns)
