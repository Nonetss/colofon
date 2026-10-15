import { useState } from "react"
import { Text } from "@/components/shared/brand/typography"
import { SoftCardList } from "@/components/shared/data-display/soft-card-list"
import { Hint } from "@/components/shared/feedback/hint"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  ApiKeyCreatedDialog,
  ApiKeyFormModal,
  type ApiKeyListItem,
  useApiKeyDelete,
  useApiKeysList,
} from "@/features/api-keys/manage"
import { useTargetConfirmDialog } from "@/hooks/use-target-confirm-dialog"
import { useTargetDialog } from "@/hooks/use-target-dialog"
import { formatDate } from "@/lib/format"
import { getIcon } from "@/lib/icon-registry"

const Plus = getIcon("actions", "add")
const Trash = getIcon("actions", "delete")
const KeyRound = getIcon("entities", "apiKey")

function keyName(key: ApiKeyListItem): string {
  const name = key.name?.trim()
  if (name === undefined || name === "") return "API key"
  return name
}

function expiryLabel(key: ApiKeyListItem): string {
  if (key.expiresAt === null) return "Sin caducidad"
  return `Caduca el ${formatDate(key.expiresAt)}`
}

/** The visible start of the key ("sk_ab…"), when Better Auth keeps one. */
function keyStart(key: ApiKeyListItem): string | null {
  if (key.start === null) return null
  return `${key.start}…`
}

interface Notice {
  text: string
  tone: "muted" | "destructive"
}

/** What shows instead of the list while it loads, fails or is empty. */
function listNotice(
  isPending: boolean,
  isError: boolean,
  count: number
): Notice | null {
  if (isPending) return { text: "Cargando API keys...", tone: "muted" }
  if (isError)
    return { text: "No se pudieron cargar las API keys.", tone: "destructive" }
  if (count === 0) return { text: "Aún no tienes ninguna.", tone: "muted" }
  return null
}

/**
 * The user's own API keys on their profile: create one to hand to an AI so it
 * reads the documentation (`/llms.txt`) as them, and revoke the ones no
 * longer needed.
 */
export function ProfileApiKeys() {
  const { data: apiKeys = [], isPending, isError } = useApiKeysList()
  const deleteApiKey = useApiKeyDelete()
  const notice = listNotice(isPending, isError, apiKeys.length)
  const [createOpen, setCreateOpen] = useState(false)
  const createdKeyDialog = useTargetDialog<string>()
  const deleteDialog = useTargetConfirmDialog<ApiKeyListItem>({
    title: "Revocar API key",
    description: (key) =>
      `Esta acción no se puede deshacer. La IA que use "${keyName(key)}" dejará de poder leer la documentación.`,
    confirmLabel: "Revocar",
    onConfirm: (key) => deleteApiKey.mutateAsync({ id: key.id }),
  })

  return (
    <section className="flex flex-col gap-3" aria-labelledby="api-keys">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <Text as="h2" id="api-keys" variant="label" tone="muted">
            API keys
          </Text>
          <Text as="p" variant="compact" tone="muted" className="mt-1">
            Crea una clave para que tu IA lea la documentación con tu cuenta.
          </Text>
        </div>
        <Button variant="outline" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Nueva API key
        </Button>
      </div>

      {notice !== null && (
        <Text as="p" variant="compact" tone={notice.tone}>
          {notice.text}
        </Text>
      )}
      {notice === null && (
        <SoftCardList as="ul">
          {apiKeys.map((key) => (
            <li key={key.id} className="flex items-center gap-3 px-4 py-3">
              <KeyRound
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <Text variant="title" className="truncate">
                  {keyName(key)}
                </Text>
                <Text variant="meta-sm" tone="muted">
                  {expiryLabel(key)}
                </Text>
              </div>
              {keyStart(key) && (
                <Text variant="data" tone="muted">
                  {keyStart(key)}
                </Text>
              )}
              <Hint label="Revocar">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Revocar ${keyName(key)}`}
                  disabled={
                    deleteApiKey.isPending &&
                    deleteApiKey.variables?.id === key.id
                  }
                  onClick={() => deleteDialog.open(key)}
                >
                  <Trash className="size-3.5" />
                </Button>
              </Hint>
            </li>
          ))}
        </SoftCardList>
      )}

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
    </section>
  )
}
