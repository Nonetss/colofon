import { useState } from "react"
import { textVariants } from "@/components/shared/brand/typography"
import { FormField } from "@/components/shared/form/field-label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AccessTokenFields } from "@/features/content-repositories/manage/components/access-token-fields"
import { GitCredentialDialog } from "@/features/content-repositories/manage/components/git-credential-dialog"
import type { useRepositoryAccess } from "@/features/content-repositories/manage/hooks/use-repository-access"
import {
  choiceOfValue,
  choiceValue,
  type GitCredential,
} from "@/features/content-repositories/manage/model/credential-choice"
import { cn } from "@/lib/utils"

const FIELD_ID = "repository-credential"

type Option = { value: string; label: string }

function optionsOf(matching: GitCredential[]): Option[] {
  return [
    { value: "none", label: "Ninguna (repositorio público)" },
    ...matching.map((credential) => ({
      value: credential.id,
      label: `${credential.username} · ${credential.host}`,
    })),
  ]
}

function hintOf(matching: GitCredential[], host: string): string {
  if (host === "") {
    return "Escribe antes la URL: aquí aparecen las credenciales de ese servidor."
  }
  if (matching.length === 0) {
    return `No tienes credenciales para ${host}. Para un repositorio privado, añade una.`
  }
  return "El usuario y el token con los que se descarga un repositorio privado."
}

interface CredentialFieldProps {
  access: ReturnType<typeof useRepositoryAccess>
  /** Whether an empty URL keeps the stored one. */
  editing: boolean
}

/**
 * How a repository logs in to its git server: one of the credentials saved
 * for the URL's host, or none. "Añadir credencial" opens the dialog that
 * saves a new one and picks it. A server that can't store credentials gets
 * the username and token only.
 */
export function CredentialField({ access, editing }: CredentialFieldProps) {
  const [adding, setAdding] = useState(false)

  if (!access.saving) {
    return (
      <AccessTokenFields
        user={access.user}
        token={access.token}
        onUserChange={access.setUser}
        onTokenChange={access.setToken}
        editing={editing}
      />
    )
  }

  const options = optionsOf(access.matching)
  const value = choiceValue(access.choice)
  return (
    <>
      <FormField
        label="Credencial"
        htmlFor={FIELD_ID}
        hint={hintOf(access.matching, access.host)}
      >
        <div className="flex items-center gap-2">
          <Select
            items={options}
            value={value}
            onValueChange={(next) => {
              if (next !== null) access.choose(choiceOfValue(next))
            }}
          >
            <SelectTrigger
              id={FIELD_ID}
              className={cn("w-full", textVariants({ role: "data" }))}
            >
              <SelectValue>
                {options.find((option) => option.value === value)?.label}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  label={option.label}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            onClick={() => setAdding(true)}
          >
            Añadir credencial
          </Button>
        </div>
      </FormField>
      <GitCredentialDialog
        open={adding}
        onOpenChange={setAdding}
        initialHost={access.host}
        onSaved={(credential) =>
          access.choose({ kind: "saved", id: credential.id })
        }
      />
    </>
  )
}
