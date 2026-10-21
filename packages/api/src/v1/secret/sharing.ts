import { db } from "@nonete/db"
import {
  member,
  organization,
  type Secret,
  secret,
  secretShare,
  user,
} from "@nonete/db/schema"
import { and, asc, eq, inArray, ne } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { errors } from "#errors"
import type { SharedOrganization } from "#shared/organization-shares"

// Secrets other users share with the caller through their organizations.
// A share counts only while both the caller and the secret's owner are
// members of its organization, so a membership ended by any path (ours,
// the admin's, Better Auth's endpoints) hides it at once.

/** A secret shared with the caller through one organization. */
export type SharedSecret = {
  secret: Secret
  organization: SharedOrganization
  ownerName: string
}

/** How a shared secret is written in a placeholder, before `.<field>`. */
export function sharedAddress(organizationSlug: string, name: string): string {
  return `${organizationSlug}/${name}`
}

const ownerMembership = alias(member, "secret_owner_member")

/**
 * The secrets shared with `userId`, once per organization they come
 * through, by organization slug and name. The caller's own secrets are
 * never among them.
 */
export async function sharedSecretsOf(userId: string): Promise<SharedSecret[]> {
  return await db
    .select({
      secret,
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      },
      ownerName: user.name,
    })
    .from(secretShare)
    .innerJoin(
      member,
      and(
        eq(member.organizationId, secretShare.organizationId),
        eq(member.userId, userId)
      )
    )
    .innerJoin(
      secret,
      and(eq(secret.id, secretShare.secretId), ne(secret.userId, userId))
    )
    .innerJoin(
      ownerMembership,
      and(
        eq(ownerMembership.organizationId, secretShare.organizationId),
        eq(ownerMembership.userId, secret.userId)
      )
    )
    .innerJoin(organization, eq(organization.id, secretShare.organizationId))
    .innerJoin(user, eq(user.id, secret.userId))
    .orderBy(asc(organization.slug), asc(secret.name))
}

/**
 * Throws `CONFLICT` when another secret named `name` is already shared with
 * one of `organizationIds`: within an organization a shared secret's name
 * is its address.
 */
export async function assertSharedNameFree(
  name: string,
  organizationIds: string[],
  secretId: string
): Promise<void> {
  if (organizationIds.length === 0) return
  const [taken] = await db
    .select({ organizationName: organization.name })
    .from(secretShare)
    .innerJoin(secret, eq(secret.id, secretShare.secretId))
    .innerJoin(organization, eq(organization.id, secretShare.organizationId))
    .where(
      and(
        inArray(secretShare.organizationId, organizationIds),
        eq(secret.name, name),
        ne(secret.id, secretId)
      )
    )
    .limit(1)
  if (taken === undefined) return
  throw errors.CONFLICT({
    message: `Ya hay un secreto llamado ${name} compartido con ${taken.organizationName}`,
  })
}
