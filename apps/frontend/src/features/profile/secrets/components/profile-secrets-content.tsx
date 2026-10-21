import { Text } from "@/components/shared/brand/typography"
import { StatusTag } from "@/components/shared/data-display/status-dot"
import { Hint } from "@/components/shared/feedback/hint"
import { PageHero } from "@/components/shared/layout/page-hero"
import { SectionHeading } from "@/components/shared/layout/section-heading"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { SecretFieldNames } from "@/features/profile/secrets/components/secret-field-names"
import { SecretOrigins } from "@/features/profile/secrets/components/secret-origins"
import { SharedSecretCard } from "@/features/profile/secrets/components/shared-secret-card"
import {
  allowedLabels,
  sharingLabel,
} from "@/features/profile/secrets/model/secret-labels"
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

function lastUseLabel(secret: SecretListItem): string {
  if (secret.lastUsedAt === null) return "Sin usar"
  return `Usado el ${formatDate(secret.lastUsedAt)}`
}

/**
 * The user's secrets on their profile: credentials of their services that an
 * AI connected to the MCP uses through `request` without ever seeing them.
 * Values are write-only.
 */
export function ProfileSecretsContent() {
  const { data, isPending, isError } = useSecretsList()
  const secrets = data?.secrets ?? []
  const shared = data?.shared ?? []
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
    <div className="flex flex-col gap-6">
      <PageHero
        surface="profile-secrets"
        action={
          enabled && (
            <Button variant="outline" onClick={formDialog.openCreate}>
              <Plus className="size-4" />
              Nuevo secreto
            </Button>
          )
        }
      />

      {notice !== null && (
        <Text as="p" variant="compact" tone={notice.tone}>
          {notice.text}
        </Text>
      )}
      {notice === null && (
        <div className="@container">
          <ul className="grid gap-3 @2xl:grid-cols-2 @3xl:grid-cols-3">
            {secrets.map((secret) => (
              <li key={secret.id} className="flex">
                <Card className="w-full gap-4 py-4">
                  <CardHeader className="px-4">
                    <CardTitle className="flex min-w-0 items-center gap-2">
                      <Vault
                        aria-hidden
                        className="size-4 shrink-0 text-muted-foreground"
                      />
                      <Text variant="title" className="truncate">
                        {secret.name}
                      </Text>
                    </CardTitle>
                    {secret.description !== null && (
                      <CardDescription>
                        <Text variant="compact" tone="muted">
                          {secret.description}
                        </Text>
                      </CardDescription>
                    )}
                    <CardAction className="flex items-center">
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
                    </CardAction>
                  </CardHeader>

                  <CardContent className="flex flex-1 flex-col gap-3 px-4">
                    <SecretFieldNames fields={secret.fields} />
                    <div className="flex flex-col gap-1">
                      <Text variant="label" tone="muted">
                        Orígenes
                      </Text>
                      <SecretOrigins origins={secret.origins} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Text variant="label" tone="muted">
                        Compartido con
                      </Text>
                      <Text variant="compact">{sharingLabel(secret)}</Text>
                    </div>
                  </CardContent>

                  <CardFooter className="flex-wrap gap-x-3 gap-y-1 border-t px-4 pt-3!">
                    <Text variant="meta-sm" tone="muted" className="mr-auto">
                      {lastUseLabel(secret)}
                    </Text>
                    {allowedLabels(secret).map((label) => (
                      <StatusTag key={label} dotTone="primary">
                        {label}
                      </StatusTag>
                    ))}
                    {secret.unreadable && (
                      <Text variant="meta-sm" tone="destructive">
                        No se puede descifrar: vuelve a escribir sus valores.
                      </Text>
                    )}
                  </CardFooter>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      )}

      {enabled && shared.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <SectionHeading as="h2" title="Compartidos contigo" />
            <Text as="p" variant="compact" tone="muted">
              Secretos de otros miembros de tus organizaciones. Tus agentes los
              usan con el prefijo de la organización; solo su propietario los
              edita.
            </Text>
          </div>
          <div className="@container">
            <ul className="grid gap-3 @2xl:grid-cols-2 @3xl:grid-cols-3">
              {shared.map((secret) => (
                <li
                  key={`${secret.organization.id}-${secret.id}`}
                  className="flex"
                >
                  <SharedSecretCard secret={secret} />
                </li>
              ))}
            </ul>
          </div>
        </section>
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
    </div>
  )
}
