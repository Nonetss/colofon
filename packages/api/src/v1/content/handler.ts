import path from "node:path"
import {
  CLONE_DIR,
  CONFIG_SCHEMA,
  ENTITY_SCHEMA_PREFIX,
  editorSchemas,
  publicUrl,
  type SyncResult,
  schemaCatalog,
  TYPE_SCHEMA,
} from "@nonete/content"
import { db } from "@nonete/db"
import { type ContentRepository, contentRepository } from "@nonete/db/schema"
import { env } from "@nonete/env/server"
import { child } from "@nonete/logger"
import { eq } from "drizzle-orm"
import type { z } from "zod"
import { errors } from "#errors"
import { toIso, toIsoOrNull } from "#shared/dates"
import { assertFound } from "#shared/not-found"
import type { contentInput } from "#v1/content/input"
import type { ContentRepositoryOutput, contentOutput } from "#v1/content/output"
import {
  type ContentReader,
  createContentReader,
  type RepositoryStore,
} from "#v1/content/reader"

/** Public path of the schema endpoints; each repository's hang from it. */
export const SCHEMAS_PATH = "/api/v1/content/schemas"

const NOT_FOUND_MESSAGE = "Repositorio de contenido no encontrado"

/** The absolute URL of a repository's schema catalog. */
export function catalogUrlOf(slug: string): string {
  return `${env.CORS_ORIGIN}${SCHEMAS_PATH}/${slug}`
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
    ref: row.ref,
    catalogUrl: catalogUrlOf(row.slug),
    lastSyncedAt: toIsoOrNull(row.lastSyncedAt),
    lastCommit: row.lastCommit,
    lastSyncError: row.lastSyncError,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  }
}

function findRow(slug: string) {
  return db.query.contentRepository.findFirst({ where: { slug } })
}

/** The content handler over `reader`; tests build one with fakes. */
export function createContentHandler(reader: ContentReader) {
  async function schemasOf(slug: string) {
    const content = await reader.content(slug)
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
        orderBy: { name: "asc" },
      })
      return rows.map(toRepository)
    },

    async createRepository({
      input,
    }: {
      input: z.infer<typeof contentInput.createRepository>
    }): Promise<z.infer<typeof contentOutput.createRepository>> {
      const conflict = errors.CONFLICT({
        message: "Ya existe un repositorio de contenido con ese slug",
      })
      if (await findRow(input.slug)) throw conflict
      // A concurrent create with the same slug loses here, on the unique index.
      const [row] = await db
        .insert(contentRepository)
        .values({
          slug: input.slug,
          name: input.name,
          url: input.url,
          ref: input.ref,
        })
        .onConflictDoNothing({ target: contentRepository.slug })
        .returning()
      if (!row) throw conflict
      reader.syncInBackground(row)
      return toRepository(row)
    },

    async updateRepository({
      input,
    }: {
      input: z.infer<typeof contentInput.updateRepository>
    }): Promise<z.infer<typeof contentOutput.updateRepository>> {
      const row = assertFound(await findRow(input.slug), NOT_FOUND_MESSAGE)
      const patch = {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.url !== undefined && { url: input.url }),
        ...(input.ref !== undefined && { ref: input.ref }),
      }
      if (Object.keys(patch).length === 0) return toRepository(row)
      const [updated] = await db
        .update(contentRepository)
        .set(patch)
        .where(eq(contentRepository.id, row.id))
        .returning()
      const saved = assertFound(updated, NOT_FOUND_MESSAGE)
      if (saved.url !== row.url || saved.ref !== row.ref) {
        reader.syncInBackground(saved)
      }
      return toRepository(saved)
    },

    async deleteRepository({
      input,
    }: {
      input: z.infer<typeof contentInput.deleteRepository>
    }): Promise<z.infer<typeof contentOutput.deleteRepository>> {
      const row = assertFound(await findRow(input.slug), NOT_FOUND_MESSAGE)
      await db.delete(contentRepository).where(eq(contentRepository.id, row.id))
      await reader.remove(row)
      return { id: row.id, success: true }
    },

    async syncRepository({
      input,
    }: {
      input: z.infer<typeof contentInput.syncRepository>
    }): Promise<z.infer<typeof contentOutput.syncRepository>> {
      const row = assertFound(await findRow(input.slug), NOT_FOUND_MESSAGE)
      const result = await reader.sync(row)
      if (!result.ok) throw errors.BAD_GATEWAY({ message: result.error })
      return toRepository(
        assertFound(await findRow(input.slug), NOT_FOUND_MESSAGE)
      )
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

/** The stored repositories, read and updated through Drizzle. */
const repositoryStore: RepositoryStore = {
  find: findRow,
  list: () => db.query.contentRepository.findMany({ orderBy: { name: "asc" } }),
  recordSync: async (id, result) => {
    await db
      .update(contentRepository)
      .set(syncFields(result, new Date()))
      .where(eq(contentRepository.id, id))
  },
}

const contentLogger = child({ module: "content" })

/**
 * The clone root. The repo root is two levels above the workspace the
 * backend runs in, as for the root `.env`.
 */
const cloneRoot = path.resolve(process.cwd(), "../..", CLONE_DIR)

export const contentHandler = createContentHandler(
  createContentReader({
    cloneRoot,
    repositories: repositoryStore,
    logger: contentLogger,
  })
)

/**
 * Starts the first sync of every content repository without waiting for it:
 * a slow or unreachable remote must not delay startup. The reader already
 * logs each failed sync, so the rejection is dropped here.
 */
export function startContentSync() {
  contentLogger.info({ cloneRoot }, "Syncing content repositories")
  contentHandler.sync().catch(() => undefined)
}
