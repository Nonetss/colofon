import type { Dirent } from "node:fs"
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"

// The files and folders the contract names, and reading them: a file's
// text, a folder's entries, and the pages of docs/ with the paths a `page`
// field or a menu entry can name.

export const CONFIG_FILE = "doc.config.yaml"
export const CATALOG_DIR = "catalog"
export const DOCS_DIR = "docs"
export const TYPE_FILE = "_type.yaml"
export const MENU_FILE = "menu.yaml"
export const DIAGRAMS_DIR = "diagrams"
/** The folder of a content repository that holds its style modules. */
export const STYLES_DIR = "styles"
/** The folder of the skills the platform serves, under the content root. */
export const SKILLS_DIR = "skills"
/** The page path the generated catalog pages own; docs/ can't use it. */
export const CATALOG_PATH = "catalog"

export async function readText(file: string): Promise<string | undefined> {
  try {
    return await readFile(file, "utf8")
  } catch (error) {
    if (isMissingFile(error)) return undefined
    throw error
  }
}

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT"
}

/** The entries of `dir` sorted by name, or none if it does not exist. */
export async function listDir(dir: string): Promise<Dirent[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    return entries.sort((a, b) => a.name.localeCompare(b.name))
  } catch (error) {
    if (isMissingFile(error)) return []
    throw error
  }
}

/** Like `listDir`, without the entries whose name starts with `.`. */
export async function listVisible(dir: string): Promise<Dirent[]> {
  const entries = await listDir(dir)
  return entries.filter((entry) => !entry.name.startsWith("."))
}

/** Whether a docs/ path is under the reserved `catalog` folder. */
export function isReservedDocsPath(docsPath: string): boolean {
  return docsPath === CATALOG_PATH || docsPath.startsWith(`${CATALOG_PATH}/`)
}

/** The `.mdx` files of docs/, with `/` separators, outside `catalog/`. */
export async function docMdxFiles(root: string): Promise<string[]> {
  const entries = await listDocFiles(path.join(root, DOCS_DIR))
  return entries
    .map((entry) => entry.split(path.sep).join("/"))
    .filter((file) => file.endsWith(".mdx") && !isReservedDocsPath(file))
}

/** Pages a `page` field can name: paths in docs/ without `.mdx`, a folder's `index.mdx` as the folder. */
export function docPagePaths(files: readonly string[]): string[] {
  const paths: string[] = []
  for (const file of files) {
    const page = pagePathOf(file)
    if (page !== "") paths.push(page)
  }
  return paths.sort()
}

/** Every folder of docs/ that holds a page, at any depth (`containers/komodo`). */
export function docFolderPaths(files: readonly string[]): string[] {
  const folders = new Set<string>()
  for (const file of files) {
    const parts = file.split("/").slice(0, -1)
    for (let depth = 1; depth <= parts.length; depth++) {
      folders.add(parts.slice(0, depth).join("/"))
    }
  }
  return [...folders].sort()
}

async function listDocFiles(dir: string): Promise<string[]> {
  try {
    return await readdir(dir, { recursive: true })
  } catch (error) {
    if (isMissingFile(error)) return []
    throw error
  }
}

/**
 * A page's path: its file under docs/ without `.mdx`, a folder's
 * `index.mdx` named by the folder, and `docs/index.mdx` (the home) as `""`.
 */
export function pagePathOf(file: string): string {
  const withoutExt = file.slice(0, -".mdx".length)
  if (withoutExt === "index") return ""
  if (withoutExt.endsWith("/index"))
    return withoutExt.slice(0, -"/index".length)
  return withoutExt
}

/** Every regular file under `dir`, relative to it with `/`, skipping hidden entries. */
export async function listFiles(dir: string, prefix = ""): Promise<string[]> {
  const files: string[] = []
  for (const entry of await listVisible(dir)) {
    const relative = relativeTo(prefix, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await listFiles(path.join(dir, entry.name), relative)))
      continue
    }
    if (entry.isFile()) files.push(relative)
  }
  return files
}

function relativeTo(prefix: string, name: string): string {
  if (prefix === "") return name
  return `${prefix}/${name}`
}
