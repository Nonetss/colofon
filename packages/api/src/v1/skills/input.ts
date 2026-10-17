import { z } from "zod"

const name = z
  .string()
  .min(1)
  .max(64)
  .describe(
    "Published name of the skill, as `list` returns it (`colofon`, `casa-deploy`)"
  )

export const skillsInput = {
  get: z.object({ name }),
  file: z.object({
    name,
    path: z
      .string()
      .min(1)
      .max(512)
      .describe(
        "Path of the file inside the skill's folder, as `list` gives it in `files` (`references/type-bar.md`), or `SKILL.md`"
      ),
  }),
}
