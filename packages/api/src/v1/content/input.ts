import { z } from "zod"

const repository = z
  .string()
  .min(1)
  .max(63)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .describe(
    "Slug of a content repository: lowercase letters, digits and single hyphens"
  )

const name = z.string().trim().min(1).max(100).describe("Display name")

const url = z
  .url({ protocol: /^https?$/ })
  .describe(
    "HTTP(S) URL of the git repository; a private one carries its credentials (https://user:token@host/owner/repo.git)"
  )

const ref = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .describe("Branch, tag or commit to check out")

const hosted = z
  .literal(true)
  .describe(
    "Host the repository on the platform, served at /git/<slug>.git, instead of reading it from a URL"
  )

const branch = z
  .string()
  .min(1)
  .max(255)
  .refine((value) => !value.startsWith("-") && !value.includes(":"), {
    message: "Not a branch name",
  })
  .describe("Branch to read")

/** Whether `value` is a path under the repository root that can't climb. */
function isRepositoryPath(value: string): boolean {
  return value
    .split("/")
    .every((segment) => segment !== "" && segment !== "." && segment !== "..")
}

const filePath = z
  .string()
  .min(1)
  .max(1024)
  .refine(isRepositoryPath, {
    message: "A relative path without empty, . or .. segments",
  })
  .describe("Path from the repository root, with / separators")

/** Neither both a URL and `hosted`, nor, unless `optional`, neither. */
function oneSource(optional: boolean) {
  return (input: { url?: string; hosted?: true }) => {
    const sent = Number(input.url !== undefined) + Number(input.hosted === true)
    if (optional) return sent <= 1
    return sent === 1
  }
}

export const contentInput = {
  schemaCatalog: z.object({ repository }),
  configSchema: z.object({ repository }),
  typeSchema: z.object({ repository }),
  entitySchema: z.object({
    repository,
    type: z
      .string()
      .min(1)
      .describe("Catalog type id: the name of its folder under catalogo/"),
  }),
  createRepository: z
    .object({
      slug: repository,
      name,
      url: url.optional(),
      hosted: hosted.optional(),
      ref: ref.default("main"),
    })
    .refine(oneSource(false), { message: "Send either url or hosted" }),
  updateRepository: z
    .object({
      slug: repository.describe(
        "Slug of the repository to edit; never changes"
      ),
      name: name.optional(),
      url: url
        .optional()
        .describe("A new URL; makes a hosted repository external"),
      hosted: hosted.optional(),
      ref: ref.optional(),
    })
    .refine(oneSource(true), { message: "Send url or hosted, not both" }),
  listBranches: z
    .object({
      url: url
        .optional()
        .describe(
          "URL of a git repository to read; with credentials if private"
        ),
      slug: repository
        .optional()
        .describe("A stored repository, read at its stored URL"),
    })
    .refine(
      (input) => (input.url === undefined) !== (input.slug === undefined),
      {
        message: "Send either url or slug",
      }
    ),
  readFolder: z.object({
    slug: repository,
    branch,
    path: z
      .union([z.literal(""), filePath])
      .default("")
      .describe(
        "Folder from the repository root, with / separators; empty for the root"
      ),
  }),
  readFile: z.object({ slug: repository, branch, path: filePath }),
  deleteRepository: z.object({ slug: repository }),
  syncRepository: z.object({ slug: repository }),
}
