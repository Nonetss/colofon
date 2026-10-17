import { type SyntheticEvent, useEffect, useState } from "react"
import { textVariants } from "@/components/shared/brand/typography"
import { FormField } from "@/components/shared/form/field-label"
import { FormDialog } from "@/components/shared/form/form-dialog"
import { Input } from "@/components/ui/input"
import { useGitCredentialSave } from "@/features/content-repositories/manage/hooks/use-git-credentials"
import {
  type GitCredential,
  hostOfServer,
} from "@/features/content-repositories/manage/model/credential-choice"

interface GitCredentialDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The server to start with, e.g. the host of the URL being typed. */
  initialHost: string
  /** Called with the credential once it is saved. */
  onSaved?: (credential: GitCredential) => void
}

/**
 * Saves the username and token for a git server. Saving again for the same
 * server and username replaces the token.
 */
export function GitCredentialDialog({
  open,
  onOpenChange,
  initialHost,
  onSaved,
}: GitCredentialDialogProps) {
  const save = useGitCredentialSave()
  const [server, setServer] = useState("")
  const [username, setUsername] = useState("")
  const [token, setToken] = useState("")

  useEffect(() => {
    if (!open) return
    setServer(initialHost)
    setUsername("")
    setToken("")
  }, [open, initialHost])

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const saved = await save.mutateAsync({
      host: hostOfServer(server),
      username: username.trim(),
      token,
    })
    onSaved?.(saved)
    onOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        if (!save.isPending) onOpenChange(next)
      }}
      title="Añadir credencial"
      description="El usuario y el token con los que se descargan tus repositorios privados de un servidor. Se guardan cifrados y solo se usan con ese servidor."
      onSubmit={handleSubmit}
      isPending={save.isPending}
      submitLabel="Guardar"
      className="sm:max-w-xl"
    >
      <FormField
        label="Servidor"
        htmlFor="git-credential-server"
        hint="El de la dirección de tus repositorios, por ejemplo git.example.com."
      >
        <Input
          id="git-credential-server"
          required
          className={textVariants({ role: "data" })}
          autoComplete="off"
          value={server}
          onChange={(e) => setServer(e.target.value)}
        />
      </FormField>
      <FormField label="Usuario" htmlFor="git-credential-user">
        <Input
          id="git-credential-user"
          required
          className={textVariants({ role: "data" })}
          autoComplete="off"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </FormField>
      <FormField
        label="Token de acceso"
        htmlFor="git-credential-token-new"
        hint="Créalo en tu servidor git con permiso de lectura sobre el repositorio."
      >
        <Input
          id="git-credential-token-new"
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
