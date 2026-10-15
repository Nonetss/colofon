import { getIcon } from "@/lib/icon-registry"

const ExternalLink = getIcon("actions", "openExternal")
const KeyRound = getIcon("entities", "apiKey")
const Plus = getIcon("actions", "add")

import { useMemo, useState } from "react"
import { inlineLinkClass } from "@/components/shared/brand/inline-link"
import { Text, textVariants } from "@/components/shared/brand/typography"
import { DataTableView } from "@/components/shared/data-display/data-table-view"
import { RowActions } from "@/components/shared/data-display/row-action-items"
import { HeroCount } from "@/components/shared/layout/page-hero"
import { ResourceOverview } from "@/components/shared/resource/resource-overview"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  API_KEY_DEFAULT_SORT,
  API_KEY_SORT_KEYS,
  type ApiKeysRowContext,
  apiKeyActions,
  apiKeyColumnLayout,
  apiKeyColumns,
  apiKeyName,
  apiKeySortValues,
} from "@/features/admin/api-keys/definitions/api-key-columns.definition"
import {
  ApiKeyCreatedDialog,
  ApiKeyFormModal,
  type ApiKeyListItem,
  useApiKeyDelete,
  useApiKeysList,
} from "@/features/api-keys/manage"
import { useColumnPreferences } from "@/hooks/use-column-preferences"
import { columnPreferenceProps, useDataTable } from "@/hooks/use-data-table"
import { useSortQueryParam } from "@/hooks/use-sort-query-param"
import { useTargetConfirmDialog } from "@/hooks/use-target-confirm-dialog"
import { useTargetDialog } from "@/hooks/use-target-dialog"
import { sortRows } from "@/lib/sort-rows"
import { cn } from "@/lib/utils"

export function ApiKeysContent() {
  const { data: apiKeys = [], isPending, isError, refetch } = useApiKeysList()
  const deleteApiKey = useApiKeyDelete()

  const [createOpen, setCreateOpen] = useState(false)
  const createdKeyDialog = useTargetDialog<string>()

  const deleteDialog = useTargetConfirmDialog<ApiKeyListItem>({
    title: "Eliminar API key",
    description: (key) =>
      `Esta acción no se puede deshacer. Las integraciones que usen "${key.name?.trim() || "esta clave"}" dejarán de funcionar.`,
    confirmLabel: "Eliminar",
    onConfirm: (key) => deleteApiKey.mutateAsync({ id: key.id }),
  })

  const openCreateModal = () => setCreateOpen(true)
  const deletingId = deleteApiKey.isPending
    ? (deleteApiKey.variables?.id ?? null)
    : null
  const rowContext: ApiKeysRowContext = {
    deletingId,
    onDelete: deleteDialog.open,
  }

  const preferences = useColumnPreferences("admin-api-keys", apiKeyColumnLayout)
  const [sorting, setSorting] = useSortQueryParam(
    API_KEY_SORT_KEYS,
    API_KEY_DEFAULT_SORT
  )
  const rows = useMemo(
    () => sortRows(apiKeys, sorting, apiKeySortValues),
    [apiKeys, sorting]
  )
  const table = useDataTable({
    data: rows,
    columns: apiKeyColumns,
    getRowId: (key) => key.id,
    sorting,
    onSortingChange: setSorting,
    ...columnPreferenceProps(preferences),
  })

  return (
    <>
      <ResourceOverview
        maxWidth="full"
        padding="none"
        surface="admin-api-keys"
        description="Crea y revoca credenciales para conectar servicios con esta aplicación."
        heroMeta={
          <HeroCount
            segments={[
              {
                count: apiKeys.length,
                label: apiKeys.length === 1 ? "clave" : "claves",
              },
            ]}
          />
        }
        heroAction={
          <Button onClick={openCreateModal}>
            <Plus className="size-4" />
            Nueva API key
          </Button>
        }
        heroChildren={
          <div className="flex items-center justify-between gap-3 border-y py-3 text-sm">
            <Text
              as="p"
              variant="compact"
              tone="muted"
              className="min-w-0 flex-1 leading-relaxed"
            >
              Consulta los endpoints, parámetros y respuestas de la API en{" "}
              <a
                href="/scalar"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(inlineLinkClass, textVariants({ role: "data" }))}
              >
                /scalar
              </a>
              .
            </Text>
            <a
              href="/scalar"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Abrir documentación de la API"
              className="shrink-0 text-muted-foreground hover:text-primary"
            >
              <ExternalLink className="size-3.5" />
            </a>
          </div>
        }
        query={{ data: apiKeys, isPending, isError, refetch }}
        loading="Cargando API keys..."
        error={{
          icon: <KeyRound className="size-6" />,
          title: "No se pudieron cargar las API keys",
          description:
            "Comprueba tu conexión y tus permisos; si el problema continúa, inténtalo de nuevo más tarde.",
        }}
        isEmpty={(data) => data.length === 0}
        empty={{
          icon: <KeyRound className="size-6" />,
          title: "No hay API keys",
          description:
            "Crea una clave para que un servicio pueda autenticarse con la API.",
          action: <Button onClick={openCreateModal}>Nueva API key</Button>,
        }}
      >
        {() => (
          <DataTableView
            table={table}
            label="API keys"
            idPrefix="admin-api-keys"
            onResetColumns={preferences.reset}
            rowState={(key) => ({ disabled: deletingId === key.id })}
            renderControl={(key) => (
              <RowActions
                actions={apiKeyActions}
                item={key}
                context={rowContext}
                accessibleLabel={apiKeyName(key)}
                disabled={deletingId === key.id}
              />
            )}
          />
        )}
      </ResourceOverview>

      <ApiKeyFormModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={createdKeyDialog.open}
      />

      <ApiKeyCreatedDialog
        {...createdKeyDialog.dialogProps}
        fullKey={createdKeyDialog.target}
      />

      <ConfirmDialog {...deleteDialog.confirmDialogProps} />
    </>
  )
}
