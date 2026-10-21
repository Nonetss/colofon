import type { ReactNode, SyntheticEvent } from "react"
import { Text } from "@/components/shared/brand/typography"
import { FormField } from "@/components/shared/form/field-label"
import { FormDialog } from "@/components/shared/form/form-dialog"
import { SectionHeading } from "@/components/shared/layout/section-heading"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  SharingField,
  sameOrganizations,
} from "@/features/profile/organizations"
import { SecretFieldList } from "@/features/secrets/manage/components/secret-field-list"
import {
  useSecretCreate,
  useSecretShare,
  useSecretUpdate,
} from "@/features/secrets/manage/hooks/use-secrets"
import {
  createInputOf,
  emptySecretForm,
  type SecretFormValues,
  secretFormFrom,
  secretFormProblems,
  sharedOrganizationIds,
  updateInputOf,
} from "@/features/secrets/manage/model/secret-form"
import type { SecretListItem } from "@/features/secrets/manage/model/types"
import { useDialogForm } from "@/hooks/use-dialog-form"

type PermissionKey = "allowWrite" | "allowInUrl" | "allowInBody"

const PERMISSIONS: {
  key: PermissionKey
  title: string
  description: string
}[] = [
  {
    key: "allowWrite",
    title: "Escritura",
    description: "POST, PUT, PATCH y DELETE. Sin ella, solo lectura.",
  },
  {
    key: "allowInUrl",
    title: "En la URL",
    description: "Sus marcadores en la ruta y la query.",
  },
  {
    key: "allowInBody",
    title: "En el body",
    description: "Sus marcadores en el cuerpo; el servicio podría guardarlo.",
  },
]

/** The dialog's title and submit label, for a new or an existing secret. */
function dialogCopy(secret: SecretListItem | null) {
  if (secret === null)
    return { title: "Nuevo secreto", submit: "Crear secreto" }
  return { title: `Editar ${secret.name}`, submit: "Guardar" }
}

function FieldError({ message }: { message: string | undefined }) {
  if (message === undefined) return null
  return (
    <Text as="p" variant="meta" tone="destructive" role="alert">
      {message}
    </Text>
  )
}

/** A block of the form under its micro-caps heading, ruled from the last. */
function FormSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="space-y-3 border-t pt-5 first:border-t-0 first:pt-0">
      <SectionHeading as="h3" title={title} />
      {children}
    </section>
  )
}

/** One permission as a tile with its switch; the whole tile toggles it. */
function PermissionTile({
  id,
  title,
  description,
  checked,
  onCheckedChange,
}: {
  id: string
  title: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer flex-col gap-1.5 rounded-lg border p-3 transition-colors hover:bg-muted/40 has-data-checked:border-foreground"
    >
      <span className="flex items-center justify-between gap-2">
        <Text variant="title">{title}</Text>
        <Switch
          id={id}
          checked={checked}
          onCheckedChange={onCheckedChange}
          className="data-checked:bg-foreground"
        />
      </span>
      <Text variant="compact" tone="muted">
        {description}
      </Text>
    </label>
  )
}

/**
 * Creates a secret, or edits one when `secret` is given. Values are
 * write-only: an edited secret's fields start empty and keep their stored
 * value unless one is typed.
 */
