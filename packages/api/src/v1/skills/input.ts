import { z } from "zod"

export const skillsInput = {
  get: z.object({
    name: z
      .string()
      .min(1)
      .max(64)
      .describe(
        "Published name of the skill, as `list` returns it (`colofon`, `casa-deploy`)"
      ),
  }),
}
