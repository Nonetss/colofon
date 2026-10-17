import { Text, textVariants } from "@/components/shared/brand/typography"
import { FormField } from "@/components/shared/form/field-label"
import { Input } from "@/components/ui/input"

interface AccessTokenFieldsProps {
  user: string
  token: string
  onUserChange: (user: string) => void
  onTokenChange: (token: string) => void
  /** Whether an empty URL keeps the stored one. */
  editing: boolean
}

function TokenHint({ editing }: { editing: boolean }) {
  return (
    <Text as="p" variant="meta" tone="muted">
      Solo para repositorios privados: un token de acceso de tu servidor git con
      permiso de lectura sobre el repositorio.{" "}
      {editing && "Un token nuevo necesita también la URL."}
    </Text>
  )
}

export function AccessTokenFields({
  user,
  token,
  onUserChange,
  onTokenChange,
  editing,
}: AccessTokenFieldsProps) {
  return (
    <div className="@container space-y-2">
      <div className="grid gap-4 @md:grid-cols-2">
        <FormField label="Usuario" htmlFor="repository-access-user">
          <Input
            id="repository-access-user"
            required={token !== ""}
            className={textVariants({ role: "data" })}
            autoComplete="off"
            value={user}
            onChange={(e) => onUserChange(e.target.value)}
          />
        </FormField>
        <FormField label="Token de acceso" htmlFor="repository-access-token">
          <Input
            id="repository-access-token"
            type="password"
            className={textVariants({ role: "data" })}
            autoComplete="new-password"
            value={token}
            onChange={(e) => onTokenChange(e.target.value)}
          />
        </FormField>
      </div>
      <TokenHint editing={editing} />
    </div>
  )
}
