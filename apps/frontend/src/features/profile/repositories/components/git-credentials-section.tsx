import { type SyntheticEvent, useEffect, useState } from "react"
import { Text, textVariants } from "@/components/shared/brand/typography"
import { FormField } from "@/components/shared/form/field-label"
import { FormDialog } from "@/components/shared/form/form-dialog"
import { SectionHeading } from "@/components/shared/layout/section-heading"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Input } from "@/components/ui/input"
import {
  type GitCredential,
  GitCredentialDialog,
  useGitCredentialDelete,
  useGitCredentialReplace,
  useGitCredentials,
} from "@/features/content-repositories/manage"
import { useTargetConfirmDialog } from "@/hooks/use-target-confirm-dialog"
import { useTargetDialog } from "@/hooks/use-target-dialog"

interface ReplaceTokenDialogProps {
  credential: GitCredential | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function ReplaceTokenDialog({
  credential,
  open,
  onOpenChange,
}: ReplaceTokenDialogProps) {
  const replace = useGitCredentialReplace()
  const [token, setToken] = useState("")

  useEffect(() => {
    if (open) setToken("")
  }, [open])

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (credential === null) return
    await replace.mutateAsync({
      host: credential.host,
      username: credential.username,
      token,
    })
    onOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        if (!replace.isPending) onOpenChange(next)
      }}
      title="Cambiar el token"
      description={
        credential === null
          ? undefined
          : `${credential.username} en ${credential.host}. Los repositorios que la usan lo recogen en su próxima sincronización.`
      }
      onSubmit={handleSubmit}
      isPending={replace.isPending}
      submitLabel="Guardar"
    >
      <FormField label="Token de acceso" htmlFor="git-credential-token">
        <Input
          id="git-credential-token"
          type="password"
          required
          className={textVariants({ role: "data" })}
          autoComplete="new-password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
      </FormField>
    </FormDialog>
  )
}

function CredentialRow({
  credential,
  onReplace,
  onDelete,
}: {
  credential: GitCredential
  onReplace: (credential: GitCredential) => void
  onDelete: (credential: GitCredential) => void
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Text as="span" variant="data" className="truncate">
          {credential.username} · {credential.host}
        </Text>
        {credential.inUse && <Badge variant="secondary">En uso</Badge>}
        {credential.unreadable && (
          <Badge variant="destructive">Guárdala de nuevo</Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => onReplace(credential)}
        >
          Cambiar token
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          disabled={credential.inUse}
          onClick={() => onDelete(credential)}
        >
          Eliminar
        </Button>
      </div>
    </li>
  )
}

/**
 * The git logins the user saved, with a way to change a token or remove one.
 * Hidden while the server can't store them.
 */
export function GitCredentialsSection() {
  const list = useGitCredentials()
  const remove = useGitCredentialDelete()
  const replaceDialog = useTargetDialog<GitCredential>()
  const [adding, setAdding] = useState(false)
  const deleteDialog = useTargetConfirmDialog<GitCredential>({
    title: "Eliminar credencial",
    description: (credential) =>
      `Se borra el token de ${credential.username} en ${credential.host}. Tendrás que volver a escribirlo para añadir otro repositorio privado de ese servidor.`,
    confirmLabel: "Eliminar",
    onConfirm: (credential) => remove.mutateAsync({ id: credential.id }),
  })

  const data = list.data
  if (data === undefined || !data.enabled) return null

  return (
    <section className="mt-8 space-y-2">
      <SectionHeading
        title="Credenciales"
        count={data.credentials.length}
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAdding(true)}
          >
            Añadir credencial
          </Button>
        }
      />
      <Text as="p" variant="meta" tone="muted">
        Los usuarios y tokens que guardaste para descargar repositorios
        privados. Se guardan cifrados y solo se usan con su servidor.
      </Text>
      {data.credentials.length > 0 && (
        <ul aria-label="Tus credenciales" className="divide-y border-y">
          {data.credentials.map((credential) => (
            <CredentialRow
              key={credential.id}
              credential={credential}
              onReplace={replaceDialog.open}
              onDelete={deleteDialog.open}
            />
          ))}
        </ul>
      )}
      <GitCredentialDialog
        open={adding}
        onOpenChange={setAdding}
        initialHost=""
      />
      <ReplaceTokenDialog
        credential={replaceDialog.target}
        {...replaceDialog.dialogProps}
      />
      <ConfirmDialog {...deleteDialog.confirmDialogProps} />
    </section>
  )
}
