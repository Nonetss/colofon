import { db } from "@nonete/db"
import {
  contentRepository,
  contentRepositoryShare,
  type Invitation,
  invitation,
  type Member,
  member,
  organization,
  secret,
  secretShare,
} from "@nonete/db/schema"
import { and, eq, inArray } from "drizzle-orm"
import type { z } from "zod"

import type { Context } from "#context"
import { errors } from "#errors"
import { toIso } from "#shared/dates"
import { assertFound } from "#shared/not-found"
import { INVITATION_TTL_MS, ROLE_NAMES } from "#shared/organization"
import type { myOrganizationInput } from "#v1/my-organization/input"
import type { myOrganizationOutput } from "#v1/my-organization/output"

// The organizations a signed-in user belongs to, as they run them from
// their profile. Every procedure acts only where the caller is a member;
// any other organization is NOT_FOUND, for admins too (they have the admin
// feature). Owners and admins manage members and invitations; only owners
// change the organization itself, grant or revoke `owner` and remove an
// owner, and an organization always keeps one owner.

const NOT_FOUND_MESSAGE = "Organización no encontrada"
const MEMBER_NOT_FOUND = "Miembro no encontrado"
const INVITATION_NOT_FOUND = "Invitación no encontrada"
const FORBIDDEN_MESSAGE = "Tu rol en la organización no permite hacerlo"

export type OrganizationRole = (typeof ROLE_NAMES)[number]

type Summary = z.infer<typeof myOrganizationOutput.create>
type MemberItem = z.infer<typeof myOrganizationOutput.updateMemberRole>
type InvitationItem = z.infer<typeof myOrganizationOutput.invite>

type User = NonNullable<Context["user"]>

/**
 * The most powerful built-in role in a stored role, which may hold several
 * separated by commas; a custom role counts as `member`.
 */
export function roleOf(stored: string | null): OrganizationRole {
  if (stored === null) return "member"
  const held = stored.split(",").map((part) => part.trim())
  for (const name of ROLE_NAMES) {
    if (held.includes(name)) return name
  }
  return "member"
}

/** Whether `role` invites, cancels invitations, changes roles and removes. */
export function canManageMembers(role: OrganizationRole): boolean {
  return role === "owner" || role === "admin"
}

function callerOf(context: Context): User {
  if (context.user === null) throw errors.UNAUTHORIZED()
  return context.user
}

function forbidden() {
  return errors.FORBIDDEN({ message: FORBIDDEN_MESSAGE })
}

/** The caller's membership of `organizationId`; NOT_FOUND without one. */
async function membershipOf(
  organizationId: string,
  userId: string
): Promise<Member> {
  return assertFound(
    await db.query.member.findFirst({ where: { organizationId, userId } }),
    NOT_FOUND_MESSAGE
  )
}

function requireManager(own: Member) {
  if (!canManageMembers(roleOf(own.role))) throw forbidden()
}

function requireOwner(own: Member) {
  if (roleOf(own.role) !== "owner") throw forbidden()
}

/** CONFLICT when removing or demoting `target` would leave no owner. */
async function assertNotLastOwner(target: Member) {
  if (roleOf(target.role) !== "owner") return
  const members = await db.query.member.findMany({
    where: { organizationId: target.organizationId },
  })
  const owners = members.filter((row) => roleOf(row.role) === "owner")
  if (owners.length > 1) return
  throw errors.CONFLICT({
    message: "La organización necesita al menos un propietario",
  })
}

/** CONFLICT when another organization already has `slug`. */
async function assertSlugFree(slug: string, organizationId: string | null) {
  const taken = await db.query.organization.findFirst({ where: { slug } })
  if (taken === undefined || taken.id === organizationId) return
  throw errors.CONFLICT({
    message: "Ya existe una organización con ese slug",
  })
}

/** The shares of `userId`'s repositories with `organizationId`. */
function sharesOfOwnerIn(organizationId: string, userId: string) {
  return and(
    eq(contentRepositoryShare.organizationId, organizationId),
    inArray(
      contentRepositoryShare.repositoryId,
      db
        .select({ id: contentRepository.id })
        .from(contentRepository)
        .where(eq(contentRepository.ownerId, userId))
    )
  )
}

