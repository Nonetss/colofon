import { type SyntheticEvent, useEffect, useState } from "react"
import { textVariants } from "@/components/shared/brand/typography"
import { FormField } from "@/components/shared/form/field-label"
import { FormDialog } from "@/components/shared/form/form-dialog"
import { SegmentedPicker } from "@/components/shared/form/segmented-picker"
import { Input } from "@/components/ui/input"
import { RefField } from "@/features/admin/content/components/ref-field"
import {
  useContentRepositoryCreate,
  useContentRepositoryUpdate,
} from "@/features/admin/content/hooks/use-content-repositories"
import {
  createInput,
  initialSource,
  updateInput,
  urlRequired,
} from "@/features/admin/content/model/repository-form"
import type {
  ContentRepository,
  RepositorySource,
} from "@/features/admin/content/model/types"
import { slugify } from "@/lib/slugify"

interface ContentRepositoryFormDialogProps {
  /** The repository to edit, or `null` to create one. */
  repository: ContentRepository | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Create only hosted repositories: the source is fixed and not shown. */
  hostedOnly?: boolean
}

const SOURCE_OPTIONS = [
  { value: "url", label: "URL externa" },
  { value: "hosted", label: "Alojado en la plataforma" },
] as const satisfies readonly { value: RepositorySource; label: string }[]

function urlHintOf(repository: ContentRepository | null): string {
  if (repository === null || repository.hosted) {
    return "Para uno privado, pon las credenciales en la URL: https://usuario:token@host/org/repo.git"
  }
  return "Déjala vacía para mantener la actual, credenciales incluidas."
}

function dialogCopy(repository: ContentRepository | null, hostedOnly: boolean) {
  if (repository === null && hostedOnly) {
    return {
      title: "Nuevo repositorio alojado",
      description:
        "La plataforma guarda el repositorio y publica su contenido. Créalo y sube su historial con git push.",
      submitLabel: "Crear repositorio",
    }
  }
  if (repository === null) {
    return {
      title: "Nuevo repositorio",
      description:
        "Conecta un repositorio git de documentación o alójalo en la plataforma, que lo sincroniza tras cada push.",
      submitLabel: "Crear repositorio",
    }
  }
  return {
    title: "Editar repositorio",
    description: `El slug "${repository.slug}" no cambia: es el que usan los editores en su URL del catálogo.`,
    submitLabel: "Guardar",
  }
}

function urlPlaceholderOf(repository: ContentRepository | null): string {
  if (repository === null || repository.hosted) {
    return "https://git.example.com/org/docs.git"
  }
  return repository.url
}

function startingSource(
  repository: ContentRepository | null,
  hostedOnly: boolean
): RepositorySource {
  if (hostedOnly) return "hosted"
  return initialSource(repository)
}

function sourceHint(
  repository: ContentRepository | null,
  source: RepositorySource
): string {
  if (source === "url") {
    return "La plataforma clona el repositorio y lo sincroniza cada cinco minutos."
  }
  if (repository !== null && !repository.hosted) {
    return "El contenido pasa a leerse del repositorio de la plataforma: sube su historial con git push. La URL externa deja de usarse."
  }
  return "La plataforma guarda el repositorio. Cualquiera que llegue a la plataforma puede clonarlo y hacer push, sin credenciales."
}

export function ContentRepositoryFormDialog({
  repository,
  open,
  onOpenChange,
  hostedOnly = false,
}: ContentRepositoryFormDialogProps) {
  const createRepository = useContentRepositoryCreate()
  const updateRepository = useContentRepositoryUpdate()
  const isEditing = repository !== null
  const copy = dialogCopy(repository, hostedOnly)

  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [slugTouched, setSlugTouched] = useState(false)
  const [source, setSource] = useState<RepositorySource>("url")
  const [url, setUrl] = useState("")
  const [ref, setRef] = useState("main")
  // An edited repository's ref, or one the user picked, is never replaced by
  // the remote's default branch.
  const [refChosen, setRefChosen] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(repository?.name ?? "")
    setSlug(repository?.slug ?? "")
    setSlugTouched(false)
    setSource(startingSource(repository, hostedOnly))
    setUrl("")
    setRef(repository?.ref ?? "main")
    setRefChosen(repository !== null)
  }, [open, repository, hostedOnly])

  const chooseRef = (value: string) => {
    setRefChosen(true)
    setRef(value)
  }

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
    const values = {
      source,
      name: name.trim(),
      url: url.trim(),
      ref: ref.trim(),
    }
    if (repository !== null) {
      await updateRepository.mutateAsync(updateInput(repository, values))
    } else {
      await createRepository.mutateAsync(createInput(slug, values))
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
      {!hostedOnly && (
        <FormField label="Origen" hint={sourceHint(repository, source)}>
          <SegmentedPicker
            label="Origen del repositorio"
            options={SOURCE_OPTIONS}
            value={source}
            onChange={setSource}
            columns={2}
          />
        </FormField>
      )}
      {source === "url" && (
        <FormField
          label="URL del repositorio git"
          htmlFor="content-repository-url"
          hint={urlHintOf(repository)}
        >
          <Input
            id="content-repository-url"
            type="url"
            required={urlRequired(repository, source)}
            placeholder={urlPlaceholderOf(repository)}
            className={textVariants({ role: "data" })}
            autoComplete="off"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </FormField>
      )}
      <RefField
        open={open}
        repository={repository}
        source={source}
        url={url}
        value={ref}
        onChange={chooseRef}
        onSuggest={setRef}
        chosen={refChosen}
      />
    </FormDialog>
  )
}
