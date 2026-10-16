import { Text } from "@/components/shared/brand/typography"
import { SoftCardList } from "@/components/shared/data-display/soft-card-list"
import { Hint } from "@/components/shared/feedback/hint"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  SecretFormDialog,
  type SecretListItem,
  SecretUsageSheet,
  useSecretDelete,
  useSecretsList,
} from "@/features/secrets/manage"
import { useEditDialog } from "@/hooks/use-edit-dialog"
import { useTargetConfirmDialog } from "@/hooks/use-target-confirm-dialog"
import { useTargetDialog } from "@/hooks/use-target-dialog"
import { formatDate } from "@/lib/format"
import { getIcon } from "@/lib/icon-registry"

const Plus = getIcon("actions", "add")
const Pencil = getIcon("actions", "edit")
const Trash = getIcon("actions", "delete")
const History = getIcon("actions", "history")
const Vault = getIcon("entities", "secret")

interface Notice {
  text: string
  tone: "muted" | "destructive"
}

/** What shows instead of the list while it loads, fails, is off or empty. */
function listNotice(
  isPending: boolean,
  isError: boolean,
  enabled: boolean,
  count: number
): Notice | null {
  if (isPending) return { text: "Cargando secretos...", tone: "muted" }
  if (isError)
    return { text: "No se pudieron cargar los secretos.", tone: "destructive" }
  if (!enabled)
    return {
      text: "Los secretos no están configurados en este servidor (falta SECRETS_ENCRYPTION_KEY).",
      tone: "muted",
    }
  if (count === 0) return { text: "Aún no tienes ninguno.", tone: "muted" }
  return null
}

/** What the secret allows, in a few words. */
function rulesLabel(secret: SecretListItem): string {
  const parts = [secret.origins.join(", ")]
  if (secret.allowWrite) parts.push("escritura")
  if (secret.allowInUrl) parts.push("en URL")
  if (secret.allowInBody) parts.push("en body")
  return parts.join(" · ")
}

function lastUseLabel(secret: SecretListItem): string {
  if (secret.lastUsedAt === null) return "Sin usar"
  return `Usado el ${formatDate(secret.lastUsedAt)}`
}

/**
 * The user's secrets on their profile: credentials of their services that an
 * AI connected to the MCP uses through `request` without ever seeing them.
 * Values are write-only.
 */
export function ProfileSecrets() {
  const { data, isPending, isError } = useSecretsList()
  const secrets = data?.secrets ?? []
  const enabled = data?.enabled === true
  const deleteSecret = useSecretDelete()
  const notice = listNotice(isPending, isError, enabled, secrets.length)
  const formDialog = useEditDialog<SecretListItem>()
  const usageSheet = useTargetDialog<SecretListItem>()
  const deleteDialog = useTargetConfirmDialog<SecretListItem>({
    title: "Eliminar secreto",
    description: (secret) =>
      `Esta acción no se puede deshacer. Los agentes dejarán de poder usar "${secret.name}".`,
    confirmLabel: "Eliminar",
    onConfirm: (secret) => deleteSecret.mutateAsync({ id: secret.id }),
  })

  return (
    <section className="flex flex-col gap-3" aria-labelledby="secrets">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <Text as="h2" id="secrets" variant="label" tone="muted">
            Secretos
          </Text>
          <Text as="p" variant="compact" tone="muted" className="mt-1">
            Credenciales de tus servicios que tu IA usa a través del MCP sin ver
            sus valores.
          </Text>
        </div>
        {enabled && (
          <Button variant="outline" onClick={formDialog.openCreate}>
            <Plus className="size-4" />
            Nuevo secreto
          </Button>
        )}
      </div>

      {notice !== null && (
        <Text as="p" variant="compact" tone={notice.tone}>
          {notice.text}
        </Text>
      )}
      {notice === null && (
        <SoftCardList as="ul">
          {secrets.map((secret) => (
            <li key={secret.id} className="flex items-center gap-3 px-4 py-3">
              <Vault
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <Text variant="title" className="truncate">
                  {secret.name}
                </Text>
                {secret.description !== null && (
                  <Text variant="meta-sm" tone="muted" className="truncate">
                    {secret.description}
                  </Text>
                )}
                <Text variant="data" tone="muted" className="truncate">
                  {secret.fields.join(", ")} · {rulesLabel(secret)}
                </Text>
                <Text variant="meta-sm" tone="muted">
                  {lastUseLabel(secret)}
                </Text>
                {secret.unreadable && (
                  <Text variant="meta-sm" tone="destructive">
                    No se puede descifrar: vuelve a escribir sus valores.
                  </Text>
                )}
              </div>
              <Hint label="Ver uso">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Ver el uso de ${secret.name}`}
                  onClick={() => usageSheet.open(secret)}
                >
                  <History className="size-3.5" />
                </Button>
              </Hint>
              <Hint label="Editar">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Editar ${secret.name}`}
                  onClick={() => formDialog.openEdit(secret)}
                >
                  <Pencil className="size-3.5" />
                </Button>
              </Hint>
              <Hint label="Eliminar">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Eliminar ${secret.name}`}
                  disabled={
                    deleteSecret.isPending &&
                    deleteSecret.variables?.id === secret.id
                  }
                  onClick={() => deleteDialog.open(secret)}
                >
                  <Trash className="size-3.5" />
                </Button>
              </Hint>
            </li>
          ))}
        </SoftCardList>
      )}

      <SecretFormDialog
        {...formDialog.dialogProps}
        secret={formDialog.editing}
      />
      <SecretUsageSheet
        {...usageSheet.dialogProps}
        secret={usageSheet.target}
      />
      <ConfirmDialog {...deleteDialog.confirmDialogProps} />
    </section>
  )
}
