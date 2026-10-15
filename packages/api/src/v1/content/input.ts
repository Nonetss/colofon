import { z } from "zod"

export const contentInput = {
  entitySchema: z.object({
    type: z
      .string()
      .min(1)
      .describe("Catalog type id: the name of its folder under catalogo/"),
  }),
}