export function SecretFormDialog({
  open,
  onOpenChange,
  secret,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  secret: SecretListItem | null
}) {
  const createSecret = useSecretCreate()
  const updateSecret = useSecretUpdate()
  const shareSecret = useSecretShare()
  const initial = secret === null ? undefined : secretFormFrom(secret)
  const form = useDialogForm(open, emptySecretForm(), initial)
  const needsEveryValue = secret?.unreadable === true
  const pending =
    createSecret.isPending || updateSecret.isPending || shareSecret.isPending
  const copy = dialogCopy(secret)
  const { values, errors } = form

  const saveSecret = () => {
    if (secret === null) return createSecret.mutateAsync(createInputOf(values))
    return updateSecret.mutateAsync(updateInputOf(secret.id, values))
  }

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    form.clearErrors()
    const problems = secretFormProblems(values, needsEveryValue)
    if (problems.name !== undefined) form.setError("name", problems.name)
    if (problems.origins !== undefined) {
      form.setError("origins", problems.origins)
    }
    if (problems.fields !== undefined) form.setError("fields", problems.fields)
    if (Object.keys(problems).length > 0) return
    try {
      const saved = await saveSecret()
      if (
        !sameOrganizations(
          sharedOrganizationIds(secret),
          values.organizationIds
        )
      ) {
        await shareSecret.mutateAsync({
          id: saved.id,
          organizationIds: values.organizationIds,
        })
      }
      onOpenChange(false)
    } catch {
      // The mutation already toasted the error; the dialog stays open.
    }
  }

  return (
    <FormDialog<SecretFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title={copy.title}
      description="Tu IA lo usa a través del MCP sin ver sus valores: la plataforma los pone en la petición y los tacha en la respuesta."
      onSubmit={handleSubmit}
      isPending={pending}
      submitLabel={copy.submit}
      className="sm:max-w-3xl"
    >
      <div className="@container space-y-5">
        {needsEveryValue && (
          <Text as="p" variant="compact" tone="destructive">
            Sus valores no se pueden descifrar (cambió la clave del servidor):
            escríbelos todos de nuevo.
          </Text>
        )}

        <FormSection title="Identidad">
          <div className="grid gap-4 @xl:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
            <FormField label="Nombre" htmlFor="secret-name">
              <Input
                id="secret-name"
                value={values.name}
                onChange={(event) => form.set("name", event.target.value)}
                placeholder="komodo"
                className="font-mono"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={errors.name ? true : undefined}
              />
              <FieldError message={errors.name} />
            </FormField>
            <FormField label="Descripción" htmlFor="secret-description">
              <Input
                id="secret-description"
                value={values.description}
                onChange={(event) =>
                  form.set("description", event.target.value)
                }
                placeholder="Opcional. Para qué sirve; el agente la lee"
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection title="Dónde se puede enviar">
          <FormField
            label="Orígenes"
            htmlFor="secret-origins"
            hint="Uno por línea, sin ruta. *.dominio cubre sus subdominios. El secreto nunca sale hacia otro sitio."
          >
            <Textarea
              id="secret-origins"
              value={values.origins}
              onChange={(event) => form.set("origins", event.target.value)}
              placeholder={"https://komodo.casa.lan\nhttp://10.0.0.5:3003"}
              rows={3}
              className="font-mono"
              spellCheck={false}
              aria-invalid={errors.origins ? true : undefined}
            />
            <FieldError message={errors.origins} />
          </FormField>
        </FormSection>

        <FormSection title="Permisos">
          <div className="grid gap-2 @xl:grid-cols-3">
            {PERMISSIONS.map((permission) => (
              <PermissionTile
                key={permission.key}
                id={`secret-${permission.key}`}
                title={permission.title}
                description={permission.description}
                checked={values[permission.key]}
                onCheckedChange={(checked) => form.set(permission.key, checked)}
              />
            ))}
          </div>
        </FormSection>

        <div className="border-t pt-5">
          <SecretFieldList
            secretName={values.name}
            fields={values.fields}
            onChange={(next) => form.set("fields", next)}
            needsEveryValue={needsEveryValue}
            problem={errors.fields}
          />
        </div>

        <FormSection title="Compartir">
          <SharingField
            value={values.organizationIds}
            onChange={(next) => form.set("organizationIds", next)}
            hint="Los agentes de sus miembros pueden usarlo con sus mismos orígenes y permisos, sin ver sus valores, mientras sigas en la organización. Solo tú lo editas y ves todo su uso."
            emptyText="No perteneces a ninguna organización, así que solo tus agentes lo usan."
          />
        </FormSection>
      </div>
    </FormDialog>
  )
}
