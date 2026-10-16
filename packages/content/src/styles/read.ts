import type { Dirent } from "node:fs"
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import type { PageProblem } from "#contract/problems"
import { cleanStyleModule } from "#styles/clean"
import {
  MAX_MODULE_BYTES,
  MAX_STYLESHEET_BYTES,
  STYLES_DIR,
  styleModuleFiles,
} from "#styles/modules"

// Reads a content repository's `estilos/` (`content-styles`): every module it
// holds, in the platform's order, cleaned and joined into one stylesheet.
// Entries that are not a module are reported and ignored, and the size
// limits leave out a module too large, or every module from the one that
// would take the stylesheet over its limit.

/** The repository's stylesheet (empty without modules) and its problems. */
export type RepositoryStyles = { css: string; problems: PageProblem[] }

export async function readStyles(
  root: string,
  docsFiles: ReadonlySet<string>,
  fileUrlOf: (docsPath: string) => string
): Promise<RepositoryStyles> {
  const folder = path.join(root, STYLES_DIR)
  const entries = await listEntries(folder)
  const modules = styleModuleFiles()
  const problems: PageProblem[] = []
  const present = new Set<string>()
  for (const entry of entries) {
    if (entry.isFile() && modules.includes(entry.name)) {
      present.add(entry.name)
      continue
    }
    problems.push({
      file: `${STYLES_DIR}/${entry.name}`,
      line: null,
      message: `No es un módulo de estilos: los módulos son ${modules.join(", ")}`,
    })
  }

  const parts: string[] = []
  let total = 0
  let overLimit = false
  for (const name of modules) {
    if (!present.has(name)) continue
    const file = `${STYLES_DIR}/${name}`
    if (overLimit) {
      problems.push(leftOut(file))
      continue
    }
    const source = await readFile(path.join(folder, name))
    if (source.byteLength > MAX_MODULE_BYTES) {
      problems.push({
        file,
        line: null,
        message: `Ocupa más de ${MAX_MODULE_BYTES / 1024} KiB: se ha dejado fuera`,
      })
      continue
    }
    const cleaned = cleanStyleModule(source.toString("utf8"), {
      file,
      docsFiles,
      fileUrlOf,
    })
    problems.push(...cleaned.problems)
    const size = Buffer.byteLength(cleaned.css)
    if (total + size > MAX_STYLESHEET_BYTES) {
      overLimit = true
      problems.push(leftOut(file))
      continue
    }
    total += size
    parts.push(cleaned.css)
  }
  return { css: parts.join("\n"), problems }
}

function leftOut(file: string): PageProblem {
  return {
    file,
    line: null,
    message: `Los estilos pasan de ${MAX_STYLESHEET_BYTES / 1024} KiB: se han dejado fuera este módulo y los siguientes`,
  }
}

/** The visible entries of `folder`; none when it doesn't exist. */
async function listEntries(folder: string): Promise<Dirent[]> {
  try {
    const entries = await readdir(folder, { withFileTypes: true })
    return entries
      .filter((entry) => !entry.name.startsWith("."))
      .sort((a, b) => a.name.localeCompare(b.name))
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT")
      return []
    throw error
  }
}
