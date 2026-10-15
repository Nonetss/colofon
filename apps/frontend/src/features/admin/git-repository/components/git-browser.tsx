import { type ReactNode, useEffect, useState } from "react"
import { Text, textVariants } from "@/components/shared/brand/typography"
import { Hint } from "@/components/shared/feedback/hint"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { GitBreadcrumb } from "@/features/admin/git-repository/components/git-breadcrumb"
import { GitFileTree } from "@/features/admin/git-repository/components/git-file-tree"
import { GitFileView } from "@/features/admin/git-repository/components/git-file-view"
import { GitFolderTable } from "@/features/admin/git-repository/components/git-folder-table"
import {
  useRepositoryBranches,
  useRepositoryFile,
  useRepositoryFolder,
} from "@/features/admin/git-repository/hooks/use-git-browser"
import { useGitLocation } from "@/features/admin/git-repository/hooks/use-git-location"
import {
  branchesInput,
  fileInput,
  folderInput,
  isNotFound,
  parentFolder,
  shownBranch,
} from "@/features/admin/git-repository/model/git-location"
import type {
  FolderEntry,
  HostedRepository,
} from "@/features/admin/git-repository/model/types"
import { getIcon } from "@/lib/icon-registry"
import { cn } from "@/lib/utils"

const BranchIcon = getIcon("entities", "gitBranch")
const PanelIcon = getIcon("views", "sidebar")

/**
 * One hosted repository's code: its branch, the folder or file the URL
 * names, and the trail back to its root. An open file keeps the
 * repository's tree beside it, as GitHub and Gitea do, unless it is hidden
 * or there is no room. Every click is a history entry.
 */
export function GitBrowser({ repository }: { repository: HostedRepository }) {
  const { location, navigate, replace } = useGitLocation()
  const [treeShown, setTreeShown] = useState(true)
  const branches = useRepositoryBranches(branchesInput(repository))
  const listing = branches.data
  const branch =
    listing === undefined
      ? undefined
      : shownBranch(location.branch, repository.ref, listing)
  const folder = useRepositoryFolder(
    folderInput(repository.slug, branch, location)
  )
  const file = useRepositoryFile(fileInput(repository.slug, branch, location))

  // A folder or file that isn't on this branch (a stale link, a branch
  // switch) falls back to the branch's root, without a history entry.
  const missing = isNotFound(folder.error) || isNotFound(file.error)
  const atRoot = location.path === "" && location.file === ""
  useEffect(() => {
    if (!missing || atRoot || branch === undefined) return
    replace({ branch, path: "", file: "" })
  }, [missing, atRoot, branch, replace])

  const shownBranchName = branch ?? ""
  const at = (path: string, file: string) =>
    navigate({ branch: shownBranchName, path, file })
  const open = (entry: FolderEntry) => {
    if (entry.kind === "folder") at(entry.path, "")
    if (entry.kind === "file") at(parentFolder(entry.path), entry.path)
  }

  if (branches.isPending) return <Status>Cargando ramas…</Status>
  if (listing === undefined || branch === undefined) {
    if (listing !== undefined && listing.branches.length === 0) {
      return (
        <Status>
          Todavía no se ha hecho push a este repositorio. Súbele contenido con
          git push a su URL de git.
        </Status>
      )
    }
    return <Status>No se pudieron leer las ramas del repositorio.</Status>
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="@container flex flex-col gap-3 @xl:flex-row @xl:items-center @xl:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          {location.file !== "" && !treeShown && (
            <TreeToggle
              label="Mostrar el árbol de ficheros"
              className="hidden @3xl:inline-flex"
              onClick={() => setTreeShown(true)}
            />
          )}
          <GitBreadcrumb
            repositoryName={repository.name}
            folder={shownFolderOf(location)}
            fileName={fileNameOf(location.file)}
            onOpenFolder={(path) => at(path, "")}
          />
        </div>
        <BranchSelect
          branches={listing.branches}
          value={branch}
          onChange={(next) =>
            navigate({ branch: next, path: location.path, file: "" })
          }
        />
      </div>

      {location.file === "" && (
        <>
          {folder.isPending && <Status>Cargando carpeta…</Status>}
          {folder.isError && !isNotFound(folder.error) && (
            <Status>No se pudo leer la carpeta.</Status>
          )}
          {folder.data !== undefined && (
            <GitFolderTable entries={folder.data.entries} onOpen={open} />
          )}
        </>
      )}
      {location.file !== "" && (
        <div className="@container flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 gap-4">
            {treeShown && (
              <aside className="hidden w-72 shrink-0 flex-col overflow-hidden rounded-md border @3xl:flex">
                <div className="flex items-center justify-between gap-2 border-b bg-muted/40 py-1 pr-1 pl-3">
                  <Text variant="label" tone="muted">
                    Ficheros
                  </Text>
                  <TreeToggle
                    label="Ocultar el árbol de ficheros"
                    onClick={() => setTreeShown(false)}
                  />
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-1">
                  <GitFileTree
                    slug={repository.slug}
                    branch={branch}
                    openFile={location.file}
                    onOpenFile={(path) => at(parentFolder(path), path)}
                  />
                </div>
              </aside>
            )}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              {file.isPending && <Status>Cargando fichero…</Status>}
              {file.isError && !isNotFound(file.error) && (
                <Status>No se pudo leer el fichero.</Status>
              )}
              {file.data !== undefined && <GitFileView file={file.data} />}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** The folder the breadcrumb ends at: the open file's, or the listed one. */
function shownFolderOf(location: { path: string; file: string }): string {
  if (location.file !== "") return parentFolder(location.file)
  return location.path
}

function fileNameOf(file: string): string | undefined {
  if (file === "") return undefined
  return file.slice(file.lastIndexOf("/") + 1)
}

function TreeToggle({
  label,
  className,
  onClick,
}: {
  label: string
  className?: string
  onClick: () => void
}) {
  return (
    <Hint label={label}>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={label}
        className={cn("shrink-0 text-muted-foreground", className)}
        onClick={onClick}
      >
        <PanelIcon className="size-4" />
      </Button>
    </Hint>
  )
}

function Status({ children }: { children: ReactNode }) {
  return (
    <Text as="p" variant="compact" tone="muted" className="py-2">
      {children}
    </Text>
  )
}

function BranchSelect({
  branches,
  value,
  onChange,
}: {
  branches: string[]
  value: string
  onChange: (branch: string) => void
}) {
  const items = branches.map((branch) => ({ value: branch, label: branch }))
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(next) => {
        if (next !== null) onChange(next)
      }}
    >
      <SelectTrigger
        aria-label="Rama"
        className={cn("w-full @xl:w-64", textVariants({ role: "data" }))}
      >
        <BranchIcon className="size-4 text-muted-foreground" />
        <SelectValue>{value}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value} label={item.label}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
