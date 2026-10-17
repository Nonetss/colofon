import { resolve } from "node:path"
import { createEnv } from "@t3-oss/env-core"
import { config } from "dotenv"
import { z } from "zod"

// Every workspace runs with its own directory as cwd, two levels below the
// repo root, so this is the root `.env`. Containers have no such file and get
// their variables from compose; already-set variables are never overridden.
config({ path: resolve(process.cwd(), "../../.env"), quiet: true })

/** Whether `value` is the standard Base64 of exactly 32 bytes. */
function isBase64Key(value: string): boolean {
  if (!/^[A-Za-z0-9+/]{43}=$/.test(value)) return false
  return Buffer.from(value, "base64").length === 32
}

export const env = createEnv({
  server: {
    // Database
    DATABASE_URL: z.string().min(1),
    // Better Auth
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    CORS_ORIGIN: z.url(),
    // Node Environment
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    // Log Level
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace"])
      .default("info"),
    // Admin
    ADMIN_EMAIL: z.email().optional(),
    ADMIN_PASSWORD: z.string().min(8).optional(),
    ADMIN_NAME: z.string().optional(),
    // OIDC (generic OAuth client). All three must be set to enable the
    // "oidc" sign-in provider; otherwise it's left out of the auth plugins.
    // OIDC_DISCOVERY_URL is the issuer's base URL, without the
    // /.well-known/openid-configuration suffix.
    OIDC_CLIENT_ID: z.string().min(1).optional(),
    OIDC_CLIENT_SECRET: z.string().min(1).optional(),
    OIDC_DISCOVERY_URL: z.url().optional(),
    // User secrets (the MCP's `request` tool). The Base64 of 32 random bytes,
    // the AES-256-GCM key their values are encrypted with; the feature is off
    // while it is unset.
    SECRETS_ENCRYPTION_KEY: z
      .string()
      .refine(isBase64Key, "Must be the Base64 of exactly 32 bytes")
      .optional(),
    // Internal git hosts users may add repositories from, comma separated
    // (git.casa.lan,gitea.lan). Any other host that resolves to a private
    // address is refused.
    TRUSTED_GIT_HOSTS: z.string().optional(),
  },
  runtimeEnv: process.env,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
})
