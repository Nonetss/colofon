## Context

Today the content source is resolved from the environment on every call (`currentContentSource()` in `packages/api/src/v1/content/handler.ts` over `resolveContentSource()` in `packages/content/src/source.ts`): a folder (`CONTENT_DIR`) read in place, or one git repository (`CONTENT_REPO` at `CONTENT_REF`) cloned into `.content/` by `createRepoSync()`. `createContentReader()` (`reader.ts`) loads the declarations, keeps the last valid ones per root and dedupes problem logs; the public schema routes and the `v1.content.sync` cron job (every five minutes, plus a fire-and-forget sync on boot from `apps/backend/src/index.ts`) sit on top. The compose files mount `CONTENT_DIR` read-only at `/content` and keep the clone in the `content_data` volume on `/app/.content`.

The user chose (see proposal): several repositories with a slug, git only (no folder source), management from an admin screen, credentials kept inside the URL and never returned.

## Goals / Non-Goals

**Goals:**
- Content repositories are rows; the backend reads, syncs and serves each one independently, keyed by slug in the public URLs and by id on disk.
- The pieces that already work (`loadContent`, `editorSchemas`, `schemaCatalog`, `createRepoSync`, credential redaction, last-valid caching) are reused, only re-keyed per repository.

**Non-Goals:**
- Organization or per-user ownership of repositories: they are global and admin-managed. The organization plugin is not wired in.
- Encrypting credentials at rest, SSH remotes, webhooks on push, or a local-folder source.
- Rendering the content (pages, entities) in the frontend: this change only moves the configuration and the editor endpoints.
- Migrating the old `.env` values into a row automatically.

## Decisions

### Table `content_repository` in `packages/db/src/schema/content/content.ts`

Columns: `id` (uuid, default random), `slug` (text, unique index), `name` (text), `url` (text, credentials included), `ref` (text, default `main`), `last_synced_at` (timestamp, null), `last_commit` (text, null), `last_sync_error` (text, null, already redacted), `created_at`, `updated_at` (`$onUpdate`). Exported from `schema/index.ts` like the other files. Hard delete: nothing references a repository and its clone is disposable. The agent edits the schema file (the user asked for the data in the database) but the user generates and applies the migration.

*Alternative*: a soft delete like `cron_job`. Rejected: no history hangs from a repository, and a freed slug should be reusable at once without a partial index.

### The slug is immutable; the clone folder is named by id

The slug is what writers paste into `.vscode/settings.json`; renaming it silently breaks every clone of the content repository, so the edit procedure doesn't accept it (delete and recreate is the explicit path). The clone lives at `<clone root>/<id>/`, so a repository's folder never depends on user input (no path traversal from a slug) and a URL change is detected by `createRepoSync()`'s existing `origin` check.

### Clone root and pruning

`CLONE_DIR` (`.content`) stays the clone root, so the `content_data` volume on `/app/.content` and the `.gitignore` entry keep working. A new helper in `packages/content/src/source.ts` gives a repository's folder (`cloneFolder(cloneRoot, id)`) and another removes entries of the root that are not in a given id set (`pruneClones(root, keep)`). The "sync all" path (boot and cron) prunes after reading the rows; this also deletes the single clone the old configuration left directly in `.content/` (its `.git` and files are not repository ids). Deleting a repository removes its folder right away.

`resolveContentSource()`, `ContentSource`'s `dir`/`none` kinds and `ContentSourceOptions` go away; `describeSource()` becomes a description of a repository (slug, public URL, ref).

### Reader keyed by repository

`createContentReader()` changes from "one source function" to a repository store (`find`, `list`, `recordSync`) plus the clone root:
- `content(slug)` → looks the row up, returns `undefined` for an unknown slug (the handler turns that into `NOT_FOUND`) and otherwise loads `<clone root>/<id>` with the current last-valid cache keyed by that folder; a folder without a checkout yields no declarations (empty catalog).
- `sync(repository)` → the existing per-key `createRepoSync()` memo (key: url, ref, folder), logging with the slug and the public URL, then stores `last_synced_at` and either `last_commit` (clearing the error) or `last_sync_error`.
- `syncAll()` → reads every row, syncs them one after another, catching each failure so the next still runs, then prunes.
- `syncInBackground(repository)` → `sync` without awaiting, logging instead of throwing (create and update).
- `remove(repository)` → deletes the clone folder and forgets its caches.

The store is injected so the handler tests keep using temp folders and local bare repos without the database, as `tests/fixtures/content.ts` does today; the production wiring passes Drizzle queries.

*Alternative*: cache rows in memory and reload on admin writes. Rejected: a one-row indexed lookup per schema request is cheap, and the editor's request rate is low; caching adds invalidation for no gain.

### Public routes: slug in the path

