import type { SyntheticEvent } from "react"
import { Text } from "@/components/shared/brand/typography"
import type { DialogFieldDescriptor } from "@/components/shared/form/dialog-fields"
import { FormDialog } from "@/components/shared/form/form-dialog"
import { SecretFieldList } from "@/features/secrets/manage/components/secret-field-list"
import {
  useSecretCreate,
  useSecretUpdate,
} from "@/features/secrets/manage/hooks/use-secrets"
import {
  createInputOf,
  emptySecretForm,
  type SecretFormValues,
  secretFormFrom,
  secretFormProblems,
  updateInputOf,
} from "@/features/secrets/manage/model/secret-form"
import type { SecretListItem } from "@/features/secrets/manage/model/types"
import { useDialogForm } from "@/hooks/use-dialog-form"

const fields: DialogFieldDescriptor<SecretFormValues>[] = [
  {
    kind: "text",
    key: "name",
    label: "Nombre",
    placeholder: "komodo",
    autoComplete: "off",
    hint: "El agente lo usa en los marcadores: {{nombre.campo}}.",
  },
  {
    kind: "textarea",
    key: "description",
    label: "Descripción (opcional)",
    placeholder: "Para qué sirve; el agente la lee",
    rows: 2,
  },
  {
    kind: "textarea",
    key: "origins",
    label: "Orígenes",
    placeholder: "https://komodo.casa.lan\nhttp://10.0.0.5:3003",
    rows: 3,
    hint: "Uno por línea, sin ruta. *.dominio cubre sus subdominios. Solo se envía a estos.",
  },
  {
    kind: "checkbox",
    key: "allowWrite",
    label: "Escritura",
    description: "Permitir POST, PUT, PATCH y DELETE",
  },
  {
    kind: "checkbox",
    key: "allowInUrl",
    label: "En la URL",
    description: "Permitir sus marcadores en la ruta y la query",
  },
  {
    kind: "checkbox",
    key: "allowInBody",
    label: "En el body",
    description:
      "Permitir sus marcadores en el body (el servicio podría guardarlo)",
  },
]

/** The dialog's title and submit label, for a new or an existing secret. */
function dialogCopy(secret: SecretListItem | null) {
  if (secret === null)
    return { title: "Nuevo secreto", submit: "Crear secreto" }
  return { title: `Editar ${secret.name}`, submit: "Guardar" }
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
  const initial = secret === null ? undefined : secretFormFrom(secret)
  const form = useDialogForm(open, emptySecretForm(), initial)
  const needsEveryValue = secret?.unreadable === true
  const pending = createSecret.isPending || updateSecret.isPending
  const copy = dialogCopy(secret)

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    form.clearErrors()
    const problems = secretFormProblems(form.values, needsEveryValue)
    if (problems.name !== undefined) form.setError("name", problems.name)
    if (problems.origins !== undefined) {
      form.setError("origins", problems.origins)
    }
    if (problems.fields !== undefined) form.setError("fields", problems.fields)
    if (Object.keys(problems).length > 0) return
    try {
      if (secret === null) {
        await createSecret.mutateAsync(createInputOf(form.values))
      } else {
        await updateSecret.mutateAsync(updateInputOf(secret.id, form.values))
      }
      onOpenChange(false)
    } catch {
      // The mutation already toasted the error; the dialog stays open.
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={copy.title}
      description="Tu IA lo usa a través del MCP sin ver sus valores: la plataforma los pone en la petición y los tacha en la respuesta."
      onSubmit={handleSubmit}
      isPending={pending}
      submitLabel={copy.submit}
      form={form}
      fields={fields}
    >
      {needsEveryValue && (
        <Text as="p" variant="compact" tone="destructive">
          Sus valores no se pueden descifrar (cambió la clave del servidor):
          escríbelos todos de nuevo.
        </Text>
      )}
      <SecretFieldList
        fields={form.values.fields}
        onChange={(next) => form.set("fields", next)}
        needsEveryValue={needsEveryValue}
        problem={form.errors.fields}
      />
    </FormDialog>
  )
}
