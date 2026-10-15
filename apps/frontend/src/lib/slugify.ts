/**
 * `value` as a slug: lowercase ASCII letters and digits joined by single
 * hyphens, accents dropped and no hyphen at either end.
 */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}