/** The shares of `userId`'s secrets with `organizationId`. */
function secretSharesOfOwnerIn(organizationId: string, userId: string) {
  return and(
    eq(secretShare.organizationId, organizationId),
    inArray(
      secretShare.secretId,
      db.select({ id: secret.id }).from(secret).where(eq(secret.userId, userId))
    )
  )
}

/**
 * Ends `target`'s membership along with the shares of their repositories
 * and secrets with that organization, which its members would no longer
 * read or use anyway.
 */
async function removeMembership(target: Member) {
  await db.transaction(async (tx) => {
    await tx.delete(member).where(eq(member.id, target.id))
    await tx
      .delete(contentRepositoryShare)
      .where(sharesOfOwnerIn(target.organizationId, target.userId))
    await tx
      .delete(secretShare)
      .where(secretSharesOfOwnerIn(target.organizationId, target.userId))
  })
}

function isPending(row: Invitation, now: Date): boolean {
  return row.status === "pending" && row.expiresAt > now
}

function toInvitationItem(row: Invitation): InvitationItem {
  return {
    id: row.id,
    email: row.email,
    role: roleOf(row.role),
    expiresAt: toIso(row.expiresAt),
    createdAt: toIso(row.createdAt),
  }
}

type MemberUser = { name: string; email: string; image: string | null }

function toMemberItem(
  row: Member,
  user: MemberUser,
  callerId: string
): MemberItem {
  return {
    id: row.id,
    userId: row.userId,
    name: user.name,
    email: user.email,
    image: user.image,
    role: roleOf(row.role),
    isCaller: row.userId === callerId,
    createdAt: toIso(row.createdAt),
  }
}

async function summaryOf(
  organizationId: string,
  role: OrganizationRole
): Promise<Summary> {
  const row = assertFound(
    await db.query.organization.findFirst({
      where: { id: organizationId },
      with: { members: true },
    }),
    NOT_FOUND_MESSAGE
  )
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    role,
    memberCount: row.members.length,
    createdAt: toIso(row.createdAt),
  }
}

/** A pending invitation addressed to `user`; NOT_FOUND otherwise. */
async function invitationFor(id: string, user: User): Promise<Invitation> {
  const row = await db.query.invitation.findFirst({ where: { id } })
  if (
    row === undefined ||
    row.email.toLowerCase() !== user.email.toLowerCase() ||
    !isPending(row, new Date())
  )
    throw errors.NOT_FOUND({ message: INVITATION_NOT_FOUND })
  return row
}

function inviterNameOf(inviter: { name: string } | null): string {
  if (inviter === null) return ""
  return inviter.name
}

