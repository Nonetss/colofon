import { realpath, stat } from "node:fs/promises"
import path from "node:path"

// Where a repository's content lives inside its clone: the clone folder
// joined with the repository's content path, which must stay inside it.

const MAX_CONTENT_PATH = 255

/**
 * Why `value` can't be a repository's content path, in Spanish, or
 * `undefined` when it can: empty (the root) or a relative path of plain
 * segments, with `/` separators.
 */
export function contentPathProblem(value: string): string | undefined {
  if (value === "") return undefined
  if (value.length > MAX_CONTENT_PATH) return "La carpeta es demasiado larga"
  if (value.startsWith("/"))
    return "La carpeta debe ser relativa al repositorio"
  const plain = value
    .split("/")
    .every((segment) => segment !== "" && !segment.startsWith("."))
  if (!plain) {
    return "La carpeta no puede tener segmentos vacíos ni empezar por punto"
  }
  return undefined
}

export type ContentRoot =
  | { ok: true; root: string }
  | { ok: false; reason: "missing" | "outside" }

async function isDirectory(folder: string): Promise<boolean> {
  try {
    return (await stat(folder)).isDirectory()
  } catch {
    return false
  }
}

function isInside(parent: string, child: string): boolean {
  const relative = path.relative(parent, child)
  if (relative === "") return true
  return !relative.startsWith("..") && !path.isAbsolute(relative)
}

/**
 * The folder the content of the clone at `cloneFolder` is read from. An
 * empty `contentPath` is the clone itself. Otherwise the folder must exist,
 * be a directory and, symbolic links followed, lie inside the clone.
 */
export async function resolveContentRoot(
  cloneFolder: string,
  contentPath: string
): Promise<ContentRoot> {
  if (contentPath === "") return { ok: true, root: cloneFolder }
  if (contentPathProblem(contentPath) !== undefined) {
    return { ok: false, reason: "outside" }
  }
  const candidate = path.join(cloneFolder, contentPath)
  try {
    const [realClone, realRoot] = await Promise.all([
      realpath(cloneFolder),
      realpath(candidate),
    ])
    if (!isInside(realClone, realRoot)) return { ok: false, reason: "outside" }
  } catch {
    return { ok: false, reason: "missing" }
  }
  if (!(await isDirectory(candidate))) return { ok: false, reason: "missing" }
  return { ok: true, root: candidate }
}
