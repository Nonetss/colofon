import { z } from "zod"

import { ROLE_NAMES } from "#shared/organization"

const role = z.enum(ROLE_NAMES)

const summary = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  role: role.describe("The caller's role in the organization"),
  memberCount: z.number().int(),
  createdAt: z.string(),
})

const memberItem = z.object({
  id: z.string().describe("The member id"),
  userId: z.string(),
  name: z.string(),
  email: z.string(),
  image: z.string().nullable(),
  role,
  isCaller: z.boolean().describe("Whether this member is the caller"),
  createdAt: z.string(),
})

const invitationItem = z.object({
  id: z.string(),
  email: z.string(),
  role,
  expiresAt: z.string(),
  createdAt: z.string(),
})

const receivedInvitation = z.object({
  id: z.string(),
  organization: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
  }),
  role,
  inviterName: z.string(),
  expiresAt: z.string(),
})

const done = z.object({ id: z.string(), success: z.boolean() })

export const myOrganizationOutput = {
  list: z.array(summary),
  get: summary.extend({
    members: z.array(memberItem),
    invitations: z
      .array(invitationItem)
      .describe(
        "Pending invitations; empty unless the caller is an owner or admin"
      ),
  }),
  create: summary,
  update: summary,
  delete: done,
  leave: done,
  invite: invitationItem,
  cancelInvitation: done,
  updateMemberRole: memberItem,
  removeMember: done,
  listInvitations: z.array(receivedInvitation),
  acceptInvitation: summary,
  rejectInvitation: done,
}
