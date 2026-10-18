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
    "name: Homelab",
    'contract: "2"',
    "header:",
    "  maquinas:",
    "    type: list",
    "    of: { type: ref, to: maquinas }",
  ].join("\n"),
  "catalog/ubicaciones/_type.yaml": [
    "name: Ubicación",
    "plural: Ubicaciones",
    "fields:",
    "  name: { type: text }",
  ].join("\n"),
  "catalog/ubicaciones/casa.yaml": "name: Casa\n",
  "catalog/maquinas/_type.yaml": [
    "name: Máquina",
    "plural: Máquinas",
    "fields:",
    "  ip: { type: ip, label: Dirección IP }",
    "  ubicacion: { type: ref, to: ubicaciones }",
    "  ficha: { type: page, optional: true }",
  ].join("\n"),
  "catalog/maquinas/pve-01.yaml": "ip: 192.168.1.10\nubicacion: casa\n",
  "catalog/maquinas/nas.yaml": "ip: 192.168.1.30\nubicacion: casa\n",
  "docs/index.mdx": "---\ntitle: Inicio\n---\n",
  "docs/red/index.mdx": "---\ntitle: Red\n---\n",
  "docs/red/dns.mdx": "---\ntitle: DNS\n---\n",
}
