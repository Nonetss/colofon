import type { AppRouterClient } from "@nonete/api/router"

type ContentClient = AppRouterClient["v1"]["content"]

export type OwnRepositories = Awaited<
  ReturnType<ContentClient["listMyRepositories"]>
>

export type OwnRepository = OwnRepositories[number]

export type CreateOwnRepositoryInput = Parameters<
  ContentClient["createMyRepository"]
>[0]

export type UpdateOwnRepositoryInput = Parameters<
  ContentClient["updateMyRepository"]
>[0]
