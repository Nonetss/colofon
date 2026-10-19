import { z } from "zod"

import { organizationSlug, ROLE_NAMES } from "#shared/organization"

const organizationId = z.string().min(1).describe("The organization id")
const role = z.enum(ROLE_NAMES).describe("A built-in organization role")

export const myOrganizationInput = {
  get: z.object({ id: organizationId }),
  create: z.object({
    name: z.string().trim().min(1).describe("The name of the organization"),
    slug: organizationSlug().describe("The slug, unique across the system"),
  }),
  update: z.object({
    id: organizationId,
    name: z.string().trim().min(1).optional().describe("The new name"),
    slug: organizationSlug().optional().describe("The new slug"),
  }),
  delete: z.object({ id: organizationId }),
  leave: z.object({ id: organizationId }),

  invite: z.object({
    organizationId,
    email: z.string().trim().toLowerCase().email().describe("Who to invite"),
    role: role.describe("The role given once the invitation is accepted"),
  }),
  cancelInvitation: z.object({
    id: z.string().min(1).describe("The invitation id"),
  }),
  updateMemberRole: z.object({
    memberId: z.string().min(1).describe("The member id"),
    role: role.describe("The member's new role"),
  }),
  removeMember: z.object({
    memberId: z.string().min(1).describe("The member id"),
  }),

  acceptInvitation: z.object({
    id: z.string().min(1).describe("The invitation id"),
  }),
  rejectInvitation: z.object({
    id: z.string().min(1).describe("The invitation id"),
  }),
}
