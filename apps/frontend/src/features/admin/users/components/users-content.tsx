import { getIcon } from "@/lib/icon-registry"

const Plus = getIcon("actions", "add")
const UsersIcon = getIcon("admin", "users")
const UserX = getIcon("identity", "userX")

import { useCallback, useState } from "react"
import type { DataTableFilter } from "@/components/shared/data-display/data-table-column-filter"
import { DataTableView } from "@/components/shared/data-display/data-table-view"
import { FilteredEmpty } from "@/components/shared/data-display/filtered-empty"
import { InfiniteScrollSentinel } from "@/components/shared/data-display/infinite-scroll-sentinel"
import { RowActions } from "@/components/shared/data-display/row-action-items"
import { HeroCount } from "@/components/shared/layout/page-hero"
import { ResourceOverview } from "@/components/shared/resource/resource-overview"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useUserFilterOptions } from "@/features/admin/shared"
import { BanUserDialog } from "@/features/admin/users/components/ban-user-dialog"
import { ChangePasswordDialog } from "@/features/admin/users/components/change-password-dialog"
import { CreateUserDialog } from "@/features/admin/users/components/create-user-dialog"
import {
  USER_DEFAULT_SORT,
  USER_ROLE_OPTIONS,
  USER_SORT_KEYS,
  USER_STATUS_OPTIONS,
  type UsersRowContext,
  userActions,
  userColumnLayout,
  userColumns,
  userRolesOf,
  userStatusesOf,
} from "@/features/admin/users/definitions/user-columns.definition"
import { useUserMutations } from "@/features/admin/users/hooks/use-user-mutations"
import { useUsersList } from "@/features/admin/users/hooks/use-users-list"
import type { UserRow } from "@/features/admin/users/model/types"
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
import { useTargetConfirmDialog } from "@/hooks/use-target-confirm-dialog"
import { useTargetDialog } from "@/hooks/use-target-dialog"
import { authClient } from "@/lib/auth-client"
import { userDisplayName } from "@/lib/user-display"

function nextRole(user: UserRow): "user" | "admin" {
  if (user.role === "admin") return "user"
  return "admin"
}

function labelOf(user: UserRow | null): string | undefined {
  if (!user) return undefined
  return userDisplayName(user)
}

/** An empty list is "every value": store the shared constant so the param
 *  drops out of the URL. */
function valuesSetter(set: (values: readonly string[]) => void) {
  return (next: string[]) => {
    if (next.length === 0) {
      set(NO_VALUES)
      return
    }
    set(next)
  }
}

