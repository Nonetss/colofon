import type { SyntheticEvent } from "react"
import type { DialogFieldDescriptor } from "@/components/shared/form/dialog-fields"
import { FormDialog } from "@/components/shared/form/form-dialog"
import { useApiKeyUpdate } from "@/features/api-keys/manage/hooks/use-api-keys"
import type { ApiKeyListItem } from "@/features/api-keys/manage/model/types"
import { useDialogForm } from "@/hooks/use-dialog-form"

interface RenameFormValues {
  name: string
}

/** Better Auth's default `maximumNameLength`, which `v1.apiKey.update` checks. */
const MAX_NAME_LENGTH = 32

const fields: DialogFieldDescriptor<RenameFormValues>[] = [
  {
    kind: "text",
    key: "name",
    label: "Nombre",
    placeholder: "Ej. Claude Code en el portátil",
    required: true,
  },
]

function currentName(apiKey: ApiKeyListItem | null): string {
  if (apiKey === null || apiKey.name === null) return ""
  return apiKey.name
}

export type ApiKeyRenameDialogProps = {
  /** The key being renamed; the dialog is open while it is set. */
  apiKey: ApiKeyListItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Renames one of the user's API keys; the key and its expiry stay as they are. */
export function ApiKeyRenameDialog({
  apiKey,
  open,
  onOpenChange,
}: ApiKeyRenameDialogProps) {
  const updateApiKey = useApiKeyUpdate()
  const form = useDialogForm(open, { name: "" }, { name: currentName(apiKey) })
  const name = form.values.name.trim()

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (apiKey === null) return
    await updateApiKey.mutateAsync({ id: apiKey.id, name })
    onOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Cambiar nombre"
      description="Ponle un nombre que te diga qué IA o equipo la usa. La clave no cambia."
      onSubmit={handleSubmit}
      isPending={updateApiKey.isPending}
      submitDisabled={name === "" || name.length > MAX_NAME_LENGTH}
      submitLabel="Guardar"
      form={form}
      fields={fields}
    />
  )
}
