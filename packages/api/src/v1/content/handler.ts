import { rm } from "node:fs/promises"
import {
  CONFIG_SCHEMA,
  DIAGRAM_SCHEMA,
  ENTITY_SCHEMA_PREFIX,
  editorSchemas,
  hostedFolder,
  listContentFolders,
  listRemoteBranches,
  MENU_SCHEMA,
  publicUrl,
  type RemoteCheck,
  readFile,
  readFolder,
  type SyncResult,
  schemaCatalog,
  TYPE_SCHEMA,
} from "@nonete/content"
import { db } from "@nonete/db"
import {
  type ContentRepository,
  contentRepository,
  contentRepositoryShare,
  member,
  organization,
} from "@nonete/db/schema"
import { env } from "@nonete/env/server"
import { and, asc, eq } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import type { z } from "zod"
import type { Context } from "#context"
import { errors } from "#errors"
import { toIso, toIsoOrNull } from "#shared/dates"
import { assertFound } from "#shared/not-found"
import {
  organizationsOf,
  ownersOrganizations,
  type SharedOrganization,
} from "#shared/organization-shares"
import { requireUserId } from "#shared/session"
import {
  ensureHostedRepo,
  gitSourceOf,
  hostedMarkerOf,
  isHosted,
} from "#v1/content/hosting"
import type { contentInput } from "#v1/content/input"
import type {
  ContentRepositoryOutput,
  contentOutput,
  OwnRepositoryOutput,
} from "#v1/content/output"
import {
  audienceOfUser,
  type ContentReader,
  type RepositoryAudience,
  type SharedRepositories,
} from "#v1/content/reader"
import { checkUserRemoteWithTrusted } from "#v1/content/trusted-hosts"
import {
  assertHostMatches,
  credentialById,
  credentialOwnedBy,
  UNREADABLE_MESSAGE,
  urlWithSavedCredential,
  withSavedAccess,
} from "#v1/git-credential/access"

/** Public path of the schema endpoints; each repository's hang from it. */
export const SCHEMAS_PATH = "/api/v1/content/schemas"

const NOT_FOUND_MESSAGE = "Repositorio de contenido no encontrado"

const NOT_IN_REPOSITORY_MESSAGE = "No existe esa rama o ruta en el repositorio"

/** The absolute URL of a repository's schema catalog. */
function catalogUrlOf(slug: string): string {
  return `${env.CORS_ORIGIN}${SCHEMAS_PATH}/${slug}`
}

/**
 * The absolute git URL to clone and push `row` with, when it is hosted;
 * `null` for an external repository.
 */
function pushUrlOf(row: ContentRepository): string | null {
  if (!isHosted(row)) return null
  return `${env.CORS_ORIGIN}${hostedMarkerOf(row.slug)}`
}

/** The fields a sync's outcome writes on its repository's row. */
export function syncFields(result: SyncResult, at: Date) {
  if (result.ok) {
    return { lastSyncedAt: at, lastCommit: result.commit, lastSyncError: null }
  }
  // A failed sync keeps the last checkout, so the last commit stays.
  return { lastSyncedAt: at, lastSyncError: result.error }
}

function toRepository(row: ContentRepository): ContentRepositoryOutput {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    url: publicUrl(row.url),
    credentialId: row.credentialId,
    hosted: isHosted(row),
    pushUrl: pushUrlOf(row),
    ref: row.ref,
    path: row.contentPath,
    catalogUrl: catalogUrlOf(row.slug),
    lastSyncedAt: toIsoOrNull(row.lastSyncedAt),
    lastCommit: row.lastCommit,
    lastSyncError: row.lastSyncError,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  }
}

function toOwnRepository(
  row: ContentRepository,
  organizations: SharedOrganization[]
): OwnRepositoryOutput {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    url: publicUrl(row.url),
    credentialId: row.credentialId,
    ref: row.ref,
    path: row.contentPath,
    lastSyncedAt: toIsoOrNull(row.lastSyncedAt),
    lastCommit: row.lastCommit,
    lastSyncError: row.lastSyncError,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
    organizations,
  }
}

