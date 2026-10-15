## Context

Content repositories are rows in `content_repository` (`packages/db/src/schema/content/content.ts`) with a `url` and a `ref`. `packages/content/src/source.ts` runs the git CLI with `Bun.spawn`: `createRepoSync` keeps one clone per repository under the clone root (`.content/`, the `content_data` volume in Docker) by `fetch origin <ref>` against the stored URL, and `listRemoteBranches` runs `git ls-remote`. `packages/api/src/v1/content/reader.ts` owns the per-repository syncs and `handler.ts` the admin procedures. The backend image already ships `git`. The gateway forwards only `/rpc/*`, `/api/*`, `/scalar*` and `/openapi.json` to the backend.

Constraints: no schema change (migrations are the user's), no authentication (user's decision, see proposal), and git logic must stay unit-testable with the existing `#tests/fixtures/git-remote` fixture and real git.

## Goals / Non-Goals

**Goals:**
- `git clone/fetch/push https://<origin>/git/<slug>.git` works for hosted repositories with a stock git client, through the gateway, in dev and production.
- The rest of the content pipeline (sync, catalog, branches) treats a hosted repository like any other, with one place that knows where its git source is.

**Non-Goals:**
- Authentication, per-user permissions or branch protection.
- Git's dumb HTTP protocol, `git://`, SSH, or protocol v2-only features beyond what `--stateless-rpc` gives.
- Browsing repositories in the UI, pull requests, hooks or any forge feature.
- Importing an existing external repository's history when switching it to hosted (the writer just pushes it).

## Decisions

### 1. Smart HTTP over `git <service> --stateless-rpc`, not `git http-backend`

The endpoint spawns git's own services:
- `GET /git/<slug>.git/info/refs?service=git-upload-pack|git-receive-pack` → `Content-Type: application/x-git-<service>-advertisement`, body = pkt-line `# service=<service>\n` + flush `0000` + stdout of `git <service-without-git-> --stateless-rpc --advertise-refs <bare>`.
- `POST /git/<slug>.git/git-upload-pack|git-receive-pack` → `Content-Type: application/x-git-<service>-result`, request body (gunzipped with `DecompressionStream("gzip")` when `Content-Encoding: gzip`) piped to stdin of `git <service> --stateless-rpc <bare>`, stdout streamed back as the response body.
- `Cache-Control: no-cache` on both; anything else → 404.

`git http-backend` is the reference implementation but it is a CGI program: Bun has no CGI host, so we'd emulate the CGI environment and parse its header output. Calling the two services directly is ~the same amount of code, with fewer moving parts. No `http.receivepack` config is needed because that switch only gates `http-backend`.

The `Git-Protocol` header is not passed on, so every exchange is protocol v0, which every git client speaks and which needs the `# service=` header unconditionally. v2's ref filtering buys nothing for repositories this small.

The child is not tied to `request.signal`: Bun also fires it once the response is done, which could kill a `receive-pack` finishing its work. A client that disconnects closes the child's stdin, and git exits on its own.

### 2. Protocol handler in `packages/content`, route in `apps/backend`

`packages/content/src/hosting.ts` exports:
- `hostedFolder(hostedRoot, id)` and `ensureBareRepo(folder, ref)` (`git init --bare --quiet --initial-branch=<ref>` when the folder holds no repository; idempotent).
- `createGitHttpHandler({ resolve, onPush, onError })`: a fetch-style `(request: Request) => Promise<Response>` for paths `/git/<slug>.git/...`. `resolve(slug)` returns the bare repository folder of a hosted repository or `undefined` (→ 404); `onPush(slug)` runs after a `git-receive-pack` child exits successfully, and `onError(slug, stderr)` after any service child fails, for the backend to log.

Keeping it fetch-shaped (no Hono, no database) lets `packages/content/tests` exercise it end to end: a `Bun.serve` on port 0 with the handler, then real `git clone` / `git push` / `git push --force` / gzip bodies against it. `apps/backend/src/routers/git.ts` mounts it with `app.all("/git/*", (c) => gitHttp(c.req.raw))`, where `gitHttp` comes from the content handler (decision 4).

`sessionMiddleware` would call `auth.api.getSession` for every git request; it is cheap without a cookie, but `/git/` is added to its early skip next to `/api/auth/` since git requests never carry a session.

### 3. Hosted = `url` holds the marker `/git/<slug>.git`

