import type { AppRouterClient } from "@nonete/api/router"

type MyOrganizationClient = AppRouterClient["v1"]["myOrganization"]

export type MyOrganizations = Awaited<ReturnType<MyOrganizationClient["list"]>>

export type MyOrganization = MyOrganizations[number]

export type OrganizationRole = MyOrganization["role"]

export type MyOrganizationDetail = Awaited<
  ReturnType<MyOrganizationClient["get"]>
>

export type OrganizationMember = MyOrganizationDetail["members"][number]

export type OrganizationInvitation = MyOrganizationDetail["invitations"][number]

export type ReceivedInvitation = Awaited<
  ReturnType<MyOrganizationClient["listInvitations"]>
>[number]

/** The input of the `myOrganization` procedure `K`. */
export type MyOrganizationInput<K extends keyof MyOrganizationClient> =
  Parameters<MyOrganizationClient[K]>[0]
