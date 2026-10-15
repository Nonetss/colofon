import type { AppRouterClient } from "@nonete/api/router"

type ContentClient = AppRouterClient["v1"]["content"]

export type HostedRepository = Awaited<
  ReturnType<ContentClient["listRepositories"]>
>[number]

export type FolderEntry = Awaited<
  ReturnType<ContentClient["readFolder"]>
>["entries"][number]

export type RepositoryFile = Awaited<ReturnType<ContentClient["readFile"]>>
