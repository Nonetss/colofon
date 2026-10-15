## 1. Database schema (migration is the user's)

- [x] 1.1 Add `packages/db/src/schema/content/content.ts` with the `content_repository` table (id, unique `slug`, name, url, `ref` default `main`, `last_synced_at`, `last_commit`, `last_sync_error`, timestamps) and export it from `schema/index.ts`; verify `bun run check-types` passes for `@nonete/db`
- [x] 1.2 Stop and ask the user to generate and apply the migration (`bun run db:generate` + migrate); do not touch `packages/db/src/migrations/`

## 2. Content package: clones per repository

- [x] 2.1 In `packages/content/src/source.ts`, remove `resolveContentSource`, `ContentSourceOptions` and the `dir`/`none` source kinds; add `cloneFolder(repoRoot, id)` and `pruneClones(root, keepIds)`; make `describeSource` describe a repository (slug, public URL, ref); update `src/index.ts` exports; verify `check-types` for `@nonete/content`
- [x] 2.2 Update `packages/content/tests/source.test.ts`: drop the `resolveContentSource` cases; assert `cloneFolder` places each id under the root, `pruneClones` removes entries not in the keep set (including a bare `.git` left at the root) and keeps the listed ones, and `describeSource` never includes credentials; verify `bun test` in `packages/content` passes

## 3. API: reader and schema endpoints per repository

