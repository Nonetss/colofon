import { z } from "zod"
import { searchLimit, searchQuery } from "#shared/search"

const repository = z
  .string()
  .min(1)
  .max(63)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .describe("Slug of a content repository")

/** Whether `value` is a relative path that can't climb out of its root. */
function isRelativePath(value: string): boolean {
  return value
    .split("/")
    .every((segment) => segment !== "" && segment !== "." && segment !== "..")
}

const relativePath = z.string().min(1).max(1024).refine(isRelativePath, {
  message: "A relative path without empty, . or .. segments",
})

export const docsInput = {
  page: z.object({
    repository,
    path: z
      .union([z.literal(""), relativePath])
      .default("")
      .describe(
        "Page path under docs/ without .mdx (`red/dns`); empty for the repository's home"
      ),
  }),
  file: z.object({
    repository,
    path: relativePath.describe(
      "Path of an image under docs/ (`red/img/zonas.svg`)"
    ),
  }),
  search: z.object({
    query: searchQuery(),
    repository: z
      .string()
      .optional()
      .describe(
        "Slug of the repository to search; every readable repository when missing or naming none"
      ),
    limit: searchLimit(10, 20),
  }),
}
