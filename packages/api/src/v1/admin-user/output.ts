import { z } from "zod"

const adminUserItem = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  role: z.string().nullable(),
  banned: z.boolean(),
  banReason: z.string().nullable(),
  banExpires: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const adminUserOutput = {
  list: z.object({
    users: z.array(adminUserItem),
    total: z.number().int().nonnegative(),
    nextCursor: z.string().nullable(),
  }),
}