- [x] 3.1 Rewrite `packages/api/src/v1/content/reader.ts` around injected `findRepository(slug)`, `listRepositories()` and `recordSync(id, result)`: `declarations(slug)` (undefined for unknown slug, empty for a folder without checkout, last valid per folder, problems logged once with the slug), `sync(repository)` (stores the outcome, redacted error) and `syncAll()` (sequential, one failure doesn't stop the rest, then prune)
- [x] 3.2 Change the schema procedures to take `repository` (shared slug schema in `input.ts`) on `/v1/content/schemas/{repository}`, `…/config`, `…/type`, `…/entities/{type}`; unknown slug → `NOT_FOUND`; catalog URLs built from `${CORS_ORIGIN}/api/v1/content/schemas/${slug}`; remove the slug-less catalog; wire production lookups with Drizzle in `handler.ts`
- [x] 3.3 Make the `sync` cron procedure (keep key `v1.content.sync` and its schedule) call `syncAll()` and return a per-repository summary; update its OpenAPI description; update `startContentSync()` to log the repository count and run `syncAll()` without awaiting
- [x] 3.4 Update `packages/api/tests/fixtures/content.ts` (temp clone root, in-memory repository lookups, local bare repos) and `tests/v1/content/handler.test.ts`: catalog per slug with absolute URLs carrying the slug; unknown slug and unknown type → `NOT_FOUND`; repository without checkout → empty catalog; two repositories stay apart; invalid content keeps the last valid declarations; no schema output contains the URL, credentials or entity values; `syncAll` keeps syncing after one failure, records commits/errors and prunes leftover folders; verify `bun run test` in `packages/api` passes

## 4. API: admin management procedures

- [x] 4.1 Add inputs/outputs for `listRepositories`, `createRepository`, `updateRepository`, `deleteRepository`, `syncRepository` (slug regex, `http(s)` URL, non-empty ref; output with masked `url`, `catalogUrl` and last-sync fields)
- [x] 4.2 Implement the handler methods: list ordered by name; create with `CONFLICT` on a taken slug (also mapping the unique violation) and a background sync; PATCH update keeping omitted fields, slug not editable, re-sync only when `url` or `ref` change; delete removing the row then the clone folder; sync awaiting with `BAD_GATEWAY` + redacted error and stored outcome; unknown slug → `NOT_FOUND`
- [x] 4.3 Wire the procedures in `router.ts` with `adminProcedure` and the methods/paths/`successStatus` from design.md; verify they appear under `Content` in the generated OpenAPI via `check-types` (no live probing)
- [x] 4.4 Add `packages/api/tests/v1/content/repositories.test.ts` against the fake database: non-admin → `FORBIDDEN` and no session → `UNAUTHORIZED` with no write; duplicate slug → `CONFLICT` with no insert; invalid slug and non-http URL rejected; update with only `ref` keeps name and URL and triggers a sync, update with only `name` keeps the stored URL with credentials and doesn't sync; delete removes the clone folder and later schema requests answer `NOT_FOUND`; list and create outputs mask credentials (`***`) and never contain the password; failed sync answers `BAD_GATEWAY` and stores the redacted error; verify `bun run test` passes

## 5. Environment and Docker

- [x] 5.1 Remove `CONTENT_DIR`, `CONTENT_REPO`, `CONTENT_REF` and their refinement from `packages/env/src/server.ts` and the Content block from `.env.example`; update `resetEnv()`/test env fixtures that clear them; verify `rg "CONTENT_(DIR|REPO|REF)"` finds nothing outside `openspec/` archives and this change
- [x] 5.2 In `compose.yml`, `compose.dev.yml` and `compose.prod.yml`, drop the `CONTENT_DIR` override, the host content mount and the `content_unset` volume, keep `content_data:/app/.content`, and update the comments; update the Dockerfile comments about `git`; verify with `docker compose -f <file> config -q` for each file (config rendering only, no stack started)
- [x] 5.3 Serve `/api/v1/content/schemas/*` in `apps/backend/src/routers/docs.ts` through an OpenAPI handler without `GetMethodCsrfProtectionHandlerPlugin`, so a catalog URL opened from the address bar isn't refused; the rest of `/api` keeps it; verify with backend `check-types` and Biome

## 6. Frontend admin screen

- [x] 6.1 Add the `admin-content` surface (“Contenido”, `/admin/content`, admin-only, description in Spanish) to `apps/frontend/src/lib/app-surfaces.ts` with an icon in the icon registry, and `apps/frontend/src/pages/admin/content/index.astro` mounting the page island with `client:only="react"`
- [x] 6.2 Create the slice `apps/frontend/src/features/admin/content/` following `features/admin/api-keys`: `content-page.tsx`/`content-content.tsx`, `hooks/use-content-repositories.ts` (queries and mutations over `orpc.v1.content.*`, each mutation invalidating the list key), `model/types.ts`, and `index.ts`
- [x] 6.3 Add `definitions/content-repository-columns.definition.tsx` (name, slug, masked URL, ref, last sync with time/short commit/error, catalog URL with `CopyButton`, row actions edit/“Sincronizar”/delete) rendered with `DataTableView` and the URL-backed sort
- [x] 6.4 Add `components/content-repository-form-modal.tsx` (create and edit; slug editable only on create; empty URL on edit keeps the stored one; Spanish copy and API error messages) and the delete confirmation following `api-keys-content.tsx`; verify `check-types`, Biome and `bun run tailwind:check` pass

## 7. Docs

- [x] 7.1 Rewrite “De dónde lo lee el backend” and “Autocompletado en el editor” in `docs/human/contenido.md`: repositories in `/admin/content`, one clone per repository, the catalog URL `https://<sitio>/api/v1/content/schemas/<slug>`, no local-folder source
- [x] 7.2 Update `AGENTS.md` (project map line for `packages/content`) and the stack skill references that mention the content variables or the slug-less catalog (`references/workspaces.md`, `references/env.md`, `references/docker.md`, `references/testing.md`); verify every cited path exists
- [x] 7.3 Tell the user the content repository's `/home/nonete/code/documentacion/.vscode/settings.json` (outside this repo) must point `yaml.schemaStore.url` at `https://localhost:4321/api/v1/content/schemas/<slug>` once the repository is created; change it only if the user asks

## 8. Validation

- [x] 8.1 From the repo root run `bun run check-types`, Biome (`bunx biome check .`) and `bun run test`; all pass
