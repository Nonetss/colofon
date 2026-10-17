import { type SyntheticEvent, useEffect, useState } from "react"
import { textVariants } from "@/components/shared/brand/typography"
import { FormField } from "@/components/shared/form/field-label"
import { FormDialog } from "@/components/shared/form/form-dialog"
import { Input } from "@/components/ui/input"
import {
  BranchRefField,
  ContentPathField,
  CredentialField,
  foldersInput,
  useGitCredentials,
  useRepositoryAccess,
} from "@/features/content-repositories/manage"
import {
  useOwnRepositoryBranches,
  useOwnRepositoryCreate,
  useOwnRepositoryFolders,
  useOwnRepositoryUpdate,
} from "@/features/profile/repositories/hooks/use-own-repositories"
import {
  createInput,
  ownBranchesSource,
  updateInput,
} from "@/features/profile/repositories/model/repository-form"
import type { OwnRepository } from "@/features/profile/repositories/model/types"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { slugify } from "@/lib/slugify"

const URL_DEBOUNCE_MS = 500

interface OwnRepositoryFormDialogProps {
  /** The repository to edit, or `null` to add one. */
  repository: OwnRepository | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function urlHintOf(repository: OwnRepository | null): string {
  if (repository === null) {
    return "La dirección https del repositorio, sin credenciales: https://host/org/repo.git"
  }
  return "Déjala vacía para mantener la actual, token incluido."
}

export function OwnRepositoryFormDialog({
  repository,
  open,
  onOpenChange,
}: OwnRepositoryFormDialogProps) {
  const createRepository = useOwnRepositoryCreate()
  const updateRepository = useOwnRepositoryUpdate()
  const isEditing = repository !== null

  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [slugTouched, setSlugTouched] = useState(false)
  const [url, setUrl] = useState("")
  const [ref, setRef] = useState("main")
  const [contentPath, setContentPath] = useState("")
  // An edited repository's ref, or one the user picked, is never replaced by
  // the remote's default branch.
  const [refChosen, setRefChosen] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(repository?.name ?? "")
    setSlug(repository?.slug ?? "")
    setSlugTouched(false)
    setUrl("")
    setRef(repository?.ref ?? "main")
    setContentPath(repository?.path ?? "")
    setRefChosen(repository !== null)
  }, [open, repository])

  const credentials = useGitCredentials()
  const access = useRepositoryAccess({
    open,
    repository,
    credentials: credentials.data,
    url,
  })
  const debouncedUrl = useDebouncedValue(access.readUrl, URL_DEBOUNCE_MS)
  const branches = useOwnRepositoryBranches(
    ownBranchesSource(open, repository, debouncedUrl, access.readCredentialId)
  )

  const debouncedRef = useDebouncedValue(ref, URL_DEBOUNCE_MS)
  const folders = useOwnRepositoryFolders(
    foldersInput(
      ownBranchesSource(
        open,
        repository,
        debouncedUrl,
        access.readCredentialId
      ),
      debouncedRef
    )
  )

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
    const prepared = await access.prepare()
    const values = {
      name: name.trim(),
      url: prepared.url,
      ref: ref.trim(),
      path: contentPath.trim(),
      credentialId: prepared.credentialId,
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
      title={isEditing ? "Editar repositorio" : "Añadir repositorio"}
      description={
        isEditing
          ? `El slug "${repository.slug}" no cambia: es la dirección de sus páginas.`
          : "Solo tú verás sus páginas. La plataforma lo descarga y lo sincroniza cada cinco minutos."
      }
      onSubmit={handleSubmit}
      isPending={isPending}
      submitLabel={isEditing ? "Guardar" : "Añadir"}
      className="sm:max-w-2xl"
    >
      <FormField label="Nombre" htmlFor="own-repository-name">
        <Input
          id="own-repository-name"
          required
          maxLength={100}
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
        />
      </FormField>
      {!isEditing && (
        <FormField
          label="Slug"
          htmlFor="own-repository-slug"
          hint="Va al principio de la dirección de sus páginas. No se puede cambiar después."
        >
          <Input
            id="own-repository-slug"
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
        htmlFor="own-repository-url"
        hint={urlHintOf(repository)}
      >
        <Input
          id="own-repository-url"
          type="url"
          required={!isEditing || access.needsUrl}
          placeholder={repository?.url ?? "https://github.com/usuario/docs.git"}
          className={textVariants({ role: "data" })}
          autoComplete="off"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </FormField>
      <CredentialField access={access} editing={isEditing} />
      <BranchRefField
        branches={branches}
        value={ref}
        onChange={chooseRef}
        onSuggest={setRef}
        chosen={refChosen}
        textHint={
          branches.isError
            ? `No se pudieron leer las ramas (${branches.error.message}); escribe la rama, el tag o el commit.`
            : "Rama, tag o commit que se descarga. Con la URL completa, se elige de una lista."
        }
      />
      <ContentPathField
        value={contentPath}
        onChange={setContentPath}
        folders={folders}
      />
    </FormDialog>
  )
}
