## Why

A review of real traces from the dev stack (about 60 traces from 30 minutes of use) found that the trace viewer shows correct hierarchies but misleads in five places:

- The viewer's own calls (`traces.search`, `traces.get`) were 98 of the last 200 traces, so every visit to `/admin/traces` buries what an admin is looking for.
- Child bars poke out of their parents by up to 1 ms. The OpenTelemetry SDK takes span start times from `Date.now()`, which has millisecond resolution, while durations are precise. In an 8 ms request that is a 12 % misalignment.
- Event-stream subscriptions (`cron.watchRuns`, `cron.watchJobs`) produce traces that last as long as the subscription (270 s seen). The request itself (4 ms) becomes an invisible sliver. While the stream is open, its spans whose parent hasn't ended show up as loose roots.
- 38 spans were named `middleware.`, because the access middlewares in `packages/api` are anonymous functions and oRPC names the span after the function.
- Every server-rendered page resolved the session twice. The backend's global `sessionMiddleware` runs `auth.api.getSession` on `/api/auth/*` too, right before Better Auth's own handler does the same.

## What Changes

- The viewer's own requests (`/rpc/v1/traces/*`, `/api/v1/traces/*`) run with tracing suppressed (OpenTelemetry's `suppressTracing`, through a new `withoutTracing` helper in `@nonete/telemetry/span`). Neither they nor the oRPC and query spans inside them are recorded, so there is nothing to hide when searching.
- `traces.get` returns, per span, a `bar` (offset and duration) clamped to its parent's bar, so the waterfall never draws a child outside its parent. `offsetMs`/`durationMs` keep the measured values.
- Streams are recognized by oRPC's `consume_async_iterator_object_output` span:
  - `traces.search` flags them (`streaming`), found with one extra search by trace id, the same way database use is found.
  - `traces.get` flags them, and its `scaleMs` (the duration the waterfall scales to) is the request's root span instead of the whole subscription. Bars that run past it are cut at the edge and marked as continuing.
  - The list shows a "Stream" tag next to the duration. The panel explains that the trace lasts as long as the subscription, and that spans may still be arriving while it is open.
- The oRPC access middlewares get names (`requireAuth`, `requireAdmin`, `requirePermission`, `requireCron`), so their spans read `middleware.requireAdmin`.
- `sessionMiddleware` skips `/api/auth/*`: Better Auth resolves the session itself there, and those routes are already outside the activity log.
- In the Docker dev stack, edits to the workspace packages restart the backend container (`sync+restart`) instead of relying on `bun --hot`. During apply, `bun --hot` reloaded `apps/backend/src` but not the synced `packages/api` files. The backend kept serving the old `traces.get` next to the new frontend, which crashed the waterfall; it was also why query spans earlier still showed as "Backend".

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `trace-viewer`:
  - search flags streams and returns the newest matches;
  - detail adds clamped bars, a stream flag and a scale;
  - the list screen adds the stream tag;
  - the panel explains streams.
- `distributed-tracing`: the viewer's own requests aren't traced; oRPC middleware spans carry the middleware's name.
- `http-server`: session resolution runs on every route except Better Auth's own `/api/auth/*`.
- `docker-dev-environment`: edits to the packages the backend uses restart its dev container.

## Impact

- **Code:**
  - `packages/api/src/v1/traces/` (input, output, handler, tests);
  - `packages/api/src/index.ts` (middleware names);
  - `apps/backend/src/middlewares/auth.ts` and `src/index.ts`;
  - `apps/frontend/src/features/admin/traces/` (stream tag, waterfall scale and continuation marks, panel notice);
  - `apps/backend/src/middlewares/tracing.ts` and `packages/telemetry/src/span.ts` (`withoutTracing`).
- `compose.dev.yml`: the backend's `packages/*/src` watch rules become `sync+restart`.
- **No dependency, environment or database change.** The API changes are additive: new output fields.
