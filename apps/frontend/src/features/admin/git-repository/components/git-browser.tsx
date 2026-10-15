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
import type { HostedRepository } from "@/features/admin/git-repository/model/types"
import { getIcon } from "@/lib/icon-registry"
import { cn } from "@/lib/utils"

const BranchIcon = getIcon("entities", "gitBranch")
const PanelIcon = getIcon("views", "sidebar")

/**
 * One hosted repository's code as a file tree with its branch on top, the
 * file the URL names and the trail back to its root. An open file keeps the
 * tree beside it, as GitHub and Gitea do; the tree collapses to a narrow
 * rail like the admin sidebar, and with it collapsed or without room for it
 * the branch moves next to the trail. Every file opened and every crumb
 * followed is a history entry.
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
  const fileOpen = location.file !== ""
  const collapsed = fileOpen && !treeShown

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

  const branchSelect = (className: string) => (
    <BranchSelect
      branches={listing.branches}
      value={branch}
      className={className}
      onChange={(next) =>
        navigate({ branch: next, path: location.path, file: "" })
      }
    />
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="@container flex flex-col gap-3 @xl:flex-row @xl:items-center @xl:justify-between">
        <GitBreadcrumb
          repositoryName={repository.name}
          folder={shownFolderOf(location)}
          fileName={fileNameOf(location.file)}
          onOpenFolder={(path) => at(path, "")}
        />
        {fileOpen && branchSelect(headerBranchClass(treeShown))}
      </div>

      <div className="@container flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 gap-4">
          <section
            aria-label="Árbol de ficheros"
            className={cn(
              "min-h-0 flex-col overflow-hidden rounded-md border transition-[width] duration-200 ease-linear",
              treePanelClass(fileOpen, collapsed)
            )}
          >
            <div className="flex h-12 shrink-0 items-center justify-center gap-1 border-b bg-muted/40 p-1.5">
              {!collapsed && branchSelect("min-w-0 flex-1")}
              {fileOpen && (
                <TreeToggle
                  collapsed={collapsed}
                  onClick={() => setTreeShown(collapsed)}
                />
              )}
            </div>
            {/* Collapsed, the tree stays mounted so it keeps what was unfolded. */}
            <div
              className={cn(
                "min-h-0 flex-1 overflow-y-auto p-1",
                collapsed && "hidden"
              )}
            >
              <GitFileTree
                slug={repository.slug}
                branch={branch}
                folder={location.path}
                openFile={location.file}
                showSizes={!fileOpen}
                onOpenFile={(path) => at(parentFolder(path), path)}
              />
            </div>
          </section>
          {fileOpen && (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              {file.isPending && <Status>Cargando fichero…</Status>}
              {file.isError && !isNotFound(file.error) && (
                <Status>No se pudo leer el fichero.</Status>
              )}
              {file.data !== undefined && <GitFileView file={file.data} />}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * The tree's panel: the whole screen for a folder; beside an open file,
 * where there is room for both, a column or, collapsed, a rail.
 */
function treePanelClass(fileOpen: boolean, collapsed: boolean): string {
  if (!fileOpen) return "flex flex-1"
  if (collapsed) return "hidden w-12 shrink-0 @3xl:flex"
  return "hidden w-72 shrink-0 @3xl:flex"
}

/**
 * The branch next to the trail, shown when an open file's tree (which
 * carries the branch) is collapsed or has no room.
 */
function headerBranchClass(treeShown: boolean): string {
  if (treeShown) return "w-full @xl:w-64 @3xl:hidden"
  return "w-full @xl:w-64"
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

function treeToggleLabel(collapsed: boolean): string {
  if (collapsed) return "Expandir el árbol de ficheros"
  return "Contraer el árbol de ficheros"
}

function TreeToggle({
  collapsed,
  onClick,
}: {
  collapsed: boolean
  onClick: () => void
}) {
  const label = treeToggleLabel(collapsed)
  return (
    <Hint label={label} side={hintSide(collapsed)}>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={label}
        aria-expanded={!collapsed}
        className="shrink-0 text-muted-foreground"
        onClick={onClick}
      >
        <PanelIcon className="size-4" />
      </Button>
    </Hint>
  )
}

/** The rail is too narrow for a bubble above it to read well. */
function hintSide(collapsed: boolean): "top" | "right" {
  if (collapsed) return "right"
  return "top"
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
  className,
  onChange,
}: {
  branches: string[]
  value: string
  className: string
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
        className={cn(className, textVariants({ role: "data" }))}
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
