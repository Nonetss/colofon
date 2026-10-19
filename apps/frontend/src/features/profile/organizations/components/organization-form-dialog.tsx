import { type SyntheticEvent, useEffect, useState } from "react"
import { textVariants } from "@/components/shared/brand/typography"
import { FormField } from "@/components/shared/form/field-label"
import { FormDialog } from "@/components/shared/form/form-dialog"
import { Input } from "@/components/ui/input"
import {
  useOrganizationCreate,
  useOrganizationUpdate,
} from "@/features/profile/organizations/hooks/use-my-organizations"
import type { MyOrganization } from "@/features/profile/organizations/model/types"
import { slugify } from "@/lib/slugify"

interface OrganizationFormDialogProps {
  /** The organization to rename, or `null` to create one. */
  organization: MyOrganization | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OrganizationFormDialog({
  organization,
  open,
  onOpenChange,
}: OrganizationFormDialogProps) {
  const createOrganization = useOrganizationCreate()
  const updateOrganization = useOrganizationUpdate()
  const isEditing = organization !== null

  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [slugTouched, setSlugTouched] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(organization?.name ?? "")
    setSlug(organization?.slug ?? "")
    setSlugTouched(organization !== null)
  }, [open, organization])

  const isPending = createOrganization.isPending || updateOrganization.isPending

  const handleOpenChange = (next: boolean) => {
    if (isPending) return
    onOpenChange(next)
  }

  const handleNameChange = (value: string) => {
    setName(value)
    if (!slugTouched) setSlug(slugify(value))
  }

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    const values = { name: name.trim(), slug: slug.trim() }
    if (organization !== null) {
      await updateOrganization.mutateAsync({ id: organization.id, ...values })
    } else {
      await createOrganization.mutateAsync(values)
    }
    handleOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={isEditing ? "Editar organización" : "Nueva organización"}
      description={
        isEditing
          ? "Cambia el nombre o el slug de la organización."
          : "Serás su propietario. Después podrás invitar a otras personas y compartir con ella tus repositorios."
      }
      onSubmit={handleSubmit}
      isPending={isPending}
      submitLabel={isEditing ? "Guardar" : "Crear organización"}
    >
      <FormField label="Nombre" htmlFor="organization-name">
        <Input
          id="organization-name"
          required
          maxLength={100}
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
        />
      </FormField>
      <FormField
        label="Slug"
        htmlFor="organization-slug"
        hint="Minúsculas, números y guiones. Único en la plataforma."
      >
        <Input
          id="organization-slug"
          required
          pattern="[a-z0-9-]+"
          className={textVariants({ role: "data" })}
          value={slug}
          onChange={(e) => {
            setSlugTouched(true)
            setSlug(e.target.value)
          }}
        />
      </FormField>
    </FormDialog>
  )
}
