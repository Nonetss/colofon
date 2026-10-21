import { z } from "zod"
import { paginationCursor, paginationLimit } from "#shared/pagination"
import { normalizeOrigin } from "#v1/secret/origins"

const name = z
  .string()
  .min(1)
  .max(40)
  .regex(/^[a-z0-9][a-z0-9-]*$/)
  .describe(
    "Name the placeholders use ({{<name>.<field>}}): lowercase letters, digits and dashes, unique among the caller's secrets"
  )

const description = z
  .string()
  .max(500)
  .nullable()
  .describe("What the secret is for, shown to agents; null for none")

const fieldName = z
  .string()
  .min(1)
  .max(40)
  .regex(/^[a-z][a-z0-9_]*$/)
  .describe("Field name: lowercase letters, digits and underscores")

const fieldValue = z
  .string()
  .min(1)
  .max(8192)
  .describe("The value; write-only, never returned")

const origin = z
  .string()
  .transform((value, ctx) => {
    const normalized = normalizeOrigin(value)
    if (normalized === null) {
      ctx.addIssue({
        code: "custom",
        message: `Origen no válido: ${value}. Usa http(s)://host[:puerto], sin ruta`,
      })
      return z.NEVER
    }
    return normalized
  })
  .describe(
    "http(s)://host[:port], no path; the host may start with *. for every subdomain"
  )

const origins = z
  .array(origin)
  .min(1)
  .max(20)
  .transform((list) => [...new Set(list)])
  .describe("Where the secret may be sent")

const flags = {
  allowWrite: z
    .boolean()
    .describe("Whether POST, PUT, PATCH and DELETE requests may use it"),
  allowInUrl: z
    .boolean()
    .describe("Whether its placeholders may appear in the URL"),
  allowInBody: z
    .boolean()
    .describe("Whether its placeholders may appear in the body"),
}

function uniqueNames(fields: { name: string }[]): boolean {
  return new Set(fields.map((field) => field.name)).size === fields.length
}

const DUPLICATE_FIELD = "Los nombres de campo no se pueden repetir"

const id = z.uuid().describe("Id of one of the caller's secrets")

export const secretInput = {
  create: z.object({
    name,
    description: description.default(null),
    fields: z
      .array(z.object({ name: fieldName, value: fieldValue }))
      .min(1)
      .max(10)
      .refine(uniqueNames, DUPLICATE_FIELD),
    origins,
    allowWrite: flags.allowWrite.default(false),
    allowInUrl: flags.allowInUrl.default(false),
    allowInBody: flags.allowInBody.default(false),
  }),
  update: z.object({
    id,
    name: name.optional(),
    description: description.optional(),
    fields: z
      .array(
        z.object({
          name: fieldName,
          value: fieldValue
            .optional()
            .describe("New value; omit to keep the stored one"),
        })
      )
      .min(1)
      .max(10)
      .refine(uniqueNames, DUPLICATE_FIELD)
      .optional()
      .describe(
        "The full list of fields: a listed field without a value keeps its stored value, a stored field not listed is removed. Omit to keep every field."
      ),
    origins: origins.optional(),
    allowWrite: flags.allowWrite.optional(),
    allowInUrl: flags.allowInUrl.optional(),
    allowInBody: flags.allowInBody.optional(),
  }),
  delete: z.object({ id }),
  share: z.object({
    id,
    organizationIds: z
      .array(z.string().min(1))
      .max(100)
      .describe(
        "Every organization to share it with, replacing the current ones; empty makes it private"
      ),
  }),
  usage: z.object({
    secretId: id
      .optional()
      .describe(
        "Only the calls that used this secret, one of the caller's or shared with them"
      ),
    limit: paginationLimit(20, 100),
    cursor: paginationCursor(),
  }),
}
