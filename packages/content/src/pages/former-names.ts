import type { Dirent } from "node:fs"
import { readdir } from "node:fs/promises"
import path from "node:path"
import { CATALOG_DIR, DIAGRAMS_DIR, TYPE_FILE } from "#contract/load"
import type { PageProblem } from "#contract/problems"
import { STYLES_DIR } from "#styles/modules"

// The folders and files the contract named in Spanish before it moved to
// English (`content-contract`, "Former Spanish names are reported"). They are
// never read: each one a repository still holds is reported as a site
// problem naming where it moved, so a repository that lost its catalog,
// diagrams or styles to the rename sees why on its home.

/** The root folders that moved, with the folder each one is now. */
const FORMER_FOLDERS = [
  { name: "catalogo", now: CATALOG_DIR, what: "El catálogo va" },
  { name: "diagramas", now: DIAGRAMS_DIR, what: "Los diagramas van" },
  { name: "estilos", now: STYLES_DIR, what: "Los estilos van" },
] as const

/** The former name of a catalog type's declaration file. */
const FORMER_TYPE_FILE = "_tipo.yaml"

/** The problems of every former name the repository at `root` holds. */
export async function formerNameProblems(root: string): Promise<PageProblem[]> {
  const problems: PageProblem[] = []
  const rootEntries = await listDir(root)
  for (const folder of FORMER_FOLDERS) {
    const entry = rootEntries.find(
      (candidate) => candidate.name === folder.name
    )
    if (entry === undefined || !entry.isDirectory()) continue
    problems.push({
      file: folder.name,
      line: null,
      message: `${folder.what} ahora en ${folder.now}/: ${folder.name}/ no se lee hasta que la renombres`,
    })
  }
  for (const type of await listDir(path.join(root, CATALOG_DIR))) {
    if (!type.isDirectory()) continue
    const files = await listDir(path.join(root, CATALOG_DIR, type.name))
    const former = files.find((file) => file.name === FORMER_TYPE_FILE)
    if (former === undefined || !former.isFile()) continue
    problems.push({
      file: `${CATALOG_DIR}/${type.name}/${FORMER_TYPE_FILE}`,
      line: null,
      message: `La declaración de un tipo se llama ahora ${TYPE_FILE}: ${FORMER_TYPE_FILE} no se lee hasta que lo renombres`,
    })
  }
  return problems
}

async function listDir(dir: string): Promise<Dirent[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    return entries.sort((a, b) => a.name.localeCompare(b.name))
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT")
      return []
    throw error
  }
}