/** The relational `where` that keeps the rows within `audience`. */
export function audienceFilter(audience: RepositoryAudience) {
  if (audience === "all") return {}
  if (audience === "platform") return { ownerId: { isNull: true as const } }
  const shared = [...audience.shared.keys()]
  if (shared.length === 0) {
    return {
      OR: [
        { ownerId: { isNull: true as const } },
        { ownerId: audience.userId },
      ],
    }
  }
  return {
    OR: [
      { ownerId: { isNull: true as const } },
      { ownerId: audience.userId },
      { id: { in: shared } },
    ],
  }
}

const repositoryOwner = alias(member, "repository_owner")

/**
 * The repositories shared with `userId`: a share names an organization where
 * both they and the repository's owner are members, so a share outlived by
 * the owner's membership reads as none. Each keeps the first organization's
 * name, by name.
 */
export async function sharedRepositoriesOf(
  userId: string
): Promise<SharedRepositories> {
  const rows = await db
    .select({
      repositoryId: contentRepositoryShare.repositoryId,
      organizationName: organization.name,
    })
    .from(contentRepositoryShare)
    .innerJoin(
      member,
      and(
        eq(member.organizationId, contentRepositoryShare.organizationId),
        eq(member.userId, userId)
      )
    )
    .innerJoin(
      contentRepository,
      eq(contentRepository.id, contentRepositoryShare.repositoryId)
    )
    .innerJoin(
      repositoryOwner,
      and(
        eq(
          repositoryOwner.organizationId,
          contentRepositoryShare.organizationId
        ),
        eq(repositoryOwner.userId, contentRepository.ownerId)
      )
    )
    .innerJoin(
      organization,
      eq(organization.id, contentRepositoryShare.organizationId)
    )
    .orderBy(asc(organization.name))
  const shared = new Map<string, string>()
  for (const row of rows) {
    if (!shared.has(row.repositoryId))
      shared.set(row.repositoryId, row.organizationName)
  }
  return shared
}

export function findRow(slug: string, audience: RepositoryAudience) {
  return db.query.contentRepository.findFirst({
    where: { slug, ...audienceFilter(audience) },
  })
}

/** One of `userId`'s repositories, with the organizations it is shared with. */
function findOwned(slug: string, userId: string) {
  return db.query.contentRepository.findFirst({
    where: { slug, ownerId: userId },
    with: { shares: { with: { organization: true } } },
  })
}

/** `message` of a credential that can't be used, as a client error. */
function unusable(error: unknown): never {
  if (error instanceof Error && error.message === UNREADABLE_MESSAGE) {
    throw errors.PRECONDITION_FAILED({ message: UNREADABLE_MESSAGE })
  }
  throw error
}

/**
 * `url` with the caller's saved credential in it when one is chosen, else as
 * sent. The credential must be for the host of `url`.
 */
async function urlWithChosenCredential(
  userId: string,
  url: string,
  credentialId: string | undefined
): Promise<string> {
  if (credentialId === undefined) return url
  const credential = await credentialOwnedBy(userId, credentialId)
  assertHostMatches(credential, url)
  try {
    return urlWithSavedCredential(credential, url)
  } catch (error) {
    return unusable(error)
  }
}

/** `row` with the credential it references put in its `url`. */
async function accessibleRow(
  row: ContentRepository
): Promise<ContentRepository> {
  try {
    return await withSavedAccess(row)
  } catch (error) {
    return unusable(error)
  }
}

/** The credential `credentialId`, checked as the caller's and for `url`'s host. */
async function chosenCredential(
  userId: string,
  url: string,
  credentialId: string
): Promise<string> {
  const credential = await credentialOwnedBy(userId, credentialId)
  assertHostMatches(credential, url)
  return credential.id
}

