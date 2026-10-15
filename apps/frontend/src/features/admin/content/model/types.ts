import type { AppRouterClient } from "@nonete/api/router"

type ContentClient = AppRouterClient["v1"]["content"]

export type ContentRepository = Awaited<
  ReturnType<ContentClient["listRepositories"]>
>[number]

export type CreateRepositoryInput = Parameters<
  ContentClient["createRepository"]
>[0]

export type UpdateRepositoryInput = Parameters<
  ContentClient["updateRepository"]
>[0]

/** Where a repository's git history lives: a URL, or the platform itself. */
export type RepositorySource = "url" | "hosted"