Schema routes become `/v1/content/schemas/{repository}`, `…/{repository}/config`, `…/{repository}/type`, `…/{repository}/entities/{type}`, with `repository` in each input (slug regex shared with the management input). The catalog base URL becomes `${CORS_ORIGIN}/api/v1/content/schemas/${slug}`; `schemaCatalog()` in `packages/content` already takes the base URL, so it doesn't change. `SCHEMAS_PATH` stays as the prefix. The old slug-less catalog is removed, not redirected: there is no "default" repository.

### Management procedures in the same `content` feature

New procedures on `contentRouter`, built with `adminProcedure`. Like every procedure but the public schema ones, they declare no `path`: the slug travels in the input.

| Procedure | Method | Notes |
|---|---|---|
| `listRepositories` | `GET` | ordered by name; small list, no pagination |
| `createRepository` | `POST`, 201 | `CONFLICT` on a taken slug (checked first; a concurrent insert loses on the unique index through `onConflictDoNothing`); starts a sync without awaiting |
| `updateRepository` | `PATCH` | `name`, `url`, `ref` optional; re-syncs when `url` or `ref` changed |
| `deleteRepository` | `DELETE` | removes the row, then the clone folder; returns `{ id, success }` |
| `syncRepository` | `POST` | awaits; `BAD_GATEWAY` with the redacted error on failure |

They live in the existing `content` feature (input/output/handler/router) because they share the reader and the clone root with the schema endpoints and the cron job; a separate `content-repository` feature would have to import `content`'s internals. The output maps a row to `{ id, slug, name, url: publicUrl(url), ref, lastSyncedAt, lastCommit, lastSyncError, catalogUrl, createdAt, updatedAt }`, so the UI doesn't rebuild the catalog URL. Input: `url` is a `z.url()` restricted to `http:`/`https:`; `ref` non-empty; `slug` `^[a-z0-9]+(?:-[a-z0-9]+)*$`, max 63.

`sync` (the cron job, key `v1.content.sync`, unchanged so `cron_job.handler_key` stays valid) calls `syncAll()` and returns the commit of each repository (`{ repositories: [{ slug, commit }] }`) instead of `{ source, commit }`. When any repository failed, after trying them all, it throws `BAD_GATEWAY` naming the failed slugs, so the run shows as failed in `/crons` as before.

### Admin screen `/admin/content`

A new `admin-content` surface in `app-surfaces.ts` (label “Contenido”, admin-only, an icon added to the icon registry), `pages/admin/content/index.astro`, and a slice `features/admin/content/` following `features/admin/api-keys` (`content-page.tsx` → `content-content.tsx`, `definitions/content-repository-columns.definition.tsx`, `components/content-repository-form-modal.tsx`, `hooks/use-content-repositories.ts`, `model/types.ts`). The table uses `DataTableView` with browser sort; the catalog URL cell reuses `components/shared/form/copy-button.tsx`; row actions are edit, “Sincronizar” (a `useOrpcMutation` that invalidates the list key) and delete through the existing confirm dialog pattern. The middleware already gates every `/admin` path by role, so no middleware change.

### Configuration and Docker

`CONTENT_DIR`, `CONTENT_REPO`, `CONTENT_REF` and the "not both" refinement leave `packages/env/src/server.ts` and `.env.example`. The three compose files drop the `CONTENT_DIR` override, the `${CONTENT_DIR:-content_unset}:/content:ro` mount and the `content_unset` volume, and keep `content_data:/app/.content`. The Dockerfiles keep `git` + `ca-certificates`; only their comments change.

## Risks / Trade-offs

- [Credentials stored in clear text in the database] → Accepted by the user; the URL is never returned or logged, the stored error is redacted, and the management procedures are admin-only. A dedicated encrypted token field can come later without changing the public endpoints.
- [Losing the read-in-place folder slows the writer's loop: a new type needs a push and a sync] → The “Sincronizar” action makes it immediate; the five-minute job covers the rest.
- [Public, unauthenticated endpoints now reveal which slugs exist (`NOT_FOUND` vs empty catalog)] → Slugs are not secret (they are in every content clone's settings); no URL, ref or value is exposed.
- [A sync started by create/update runs in the background, so the request can't report its failure] → The outcome is stored on the row and shown in the table; `syncRepository` gives a synchronous answer.
- [Concurrent syncs of the same repository from cron, create and the button] → `createRepoSync()` already shares a running sync per key; deleting while syncing may leave a folder that the next prune removes.

## Migration Plan

1. Implement and merge; the user generates and applies the migration for `content_repository` (`bun run db:generate`, then migrate).
2. After deploying, an admin creates the repository (the old `CONTENT_REPO`/`CONTENT_REF` values) at `/admin/content`; the first full sync prunes the old `.content/` clone and clones it under its id.
3. Remove `CONTENT_*` from each `.env` (left over, they are ignored).
4. In each content repository, change `.vscode/settings.json` to `"yaml.schemaStore.url": "https://<host>/api/v1/content/schemas/<slug>"` (for the local one: `https://localhost:4321/api/v1/content/schemas/documentacion`).

Rollback: redeploy the previous version and restore the `CONTENT_*` variables; the table is left unused.