/** The `credentialId` column a create writes: none unless one is chosen. */
async function createdCredential(
  userId: string,
  url: string,
  credentialId: string | undefined
): Promise<{ credentialId?: string }> {
  if (credentialId === undefined) return {}
  return { credentialId: await chosenCredential(userId, url, credentialId) }
}

/**
 * The `credentialId` column an edit writes: nothing when the edit leaves the
 * credential alone and the URL's host. A chosen credential must be the
 * caller's and for the URL's host; a kept one must still match a new URL.
 */
async function credentialPatch(
  userId: string,
  row: ContentRepository,
  input: { url?: string; credentialId?: string | null }
): Promise<{ credentialId?: string | null }> {
  if (input.credentialId === null) return { credentialId: null }
  const url = input.url ?? row.url
  if (input.credentialId !== undefined) {
    return {
      credentialId: await chosenCredential(userId, url, input.credentialId),
    }
  }
  if (row.credentialId !== null && input.url !== undefined) {
    assertHostMatches(await credentialById(row.credentialId), url)
  }
  return {}
}

/** Whether `saved` clones from somewhere other than `before` did. */
function changesClone(before: ContentRepository, saved: ContentRepository) {
  return (
    saved.url !== before.url ||
    saved.ref !== before.ref ||
    saved.credentialId !== before.credentialId
  )
}

/** The credential column an admin edit writes; a hosted repository has none. */
function editedCredential(
  userId: string,
  row: ContentRepository,
  input: z.infer<typeof contentInput.updateRepository>
): Promise<{ credentialId?: string | null }> {
  if (input.hosted === true) return Promise.resolve({ credentialId: null })
  return credentialPatch(userId, row, input)
}

/** The `url` a new repository stores: the one sent, or the hosted marker. */
function createdUrlOf(
  input: z.infer<typeof contentInput.createRepository>
): string {
  if (input.hosted === true) return hostedMarkerOf(input.slug)
  if (input.url !== undefined) return input.url
  throw errors.BAD_REQUEST({ message: "Send either url or hosted" })
}

/** The `url` an edit stores, `undefined` when it keeps the stored one. */
function editedUrlOf(
  input: z.infer<typeof contentInput.updateRepository>
): string | undefined {
  if (input.hosted === true) return hostedMarkerOf(input.slug)
  return input.url
}

export type ContentHandlerOptions = {
  /** Folder holding the bare repository of each hosted repository. */
  hostedRoot: string
  /** Vets a user's remote before its branches are read; tests replace it. */
  checkRemote?: (url: string) => Promise<RemoteCheck>
}

