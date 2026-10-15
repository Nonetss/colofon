## 1. Bare repositories and the smart HTTP handler (`packages/content`)

- [x] 1.1 Add `packages/content/src/hosting.ts` with `HOSTED_DIR = ".hosted"`, `hostedFolder(hostedRoot, id)` and `ensureBareRepo(folder, ref)` (idempotent `git init --bare --initial-branch=<ref>`, run outside any checkout like `listRemoteBranches`); export them from `src/index.ts`; verify with `bun run check-types`
- [x] 1.2 Add `createGitHttpHandler({ resolve, onPush })` to `hosting.ts`: `GET .../info/refs?service=` advertisement with the pkt-line header, `POST .../git-upload-pack|git-receive-pack` streaming the (gunzipped when `Content-Encoding: gzip`) body through `git <service> --stateless-rpc`, protocol v0 only, `Cache-Control: no-cache`, `onError(slug, stderr)` for failed services, `onPush(slug)` after a successful receive-pack, `404` for unknown slugs, other services, dumb-protocol paths and anything else under `/git/`
- [x] 1.3 Write `packages/content/tests/hosting.test.ts` (real git, `Bun.serve` on port 0 with the handler, temp folders): `ensureBareRepo` creates a bare repo whose HEAD points at the ref and is a no-op the second time; clone of an empty repo then push to `main` and clone again gets the commit; `git push --force` rewrites `main`; `ls-remote` lists pushed branches; a gzip-encoded upload-pack body works (send one by hand with `fetch`); `onPush` is called once per successful push and not for fetches; `resolve` returning `undefined` answers 404 and creates nothing; unknown service and `/git/x.git/HEAD` answer 404. Verify with `bun test` in `packages/content`

## 2. Hosted repositories in the content API (`packages/api/src/v1/content`)

- [x] 2.1 Add the hosted helpers (`hostedMarkerOf`, `isHosted`, `gitSourceOf`, `pushUrlOf`) next to `catalogUrlOf` in `handler.ts` (or a small `hosted.ts` in the feature if `handler.ts` grows too much), and the `hostedRoot` sibling of `cloneRoot`
- [x] 2.2 `input.ts`: `hosted: z.literal(true).optional()` on `createRepository` and `updateRepository`, refusing `url` + `hosted` together; `output.ts`: `hosted: boolean` and `pushUrl: string | null` on the repository output; verify with `bun run check-types`
- [x] 2.3 `reader.ts`: take a `resolveSource(repository)` option and use it in `repoSyncFor` (keep `url` + `ref` as the sync key); wire it to `gitSourceOf` in `handler.ts`
- [x] 2.4 `handler.ts`: create hosted (store marker, `ensureBareRepo`, no sync; `BAD_REQUEST` when neither url nor hosted), update to hosted (marker, `ensureBareRepo`, existing sync rule), delete removes the bare folder of a hosted repository, `branchesUrlOf` goes through `gitSourceOf`, `toRepository` fills `hosted` and `pushUrl`
- [x] 2.5 Export `gitHttp` from `handler.ts`: `createGitHttpHandler` whose `resolve` finds the row by slug, returns `undefined` unless hosted and runs `ensureBareRepo`, and whose `onPush` calls `reader.syncInBackground(row)`
- [x] 2.6 Extend `packages/api/tests/v1/content/repositories.test.ts` (fake db, per `references/writing-unit-tests.md`): create hosted stores `/git/<slug>.git`, answers `hosted: true` and `pushUrl` `<CORS_ORIGIN>/git/<slug>.git`, creates the bare repo and starts no sync; create with both `url` and `hosted` fails validation; create with neither answers `BAD_REQUEST`; a typed `/git/x.git` URL fails validation; update to hosted sets the marker and syncs; update of a hosted repo with a URL makes it external and keeps the bare folder; delete of a hosted repo removes the bare folder; external repos answer `hosted: false`, `pushUrl: null`; `listBranches` by slug of a hosted repo reads its bare repo (empty → no branches)
- [x] 2.7 Extend `packages/api/tests/v1/content/handler.test.ts` for the reader: a hosted repository syncs from the folder `resolveSource` returns, and `gitHttp`'s `onPush` starts a sync of that repository only; `resolve` answers `undefined` for an external or unknown slug. Verify with `bun test` in `packages/api`

## 3. Backend route and gateway

- [x] 3.1 Add `apps/backend/src/routers/git.ts` mounting `app.all("/git/*", (c) => gitHttp(c.req.raw))` and register it in `src/index.ts`; skip `/git/` in `sessionMiddleware` next to `/api/auth/`; verify with `bun run check-types`
- [x] 3.2 `apps/gateway/routes.caddy`: add `/git/*` to `@backend` and a `not path /git/*` matcher to `encode`; validate with `docker run --rm -v ./apps/gateway:/etc/caddy caddy:2-alpine caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile`

## 4. Docker and repo housekeeping

- [x] 4.1 Add the named volume `hosted_data` on `/app/.hosted` for the backend in `compose.yml`, `compose.prod.yml` and `compose.dev.yml`, with a comment like `content_data`'s; verify with `docker compose -f <file> config --quiet` for each
- [x] 4.2 Add `.hosted/` to `.gitignore` (and `.dockerignore` if `.content/` is listed there); verify `git status` ignores a created `.hosted/` folder

## 5. Admin screen (`apps/frontend/src/features/admin/content`)

- [x] 5.1 `model/types.ts` and the form schema: source `"url" | "hosted"`, sending `hosted: true` instead of `url` for hosted; edit of a hosted repo starts with source hosted
- [x] 5.2 `content-repository-form-dialog.tsx`: source choice (“URL externa” / “Alojado en la plataforma”) reusing the existing form primitives; hosted hides the URL field; `ref-field.tsx`/`model/branches-source.ts` read branches by slug when editing a hosted repository and keep the typed fallback otherwise
- [x] 5.3 `content-repository-card.tsx` (the screen lists repositories as cards): show `pushUrl` (instead of the URL) for hosted repositories with the same copy control as the catalog URL; delete confirmation warns that a hosted repository's history is deleted with it
- [x] 5.4 Extend `apps/frontend/tests/unit/features/admin/content/branches-source.test.ts` and add `repository-form.test.ts` for the form-to-input mapping: hosted create never reads branches; hosted edit reads by slug; the payload sends `hosted: true` and no `url`. Verify with `bun test` in `apps/frontend` and `bun run tailwind:check`

## 6. Docs

- [x] 6.1 Update `AGENTS.md` (project map line of `packages/content`), the stack skill's `references/workspaces.md` and `references/docker.md` (the `hosted_data` volume and `/git/*` route), and `docs/human/contenido.md` with how to push to a hosted repository (`README.md` has no content-repository section, so it stays as it is); check every cited path exists

## 7. Validation

- [x] 7.1 Run `bun run check-types`, Biome (`bun run check` or the repo's Biome script) and `bun run test` from the repo root, and fix anything they report
