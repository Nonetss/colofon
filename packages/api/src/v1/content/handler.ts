import path from "node:path"
import {
  CONFIG_SCHEMA,
  describeSource,
  ENTITY_SCHEMA_PREFIX,
  editorSchemas,
  resolveContentSource,
  schemaCatalog,
  TYPE_SCHEMA,
} from "@nonete/content"
import { env } from "@nonete/env/server"
import { child } from "@nonete/logger"
import type { z } from "zod"
import { errors } from "#errors"
import type { contentInput } from "#v1/content/input"
import type { contentOutput } from "#v1/content/output"
import { type ContentReader, createContentReader } from "#v1/content/reader"

/** Public path of the schema endpoints; the catalog's URLs hang from it. */
export const SCHEMAS_PATH = "/api/v1/content/schemas"

/**
 * The content source in the environment. The repo root is two levels above
 * the workspace the backend runs in, as for the root `.env`.
 */
export function currentContentSource() {
  return resolveContentSource({
    dir: env.CONTENT_DIR,
    repo: env.CONTENT_REPO,
    ref: env.CONTENT_REF,
    repoRoot: path.resolve(process.cwd(), "../.."),
  })
}

/** The content handler over `reader`; tests build one with a fake logger. */
export function createContentHandler(reader: ContentReader) {
  async function schemas() {
    const declarations = await reader.declarations()
    if (declarations === undefined) return []
    return editorSchemas(declarations)
  }

  async function schemaNamed(name: string) {
    const schema = (await schemas()).find((each) => each.name === name)
    if (schema === undefined) {
      throw errors.NOT_FOUND({ message: `No content schema named ${name}` })
    }
    return schema.schema
  }

  return {
    async schemaCatalog(): Promise<
      z.infer<typeof contentOutput.schemaCatalog>
    > {
      return schemaCatalog(await schemas(), `${env.CORS_ORIGIN}${SCHEMAS_PATH}`)
    },

    configSchema(): Promise<z.infer<typeof contentOutput.configSchema>> {
      return schemaNamed(CONFIG_SCHEMA)
    },

    typeSchema(): Promise<z.infer<typeof contentOutput.typeSchema>> {
      return schemaNamed(TYPE_SCHEMA)
    },

    entitySchema({
      input,
    }: {
      input: z.infer<typeof contentInput.entitySchema>
    }): Promise<z.infer<typeof contentOutput.entitySchema>> {
      return schemaNamed(`${ENTITY_SCHEMA_PREFIX}${input.type}`)
    },

    async sync(): Promise<z.infer<typeof contentOutput.sync>> {
      const source = reader.source()
      const result = await reader.sync()
      if (result === undefined) return { source: source.kind, commit: null }
      if (!result.ok) throw errors.BAD_GATEWAY({ message: result.error })
      return { source: source.kind, commit: result.commit }
    },
  }
}

const contentLogger = child({ module: "content" })

export const contentHandler = createContentHandler(
  createContentReader({ source: currentContentSource, logger: contentLogger })
)

/**
 * Logs the configured content source and starts its first sync without
 * waiting for it: a slow or unreachable remote must not delay startup.
 * The reader already logs a failed sync, so the rejection is dropped here.
 */
export function startContentSync() {
  contentLogger.info(
    { source: describeSource(currentContentSource()) },
    "Content source"
  )
  contentHandler.sync().catch(() => undefined)
}
