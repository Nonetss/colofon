import { type SyntheticEvent, useEffect, useState } from "react"
import { textVariants } from "@/components/shared/brand/typography"
import { FormField } from "@/components/shared/form/field-label"
import { FormDialog } from "@/components/shared/form/form-dialog"
import { SegmentedPicker } from "@/components/shared/form/segmented-picker"
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
  SharingField,
  sameOrganizations,
} from "@/features/profile/organizations"
import {
  useOwnRepositoryBranches,
  useOwnRepositoryCreate,
  useOwnRepositoryFolders,
  useOwnRepositoryShare,
  useOwnRepositoryUpdate,
} from "@/features/profile/repositories/hooks/use-own-repositories"
import {
  createInput,
  type OwnRepositoryFormValues,
  type OwnRepositorySource,
  ownBranchesSource,
  ownRepositorySourceOf,
  sharedOrganizationIds,
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

const SOURCE_OPTIONS = [
  { value: "url", label: "Repositorio externo" },
  { value: "hosted", label: "Alojado en la plataforma" },
] as const satisfies readonly { value: OwnRepositorySource; label: string }[]

function sourceHint(source: OwnRepositorySource): string {
  if (source === "url") {
    return "La plataforma lo descarga de su URL y lo sincroniza cada cinco minutos."
  }
  return "La plataforma guarda el repositorio: súbelo con git push a la URL que verás en su tarjeta. Por ahora esa URL no pide credenciales: cualquiera que la conozca puede clonarlo y hacer push."
}

function refHint(
  source: OwnRepositorySource,
  branches: { isError: boolean; error: Error | null }
): string {
  if (source === "hosted") {
    return "Rama que se publica: cada push a ella actualiza el contenido. Hasta el primer push, escríbela."
  }
  if (branches.isError) {
    return `No se pudieron leer las ramas (${branches.error?.message ?? "error desconocido"}); escribe la rama, el tag o el commit.`
  }
  return "Rama, tag o commit que se descarga. Con la URL completa, se elige de una lista."
}

function dialogDescription(repository: OwnRepository | null): string {
  if (repository !== null) {
    return `El slug "${repository.slug}" no cambia: es la dirección de sus páginas.`
  }
  return "Solo tú y las organizaciones con las que lo compartas veréis sus páginas."
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
  const shareRepository = useOwnRepositoryShare()
  const isEditing = repository !== null

  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [slugTouched, setSlugTouched] = useState(false)
  const [source, setSource] = useState<OwnRepositorySource>("url")
  const [url, setUrl] = useState("")
  const [ref, setRef] = useState("main")
  const [contentPath, setContentPath] = useState("")
  // An edited repository's ref, or one the user picked, is never replaced by
  // the remote's default branch.
  const [refChosen, setRefChosen] = useState(false)
  const [organizationIds, setOrganizationIds] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    setName(repository?.name ?? "")
    setSlug(repository?.slug ?? "")
    setSlugTouched(false)
    setSource(ownRepositorySourceOf(repository))
    setUrl("")
    setRef(repository?.ref ?? "main")
    setContentPath(repository?.path ?? "")
    setRefChosen(repository !== null)
    setOrganizationIds(sharedOrganizationIds(repository))
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

  const isPending =
    createRepository.isPending ||
    updateRepository.isPending ||
    shareRepository.isPending

  const handleOpenChange = (next: boolean) => {
    if (isPending) return
    onOpenChange(next)
  }

  const handleNameChange = (value: string) => {
    setName(value)
    if (!isEditing && !slugTouched) setSlug(slugify(value))
  }

  const saveRepository = (values: OwnRepositoryFormValues) => {
    if (repository !== null)
      return updateRepository.mutateAsync(updateInput(repository, values))
    return createRepository.mutateAsync(createInput(slug, source, values))
  }

  // A hosted repository has no URL and no login to prepare.
  const preparedAccess = () => {
    if (source === "hosted")
      return Promise.resolve({ url: "", credentialId: undefined })
    return access.prepare()
  }

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    const prepared = await preparedAccess()
    const values = {
      name: name.trim(),
      url: prepared.url,
      ref: ref.trim(),
      path: contentPath.trim(),
      credentialId: prepared.credentialId,
    }
    const saved = await saveRepository(values)
    if (
      !sameOrganizations(sharedOrganizationIds(repository), organizationIds)
    ) {
      await shareRepository.mutateAsync({
        slug: saved.slug,
        organizationIds,
      })
    }
    onOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={isEditing ? "Editar repositorio" : "Añadir repositorio"}
      description={dialogDescription(repository)}
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
      {!isEditing && (
        <FormField label="Origen" hint={sourceHint(source)}>
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
          htmlFor="own-repository-url"
          hint={urlHintOf(repository)}
        >
          <Input
            id="own-repository-url"
            type="url"
            required={!isEditing || access.needsUrl}
            placeholder={
              repository?.url ?? "https://github.com/usuario/docs.git"
            }
            className={textVariants({ role: "data" })}
            autoComplete="off"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </FormField>
      )}
      {source === "url" && (
        <CredentialField access={access} editing={isEditing} />
      )}
      <BranchRefField
        branches={branches}
        value={ref}
        onChange={chooseRef}
        onSuggest={setRef}
        chosen={refChosen}
        textHint={refHint(source, branches)}
      />
      <ContentPathField
        value={contentPath}
        onChange={setContentPath}
        folders={folders}
      />
      <SharingField
        value={organizationIds}
        onChange={setOrganizationIds}
        hint="Sus miembros lo leen como tú, mientras sigas en la organización. Solo tú lo editas."
        emptyText="No perteneces a ninguna organización, así que solo tú lo lees."
      />
    </FormDialog>
  )
}
