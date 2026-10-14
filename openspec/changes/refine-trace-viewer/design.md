## Context

- The trace viewer (`v1.traces.search`/`get` over Tempo, `/admin/traces` as list plus waterfall panel) shipped with `add-opentelemetry`. A pass over real dev-stack traces (`traces.get` output for about 60 traces) produced the findings listed in the proposal.
- Facts this design relies on, all checked against the running stack (Tempo 3.1, oRPC `2.0.0-beta.42`):
  - `trace:id = "<id>"` works in a spanset, as the database search added in `add-opentelemetry` already uses.
  - oRPC wraps a streamed output in a span named `consume_async_iterator_object_output`. `{ name = "consume_async_iterator_object_output" }` finds the `cron.watchRuns`/`watchJobs` traces.
  - oRPC's `decorateMiddleware` copies the wrapped function's `name`, and the span is named `middleware.${name}`. Our middlewares are anonymous arrows, hence `middleware.`.
  - Span start times have millisecond resolution (the SDK starts spans at `Date.now()` and measures durations with `performance.now()`). 64 of the sampled spans ended up to 1 ms past their parent. This isn't fixable in the SDK without overriding every instrumentation's start time.

## Goals / Non-Goals

**Goals:**
- The viewer never records itself: what an admin sees is application traffic.
- The waterfall never draws a child outside its parent, and the measured times stay exact in the data.
- A stream trace is recognizable in the list, and its request is readable in the waterfall.
- Every span has a meaningful name.
- One session lookup per request.

**Non-Goals:**
- Changing span start precision in the SDK.
- Reclassifying a stream that ends with an error (e.g. `watchRuns` for a deleted job, `NOT_FOUND`). oRPC marks it as an error, and it is one: the subscription failed.
- Sorting or filtering by stream in the list.

## Decisions

### 1. The viewer's own requests aren't traced

The backend's tracing middleware runs requests to the viewer's procedures (`/rpc/v1/traces/*`, `/api/v1/traces/*`) inside `withoutTracing`, a new helper in `@nonete/telemetry/span` built on OpenTelemetry's `suppressTracing`. The SDK's `Tracer` checks suppression on every `startSpan`, so the HTTP span, oRPC's spans and the query spans inside those requests are all non-recording, and nothing is exported. That is the same as what already happens for the `GET /` healthcheck, which simply never gets a span. Checked with the real middleware and oRPC instrumentation: a viewer request records no span, while a `cron/list` request records its four.

**Alternatives:**
- Excluding the viewer's traces when searching, with `{ trace:rootName !~ ".*/rpc/v1/traces/.*" }` and an `includeViewer` switch. This was the first implementation, rejected in review: it stored traces only to hide them, matched on a name regex, and needed a switch to undo it.
- Simply not starting the HTTP span for those paths. oRPC's spans would then become orphan root traces, because its instrumentation has no "require parent" option. Suppression covers every instrumentation at once.

### 2. Bars clamped server-side, measured values kept

Each `traces.get` span gains `bar: { offsetMs, durationMs, continues }`. It is computed during layout, where parents always precede their children:
- A root's bar is its own measured range.
- A child's bar is its measured range intersected with its parent's bar (start pushed up to the parent's start, end pulled back to the parent's end), with a zero width if nothing is left.
- Every bar is also intersected with `[0, scaleMs]` (Decision 3). `continues` is true when the measured end lies past the bar's end because of `scaleMs`.

`offsetMs`/`durationMs` stay the measured values, which the span detail shows. Doing it in the handler keeps the rule in the tested `packages/api` suite; the frontend only draws `bar` against `scaleMs`.

**Alternative:** clamping in the frontend's waterfall. That works too, but frontend feature slices have no unit suite.

### 3. Streams: flagged, scaled to the request

