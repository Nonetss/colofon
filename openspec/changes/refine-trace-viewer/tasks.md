## 1. Named oRPC middlewares

- [x] 1.1 In `packages/api/src/index.ts`, turn the anonymous arrows passed to `o.middleware` into named function expressions: `requireAuth`, `requireAdmin`, `requirePermission` (the one returned by the factory), `requireCron`. No behavior change; `packages/api/tests/index.test.ts` keeps passing.
- [x] 1.2 Extend `packages/api/tests/index.test.ts` (or the closest builder test) with a check that each access builder's middleware carries its name, so a future anonymous arrow fails the suite.

## 2. One session lookup on Better Auth's routes

- [x] 2.1 Check that no router under `/api/auth` reads `c.get("user")`/`c.get("session")` (`apps/backend/src/routers/auth.ts`, middlewares).
- [x] 2.2 In `apps/backend/src/middlewares/auth.ts`, make `sessionMiddleware` set `user`/`session` to `null` and call `next()` without `auth.api.getSession` when the path starts with `/api/auth/`. Comment why: Better Auth resolves it itself, and these routes aren't activity-logged.

## 2b. The viewer isn't traced

- [x] 2b.1 Add `withoutTracing(fn)` to `packages/telemetry/src/span.ts` (OpenTelemetry's `suppressTracing` around `fn`), with tests: no span recorded inside it, nested ones included, and tracing still on outside it.
- [x] 2b.2 In `apps/backend/src/middlewares/tracing.ts`, run requests to `/rpc/v1/traces/*` and `/api/v1/traces/*` inside `withoutTracing`, next to the healthcheck skip. Check with the real middleware and `ORPCInstrumentation` that a viewer request records no span and a `cron/list` request records its spans.

## 3. Trace API (`packages/api/src/v1/traces/`)

- [x] 3.2 `handler.ts`, search:
  - Generalize the by-id second search into a helper: given the page's ids and a spanset, return the ids that match.
  - Run it twice in parallel, for the database spanset and for `{ name = "consume_async_iterator_object_output" }`.
  - Add `streaming` to each summary.
- [x] 3.3 `handler.ts`, get: compute `streaming` (a span named `consume_async_iterator_object_output`) and `scaleMs` (the first root span's duration for a stream, else the trace duration). During layout, compute each span's `bar` (`offsetMs`, `durationMs`, `continues`): the measured range intersected with the parent's bar (parents come first in depth-first order) and with `[0, scaleMs]`.
- [x] 3.4 `output.ts`: `streaming` on summaries; `streaming`, `scaleMs` and per-span `bar` on `get`, with `.describe()` texts.
- [x] 3.6 End the main search with `with (most_recent=true)`, so Tempo returns the newest matches instead of the first ones it finds (found during apply: a busy day filled the list with traces from hours ago). Update the tests' expected queries.
- [x] 3.5 Extend `packages/api/tests/v1/traces/handler.test.ts`:
  - search:
    - the stream search names the page's ids;
    - `streaming` is set only on the traces it returns;
    - three Tempo calls for a non-empty page, one for an empty page;
  - get:
    - a child overrunning its parent by 0.4 ms gets a bar ending at the parent's end, with unchanged `offsetMs`/`durationMs`;
    - a child entirely outside its parent gets a zero-width bar;
    - a stream trace gets `streaming`, `scaleMs` equal to its root span's duration, and the stream span's bar cut at `scaleMs` with `continues`;
    - a plain trace gets `scaleMs` equal to `durationMs` and no `continues`.

## 4. Trace screens (`apps/frontend/src/features/admin/traces/`)

- [x] 4.1 Overview:
  - a "Stream" `StatusTag` next to the duration of streaming rows.
- [x] 4.2 Detail:
  - the waterfall positions and sizes each row from `span.bar` against `trace.scaleMs`, with a continuation mark on the right edge (a small chevron icon, `aria-hidden`, with the row's accessible text saying it continues) when `bar.continues` is set;
  - the time scale header shows `scaleMs`;
  - `spanBar` in `model/trace-layout.ts` takes the bar and the scale.
- [x] 4.3 Detail panel: a notice for streams explaining the subscription length (with `durationMs`), the request scale and that spans may still be arriving.

## 4b. Dev stack reload

- [x] 4b.1 In `compose.dev.yml`, switch the backend's `packages/*/src` watch rules to `sync+restart` (seven packages), with a comment saying why; keep `apps/backend/src` on `sync` and the frontend's rules unchanged. Validate with `docker compose -f compose.dev.yml config -q`.

## 5. Docs

- [x] 5.1 Update `docs/human/transversales.md` (Trazas) and `README.md` (Tracing) where they describe the list and the waterfall: viewer traces hidden by default, streams.
- [x] 5.3 Update the hot-reload tables in `README.md` and `docs/human/desarrollo.md`, and `references/docker.md`: package edits restart the dev backend.
- [x] 5.2 Update the stack skill references if they describe the session middleware or trace viewer behavior (`references/env.md`, `references/workspaces.md`).

## 6. Validation

- [x] 6.1 `bun run check-types`, Biome (`bunx biome check .`, ignoring the pre-existing migration snapshot) and `bun run tailwind:check` from the repo root.
- [x] 6.2 `bun run test` from the repo root; every suite passes.
- [x] 6.3 `openspec validate refine-trace-viewer --strict`.
- [x] 6.4 Run `traces.search`/`traces.get` inside the dev backend container against the dev Tempo (read-only, as during the review):
  - no new viewer traces recorded;
  - `watchRuns` flagged with a request-sized `scaleMs`;
  - no bar outside its parent across a sample of traces;
  - no `middleware.` span in new traces;
  - one `get-session` per SSR page in new traces.
