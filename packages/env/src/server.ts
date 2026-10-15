import { resolve } from "node:path"
import { createEnv } from "@t3-oss/env-core"
import { config } from "dotenv"
import { z } from "zod"

// Every workspace runs with its own directory as cwd, two levels below the
// repo root, so this is the root `.env`. Containers have no such file and get
// their variables from compose; already-set variables are never overridden.
config({ path: resolve(process.cwd(), "../../.env"), quiet: true })

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
    // Content repository. Either a local folder (CONTENT_DIR, relative to
    // the repo root) or a git URL (CONTENT_REPO, credentials in the URL)
    // checked out at CONTENT_REF; never both. Without either the backend
    // runs without content.
    CONTENT_DIR: z.string().min(1).optional(),
    CONTENT_REPO: z.string().min(1).optional(),
    CONTENT_REF: z.string().min(1).default("main"),
  },
  createFinalSchema: (shape) =>
    z.object(shape).superRefine((values, ctx) => {
      if (values.CONTENT_DIR === undefined) return
      if (values.CONTENT_REPO === undefined) return
      ctx.addIssue({
        code: "custom",
        path: ["CONTENT_REPO"],
        message: "Set CONTENT_DIR or CONTENT_REPO, not both",
      })
    }),
  runtimeEnv: process.env,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
})