export const myOrganizationHandler = {
  async list({
    context,
  }: {
    context: Context
  }): Promise<z.infer<typeof myOrganizationOutput.list>> {
    const userId = callerOf(context).id
    const rows = await db.query.member.findMany({
      where: { userId },
      with: { organization: { with: { members: true } } },
    })
    const answer: Summary[] = []
    for (const row of rows) {
      if (row.organization === null) continue
      answer.push({
        id: row.organization.id,
        name: row.organization.name,
        slug: row.organization.slug,
        role: roleOf(row.role),
        memberCount: row.organization.members.length,
        createdAt: toIso(row.organization.createdAt),
      })
    }
    return answer.toSorted((a, b) => a.name.localeCompare(b.name, "es"))
  },

  async get({
    context,
    input,
  }: {
    context: Context
    input: z.infer<typeof myOrganizationInput.get>
  }): Promise<z.infer<typeof myOrganizationOutput.get>> {
    const caller = callerOf(context)
    const callerId = caller.id
    const own = await membershipOf(input.id, callerId)
    const row = assertFound(
      await db.query.organization.findFirst({
        where: { id: input.id },
        with: { members: { with: { user: true } }, invitations: true },
      }),
      NOT_FOUND_MESSAGE
    )
    const role = roleOf(own.role)
    const now = new Date()
    const members: MemberItem[] = []
    for (const each of row.members) {
      if (each.user !== null)
        members.push(toMemberItem(each, each.user, callerId))
    }
    const invitations: InvitationItem[] = []
    if (canManageMembers(role)) {
      for (const each of row.invitations) {
        if (isPending(each, now)) invitations.push(toInvitationItem(each))
      }
    }
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      role,
      memberCount: row.members.length,
      createdAt: toIso(row.createdAt),
      members: members.toSorted((a, b) => a.name.localeCompare(b.name, "es")),
      // Global admins skip invitations: the admin feature adds users at once.
      canAddMembers: caller.role === "admin",
      invitations,
    }
  },

  async create({
    context,
    input,
  }: {
    context: Context
    input: z.infer<typeof myOrganizationInput.create>
  }): Promise<z.infer<typeof myOrganizationOutput.create>> {
    const userId = callerOf(context).id
    await assertSlugFree(input.slug, null)
    const id = crypto.randomUUID()
    const now = new Date()
    // A concurrent create with the same slug loses on the unique index.
    await db.transaction(async (tx) => {
      await tx
        .insert(organization)
        .values({ id, name: input.name, slug: input.slug, createdAt: now })
      await tx.insert(member).values({
        id: crypto.randomUUID(),
        organizationId: id,
        userId,
        role: "owner",
        createdAt: now,
      })
    })
    return {
      id,
      name: input.name,
      slug: input.slug,
      role: "owner",
      memberCount: 1,
      createdAt: toIso(now),
    }
  },

  async update({
    context,
    input,
  }: {
    context: Context
    input: z.infer<typeof myOrganizationInput.update>
  }): Promise<z.infer<typeof myOrganizationOutput.update>> {
    const own = await membershipOf(input.id, callerOf(context).id)
    requireOwner(own)
    if (input.slug !== undefined) await assertSlugFree(input.slug, input.id)
    if (input.name !== undefined || input.slug !== undefined) {
      await db
        .update(organization)
        .set({ name: input.name, slug: input.slug })
        .where(eq(organization.id, input.id))
    }
    return summaryOf(input.id, "owner")
  },

  async delete({
    context,
    input,
  }: {
    context: Context
    input: z.infer<typeof myOrganizationInput.delete>
  }): Promise<z.infer<typeof myOrganizationOutput.delete>> {
    const own = await membershipOf(input.id, callerOf(context).id)
    requireOwner(own)
    // Members, invitations and repository shares go with it (cascade).
    await db.delete(organization).where(eq(organization.id, input.id))
    return { id: input.id, success: true }
  },

  async leave({
    context,
    input,
  }: {
    context: Context
    input: z.infer<typeof myOrganizationInput.leave>
  }): Promise<z.infer<typeof myOrganizationOutput.leave>> {
    const own = await membershipOf(input.id, callerOf(context).id)
    await assertNotLastOwner(own)
    await removeMembership(own)
    return { id: input.id, success: true }
  },

  async invite({
    context,
    input,
  }: {
    context: Context
    input: z.infer<typeof myOrganizationInput.invite>
  }): Promise<z.infer<typeof myOrganizationOutput.invite>> {
    const caller = callerOf(context)
    const own = await membershipOf(input.organizationId, caller.id)
    requireManager(own)
    if (input.role === "owner") requireOwner(own)
    const invitee = await db.query.user.findFirst({
      where: { email: input.email },
    })
    if (invitee !== undefined) {
      const already = await db.query.member.findFirst({
        where: { organizationId: input.organizationId, userId: invitee.id },
      })
      if (already !== undefined)
        throw errors.CONFLICT({
          message: "Esa persona ya es miembro de la organización",
        })
    }
    const now = new Date()
    const sent = await db.query.invitation.findMany({
      where: { organizationId: input.organizationId, email: input.email },
    })
    if (sent.some((row) => isPending(row, now)))
      throw errors.CONFLICT({
        message: "Ya hay una invitación pendiente para ese email",
      })
    const [row] = await db
      .insert(invitation)
      .values({
        id: crypto.randomUUID(),
        organizationId: input.organizationId,
        email: input.email,
        role: input.role,
        status: "pending",
        expiresAt: new Date(now.getTime() + INVITATION_TTL_MS),
        createdAt: now,
        inviterId: caller.id,
      })
      .returning()
    if (!row) throw errors.INTERNAL_SERVER_ERROR()
    return toInvitationItem(row)
  },

  async cancelInvitation({
    context,
    input,
  }: {
    context: Context
    input: z.infer<typeof myOrganizationInput.cancelInvitation>
  }): Promise<z.infer<typeof myOrganizationOutput.cancelInvitation>> {
    const row = assertFound(
      await db.query.invitation.findFirst({ where: { id: input.id } }),
      INVITATION_NOT_FOUND
    )
    const own = await membershipOf(row.organizationId, callerOf(context).id)
    requireManager(own)
    if (row.status !== "pending")
      throw errors.NOT_FOUND({ message: INVITATION_NOT_FOUND })
    await db
      .update(invitation)
      .set({ status: "canceled" })
      .where(eq(invitation.id, row.id))
    return { id: row.id, success: true }
  },

  async updateMemberRole({
    context,
    input,
  }: {
    context: Context
    input: z.infer<typeof myOrganizationInput.updateMemberRole>
  }): Promise<z.infer<typeof myOrganizationOutput.updateMemberRole>> {
    const target = assertFound(
      await db.query.member.findFirst({
        where: { id: input.memberId },
        with: { user: true },
      }),
      MEMBER_NOT_FOUND
    )
    if (target.user === null)
      throw errors.NOT_FOUND({ message: MEMBER_NOT_FOUND })
    const callerId = callerOf(context).id
    const own = await membershipOf(target.organizationId, callerId)
    requireManager(own)
    const current = roleOf(target.role)
    if (current === "owner" || input.role === "owner") requireOwner(own)
    if (input.role !== "owner") await assertNotLastOwner(target)
    await db
      .update(member)
      .set({ role: input.role })
      .where(eq(member.id, target.id))
    return toMemberItem({ ...target, role: input.role }, target.user, callerId)
  },

  async removeMember({
    context,
    input,
  }: {
    context: Context
    input: z.infer<typeof myOrganizationInput.removeMember>
  }): Promise<z.infer<typeof myOrganizationOutput.removeMember>> {
    const target = assertFound(
      await db.query.member.findFirst({ where: { id: input.memberId } }),
      MEMBER_NOT_FOUND
    )
    const own = await membershipOf(target.organizationId, callerOf(context).id)
    requireManager(own)
    if (roleOf(target.role) === "owner") requireOwner(own)
    await assertNotLastOwner(target)
    await removeMembership(target)
    return { id: target.id, success: true }
  },

  async listInvitations({
    context,
  }: {
    context: Context
  }): Promise<z.infer<typeof myOrganizationOutput.listInvitations>> {
    const caller = callerOf(context)
    const rows = await db.query.invitation.findMany({
      where: { email: caller.email.toLowerCase(), status: "pending" },
      with: { organization: true, inviter: true },
      orderBy: { createdAt: "desc" },
    })
    const now = new Date()
    const answer: z.infer<typeof myOrganizationOutput.listInvitations> = []
    for (const row of rows) {
      if (!isPending(row, now) || row.organization === null) continue
      answer.push({
        id: row.id,
        organization: {
          id: row.organization.id,
          name: row.organization.name,
          slug: row.organization.slug,
        },
        role: roleOf(row.role),
        inviterName: inviterNameOf(row.inviter),
        expiresAt: toIso(row.expiresAt),
      })
    }
    return answer
  },

  async acceptInvitation({
    context,
    input,
  }: {
    context: Context
    input: z.infer<typeof myOrganizationInput.acceptInvitation>
  }): Promise<z.infer<typeof myOrganizationOutput.acceptInvitation>> {
    const caller = callerOf(context)
    const row = await invitationFor(input.id, caller)
    const existing = await db.query.member.findFirst({
      where: { organizationId: row.organizationId, userId: caller.id },
    })
    const role = roleOf(row.role)
    await db.transaction(async (tx) => {
      if (existing === undefined) {
        await tx.insert(member).values({
          id: crypto.randomUUID(),
          organizationId: row.organizationId,
          userId: caller.id,
          role,
          createdAt: new Date(),
        })
      }
      await tx
        .update(invitation)
        .set({ status: "accepted" })
        .where(eq(invitation.id, row.id))
    })
    if (existing !== undefined)
      return summaryOf(row.organizationId, roleOf(existing.role))
    return summaryOf(row.organizationId, role)
  },

  async rejectInvitation({
    context,
    input,
  }: {
    context: Context
    input: z.infer<typeof myOrganizationInput.rejectInvitation>
  }): Promise<z.infer<typeof myOrganizationOutput.rejectInvitation>> {
    const row = await invitationFor(input.id, callerOf(context))
    await db
      .update(invitation)
      .set({ status: "rejected" })
      .where(eq(invitation.id, row.id))
    return { id: row.id, success: true }
  },
}
