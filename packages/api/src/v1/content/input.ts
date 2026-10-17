import {
  contentPathProblem,
  isReservedSlug,
  userRemoteProblem,
} from "@nonete/content"
import { z } from "zod"

const repository = z
  .string()
  .min(1)
  .max(63)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .describe(
    "Slug of a content repository: lowercase letters, digits and single hyphens"
  )

// A new slug becomes the first segment of the repository's reader routes,
// so it can't take a name the web or the gateway already answers.
const newRepository = repository.refine((slug) => !isReservedSlug(slug), {
  message:
    "Ese slug está reservado por la plataforma (admin, api, login…); elige otro",
})

const name = z.string().trim().min(1).max(100).describe("Display name")

const url = z
  .url({ protocol: /^https?$/ })
  .describe(
    "HTTP(S) URL of the git repository; a private one carries its credentials (https://user:token@host/owner/repo.git)"
  )

// A user's remote is held to a stricter rule than an admin's: the backend
// clones it from inside the platform's network.
const userUrl = z
  .url({ protocol: /^https$/ })
  .refine((value) => userRemoteProblem(value) === undefined, {
    message: "Esa dirección no está permitida: usa una URL https pública",
  })
  .describe(
    "HTTPS URL of a public git host; a private repository carries its token (https://user:token@host/owner/repo.git)"
  )

const ref = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .describe("Branch, tag or commit to check out")

const contentPath = z
  .string()
  .trim()
  .refine((value) => contentPathProblem(value) === undefined, {
    message:
      "La carpeta debe ser una ruta relativa al repositorio, sin segmentos vacíos ni que empiecen por punto (docs, sitio/docs)",
  })
  .describe(
    "Folder of the git repository where the content lives, with / separators; empty for the root"
  )

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
  menuSchema: z.object({ repository }),
  diagramSchema: z.object({ repository }),
  typeSchema: z.object({ repository }),
  entitySchema: z.object({
    repository,
    type: z
      .string()
      .min(1)
      .describe("Catalog type id: the name of its folder under catalog/"),
  }),
  createRepository: z
    .object({
      slug: newRepository,
      name,
      url: url.optional(),
      hosted: hosted.optional(),
      ref: ref.default("main"),
      path: contentPath.default(""),
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
      path: contentPath.optional(),
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
  listContentFolders: z
    .object({
      url: url
        .optional()
        .describe(
          "URL of a git repository to read; with credentials if private"
        ),
      slug: repository
        .optional()
        .describe("A stored repository, read at its stored URL"),
      ref: ref
        .optional()
        .describe(
          "Branch, tag or commit to read; the remote's HEAD when left out"
        ),
    })
    .refine(
      (input) => (input.url === undefined) !== (input.slug === undefined),
      {
        message: "Send either url or slug",
      }
    ),
  listMyContentFolders: z
    .object({
      url: userUrl
        .optional()
        .describe("URL of a git repository to read; with its token if private"),
      slug: repository
        .optional()
        .describe("One of the caller's repositories, read at its stored URL"),
      ref: ref
        .optional()
        .describe(
          "Branch, tag or commit to read; the remote's HEAD when left out"
        ),
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
  createMyRepository: z.object({
    slug: newRepository,
    name,
    url: userUrl,
    ref: ref.default("main"),
    path: contentPath.default(""),
  }),
  updateMyRepository: z.object({
    slug: repository.describe("Slug of the repository to edit; never changes"),
    name: name.optional(),
    url: userUrl.optional(),
    ref: ref.optional(),
    path: contentPath.optional(),
  }),
  listMyBranches: z
    .object({
      url: userUrl
        .optional()
        .describe("URL of a git repository to read; with its token if private"),
      slug: repository
        .optional()
        .describe("One of the caller's repositories, read at its stored URL"),
    })
    .refine(
      (input) => (input.url === undefined) !== (input.slug === undefined),
      {
        message: "Send either url or slug",
      }
    ),
  deleteMyRepository: z.object({ slug: repository }),
  deleteRepository: z.object({ slug: repository }),
  syncRepository: z.object({ slug: repository }),
}
