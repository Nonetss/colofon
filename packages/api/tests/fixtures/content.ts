import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

/** A small valid content repository: two types, one pointing at the other. */
export const CONTENT_SITE: Record<string, string> = {
  "doc.config.yaml": 'nombre: Homelab\nplataforma: "1"\n',
  "catalogo/ubicaciones/_tipo.yaml":
    "nombre: Ubicación\nplural: Ubicaciones\ncampos:\n  nombre: { tipo: texto }\n",
  "catalogo/ubicaciones/casa.yaml": "nombre: Casa\n",
  "catalogo/maquinas/_tipo.yaml": [
    "nombre: Máquina",
    "plural: Máquinas",
    "campos:",
    "  ip: { tipo: ip }",
    "  ubicacion: { tipo: ref, a: ubicaciones }",
    "  ficha: { tipo: ficha, opcional: true }",
  ].join("\n"),
  "catalogo/maquinas/nas.yaml": "ip: 192.168.1.30\nubicacion: casa\n",
  "docs/index.mdx": "---\ntitulo: Inicio\n---\n",
  "docs/red/dns.mdx": "---\ntitulo: DNS\n---\n",
}

/** A content folder in a temp directory; `write` changes files in place. */
export type ContentFolder = {
  root: string
  write: (files: Record<string, string>) => Promise<void>
  remove: () => Promise<void>
}

export async function createContentFolder(
  files: Record<string, string> = CONTENT_SITE
): Promise<ContentFolder> {
  const root = await mkdtemp(path.join(tmpdir(), "api-content-"))
  const write = async (changes: Record<string, string>) => {
    for (const [file, text] of Object.entries(changes)) {
      const target = path.join(root, file)
      await mkdir(path.dirname(target), { recursive: true })
      await writeFile(target, text)
    }
  }
  await write(files)
  return {
    root,
    write,
    remove: () => rm(root, { recursive: true, force: true }),
  }
}
