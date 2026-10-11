import { getIcon } from "@/lib/icon-registry"

const UsersRound = getIcon("admin", "teams")

import { useCallback, useDeferredValue, useMemo, useState } from "react"
import { Text } from "@/components/shared/brand/typography"
import { DataTableIdentityCell } from "@/components/shared/data-display/data-table-cell-content"
import { DataTableView } from "@/components/shared/data-display/data-table-view"
import { RowActions } from "@/components/shared/data-display/row-action-items"
import type { SuggestInputItem } from "@/components/shared/form/suggest-input"
import { HeroCount } from "@/components/shared/layout/page-hero"
import { FilterChips } from "@/components/shared/resource/filter-chips"
import {
  chipsFor,
  type ResourceFilterDescriptor,
  ResourceFilters,
} from "@/components/shared/resource/resource-filters"
import { ResourceOverview } from "@/components/shared/resource/resource-overview"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useOrganizationsList } from "@/features/admin/organizations/public"
import { TeamFormDialog } from "@/features/admin/teams/components/team-form-dialog"
import { TeamMembersSheet } from "@/features/admin/teams/components/team-members-sheet"
import {
  TEAM_DEFAULT_SORT,
  TEAM_NAME_COLUMN,
  TEAM_ORGANIZATION_COLUMN,
  TEAM_SORT_KEYS,
  type TeamsRowContext,
  teamActions,
  teamColumnLayout,
  teamColumns,
  teamSortValues,
} from "@/features/admin/teams/definitions/team-columns.definition"
import {
  useTeamDelete,
  useTeamsList,
} from "@/features/admin/teams/hooks/use-teams"
import type { Team } from "@/features/admin/teams/model/types"
import { useColumnPreferences } from "@/hooks/use-column-preferences"
import { columnPreferenceProps, useDataTable } from "@/hooks/use-data-table"
import { useEditDialog } from "@/hooks/use-edit-dialog"
import { useSortQueryParam } from "@/hooks/use-sort-query-param"
import { useTargetConfirmDialog } from "@/hooks/use-target-confirm-dialog"
import { useTargetDialog } from "@/hooks/use-target-dialog"
import { foldText, textSuggestions } from "@/lib/fold-text"
import { sortRows } from "@/lib/sort-rows"

const ALL_ORGS = "all"

