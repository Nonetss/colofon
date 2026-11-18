import { skipToken } from "@tanstack/react-query"
import { type SyntheticEvent, useEffect, useState } from "react"
import { Text } from "@/components/shared/brand/typography"
import { FormDialog } from "@/components/shared/form/form-dialog"
import { ContentPathField } from "@/features/content-repositories/manage"
import {
  useSharedRepositoryFolders,
  useSharedRepositoryPathUpdate,
} from "@/features/profile/repositories/hooks/use-shared-repositories"
import type { SharedRepository } from "@/features/profile/repositories/model/types"

interface SharedRepositoryPathDialogProps {
  repository: SharedRepository | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** What the folders are read for: the repository, while the dialog is open. */
function foldersInputOf(repository: SharedRepository | null, open: boolean) {
  if (!open || repository === null) return skipToken
  return { slug: repository.slug }
}

/**
 * Where a repository shared with the user reads its content from. It is the
 * one thing a member changes: the folder is the owner's site and every
 * member's.
 */
export function SharedRepositoryPathDialog({
  repository,
  open,
  onOpenChange,
}: SharedRepositoryPathDialogProps) {
  const updatePath = useSharedRepositoryPathUpdate()
  const [path, setPath] = useState("")

  useEffect(() => {
    if (open) setPath(repository?.path ?? "")
  }, [open, repository])

  const folders = useSharedRepositoryFolders(foldersInputOf(repository, open))

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (repository === null) return
    if (path.trim() !== repository.path) {
      await updatePath.mutateAsync({
        slug: repository.slug,
        path: path.trim(),
      })
    }
    onOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        if (!updatePath.isPending) onOpenChange(next)
      }}
      title="Cambiar la carpeta del contenido"
      description={
        repository === null
          ? undefined
          : `Carpeta de "${repository.name}" de la que se lee su documentación.`
      }
      onSubmit={handleSubmit}
      isPending={updatePath.isPending}
      submitLabel="Guardar"
    >
      <ContentPathField value={path} onChange={setPath} folders={folders} />
      <Text as="p" variant="meta" tone="muted">
        El repositorio no es tuyo: la carpeta es la misma para su propietario y
        para todos los miembros con los que se comparte, así que el cambio lo
        ven todos. Solo puede ser una carpeta que ya exista en el repositorio.
      </Text>
    </FormDialog>
  )
}
