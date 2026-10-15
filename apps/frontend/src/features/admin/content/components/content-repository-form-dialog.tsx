import { type SyntheticEvent, useEffect, useState } from "react"
import { textVariants } from "@/components/shared/brand/typography"
import { FormField } from "@/components/shared/form/field-label"
import { FormDialog } from "@/components/shared/form/form-dialog"
import { Input } from "@/components/ui/input"
import {
  useContentRepositoryCreate,
  useContentRepositoryUpdate,
} from "@/features/admin/content/hooks/use-content-repositories"
import type { ContentRepository } from "@/features/admin/content/model/types"
import { slugify } from "@/lib/slugify"

interface ContentRepositoryFormDialogProps {
  /** The repository to edit, or `null` to create one. */
  repository: ContentRepository | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

type UpdateFields = { name?: string; url?: string; ref?: string }

/**
 * What an edit sends: only the fields that changed. An empty URL keeps the
 * stored one, credentials included, since the list only shows it masked.
 */
function changedFields(
  repository: ContentRepository,
  values: { name: string; url: string; ref: string }
): UpdateFields {
  return {
    ...(values.name !== repository.name && { name: values.name }),
    ...(values.url !== "" && { url: values.url }),
    ...(values.ref !== repository.ref && { ref: values.ref }),
  }
}

function dialogCopy(repository: ContentRepository | null) {
  if (repository === null) {
    return {
      title: "Nuevo repositorio",
      description:
        "Conecta un repositorio git de documentación. La plataforma lo clona y lo sincroniza cada cinco minutos.",
      submitLabel: "Crear repositorio",
      urlHint:
        "Para uno privado, pon las credenciales en la URL: https://usuario:token@host/org/repo.git",
    }
  }
  return {
    title: "Editar repositorio",
    description: `El slug "${repository.slug}" no cambia: es el que usan los editores en su URL del catálogo.`,
    submitLabel: "Guardar",
    urlHint: "Déjala vacía para mantener la actual, credenciales incluidas.",
  }
}

export function ContentRepositoryFormDialog({
  repository,
  open,
  onOpenChange,
}: ContentRepositoryFormDialogProps) {
  const createRepository = useContentRepositoryCreate()
  const updateRepository = useContentRepositoryUpdate()
  const isEditing = repository !== null
  const copy = dialogCopy(repository)

  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [slugTouched, setSlugTouched] = useState(false)
  const [url, setUrl] = useState("")
  const [ref, setRef] = useState("main")

  useEffect(() => {
    if (!open) return
    setName(repository?.name ?? "")
    setSlug(repository?.slug ?? "")
    setSlugTouched(false)
    setUrl("")
    setRef(repository?.ref ?? "main")
  }, [open, repository])

  const isPending = createRepository.isPending || updateRepository.isPending

  const handleOpenChange = (next: boolean) => {
    if (isPending) return
    onOpenChange(next)
  }

  const handleNameChange = (value: string) => {
    setName(value)
    if (!isEditing && !slugTouched) setSlug(slugify(value))
  }

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    const values = { name: name.trim(), url: url.trim(), ref: ref.trim() }
    if (repository !== null) {
      await updateRepository.mutateAsync({
        slug: repository.slug,
        ...changedFields(repository, values),
      })
    } else {
      await createRepository.mutateAsync({ slug, ...values })
    }
    handleOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={copy.title}
      description={copy.description}
      onSubmit={handleSubmit}
      isPending={isPending}
      submitLabel={copy.submitLabel}
    >
      <FormField label="Nombre" htmlFor="content-repository-name">
        <Input
          id="content-repository-name"
          required
          maxLength={100}
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
        />
      </FormField>
      {!isEditing && (
        <FormField
          label="Slug"
          htmlFor="content-repository-slug"
          hint="Va al final de la URL del catálogo. No se puede cambiar después."
        >
          <Input
            id="content-repository-slug"
            required
            maxLength={63}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            className={textVariants({ role: "data" })}
            value={slug}
            onChange={(e) => {
              setSlugTouched(true)
              setSlug(e.target.value)
            }}
          />
        </FormField>
      )}
      <FormField
        label="URL del repositorio git"
        htmlFor="content-repository-url"
        hint={copy.urlHint}
      >
        <Input
          id="content-repository-url"
          type="url"
          required={!isEditing}
          placeholder={
            repository?.url ?? "https://git.example.com/org/docs.git"
          }
          className={textVariants({ role: "data" })}
          autoComplete="off"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </FormField>
      <FormField
        label="Ref"
        htmlFor="content-repository-ref"
        hint="Rama, tag o commit que se descarga."
      >
        <Input
          id="content-repository-ref"
          required
          maxLength={255}
          className={textVariants({ role: "data" })}
          value={ref}
          onChange={(e) => setRef(e.target.value)}
        />
      </FormField>
    </FormDialog>
  )
}
