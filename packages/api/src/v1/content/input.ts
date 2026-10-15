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
  createRepository: z.object({
    slug: repository,
    name,
    url,
    ref: ref.default("main"),
  }),
  updateRepository: z.object({
    slug: repository.describe("Slug of the repository to edit; never changes"),
    name: name.optional(),
    url: url.optional(),
    ref: ref.optional(),
  }),
  deleteRepository: z.object({ slug: repository }),
  syncRepository: z.object({ slug: repository }),
}
