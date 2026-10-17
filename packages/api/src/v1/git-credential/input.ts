import { z } from "zod"

const host = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(255)
  .regex(/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?(:\d{1,5})?$/, {
    message: "Escribe solo el servidor, con su puerto si lo tiene",
  })
  .describe(
    "Host of the git server with its port if it has one (git.example.com, git.example.com:8443)"
  )

const username = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .describe("Username the token belongs to")

const token = z
  .string()
  .min(1)
  .max(8192)
  .describe("Access token of the git server; write-only, never returned")

export const gitCredentialInput = {
  save: z.object({ host, username, token }),
  delete: z.object({
    id: z.uuid().describe("Id of one of the caller's credentials"),
  }),
}