- **Detection:** a trace is `streaming` when it has a span named `consume_async_iterator_object_output`.
- **`traces.get`** returns `streaming` and `scaleMs`. `scaleMs` is the first root span's duration for a stream (the HTTP request: the response with the open stream was returned then), and `durationMs` otherwise. Spans past it are cut at the right edge with `bar.continues`. The panel says "Stream: la traza dura lo que la suscripción (Ns); la cascada se ajusta a la petición." While the subscription is open, the stream's span hasn't ended and can't be exported yet, so its children show up as roots. The notice says spans may still be arriving.
- **`traces.search`** returns `streaming` per trace. It comes from one more search by the page's trace ids (`{ name = "consume_async_iterator_object_output" } && { trace:id = … }`), run in parallel with the database one. Both share the ids-to-query helper.
- **The list** shows the stream's duration followed by a "Stream" status tag. The duration is still the true length, so sorting by duration stays honest.

**Alternative:** excluding streams from the list. They are real requests, so it's better to label them.

### 4. Named oRPC middlewares

In `packages/api/src/index.ts`, `o.middleware(async ({ context, next }) => …)` becomes `o.middleware(async function requireAuth({ context, next }) { … })` (and the same for `requireAdmin`, `requirePermission`, `requireCron`). The `const` bindings stay. Nothing else changes in behavior, which the existing access tests already cover.

### 5. No session lookup on `/api/auth/*`

`sessionMiddleware` sets `user`/`session` to `null` and continues without calling `auth.api.getSession` when the path starts with `/api/auth/`. Better Auth's handler resolves the session itself for its own routes. `requestLogger` only uses `user` for activity entries, and `/api/auth` is excluded from those. No router under `/api/auth` reads `c.get("user")`; this is checked during apply.

### 7. Newest traces first, by query hint

Found during apply. With more traces in the window than `limit`, Tempo's search returns the first matches it finds rather than the newest. A 24-hour list was filled with traces from 10:48 to 11:59, still carrying the old `QUERY /rpc/*` names, while traces from the last hour were left out. The main search now ends with TraceQL's `with (most_recent=true)` hint. Checked against the dev Tempo 3.1: the same query returned 12:26 to 12:46, with the filters' `&&` spansets still working. The by-id searches don't need it, because they name their traces.

### 6. Backend restarts on package edits in the dev stack

Found during apply. After syncing an edit to `packages/api/src/v1/traces/handler.ts` into the backend container, the running backend kept serving the old code: `traces.get` returned no `bar`, and the already-updated frontend crashed (`bar is undefined`). An edit to `apps/backend/src/middlewares/auth.ts` in the same session was picked up. So `bun --hot` reloads the app's own files but not synced edits to the workspace packages; most likely it doesn't watch them because they are reached through `node_modules`.

The backend's watch rules for `packages/*/src` become `sync+restart`, while `apps/backend/src` stays `sync`. The frontend keeps `sync`, because Vite reloads the packages it imports.

**Alternatives:**
- Bind-mounting the repo: the dev images avoid it on purpose (container `node_modules`).
- Running `bun --watch` instead of `--hot`: it restarts the whole process on the app's own edits too, and would need the same `node_modules` watch to work.

## Risks / Trade-offs

- **Viewer traces recorded before this change** stay in Tempo until their 7-day retention ends. → They age out of the list (newest first) as soon as there is newer traffic.
- **Clamped bars could hide a real anomaly** (a child really outliving its parent, e.g. fire-and-forget work). → The span detail still shows the measured offset and duration. Only the drawing is clamped, and in the sample every overrun was under 1 ms (the rounding) apart from streams.
- **Two extra Tempo searches per list load.** → They run in parallel, are bounded by the page's ids, and each took about 14 ms against the dev Tempo.
- **A package edit restarts the dev backend** (a few seconds, open streams reconnect). → Acceptable, and still faster than debugging a stale backend. App-source edits keep hot reloading.
- **Stream scale picks the first root span.** → For a stream the first span in depth-first order is the HTTP request. A stream trace whose request span is missing would scale to the trace duration as before.
