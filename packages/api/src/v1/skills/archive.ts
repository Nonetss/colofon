import { gzipSync } from "node:zlib"

// A skill's archive (`agent-skills`, "archive" type): a gzipped ustar whose
// root holds the skill folder's files. Built by hand so the bytes depend only
// on the files: entries sorted by path, every mode, owner and time fixed, and
// the gzip header's time left at zero. The same files give the same bytes,
// and so the same digest, on every build and restart.

const BLOCK = 512
const NAME_LENGTH = 100
const PREFIX_LENGTH = 155
const encoder = new TextEncoder()

/** A file of the archive: its POSIX path from the root and its bytes. */
export type ArchiveFile = { path: string; content: string }

/** Whether `path` is relative and stays inside the root. */
export function isSafeArchivePath(path: string): boolean {
  if (path === "" || path.startsWith("/")) return false
  return path
    .split("/")
    .every((part) => part !== "" && part !== ".." && part !== ".")
}

/** The gzipped tar of `files`; throws on a path that leaves the root. */
export function buildTarGz(files: readonly ArchiveFile[]): Uint8Array {
  const sorted = [...files].sort((a, b) => compare(a.path, b.path))
  const blocks: Uint8Array[] = []
  for (const file of sorted) {
    if (!isSafeArchivePath(file.path))
      throw new Error(`Unsafe archive path: ${file.path}`)
    const content = encoder.encode(file.content)
    blocks.push(header(file.path, content.length), padded(content))
  }
  blocks.push(new Uint8Array(BLOCK * 2))
  return new Uint8Array(gzipSync(concat(blocks), { level: 9 }))
}

function compare(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

/** The ustar header of a regular file. */
function header(path: string, size: number): Uint8Array {
  const block = new Uint8Array(BLOCK)
  const { name, prefix } = splitPath(path)
  write(block, 0, NAME_LENGTH, name)
  writeOctal(block, 100, 8, 0o644)
  writeOctal(block, 108, 8, 0)
  writeOctal(block, 116, 8, 0)
  writeOctal(block, 124, 12, size)
  writeOctal(block, 136, 12, 0)
  block.fill(0x20, 148, 156)
  block[156] = 0x30
  write(block, 257, 6, "ustar\0")
  write(block, 263, 2, "00")
  write(block, 345, PREFIX_LENGTH, prefix)
  writeChecksum(block)
  return block
}

/** `path` as ustar's name and prefix, split at a slash when it's long. */
function splitPath(path: string): { name: string; prefix: string } {
  if (encoder.encode(path).length <= NAME_LENGTH)
    return { name: path, prefix: "" }
  const parts = path.split("/")
  for (let at = 1; at < parts.length; at++) {
    const prefix = parts.slice(0, at).join("/")
    const name = parts.slice(at).join("/")
    if (
      encoder.encode(prefix).length <= PREFIX_LENGTH &&
      encoder.encode(name).length <= NAME_LENGTH
    )
      return { name, prefix }
  }
  throw new Error(`Archive path too long: ${path}`)
}

function write(
  block: Uint8Array,
  offset: number,
  length: number,
  value: string
) {
  const bytes = encoder.encode(value)
  if (bytes.length > length) throw new Error(`Tar field too long: ${value}`)
  block.set(bytes, offset)
}

/** An octal number padded with zeros, then a NUL, filling `length` bytes. */
function writeOctal(
  block: Uint8Array,
  offset: number,
  length: number,
  value: number
) {
  write(
    block,
    offset,
    length,
    `${value.toString(8).padStart(length - 1, "0")}\0`
  )
}

/** The header's checksum: six octal digits, a NUL and a space. */
function writeChecksum(block: Uint8Array) {
  const sum = block.reduce((total, byte) => total + byte, 0)
  write(block, 148, 8, `${sum.toString(8).padStart(6, "0")}\0 `)
}

/** `content` followed by zeros up to a whole number of blocks. */
function padded(content: Uint8Array): Uint8Array {
  const size = Math.ceil(content.length / BLOCK) * BLOCK
  const block = new Uint8Array(size)
  block.set(content)
  return block
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}
