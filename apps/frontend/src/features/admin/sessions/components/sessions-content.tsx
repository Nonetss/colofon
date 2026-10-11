import { getIcon } from "@/lib/icon-registry"

const History = getIcon("admin", "sessions")
const UserX = getIcon("identity", "userX")

import { useMemo, useState } from "react"
import { Text, textVariants } from "@/components/shared/brand/typography"
import type { DataTableFilter } from "@/components/shared/data-display/data-table-column-filter"
import { DataTableView } from "@/components/shared/data-display/data-table-view"
import { FilteredEmpty } from "@/components/shared/data-display/filtered-empty"
import { InfiniteScrollSentinel } from "@/components/shared/data-display/infinite-scroll-sentinel"
import { MetadataDefinitionList } from "@/components/shared/data-display/metadata-cell"
import { HeroCount } from "@/components/shared/layout/page-hero"
import { ResourceOverview } from "@/components/shared/resource/resource-overview"
import {
  isActiveSession,
  SESSION_ACTIONS_COLUMN,
  SESSION_DEFAULT_SORT,
  SESSION_SORT_KEYS,
  SESSION_STATUS_OPTIONS,
  sessionColumnLayout,
  sessionColumns,
  sessionStatusesOf,
} from "@/features/admin/sessions/definitions/session-columns.definition"
import { useSessionHistory } from "@/features/admin/sessions/hooks/use-session-history"
import type { SessionRecord } from "@/features/admin/sessions/model/types"
import { useUserFilterOptions } from "@/features/admin/shared"
import { useAdminUserSearch } from "@/hooks/use-admin-user-search"
import { useColumnPreferences } from "@/hooks/use-column-preferences"
import { columnPreferenceProps, useDataTable } from "@/hooks/use-data-table"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import {
  NO_VALUES,
  useQueryParam,
  valueListCodec,
} from "@/hooks/use-query-param"
import { useSortQueryParam } from "@/hooks/use-sort-query-param"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

/** A session row's expanded detail: every technical field, as the row's
 *  "Ver información técnica" disclosure showed them. */
function SessionDetail({ session }: { session: SessionRecord }) {
  const isActive = isActiveSession(session)
  const expiryTone = isActive ? "text-muted-foreground" : "text-foreground"
  return (
    <div className="@container">
      <MetadataDefinitionList
        columns={3}
        bordered={false}
        className="gap-x-5 gap-y-3 py-0"
        context={{ session }}
        fields={[
          {
            key: "userAgent",
            label: "User-agent",
            className: "@xl:col-span-3",
            value: ({ session }) => (
              <Text
                variant="data"
                tone="muted"
                className="break-all leading-relaxed"
              >
                {session.userAgent ?? "No registrado"}
              </Text>
            ),
          },
          {
            key: "sessionId",
            label: "ID de sesión",
            value: ({ session }) => (
              <Text variant="data" tone="muted" className="break-all">
                {session.id}
              </Text>
            ),
          },
          {
            key: "userId",
            label: "ID de usuario",
            value: ({ session }) => (
              <Text variant="data" tone="muted" className="break-all">
                {session.userId}
              </Text>
            ),
          },
          {
            key: "updatedAt",
            label: "Actualizada",
            value: ({ session }) => (
              <Text variant="data" tone="muted">
                {formatDateTime(session.updatedAt, { includeYear: true })}
              </Text>
            ),
          },
          {
            key: "expiresAt",
            label: "Caduca",
            value: ({ session }) => (
              <span className={cn(textVariants({ role: "data" }), expiryTone)}>
                {formatDateTime(session.expiresAt, { includeYear: true })}
              </span>
            ),
          },
          {
            key: "activeOrg",
            label: "Organización activa",
            value: ({ session }) => (
              <Text variant="data" tone="muted" className="break-all">
                {session.activeOrganizationId ?? "Ninguna"}
              </Text>
            ),
          },
          {
            key: "activeTeam",
            label: "Equipo activo",
            value: ({ session }) => (
              <Text variant="data" tone="muted" className="break-all">
                {session.activeTeamId ?? "Ninguno"}
              </Text>
            ),
          },
        ]}
      />
    </div>
  )
}