/** The content handler over `reader`; tests build one with fakes. */
export function createContentHandler(
  reader: ContentReader,
  options: ContentHandlerOptions
) {
  const { hostedRoot, checkRemote = checkUserRemoteWithTrusted } = options

  /**
   * What `listBranches` reads: the URL sent, or a stored repository's
   * source, credentials included, which the client never sees.
   */
  async function branchesSourceOf(
    userId: string,
    input: z.infer<typeof contentInput.listBranches>
  ): Promise<string> {
    if (input.url !== undefined) {
      return urlWithChosenCredential(userId, input.url, input.credentialId)
    }
    if (input.slug === undefined) {
      throw errors.BAD_REQUEST({ message: "Send either url or slug" })
    }
    const row = assertFound(
      await findRow(input.slug, "platform"),
      NOT_FOUND_MESSAGE
    )
    return gitSourceOf(await accessibleRow(row), hostedRoot)
  }

  /**
   * What `listContentFolders` reads: the URL sent, or a stored repository's
   * source, credentials included, and whether that is a bare repository.
   */
  async function foldersSourceOf(
    userId: string,
    input: z.infer<typeof contentInput.listContentFolders>
  ): Promise<{ source: string; bare: boolean }> {
    if (input.url !== undefined) {
      const source = await urlWithChosenCredential(
        userId,
        input.url,
        input.credentialId
      )
      return { source, bare: false }
    }
    if (input.slug === undefined) {
      throw errors.BAD_REQUEST({ message: "Send either url or slug" })
    }
    const row = assertFound(
      await findRow(input.slug, "platform"),
      NOT_FOUND_MESSAGE
    )
    return {
      source: gitSourceOf(await accessibleRow(row), hostedRoot),
      bare: isHosted(row),
    }
  }

  /**
   * The bare repository folder of the hosted repository `slug`. An external
   * one is as unknown as a missing one. Never created here: reads don't
   * write.
   */
  async function hostedFolderOf(slug: string): Promise<string> {
    const row = await findRow(slug, "platform")
    if (row === undefined || !isHosted(row)) {
      throw errors.NOT_FOUND({ message: NOT_FOUND_MESSAGE })
    }
    return gitSourceOf(row, hostedRoot)
  }

  /** The URL `listMyBranches` reads: the one sent, or an owned repository's. */
  async function ownBranchesUrlOf(
    userId: string,
    input: z.infer<typeof contentInput.listMyBranches>
  ): Promise<string> {
    if (input.url !== undefined) {
      return urlWithChosenCredential(userId, input.url, input.credentialId)
    }
    if (input.slug === undefined) {
      throw errors.BAD_REQUEST({ message: "Send either url or slug" })
    }
    const row = assertFound(
      await findOwned(input.slug, userId),
      NOT_FOUND_MESSAGE
    )
    return (await accessibleRow(row)).url
  }

  async function schemasOf(slug: string) {
    const content = await reader.content(slug, "platform")
    if (content === undefined) {
      throw errors.NOT_FOUND({ message: `No content repository named ${slug}` })
    }
    if (content.declarations === undefined) return []
    return editorSchemas(content.declarations)
  }

  async function schemaNamed(slug: string, name: string) {
    const schema = (await schemasOf(slug)).find((each) => each.name === name)
    if (schema === undefined) {
      throw errors.NOT_FOUND({ message: `No content schema named ${name}` })
    }
    return schema.schema
  }

  return {
    async schemaCatalog({
      input,
    }: {
      input: z.infer<typeof contentInput.schemaCatalog>
    }): Promise<z.infer<typeof contentOutput.schemaCatalog>> {
      return schemaCatalog(
        await schemasOf(input.repository),
        catalogUrlOf(input.repository)
      )
    },

    configSchema({
      input,
    }: {
      input: z.infer<typeof contentInput.configSchema>
    }): Promise<z.infer<typeof contentOutput.configSchema>> {
      return schemaNamed(input.repository, CONFIG_SCHEMA)
    },

    menuSchema({
      input,
    }: {
      input: z.infer<typeof contentInput.menuSchema>
    }): Promise<z.infer<typeof contentOutput.menuSchema>> {
      return schemaNamed(input.repository, MENU_SCHEMA)
    },

    diagramSchema({
      input,
    }: {
      input: z.infer<typeof contentInput.diagramSchema>
    }): Promise<z.infer<typeof contentOutput.diagramSchema>> {
      return schemaNamed(input.repository, DIAGRAM_SCHEMA)
    },

    typeSchema({
      input,
    }: {
      input: z.infer<typeof contentInput.typeSchema>
    }): Promise<z.infer<typeof contentOutput.typeSchema>> {
      return schemaNamed(input.repository, TYPE_SCHEMA)
    },

    entitySchema({
      input,
    }: {
      input: z.infer<typeof contentInput.entitySchema>
    }): Promise<z.infer<typeof contentOutput.entitySchema>> {
      return schemaNamed(
        input.repository,
        `${ENTITY_SCHEMA_PREFIX}${input.type}`
      )
    },

    async listRepositories(): Promise<
      z.infer<typeof contentOutput.listRepositories>
    > {
      const rows = await db.query.contentRepository.findMany({
        where: audienceFilter("platform"),
        orderBy: { name: "asc" },
      })
      return rows.map(toRepository)
    },

    async createRepository({
      context,
      input,
    }: {
      context: Context
      input: z.infer<typeof contentInput.createRepository>
    }): Promise<z.infer<typeof contentOutput.createRepository>> {
      const conflict = errors.CONFLICT({
        message: "Ya existe un repositorio de contenido con ese slug",
      })
      const url = createdUrlOf(input)
      const credential = await createdCredential(
        requireUserId(context),
        url,
        input.credentialId
      )
      if (await findRow(input.slug, "all")) throw conflict
      // A concurrent create with the same slug loses here, on the unique index.
      const [row] = await db
        .insert(contentRepository)
        .values({
          slug: input.slug,
          name: input.name,
          url,
          ...credential,
          ref: input.ref,
          contentPath: input.path,
        })
        .onConflictDoNothing({ target: contentRepository.slug })
        .returning()
      if (!row) throw conflict
      // Nothing has been pushed to a new hosted repository: no sync yet.
      if (isHosted(row)) {
        await ensureHostedRepo(row, hostedRoot)
      } else {
        reader.syncInBackground(row)
      }
      return toRepository(row)
    },

    async updateRepository({
      context,
      input,
    }: {
      context: Context
      input: z.infer<typeof contentInput.updateRepository>
    }): Promise<z.infer<typeof contentOutput.updateRepository>> {
      const row = assertFound(
        await findRow(input.slug, "platform"),
        NOT_FOUND_MESSAGE
      )
      const url = editedUrlOf(input)
      const credential = await editedCredential(
        requireUserId(context),
        row,
        input
      )
      const patch = {
        ...(input.name !== undefined && { name: input.name }),
        ...(url !== undefined && { url }),
        ...credential,
        ...(input.ref !== undefined && { ref: input.ref }),
        ...(input.path !== undefined && { contentPath: input.path }),
      }
      if (Object.keys(patch).length === 0) return toRepository(row)
      const [updated] = await db
        .update(contentRepository)
        .set(patch)
        .where(eq(contentRepository.id, row.id))
        .returning()
      const saved = assertFound(updated, NOT_FOUND_MESSAGE)
      if (isHosted(saved)) await ensureHostedRepo(saved, hostedRoot)
      if (changesClone(row, saved)) {
        reader.syncInBackground(saved)
      }
      return toRepository(saved)
    },

    async listBranches({
      context,
      input,
    }: {
      context: Context
      input: z.infer<typeof contentInput.listBranches>
    }): Promise<z.infer<typeof contentOutput.listBranches>> {
      const source = await branchesSourceOf(requireUserId(context), input)
      const result = await listRemoteBranches(source)
      if (!result.ok) throw errors.BAD_GATEWAY({ message: result.error })
      return { branches: result.branches, defaultBranch: result.defaultBranch }
    },

    async listContentFolders({
      context,
      input,
    }: {
      context: Context
      input: z.infer<typeof contentInput.listContentFolders>
    }): Promise<z.infer<typeof contentOutput.listContentFolders>> {
      const { source, bare } = await foldersSourceOf(
        requireUserId(context),
        input
      )
      const result = await listContentFolders(source, { ref: input.ref, bare })
      if (!result.ok) throw errors.BAD_GATEWAY({ message: result.error })
      return { folders: result.folders }
    },

    async listMyContentFolders({
      context,
      input,
    }: {
      context: Context
      input: z.infer<typeof contentInput.listMyContentFolders>
    }): Promise<z.infer<typeof contentOutput.listContentFolders>> {
      const url = await ownBranchesUrlOf(requireUserId(context), input)
      const checked = await checkRemote(url)
      if (!checked.ok) {
        throw errors.BAD_REQUEST({ message: "Esa dirección no está permitida" })
      }
      const result = await listContentFolders(url, {
        ref: input.ref,
        httpsOnly: true,
      })
      if (!result.ok) throw errors.BAD_GATEWAY({ message: result.error })
      return { folders: result.folders }
    },

    async readFolder({
      input,
    }: {
      input: z.infer<typeof contentInput.readFolder>
    }): Promise<z.infer<typeof contentOutput.readFolder>> {
      const folder = await hostedFolderOf(input.slug)
      const result = await readFolder(folder, input.branch, input.path)
      if (!result.ok) {
        throw errors.NOT_FOUND({ message: NOT_IN_REPOSITORY_MESSAGE })
      }
      return { entries: result.entries }
    },

    async readFile({
      input,
    }: {
      input: z.infer<typeof contentInput.readFile>
    }): Promise<z.infer<typeof contentOutput.readFile>> {
      const folder = await hostedFolderOf(input.slug)
      const result = await readFile(folder, input.branch, input.path)
      if (!result.ok) {
        throw errors.NOT_FOUND({ message: NOT_IN_REPOSITORY_MESSAGE })
      }
      if (result.kind === "text") {
        return {
          path: input.path,
          size: result.size,
          kind: result.kind,
          content: result.content,
        }
      }
      return {
        path: input.path,
        size: result.size,
        kind: result.kind,
        content: null,
      }
    },

    async deleteRepository({
      input,
    }: {
      input: z.infer<typeof contentInput.deleteRepository>
    }): Promise<z.infer<typeof contentOutput.deleteRepository>> {
      const row = assertFound(
        await findRow(input.slug, "platform"),
        NOT_FOUND_MESSAGE
      )
      await db.delete(contentRepository).where(eq(contentRepository.id, row.id))
      await reader.remove(row)
      if (isHosted(row)) {
        await rm(hostedFolder(hostedRoot, row.id), {
          recursive: true,
          force: true,
        })
      }
      return { id: row.id, success: true }
    },

    async syncRepository({
      context,
      input,
    }: {
      context: Context
      input: z.infer<typeof contentInput.syncRepository>
    }): Promise<z.infer<typeof contentOutput.syncRepository>> {
      const audience = await audienceOfUser(context.user, {
        sharedWith: sharedRepositoriesOf,
      })
      const row = assertFound(
        await findRow(input.slug, audience),
        NOT_FOUND_MESSAGE
      )
      const result = await reader.sync(row)
      if (!result.ok) throw errors.BAD_GATEWAY({ message: result.error })
      return toRepository(
        assertFound(await findRow(input.slug, audience), NOT_FOUND_MESSAGE)
      )
    },

    async listMyRepositories({
      context,
    }: {
      context: Context
    }): Promise<z.infer<typeof contentOutput.listMyRepositories>> {
      const rows = await db.query.contentRepository.findMany({
        where: { ownerId: requireUserId(context) },
        with: { shares: { with: { organization: true } } },
        orderBy: { name: "asc" },
      })
      return rows.map((row) =>
        toOwnRepository(row, organizationsOf(row.shares))
      )
    },

    async createMyRepository({
      context,
      input,
    }: {
      context: Context
      input: z.infer<typeof contentInput.createMyRepository>
    }): Promise<z.infer<typeof contentOutput.createMyRepository>> {
      const ownerId = requireUserId(context)
      const conflict = errors.CONFLICT({
        message: "Ya existe un repositorio con ese slug",
      })
      const credential = await createdCredential(
        ownerId,
        input.url,
        input.credentialId
      )
      if (await findRow(input.slug, "all")) throw conflict
      // A concurrent create with the same slug loses here, on the unique index.
      const [row] = await db
        .insert(contentRepository)
        .values({
          slug: input.slug,
          name: input.name,
          url: input.url,
          ...credential,
          ref: input.ref,
          contentPath: input.path,
          ownerId,
        })
        .onConflictDoNothing({ target: contentRepository.slug })
        .returning()
      if (!row) throw conflict
      reader.syncInBackground(row)
      return toOwnRepository(row, [])
    },

    async updateMyRepository({
      context,
      input,
    }: {
      context: Context
      input: z.infer<typeof contentInput.updateMyRepository>
    }): Promise<z.infer<typeof contentOutput.updateMyRepository>> {
      const ownerId = requireUserId(context)
      const row = assertFound(
        await findOwned(input.slug, ownerId),
        NOT_FOUND_MESSAGE
      )
      const credential = await credentialPatch(ownerId, row, input)
      const patch = {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.url !== undefined && { url: input.url }),
        ...credential,
        ...(input.ref !== undefined && { ref: input.ref }),
        ...(input.path !== undefined && { contentPath: input.path }),
      }
      const organizations = organizationsOf(row.shares)
      if (Object.keys(patch).length === 0)
        return toOwnRepository(row, organizations)
      const [updated] = await db
        .update(contentRepository)
        .set(patch)
        .where(eq(contentRepository.id, row.id))
        .returning()
      const saved = assertFound(updated, NOT_FOUND_MESSAGE)
      if (changesClone(row, saved)) reader.syncInBackground(saved)
      return toOwnRepository(saved, organizations)
    },

    async shareMyRepository({
      context,
      input,
    }: {
      context: Context
      input: z.infer<typeof contentInput.shareMyRepository>
    }): Promise<z.infer<typeof contentOutput.shareMyRepository>> {
      const ownerId = requireUserId(context)
      const row = assertFound(
        await findOwned(input.slug, ownerId),
        NOT_FOUND_MESSAGE
      )
      const wanted = new Set(input.organizationIds)
      const organizations = await ownersOrganizations(ownerId, [...wanted])
      if (organizations.length !== wanted.size)
        throw errors.NOT_FOUND({ message: "Organización no encontrada" })
      await db.transaction(async (tx) => {
        await tx
          .delete(contentRepositoryShare)
          .where(eq(contentRepositoryShare.repositoryId, row.id))
        if (wanted.size === 0) return
        await tx.insert(contentRepositoryShare).values(
          [...wanted].map((organizationId) => ({
            repositoryId: row.id,
            organizationId,
          }))
        )
      })
      return toOwnRepository(row, organizationsOf(organizations))
    },

    async deleteMyRepository({
      context,
      input,
    }: {
      context: Context
      input: z.infer<typeof contentInput.deleteMyRepository>
    }): Promise<z.infer<typeof contentOutput.deleteMyRepository>> {
      const row = assertFound(
        await findOwned(input.slug, requireUserId(context)),
        NOT_FOUND_MESSAGE
      )
      await db.delete(contentRepository).where(eq(contentRepository.id, row.id))
      await reader.remove(row)
      return { id: row.id, success: true }
    },

    async listMyBranches({
      context,
      input,
    }: {
      context: Context
      input: z.infer<typeof contentInput.listMyBranches>
    }): Promise<z.infer<typeof contentOutput.listBranches>> {
      const url = await ownBranchesUrlOf(requireUserId(context), input)
      const checked = await checkRemote(url)
      if (!checked.ok) {
        throw errors.BAD_REQUEST({ message: "Esa dirección no está permitida" })
      }
      const result = await listRemoteBranches(url, undefined, true)
      if (!result.ok) throw errors.BAD_GATEWAY({ message: result.error })
      return { branches: result.branches, defaultBranch: result.defaultBranch }
    },

    async sync(): Promise<z.infer<typeof contentOutput.sync>> {
      const repositories: z.infer<typeof contentOutput.sync>["repositories"] =
        []
      const failures: string[] = []
      for (const { repository, result } of await reader.syncAll()) {
        if (result.ok) {
          repositories.push({ slug: repository.slug, commit: result.commit })
        } else {
          failures.push(`${repository.slug} (${result.error})`)
        }
      }
      // Every repository was tried; the run still fails so /crons shows it.
      if (failures.length > 0) {
        throw errors.BAD_GATEWAY({
          message: `Content repositories failed to sync: ${failures.join("; ")}`,
        })
      }
      return { repositories }
    },
  }
}
