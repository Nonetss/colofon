import { textVariants } from "@/components/shared/brand/typography"
import { FormField } from "@/components/shared/form/field-label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AccessTokenFields } from "@/features/content-repositories/manage/components/access-token-fields"
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
    { value: "new", label: "Nueva credencial…" },
  ]
}

interface CredentialFieldProps {
  access: ReturnType<typeof useRepositoryAccess>
  /** Whether an empty URL keeps the stored one. */
  editing: boolean
}

/**
 * How a repository logs in to its git server: a saved credential for the
 * URL's host, none, or a new one typed here and saved on submit. A server
 * that can't store credentials gets the username and token only.
 */
export function CredentialField({ access, editing }: CredentialFieldProps) {
  if (!access.saving) {
    return (
      <AccessTokenFields
        user={access.user}
        token={access.token}
        onUserChange={access.setUser}
        onTokenChange={access.setToken}
        editing={editing}
        saved={false}
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
        hint="El usuario y el token con los que se descarga un repositorio privado. Las que guardaste para este servidor aparecen aquí."
      >
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
      </FormField>
      {access.choice.kind === "new" && (
        <AccessTokenFields
          user={access.user}
          token={access.token}
          onUserChange={access.setUser}
          onTokenChange={access.setToken}
          editing={editing}
          saved
        />
      )}
    </>
  )
}