export function TeamsContent() {
  const { data: teams = [], isPending, isError, refetch } = useTeamsList()
  const { data: organizations = [] } = useOrganizationsList()
  const deleteTeam = useTeamDelete()

  const orgNameById = useMemo(
    () => new Map(organizations.map((org) => [org.id, org.name])),
    [organizations]
  )

  const [search, setSearch] = useState("")
  const [orgFilter, setOrgFilter] = useState(ALL_ORGS)

  const editDialog = useEditDialog<Team>()
  const membersDialog = useTargetDialog<Team>()
  const deleteDialog = useTargetConfirmDialog<Team>({
    title: "Eliminar equipo",
    description: (team) =>
      `Esta acción no se puede deshacer. Se eliminará el equipo "${team.name}".`,
    confirmLabel: "Eliminar",
    onConfirm: (team) => deleteTeam.mutateAsync({ id: team.id }),
  })

  const canCreate = organizations.length > 0

  const normalizedSearch = search.trim().toLowerCase()
  // Keystrokes commit immediately; the filtered list catches up in a
  // lower-priority render instead of blocking the input.
  const searchTerm = useDeferredValue(normalizedSearch)
  const filteredTeams = useMemo(
    () =>
      teams.filter((team) => {
        if (orgFilter !== ALL_ORGS && team.organizationId !== orgFilter) {
          return false
        }
        if (searchTerm && !team.name.toLowerCase().includes(searchTerm)) {
          return false
        }
        return true
      }),
    [teams, orgFilter, searchTerm]
  )
  const activeFilterCount =
    (normalizedSearch ? 1 : 0) + (orgFilter !== ALL_ORGS ? 1 : 0)
  const clearFilters = () => {
    setSearch("")
    setOrgFilter(ALL_ORGS)
  }

  const rowContext: TeamsRowContext = {
    onOpenMembers: membersDialog.open,
    onEdit: editDialog.openEdit,
    onDelete: deleteDialog.open,
  }
  const preferences = useColumnPreferences("admin-teams", teamColumnLayout)
  const [sorting, setSorting] = useSortQueryParam(
    TEAM_SORT_KEYS,
    TEAM_DEFAULT_SORT
  )
  const rows = useMemo(
    () => sortRows(filteredTeams, sorting, teamSortValues(orgNameById)),
    [filteredTeams, sorting, orgNameById]
  )
  const table = useDataTable({
    data: rows,
    columns: teamColumns,
    getRowId: (team) => team.id,
    sorting,
    onSortingChange: setSorting,
    ...columnPreferenceProps(preferences),
  })

  const searchSuggestions = useMemo<SuggestInputItem[]>(
    () =>
      textSuggestions(teams, search, {
        match: (team, q) => foldText(team.name).includes(q),
        toItem: (team) => ({
          key: team.id,
          value: team.name,
          label: team.name,
          detail: orgNameById.get(team.organizationId),
        }),
      }),
    [teams, search, orgNameById]
  )

  const filterDescriptors: ResourceFilterDescriptor[] = [
    {
      kind: "suggestion",
      key: "team-filter-search",
      label: "Buscar",
      value: search,
      onChange: setSearch,
      suggestions: searchSuggestions,
      placeholder: "Nombre del equipo...",
    },
    {
      kind: "select",
      key: "team-filter-org",
      label: "Organización",
      value: orgFilter,
      onChange: setOrgFilter,
      placeholder: "Todas las organizaciones",
      options: [
        { value: ALL_ORGS, label: "Todas las organizaciones" },
        ...organizations.map((org) => ({ value: org.id, label: org.name })),
      ],
      defaultValue: ALL_ORGS,
      isActive: (value) => value !== ALL_ORGS,
    },
  ]
  // Every filter here applies live, so the sheet's draft total is simply the
  // current filtered count.
  const fetchDraftTotal = useCallback(
    () => filteredTeams.length,
    [filteredTeams.length]
  )

  return (
    <>
      <ResourceOverview
        maxWidth="80%"
        surface="admin-teams"
        description="Subdivide las organizaciones en equipos de trabajo."
        heroMeta={
          <HeroCount segments={[{ count: teams.length, label: "total" }]} />
        }
        heroAction={
          <Button onClick={editDialog.openCreate} disabled={!canCreate}>
            <UsersRound className="size-4" />
            Nuevo equipo
          </Button>
        }
        filters={
          !isError && !isPending && teams.length > 0 ? (
            <div className="space-y-3">
              <ResourceFilters
                columns={2}
                filters={filterDescriptors}
                onClear={clearFilters}
                fetchDraftTotal={fetchDraftTotal}
                count={
                  filteredTeams.length === teams.length
                    ? `${teams.length} equipos`
                    : `${filteredTeams.length} de ${teams.length} equipos`
                }
              />
              <FilterChips
                chips={chipsFor(filterDescriptors)}
                onClear={clearFilters}
              />
            </div>
          ) : undefined
        }
        query={{ data: filteredTeams, isPending, isError, refetch }}
        loading="Cargando equipos..."
        error={{
          icon: <UsersRound className="size-6" />,
          title: "No se pudieron cargar los equipos",
          description:
            "Comprueba tu conexión y tus permisos de administración; después, vuelve a intentarlo.",
        }}
        isEmpty={(data) => data.length === 0}
        empty={{
          icon: <UsersRound className="size-6" />,
          title: "No hay equipos",
          description: canCreate
            ? "Todavía no se ha creado ningún equipo."
            : "Crea primero una organización para poder añadir equipos.",
          action: canCreate ? (
            <Button onClick={editDialog.openCreate}>Nuevo equipo</Button>
          ) : undefined,
        }}
        hasActiveFilters={activeFilterCount > 0}
        filteredEmpty={{
          icon: <UsersRound className="size-6" />,
          title: "Sin resultados",
          description: "Ningún equipo coincide con los filtros seleccionados.",
          onClear: clearFilters,
        }}
      >
        {() => (
          <div className="flex min-h-0 flex-1 flex-col">
            <DataTableView
              table={table}
              label="Equipos"
              idPrefix="admin-teams"
              onResetColumns={preferences.reset}
              renderControl={(team, columnId) => {
                if (columnId === TEAM_NAME_COLUMN) {
                  return (
                    <DataTableIdentityCell
                      primary={team.name}
                      onOpen={() => membersDialog.open(team)}
                      label={team.name}
                    />
                  )
                }
                if (columnId === TEAM_ORGANIZATION_COLUMN) {
                  return (
                    <Text tone="muted" className="block truncate">
                      {orgNameById.get(team.organizationId) ?? "—"}
                    </Text>
                  )
                }
                return (
                  <RowActions
                    actions={teamActions}
                    item={team}
                    context={rowContext}
                    accessibleLabel={team.name}
                  />
                )
              }}
            />
          </div>
        )}
      </ResourceOverview>

      <TeamFormDialog team={editDialog.editing} {...editDialog.dialogProps} />

      <TeamMembersSheet
        team={membersDialog.target}
        onOpenChange={membersDialog.dialogProps.onOpenChange}
      />

      <ConfirmDialog {...deleteDialog.confirmDialogProps} />
    </>
  )
}
