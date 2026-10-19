import type { RouterClient } from "@orpc/server"
import { adminUserRouter } from "#v1/admin-user/router"
import { apiKeyRouter } from "#v1/api-key/router"
import { authConfigRouter } from "#v1/auth-config/router"
import { commentRouter } from "#v1/comment/router"
import { contentRouter } from "#v1/content/router"
import { cronRouter } from "#v1/cron/router"
import { docsRouter } from "#v1/docs/router"
import { entityIconRouter } from "#v1/entity-icon/router"
import { gitCredentialRouter } from "#v1/git-credential/router"
import { healthRouter } from "#v1/health/router"
import { myOrganizationRouter } from "#v1/my-organization/router"
import { organizationRouter } from "#v1/organization/router"
import { pluginsRouter } from "#v1/plugins/router"
import { privateRouter } from "#v1/private/router"
import { releaseRouter } from "#v1/release/router"
import { secretRouter } from "#v1/secret/router"
import { sessionHistoryRouter } from "#v1/session-history/router"
import { skillsRouter } from "#v1/skills/router"

export const appRouter = {
  authConfig: authConfigRouter,
  health: healthRouter,
  release: releaseRouter,
  apiKey: apiKeyRouter,
  comment: commentRouter,
  entityIcon: entityIconRouter,
  private: privateRouter,
  organization: organizationRouter,
  myOrganization: myOrganizationRouter,
  plugins: pluginsRouter,
  cron: cronRouter,
  sessionHistory: sessionHistoryRouter,
  adminUser: adminUserRouter,
  content: contentRouter,
  docs: docsRouter,
  skills: skillsRouter,
  secret: secretRouter,
  gitCredential: gitCredentialRouter,
}
export type AppRouter = typeof appRouter
export type AppRouterClient = RouterClient<typeof appRouter>