export function SessionsContent() {
  const [sorting, setSorting, ordering] = useSortQueryParam(
    SESSION_SORT_KEYS,
    SESSION_DEFAULT_SORT
  )
  const [statusParam, setStatusParam] = useQueryParam(
    "status",
    NO_VALUES,
    valueListCodec
  )
  const [userParam, setUserParam] = useQueryParam(
    "user",
    NO_VALUES,
    valueListCodec
  )
  // Unknown `?status=` values are dropped instead of emptying the list.
  const statuses = sessionStatusesOf(statusParam)
  const {
    sessions,
    total,
    isPending,
    isError,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useSessionHistory(ordering, { statuses, userIds: userParam })
  const preferences = useColumnPreferences(
    "admin-sessions",
    sessionColumnLayout
  )
  const table = useDataTable({
    data: sessions,
    columns: sessionColumns,
    getRowId: (session) => session.id,
    sorting,
    onSortingChange: setSorting,
    ...columnPreferenceProps(preferences),
  })

  const [userQuery, setUserQuery] = useState("")
  const userSearch = useAdminUserSearch(userQuery)
  const sessionUsers = useMemo(
    () => sessions.map((session) => session.user),
    [sessions]
  )
  const userOptions = useUserFilterOptions({
    selected: userParam,
    seen: sessionUsers,
    results: userSearch.results,
  })

  const filtered = statuses.length > 0 || userParam.length > 0
  const clearFilters = () => {
    setStatusParam(NO_VALUES)
    setUserParam(NO_VALUES)
  }
  // An empty list is "every value": store the shared constant so the param
  // drops out of the URL.
  const valuesSetter =
    (set: (values: readonly string[]) => void) => (next: string[]) => {
      if (next.length === 0) {
        set(NO_VALUES)
        return
      }
      set(next)
    }
  const filters: Partial<Record<string, DataTableFilter>> = {
    status: {
      options: SESSION_STATUS_OPTIONS,
      selected: statuses,
      onChange: valuesSetter(setStatusParam),
    },
    user: {
      options: userOptions,
      selected: userParam,
      onChange: valuesSetter(setUserParam),
      search: {
        query: userQuery,
        onQueryChange: setUserQuery,
        isLoading: userSearch.isFetching,
        hint: "Escribe al menos 2 letras del nombre o el email",
      },
    },
  }

  const [scrollContainer, setScrollContainer] = useState<HTMLDivElement | null>(
    null
  )
  const sentinelRef = useInfiniteScroll(
    scrollContainer,
    fetchNextPage,
    hasNextPage && !isFetchingNextPage
  )

  return (
    <ResourceOverview
      maxWidth="80%"
      surface="admin-sessions"
      description="Historial de accesos registrado por la aplicación."
      heroMeta={<HeroCount segments={[{ count: total, label: "registros" }]} />}
      query={{ data: sessions, isPending, isError, refetch }}
      loading="Cargando historial de sesiones..."
      error={{
        icon: <UserX className="size-6" />,
        title: "No se pudo cargar el historial de sesiones",
        description:
          "Comprueba tu conexión y que tu sesión tenga permisos de administración.",
      }}
      isEmpty={(data) => data.length === 0 && !filtered}
      empty={{
        icon: <History className="size-6" />,
        title: "No hay sesiones registradas",
        description: "El historial aparecerá aquí cuando se inicie una sesión.",
      }}
    >
      {() => (
        <div className="flex min-h-0 flex-1 flex-col">
          <DataTableView
            table={table}
            label="Sesiones"
            idPrefix="admin-sessions"
            onResetColumns={preferences.reset}
            scrollRef={setScrollContainer}
            filters={filters}
            emptyMessage={
              <FilteredEmpty
                message="Ninguna sesión coincide con los filtros."
                onClear={clearFilters}
              />
            }
            renderDetail={(session) => <SessionDetail session={session} />}
            renderControl={(_session, columnId, expandToggle) => {
              if (columnId !== SESSION_ACTIONS_COLUMN) return null
              return (
                <span className="inline-flex size-8 items-center justify-center">
                  {expandToggle}
                </span>
              )
            }}
            detailLabel={(session) =>
              `Ver información técnica de la sesión de ${session.user.name}`
            }
            footer={
              <InfiniteScrollSentinel
                sentinelRef={sentinelRef}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
              />
            }
          />
        </div>
      )}
    </ResourceOverview>
  )
}