No new column: a hosted repository stores `/git/<slug>.git` in `url`. Alternatives:
- A `hosted` boolean column: cleaner, but needs a migration for something derivable.
- Storing the backend's own HTTP URL (`http://localhost:3000/git/<slug>.git`): the sync would go through the backend's own HTTP server and depend on its port and network, and the public table would show an internal URL.
- Storing a filesystem path: breaks when the hosted root differs between native dev (`<repo>/.hosted`) and Docker (`/app/.hosted`).

The marker is environment-independent and self-describing. One helper in `packages/api/src/v1/content` owns it: `hostedMarkerOf(slug)`, `isHosted(row)` (`row.url === hostedMarkerOf(row.slug)`), and `gitSourceOf(row)` → the bare folder for a hosted row, `row.url` otherwise. Every place that hands a URL to git (`reader.ts`'s `repoSyncFor`, `branchesUrlOf`) goes through `gitSourceOf`. `publicUrl` and `redactCredentials` already pass a credential-less string through unchanged.

Input: `createRepository` and `updateRepository` gain `hosted: z.literal(true).optional()`. `url` keeps its `https?://` validation, so the marker can't be typed. A zod refinement rejects `url` + `hosted` together; create also rejects neither (the handler maps that to `BAD_REQUEST` as `listBranches` does today). Output: `hosted: boolean` and `pushUrl: string | null` (`${env.CORS_ORIGIN}/git/<slug>.git`, built like `catalogUrlOf`).

### 4. Wiring in the content handler

`handler.ts` already builds the reader with `cloneRoot = path.resolve(process.cwd(), "../..", CLONE_DIR)`. A sibling `hostedRoot` uses a new `HOSTED_DIR = ".hosted"` exported from `@nonete/content`. The reader receives `resolveSource: (repository) => string` (tests pass identity) so it stays database- and filesystem-layout-agnostic.

Handler behaviour:
- create hosted → insert with the marker, `ensureBareRepo`, no `syncInBackground`.
- update to hosted → set marker, `ensureBareRepo`, then the existing "url or ref changed → sync" rule (it fails cleanly if nothing was pushed).
- delete → existing clone removal plus `rm -rf` of the bare folder when hosted.
- exported `gitHttp = createGitHttpHandler({ resolve, onPush })`: `resolve` looks the row up by slug, returns `undefined` unless hosted, and calls `ensureBareRepo` (covers a wiped volume); `onPush` finds the row and calls `reader.syncInBackground(row)`.

Changing a hosted repository's `ref` doesn't move the bare repository's `HEAD`; HEAD only decides what a fresh `git clone` checks out by default, and the sync always fetches the explicit `ref`. Acceptable.

### 5. Gateway and volumes

`routes.caddy`: add `/git/*` to the `@backend` matcher, and give `encode` a `not path /git/*` matcher so the packs stream through untouched, explicitly rather than relying on `encode`'s default content-type list, which varies between Caddy versions.

Compose: a named volume `hosted_data` on `/app/.hosted` for the backend in `compose.yml`, `compose.prod.yml` and `compose.dev.yml`, separate from `content_data` because clones are a disposable cache while bare repositories may be the only copy of the content. `.gitignore` gets `.hosted/`.

### 6. Frontend

`content-repository-form-dialog.tsx` gets a source choice (external URL vs “Alojado en la plataforma”) with the existing form primitives. Hosted hides the URL field; `ref-field.tsx` keeps its typed fallback, and its branch source reads the stored slug when editing a hosted repository. The card/table shows `pushUrl` with the same copy control as the catalog URL. Delete confirmation adds the warning for hosted repositories.

## Risks / Trade-offs

- [Anyone who reaches the gateway can push or rewrite history] → Accepted by the user. The writer's local clones are the backup. Adding auth later is local to `createGitHttpHandler`: compare a Basic-auth password against an env token before spawning `receive-pack`.
- [Bun's default `maxRequestBodySize` (128 MB) caps a single push] → Plenty for text content; raise it on `Bun.serve` if a repository ever needs bigger pushes.
- [Long pushes/clones held open through Caddy and Bun] → Responses stream; no timeouts are added to the service children, which end when the client's request body ends.
- [Volume loss deletes hosted history] → Separate `hosted_data` volume, never pruned by syncs; document that it must be backed up.
- [Concurrent pushes] → `receive-pack` locks refs itself; the second push to the same ref is rejected as non-fast-forward or wins, as on any git server. Syncs already coalesce per repository.

## Migration Plan

No database migration. Deploy is additive: existing repositories keep their URLs and behave as before. After deploying, `docker compose up` creates `hosted_data`. Rollback: redeploy the previous images; hosted repositories then fail to sync (their marker isn't a URL) until switched back to an external URL, and `hosted_data` keeps their history.
