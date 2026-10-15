import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

/** A content repository in a temporary folder; `remove` deletes it. */
export type ContentDir = { root: string; remove: () => Promise<void> }

/** Writes `files` (path relative to the root → text) to a new temp folder. */
export async function createContentDir(
  files: Record<string, string>
): Promise<ContentDir> {
  const root = await mkdtemp(path.join(tmpdir(), "content-"))
  for (const [file, text] of Object.entries(files)) {
    const target = path.join(root, file)
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, text)
  }
  return { root, remove: () => rm(root, { recursive: true, force: true }) }
}

/** A small valid site: two types, one pointing at the other, and two pages. */
export const VALID_SITE: Record<string, string> = {
  "doc.config.yaml": [
    "nombre: Homelab",
    'plataforma: "1"',
    "cabecera:",
    "  maquinas:",
    "    tipo: lista",
    "    de: { tipo: ref, a: maquinas }",
  ].join("\n"),
  "catalogo/ubicaciones/_tipo.yaml": [
    "nombre: Ubicación",
    "plural: Ubicaciones",
    "campos:",
    "  nombre: { tipo: texto }",
  ].join("\n"),
  "catalogo/ubicaciones/casa.yaml": "nombre: Casa\n",
  "catalogo/maquinas/_tipo.yaml": [
    "nombre: Máquina",
    "plural: Máquinas",
    "campos:",
    "  ip: { tipo: ip }",
    "  ubicacion: { tipo: ref, a: ubicaciones }",
    "  ficha: { tipo: ficha, opcional: true }",
  ].join("\n"),
  "catalogo/maquinas/pve-01.yaml": "ip: 192.168.1.10\nubicacion: casa\n",
  "catalogo/maquinas/nas.yaml": "ip: 192.168.1.30\nubicacion: casa\n",
  "docs/index.mdx": "---\ntitulo: Inicio\n---\n",
  "docs/red/index.mdx": "---\ntitulo: Red\n---\n",
  "docs/red/dns.mdx": "---\ntitulo: DNS\n---\n",
}
