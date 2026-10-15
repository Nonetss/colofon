## Why

The content repository the backend reads is configured today in `.env` (`CONTENT_DIR`, or `CONTENT_REPO` + `CONTENT_REF`): one source per deployment, changing it means editing the environment and restarting the backend, and the compose files carry a host-folder mount just for it. The user wants the repositories defined in the database, managed from the admin panel, and the editor setting of each content repository to point at a catalog named after that repository (`…/api/v1/content/schemas/<slug>`) instead of the single `…/schemas`.

## What Changes

- New table `content_repository`: one row per git content repository, with a unique `slug` (used in the editor URLs), a display name, the git URL (credentials, if any, inside it), the ref to check out and the outcome of its last sync.
- **BREAKING** Remove `CONTENT_DIR`, `CONTENT_REPO` and `CONTENT_REF` from `@nonete/env/server`, `.env.example` and the compose files. The local-folder source goes away: every repository is a git repository the backend clones.
- **BREAKING** Remove the read-only content folder mount and the `content_unset` volume from `compose.yml`, `compose.dev.yml` and `compose.prod.yml`; the `content_data` volume stays and now holds one clone per repository.
- The backend keeps one clone per repository under `.content/<repository id>/`, syncs every repository on boot and every five minutes (the existing `v1.content.sync` cron job), syncs one right after it is created or its URL or ref changes, and removes the clone of a deleted repository.
- **BREAKING** The public schema endpoints move under the repository's slug: the catalog at `GET /api/v1/content/schemas/{repository}`, and `…/{repository}/config`, `…/{repository}/type`, `…/{repository}/entities/{type}`. `GET /api/v1/content/schemas` (no slug) is removed. An unknown slug answers `NOT_FOUND`.
- New admin procedures under `v1.content` to list, create, edit, delete and sync repositories now. Responses never carry the URL's credentials.
- New admin screen at `/admin/content` (“Contenido”): a table of repositories with their last sync and the catalog URL to paste into the editor, a form to create and edit them, delete with confirmation and a “Sincronizar” action.
- Docs: `docs/human/contenido.md`, the stack skill references and `AGENTS.md` describe the repositories in the database instead of the variables. The content repository's `.vscode/settings.json` (in its own repository) changes its `yaml.schemaStore.url` to `https://<host>/api/v1/content/schemas/<slug>`.

## Capabilities

### New Capabilities

- `content-repository-management`: storing content repositories in the database and managing them from admin-only procedures and the `/admin/content` screen.

### Modified Capabilities

- `content-source`: the source is the set of repositories in the database, not environment variables; no local-folder source; one clone per repository; boot, periodic and on-demand sync of every repository; last valid declarations kept per repository.
- `content-editor-schemas`: the catalog and schema endpoints are scoped to a repository's slug; the editor setting points at `…/schemas/<slug>`.
- `environment-configuration`: `CONTENT_DIR`, `CONTENT_REPO` and `CONTENT_REF` leave the validated environment and the compose overrides.
- `docker-dev-environment`: no content folder mount or `CONTENT_DIR` override in the dev stack; the clone volume stays.
- `docker-production-deployment`: no content folder mount in `compose.yml` and `compose.prod.yml`; the clone volume holds every repository's clone.
- `rpc-api`: the `/api` GET CSRF protection exempts the public content schema endpoints, so a catalog URL opens from the address bar.
- `unit-testing`: the scenario showing that an integration a test turns on doesn't leak uses an OIDC variable instead of `CONTENT_DIR`.

## Impact

- Database: new `content_repository` table in `packages/db/src/schema/content/content.ts`. The migration is generated and applied by the user; the agent does not touch `packages/db/src/migrations/`.
- Code: `packages/content/src/source.ts` (no folder source, clone folder per repository), `packages/env/src/server.ts`, `packages/api/src/v1/content/*` (reader per repository, schema routes with the slug, admin procedures), `apps/backend/src/index.ts` (boot sync), `apps/frontend` (new `features/admin/content` slice, `pages/admin/content`, `app-surfaces.ts`, icon registry), with their tests.
- Docker: the three compose files and their comments; the backend images keep `git`.
- Data: an existing deployment loses its `.env`-configured content until an admin creates the repository in `/admin/content`; the old single clone in `.content/` is removed by the first sync. Every content repository's editor setting must be updated to the new URL.
