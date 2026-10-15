import { z } from "zod"

const jsonSchema = z
  .record(z.string(), z.unknown())
  .describe("A JSON Schema (draft-07) for one kind of content file")

export const contentOutput = {
  schemaCatalog: z
    .object({
      version: z.literal(1),
      schemas: z.array(
        z.object({
          name: z.string().describe("Title of the schema"),
          description: z.string(),
          url: z.string().describe("Absolute URL of the schema"),
          fileMatch: z
            .array(z.string())
            .describe(
              "Globs of the files it applies to, relative to the content root; a leading ! excludes"
            ),
        })
      ),
    })
    .describe("Schema catalog in SchemaStore's format"),
  configSchema: jsonSchema,
  typeSchema: jsonSchema,
  entitySchema: jsonSchema,
  sync: z.object({
    source: z
      .enum(["none", "dir", "repo"])
      .describe("Kind of content source configured"),
    commit: z
      .string()
      .nullable()
      .describe("Commit checked out, for a repository source"),
  }),
}
