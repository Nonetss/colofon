import { Text } from "@/components/shared/brand/typography"
import { DataTableView } from "@/components/shared/data-display/data-table-view"
import { SectionHeading } from "@/components/shared/layout/section-heading"
import { AppLink } from "@/components/ui/app-link"
import {
  teamColumnLayout,
  teamColumns,
  teamSortValues,
} from "@/features/admin/organizations/definitions/organization-detail-columns.definition"
import type { OrganizationDetail } from "@/features/admin/organizations/model/types"
import { useLocalDataTable } from "@/hooks/use-data-table"

/** The organization detail sheet's "Equipos" section: read-only summary
 *  with a link to the full Teams section for management. */
export function OrganizationTeamsSection({
  teams,
}: {
  teams: OrganizationDetail["teams"]
}) {
  const { table, preferences } = useLocalDataTable({
    tableId: "admin-organization-teams",
    rows: teams,
    columns: teamColumns,
    layout: teamColumnLayout,
    getRowId: (team) => team.id,
    sortValues: teamSortValues,
  })

  return (
    <section className="space-y-3">
      <SectionHeading title="Equipos" count={teams.length} />
      {teams.length === 0 ? (
        <Text as="p" tone="muted">
          Esta organización no tiene equipos todavía.
        </Text>
      ) : (
        <DataTableView
          table={table}
          label="Equipos"
          idPrefix="admin-organization-teams"
          layout="table"
          onResetColumns={preferences.reset}
        />
      )}
      <Text as="p" variant="compact" tone="muted">
        Gestiona los equipos desde la sección{" "}
        <AppLink href="/admin/teams" className="underline underline-offset-4">
          Equipos
        </AppLink>
        .
      </Text>
    </section>
  )
}
