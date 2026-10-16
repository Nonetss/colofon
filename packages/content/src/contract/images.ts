import path from "node:path"

/** Image files a page can show, by extension. */
export const IMAGE_EXTENSIONS = [
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "avif",
  "svg",
] as const

/** Whether a file under `docs/` is an image a page can show. */
export function isImageFile(file: string): boolean {
  const extension = path.posix.extname(file).slice(1).toLowerCase()
  return IMAGE_EXTENSIONS.some((allowed) => allowed === extension)
}
