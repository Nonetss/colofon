import { type CSSProperties, useEffect, useRef, useState } from "react"
import { Text } from "@/components/shared/brand/typography"
import { useRepositoryFolder } from "@/features/admin/git-repository/hooks/use-git-browser"
import {
  ancestorFolders,
  isNotFound,
  toggledFolder,
} from "@/features/admin/git-repository/model/git-location"
import type { FolderEntry } from "@/features/admin/git-repository/model/types"
import { getIcon } from "@/lib/icon-registry"
import { cn } from "@/lib/utils"

const ICONS = {
  folder: getIcon("entities", "folder"),
  file: getIcon("entities", "file"),
  submodule: getIcon("entities", "submodule"),
} as const
const Chevron = getIcon("controls", "chevronRight")

/** Left padding of a row `depth` folders deep, plus `extraRem`. */
function indentOf(depth: number, extraRem = 0): CSSProperties {
  return { paddingLeft: `${depth * 0.75 + 0.5 + extraRem}rem` }
}

const ROW =
  "flex w-full min-w-0 items-center gap-1.5 rounded-sm py-1 pr-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"

interface GitFileTreeProps {
  slug: string
  branch: string
  /** The open file, highlighted; its folders start unfolded. */
  openFile: string
  onOpenFile: (path: string) => void
}

/**
 * The repository's folders and files as a tree, like GitHub's and Gitea's
 * side panel next to an open file. Each folder is read when it is first
 * unfolded; a folder only folds and unfolds, a file opens.
 */
export function GitFileTree({
  slug,
  branch,
  openFile,
  onOpenFile,
}: GitFileTreeProps) {
  const [unfolded, setUnfolded] = useState<Set<string>>(
    () => new Set(ancestorFolders(openFile))
  )

  // Opening a file from elsewhere (breadcrumb, back button) reveals it.
  useEffect(() => {
    setUnfolded((current) => {
      const missing = ancestorFolders(openFile).filter(
        (folder) => !current.has(folder)
      )
      if (missing.length === 0) return current
      return new Set([...current, ...missing])
    })
  }, [openFile])

  return (
    <nav aria-label="Ficheros del repositorio">
      <TreeLevel
        slug={slug}
        branch={branch}
        folder=""
        depth={0}
        openFile={openFile}
        unfolded={unfolded}
        onToggle={(path) =>
          setUnfolded((current) => toggledFolder(current, path))
        }
        onOpenFile={onOpenFile}
      />
    </nav>
  )
}

interface TreeLevelProps {
  slug: string
  branch: string
  folder: string
  depth: number
  openFile: string
  unfolded: ReadonlySet<string>
  onToggle: (path: string) => void
  onOpenFile: (path: string) => void
}

function TreeLevel(props: TreeLevelProps) {
  const { slug, branch, folder, depth } = props
  const listing = useRepositoryFolder({ slug, branch, path: folder })
  const indent = indentOf(depth)

  if (listing.isPending) {
    return <TreeNote style={indent}>Cargando…</TreeNote>
  }
  if (listing.isError) {
    const message = isNotFound(listing.error)
      ? "No existe en esta rama."
      : "No se pudo leer la carpeta."
    return <TreeNote style={indent}>{message}</TreeNote>
  }
  if (listing.data.entries.length === 0) {
    return <TreeNote style={indent}>Carpeta vacía</TreeNote>
  }

  return (
    <ul className="flex flex-col">
      {listing.data.entries.map((entry) => (
        <li key={entry.path}>
          <TreeEntry entry={entry} {...props} />
        </li>
      ))}
    </ul>
  )
}

function TreeEntry({
  entry,
  depth,
  ...props
}: TreeLevelProps & { entry: FolderEntry }) {
  const { openFile, unfolded, onToggle, onOpenFile } = props
  const Icon = ICONS[entry.kind]
  const indent = indentOf(depth)

  if (entry.kind === "folder") {
    const isUnfolded = unfolded.has(entry.path)
    return (
      <>
        <button
          type="button"
          aria-expanded={isUnfolded}
          className={cn(ROW, "hover:bg-muted")}
          style={indent}
          onClick={() => onToggle(entry.path)}
        >
          <Chevron
            aria-hidden
            className={cn(
              "size-3.5 shrink-0 text-muted-foreground transition-transform",
              isUnfolded && "rotate-90"
            )}
          />
          <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <EntryName name={entry.name} />
        </button>
        {isUnfolded && (
          <TreeLevel {...props} folder={entry.path} depth={depth + 1} />
        )}
      </>
    )
  }

  // Files and submodules line up with folder names, past the chevron.
  const leafIndent = indentOf(depth, 1.25)

  if (entry.kind === "submodule") {
    return (
      <div className={cn(ROW, "text-muted-foreground")} style={leafIndent}>
        <Icon aria-hidden className="size-4 shrink-0" />
        <EntryName name={entry.name} />
      </div>
    )
  }

  return (
    <FileRow
      name={entry.name}
      isOpen={entry.path === openFile}
      style={leafIndent}
      onOpen={() => onOpenFile(entry.path)}
    />
  )
}

function FileRow({
  name,
  isOpen,
  style,
  onOpen,
}: {
  name: string
  isOpen: boolean
  style: CSSProperties
  onOpen: () => void
}) {
  const ref = useRef<HTMLButtonElement>(null)
  const Icon = ICONS.file

  // Keep the open file in view when the tree first shows it.
  useEffect(() => {
    if (isOpen) ref.current?.scrollIntoView({ block: "nearest" })
  }, [isOpen])

  return (
    <button
      ref={ref}
      type="button"
      aria-current={isOpen ? "page" : undefined}
      className={cn(
        ROW,
        "hover:bg-muted",
        isOpen && "bg-accent text-accent-foreground hover:bg-accent"
      )}
      style={style}
      onClick={onOpen}
    >
      <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      <EntryName name={name} />
    </button>
  )
}

function EntryName({ name }: { name: string }) {
  return (
    <Text variant="compact" className="min-w-0 truncate">
      {name}
    </Text>
  )
}

function TreeNote({
  style,
  children,
}: {
  style: CSSProperties
  children: string
}) {
  return (
    <Text as="p" variant="compact" tone="muted" className="py-1" style={style}>
      {children}
    </Text>
  )
}