export function UsersContent() {
  const { data: session } = authClient.useSession()
  const currentUserId = session?.user.id

  const [sorting, setSorting, ordering] = useSortQueryParam(
    USER_SORT_KEYS,
    USER_DEFAULT_SORT
  )
  const [idParam, setIdParam] = useQueryParam("user", NO_VALUES, valueListCodec)
  const [roleParam, setRoleParam] = useQueryParam(
    "role",
    NO_VALUES,
    valueListCodec
  )
  const [statusParam, setStatusParam] = useQueryParam(
    "status",
    NO_VALUES,
    valueListCodec
  )
  // Unknown values in the URL are dropped instead of emptying the list.
  const roles = userRolesOf(roleParam)
  const statuses = userStatusesOf(statusParam)

  const {
    users,
    total,
    isPending,
    isError,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useUsersList(ordering, { ids: idParam, roles, statuses })
  const { unbanUser, removeUser, setRole } = useUserMutations()

  const [createOpen, setCreateOpen] = useState(false)
  const passwordDialog = useTargetDialog<UserRow>()
  const banDialog = useTargetDialog<UserRow>()

  const deleteDialog = useTargetConfirmDialog<UserRow>({
    title: "Eliminar usuario",
    description: (user) =>
      `Esta acción no se puede deshacer. Se eliminará la cuenta de ${userDisplayName(user)} (${user.email}).`,
    confirmLabel: "Eliminar",
    onConfirm: (user) => removeUser.mutateAsync({ userId: user.id }),
  })

  const handleToggleAdmin = useCallback(
    (user: UserRow) => {
      setRole.mutate({ userId: user.id, role: nextRole(user) })
    },
    [setRole.mutate]
  )
  const handleUnban = useCallback(
    (userId: string) => {
      unbanUser.mutate({ userId })
    },
    [unbanUser.mutate]
  )

  const rowContext: UsersRowContext = {
    currentUserId,
    onChangePassword: passwordDialog.open,
    onToggleAdmin: handleToggleAdmin,
    onUnban: handleUnban,
    onBan: banDialog.open,
    onDelete: deleteDialog.open,
  }

  const preferences = useColumnPreferences("admin-users", userColumnLayout)
  const table = useDataTable({
    data: users,
    columns: userColumns,
    getRowId: (user) => user.id,
    sorting,
    onSortingChange: setSorting,
    ...columnPreferenceProps(preferences),
  })

  const [userQuery, setUserQuery] = useState("")
  const userSearch = useAdminUserSearch(userQuery)
  const userOptions = useUserFilterOptions({
    selected: idParam,
    seen: users,
    results: userSearch.results,
  })

  const filtered = idParam.length > 0 || roles.length > 0 || statuses.length > 0
  const clearFilters = () => {
    setIdParam(NO_VALUES)
    setRoleParam(NO_VALUES)
    setStatusParam(NO_VALUES)
  }
  const filters: Partial<Record<string, DataTableFilter>> = {
    name: {
      options: userOptions,
      selected: idParam,
      onChange: valuesSetter(setIdParam),
      search: {
        query: userQuery,
        onQueryChange: setUserQuery,
        isLoading: userSearch.isFetching,
        hint: "Escribe al menos 2 letras del nombre o el email",
      },
    },
    role: {
      options: USER_ROLE_OPTIONS,
      selected: roles,
      onChange: valuesSetter(setRoleParam),
    },
    banned: {
      options: USER_STATUS_OPTIONS,
      selected: statuses,
      onChange: valuesSetter(setStatusParam),
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
    <>
      <ResourceOverview
        maxWidth="80%"
        surface="admin-users"
        description="Gestiona las cuentas de la aplicación."
        heroMeta={<HeroCount segments={[{ count: total, label: "total" }]} />}
        heroAction={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Nuevo usuario
          </Button>
        }
        query={{ data: users, isPending, isError, refetch }}
        loading="Cargando usuarios..."
        error={{
          icon: <UserX className="size-6" />,
          title: "No se pudo cargar la lista de usuarios",
          description:
            "Comprueba tu conexión y que tu sesión tenga permisos de administración.",
        }}
        isEmpty={(data) => data.length === 0 && !filtered}
        empty={{
          icon: <UsersIcon className="size-6" />,
          title: "No hay usuarios",
          description: "Todavía no se ha creado ningún usuario.",
        }}
      >
        {() => (
          <DataTableView
            table={table}
            label="Usuarios"
            idPrefix="admin-users"
            onResetColumns={preferences.reset}
            scrollRef={setScrollContainer}
            filters={filters}
            emptyMessage={
              <FilteredEmpty
                message="Ningún usuario coincide con los filtros."
                onClear={clearFilters}
              />
            }
            renderControl={(user) => (
              <RowActions
                actions={userActions}
                item={user}
                context={rowContext}
                accessibleLabel={userDisplayName(user)}
              />
            )}
            footer={
              <InfiniteScrollSentinel
                sentinelRef={sentinelRef}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
              />
            }
          />
        )}
      </ResourceOverview>

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />

      <ChangePasswordDialog
        userId={passwordDialog.target?.id ?? null}
        userLabel={labelOf(passwordDialog.target)}
        onOpenChange={passwordDialog.dialogProps.onOpenChange}
      />

      <BanUserDialog
        userId={banDialog.target?.id ?? null}
        userLabel={labelOf(banDialog.target)}
        onOpenChange={banDialog.dialogProps.onOpenChange}
      />

      <ConfirmDialog {...deleteDialog.confirmDialogProps} />
    </>
  )
}
