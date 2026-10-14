## 1. Dependencies and the `@nonete/telemetry` package

- [x] 1.1 Add to the root catalog:
  - `@opentelemetry/api`, `@opentelemetry/sdk-trace-base`, `@opentelemetry/resources`, `@opentelemetry/core`, `@opentelemetry/context-async-hooks`, `@opentelemetry/exporter-trace-otlp-http`, `@opentelemetry/instrumentation` and `@opentelemetry/semantic-conventions` (current stable versions);
  - `@orpc/opentelemetry` pinned exactly to `2.0.0-beta.42`, like every other `@orpc/*` entry.
- [x] 1.2 Scaffold `packages/telemetry` like `packages/logger`:
  - `package.json` named `@nonete/telemetry`, `build: "true"`, `check-types: "tsc -b"`, `"imports": { "#*": "./src/*.ts" }`;
  - exports `.` (SDK setup), `./span` (API-only helpers) and `./testing` (in-memory provider);
  - `tsconfig.json` extending `@nonete/config`.
- [x] 1.3 Implement `src/span.ts`, which depends on `@opentelemetry/api` only (design Decisions 1 and 3):
  - `withSpan(tracerName, spanName, { kind?, attributes?, root?, links? }, fn)`: starts an active span, records the exception and error status on throw or rejection, ends on every path and rethrows the original error;
  - `withServerSpan(request, name, fn)`: extracts the parent from the headers, starts a `SERVER` span with `http.request.method`, `url.path` and `user_agent.original`, lets `fn` rename it and set `http.route`, records `http.response.status_code` from the returned `Response`, marks 5xx as error, and ends when the response is returned;
  - `injectTraceHeaders(headers)`;
  - `activeTraceFields()`: returns `{ traceId, spanId }` only for an active sampled span, otherwise `{}`.
- [x] 1.4 Implement `src/index.ts` `startTelemetry({ serviceName, endpoint, sampleRatio, instrumentations, spanProcessor? })` (design Decision 1):
  - `BasicTracerProvider` with resource attributes, `ParentBasedSampler(TraceIdRatioBasedSampler)`, `BatchSpanProcessor(OTLPTraceExporter({ url: <endpoint>/v1/traces }))`;
  - registers the context manager, the W3C propagator and the instrumentations;
  - returns `{ shutdown }`;
  - without an endpoint, a no-op handle that registers nothing;
  - no casts and no `??` chains (code-style reference).
- [x] 1.5 Implement `src/testing.ts`: an in-memory provider (`SimpleSpanProcessor(InMemorySpanExporter)` plus the context manager) with `spans()` and `reset()`.
- [x] 1.6 Add the unit suite `packages/telemetry/tests/` (`bunfig.toml` with `root = "./tests"`, a `test` script, `#tests/*` import alias, no relative imports) covering:
  - `withSpan`: ends on success, records the exception, sets error status and rethrows on failure, nests under the active span, and `root: true` starts a new trace with links;
  - `withServerSpan`: continues the trace of an incoming `traceparent`, applies the rename and route from `fn`, records the status, sets error status on 5xx and not on 4xx;
  - `activeTraceFields`: returns `{}` with no span and for an unsampled span, and the ids for a sampled one;
  - `injectTraceHeaders`: writes a valid `traceparent`;
  - `startTelemetry`: registers nothing without an endpoint; with ratio `0`, root spans aren't sampled but a sampled remote parent is followed.
- [x] 1.7 Add `packages/telemetry` to the stack skill's `references/workspaces.md`, `references/aliases-and-deps.md` and `references/testing.md` (the list of suites), and to the `AGENTS.md` project map.

## 2. oRPC and bundle check

- [x] 2.1 Add `@orpc/opentelemetry` and `@opentelemetry/instrumentation` to `apps/backend`, and pass `new ORPCInstrumentation()` to `startTelemetry`.
- [x] 2.2 Build the backend (`bun run build` in `apps/backend`) and check that the bundle loads `@opentelemetry/instrumentation` on Bun by importing it with `SKIP_ENV_VALIDATION` and without starting the server. If it can't, replace `ORPCInstrumentation` with our own `Tracer` adapter for `setTracer` in `@nonete/telemetry` (design Decision 2), with its tests in the telemetry suite. Ask the user before running anything that needs the database or a running stack.

## 3. Environment

- [x] 3.1 Add to `packages/env/src/server.ts`, with comments like the `LOKI_URL` one:
  - `OTEL_EXPORTER_OTLP_ENDPOINT` (optional `z.url()`);
  - `OTEL_TRACES_SAMPLER_ARG` (`z.coerce.number().min(0).max(1).default(1)`);
  - `TEMPO_URL` (optional `z.url()`).
- [x] 3.2 Declare `OTEL_EXPORTER_OTLP_ENDPOINT` and `OTEL_TRACES_SAMPLER_ARG` as optional server `envField`s in `apps/frontend/astro.config.mjs`.
- [x] 3.3 Blank the new variables in `packages/api/tests/setup.ts` (and any other preload that lists the optional integrations), and add `TEMPO_URL` to the env fixture the same way `LOKI_URL` is handled for the logs tests.
- [x] 3.4 Document the variables in `.env.example`:
  - `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318` and `TEMPO_URL=http://localhost:3200` uncommented;
  - the sampler commented with its default `1`.
  Update the stack skill's `references/env.md`.

## 4. Logger correlation

- [x] 4.1 In `packages/logger/src/factory.ts`, set pino's `mixin` to `activeTraceFields` from `@nonete/telemetry/span`, and add `@nonete/telemetry` to the package's dependencies. The behavior is covered by `activeTraceFields`' tests in 1.6; the wiring is checked by `check-types`.

## 5. Backend tracing

- [x] 5.1 In `apps/backend/src/index.ts`, start telemetry first:
  - `startTelemetry({ serviceName: "stack-backend", endpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT, sampleRatio: env.OTEL_TRACES_SAMPLER_ARG, instrumentations: [ORPCInstrumentation] })`;
  - keep the handle in `globalThis.__backendTelemetry`, so `bun --hot` reloads reuse it.
- [x] 5.2 Add a last graceful-shutdown step after `closeDb()`: `telemetry.shutdown()`, bounded by the existing timeout. A failure is logged at `warn` and never changes the exit code.
- [x] 5.3 HTTP server span (design Decision 3):
  - Evaluate `@hono/otel` first.
  - Otherwise add `apps/backend/src/middlewares/tracing.ts`, a thin wrapper over `withServerSpan` that skips `GET /` and names the span `METHOD <matched route>`.
  - Register it with `app.use` before `requestLogger`.

## 6. Database spans

- [x] 6.1 In `packages/db`, add `src/tracing.ts` with `pgTracing()`: `@opentelemetry/instrumentation-pg` built with `enabled: false` and `requireParentSpan: true`, its `pg` module definition applied by hand to the imported `pg` on `enable()` and removed on `disable()` (design Decision 5). No casts.
- [x] 6.2 Pass `pgTracing()` to `startTelemetry` in `apps/backend/src/index.ts`, next to `ORPCInstrumentation`. `createDb()` stays as is, because Drizzle's pool uses the patched `pg.Client`.
- [x] 6.3 Add a `packages/db/tests/` suite (no real database: `query` stubbed under the patch) asserting:
  - a `CLIENT` span with `db.system.name`, `db.namespace` and `db.query.text` for a query inside a trace;
  - parameter values never appear in any attribute;
  - a rejected query fails its span and rejects with the original error;
  - a query outside a trace gets no span and returns its result unchanged;
  - `disable()` restores the unpatched query.
  Add the suite to `references/testing.md`.
- [x] 6.4 Run the bundled backend code against a throwaway PostgreSQL once, to check pool, transaction and Drizzle queries end to end.
- [x] 6.5 Give the Docker dev stack its own PostgreSQL (`db`, with the backend's `DATABASE_URL` overridden to reach it) and native dev a `db-native` under the `native` profile with `postgres:start`/`postgres:stop`. Update `.env.example`, `scripts/setup-dev.sh` and every doc that described the external dev database.

## 7. Cron spans

- [x] 7.1 In `packages/cron/src/scheduler.ts`, run `performRun` inside `withSpan("@nonete/cron", "cron.run <handlerKey>", { root: true, … })` (design Decision 6):
  - attributes `cron.job.id`, `cron.job.handler_key`, `cron.run.id`, `cron.trigger`, and the final `cron.run.status`;
  - error status for a failed run;
  - for `runJobNow`, a link to the span active when it was called.
  Add `@nonete/telemetry` to `packages/cron`.
- [x] 7.2 Extend `packages/cron/tests/` with the in-memory provider, asserting:
  - a scheduled run records a root span with `cron.trigger=schedule` and its attributes;
  - a failed run has error status and `cron.run.status=failed`;
  - a manual run started inside a parent span is a new trace linked to that parent.

## 8. Frontend SSR tracing

- [x] 8.1 Add `apps/frontend/src/lib/telemetry.ts`: it starts telemetry once per process (service `stack-frontend`, `astro:env/server` values) behind a `globalThis` guard. Add `@nonete/telemetry` to `apps/frontend`.
- [x] 8.2 In `src/middleware.ts`:
  - import the telemetry module;
  - wrap the non-public request path in `withServerSpan`;
  - merge `injectTraceHeaders(...)` into the headers passed to `authServer.getSession`.
  The helper logic lives and is tested in `@nonete/telemetry`, so there are no new frontend `src/lib` helpers with logic.

## 9. Gateway

- [x] 9.1 In `apps/gateway/routes.caddy`, strip `traceparent`, `tracestate` and `baggage` from every request (`request_header`).

## 10. Tempo

- [x] 10.1 Check against the running image which settings `grafana/tempo:3.1.0` takes as flags (target, port, storage, log level, usage reporting) and which only as YAML (OTLP receivers, retention). Pin the tag. No config file in the repo (design Decision 9).
- [x] 10.2 `compose.dev.yml`:
  - add an `x-tempo` anchor (image, flags, inline config, `tempo_data` volume) and the `tempo` service (`expose` only);
  - give both apps `OTEL_EXPORTER_OTLP_ENDPOINT: http://tempo:4318` and the backend `TEMPO_URL: http://tempo:3200`;
  - add `tempo-native` under the `native` profile (`127.0.0.1:4318:4318`, `127.0.0.1:3200:3200`);
  - add the top-level inline `configs` entry and update the header comment.
- [x] 10.3 `compose.yml`: add `tempo` with the same flags and inline config, the overrides, and the volume.
- [x] 10.4 `compose.prod.yml`: add `stack-tempo` on the `stack` network with the same flags, inline config, overrides and volume.
- [x] 10.5 Add the root scripts `tempo:start` (`docker compose -f compose.dev.yml --profile native up -d tempo-native`) and `tempo:stop`.
- [x] 10.6 Run `docker compose -f <file> config -q` on all three compose files (static validation only; never start or stop the user's stacks).

## 11. Trace API (`packages/api/src/v1/traces/`)

- [x] 11.1 Read `references/api/layering.md` and `references/api/http-semantics.md`, then check `packages/api/src/shared` and the `logs` feature for helpers to reuse: the escaping, time-range and fetch/error patterns.
- [x] 11.2 `input.ts`:
  - `tracesInput.search`: `service?`, `errorsOnly?`, `minDurationMs?`, `name?`, `from?`, `to?`, and `limit` via `paginationLimit(50, 200)` or the closest shared helper;
  - `tracesInput.get`: `traceId` matching `/^[0-9a-f]{32}$/`.
- [x] 11.3 `output.ts`:
  - `search`: `{ traces: [{ traceId, rootService, rootName, startTime, durationMs }], limitReached }`;
  - `get`: `{ traceId, startTime, durationMs, spanCount, errorCount, truncated, spans: [{ spanId, parentSpanId, name, service, kind, depth, offsetMs, durationMs, status, statusMessage, attributes, events }] }`.
- [x] 11.4 `handler.ts` (design Decision 10):
  - Build TraceQL with hand-escaped values and call `<TEMPO_URL>/api/search` and `<TEMPO_URL>/api/v2/traces/<id>`.
  - Validate Tempo's JSON with zod (no casts).
  - Normalize base64 or hex ids to hex, nanoseconds to ms offsets, and `AnyValue` attributes to JSON values.
  - Lay out the spans depth-first with orphans as roots, and cap at 2000 spans.
  - Map errors:
    - `TEMPO_URL` unset: empty search, `SERVICE_UNAVAILABLE` on get;
    - fetch failure, 5xx or invalid body: `BAD_GATEWAY`;
    - 404: `NOT_FOUND("Traza no encontrada")`.
  - Spanish user-facing messages.
- [x] 11.5 `router.ts`: `adminProcedure`, `openapi({ method: "GET", tags: ["Admin - Traces", "Admin"], … })` with English summaries. The search description says it is capped by `limit` with no cursor because Tempo's search can't paginate. Add `traces: tracesRouter` to `src/v1/router.ts`.
- [x] 11.6 `packages/api/tests/v1/traces/handler.test.ts` (`spyOn(globalThis, "fetch")` with Tempo response fixtures, following the logs handler tests). One `describe` per method:
  - `traces.search`:
    - empty without `TEMPO_URL` and no fetch;
    - the TraceQL built for each filter, with quotes and braces escaped;
    - the time range and limit sent;
    - newest-first mapping and `limitReached`;
    - `BAD_GATEWAY` on a fetch failure, a 5xx and an invalid body.
  - `traces.get`:
    - `SERVICE_UNAVAILABLE` without `TEMPO_URL`;
    - `NOT_FOUND` on a Tempo 404;
    - base64 ids decoded to hex;
    - depth-first order with sibling start order, depths and offsets;
    - an orphan span placed as a root;
    - status and attribute mapping and events;
    - `errorCount`;
    - truncation at 2000 spans.

## 12. Activity log ↔ trace

- [x] 12.1 `packages/api/src/v1/logs/`:
  - `traceId: z.string().nullable()` on each entry, read from the line in `parseLogEntry`;
  - `traceId?` (32 hex) on `logsInput.query`, appended to the LogQL pipeline after `| json` as `| traceId="…"`.
- [x] 12.2 Extend `packages/api/tests/v1/logs/handler.test.ts`:
  - `traceId` is mapped when present and `null` when absent;
  - the `traceId` filter appears in the LogQL sent to Loki, together with the type filter.
- [x] 12.3 `apps/frontend/src/features/admin/logs`:
  - read `traceId` from the URL as a filter (shown and clearable like the other filters);
  - in `renderDetail`, a "Ver traza" link to `/admin/traces?trace=<traceId>` when the entry has one, with `Hint`/`aria-label` if it is icon-only.

## 13. Trace screens (`apps/frontend`)

- [x] 13.1 Read `references/frontend/feature-structure.md`, `navigation-and-layouts.md`, `data-tables.md`, `data-fetching.md` and `typography.md`, and look for components to reuse (`DataTableView`, `ResourceOverview`, `JsonView`, the filter components, `Text`, `Hint`, `Badge`).
- [x] 13.2 Add the surfaces `admin-traces` (`/admin/traces`, in the admin nav, Spanish title, label and description, an icon from the catalog) to `src/lib/app-surfaces.ts` and, if needed, `site-nav.ts`.
- [x] 13.3 Create `src/features/admin/traces/` with an `overview` slice:
  - a `traces-page.tsx` provider boundary and `traces-content.tsx` with `useQuery(orpc.v1.traces.search.queryOptions(...))`;
  - filters mapped to the inputs;
  - `trace-columns.definition.tsx` (start, root span, service, duration, error badge) with browser sort in the URL (`useSortQueryParam`, default `startTime desc`) and rows linking to the detail;
  - empty state mentioning `TEMPO_URL`, error state, and a notice when `limitReached`.
- [x] 13.4 Add a `detail` slice to `src/features/admin/traces/`:
  - `trace-page.tsx`/`trace-content.tsx` reading `orpc.v1.traces.get`;
  - a summary header with a link to `/admin/logs?traceId=…`;
  - a `trace-waterfall` component: rows indented by `depth`, bars positioned with percentage offset and width, the error status token for error spans, palette tokens per service, and keyboard-selectable rows;
  - a span detail panel (attributes in `JsonView`, events list);
  - a truncation banner, plus `NOT_FOUND` and `SERVICE_UNAVAILABLE` states.
  Narrow `index.ts` barrels.
- [x] 13.5 Add the page `src/pages/admin/traces/index.astro` with the `Admin` layout; the trace detail is a panel beside the list (`?trace=`), not a route of its own, and `client:only="react"` islands, like `pages/admin/logs/index.astro`.
- [x] 13.6 Run `bun run tailwind:check` on the new markup.

## 14. Docs

- [x] 14.1 Update the stack skill references:
  - `docker.md`: the Tempo service, its flags and inline config repeated in each compose file (like Loki's flags), the volume;
  - `commands.md`: `tempo:start`/`tempo:stop`;
  - `env.md`: tracing vars, `TEMPO_URL`, trace headers stripped at the gateway;
  - `api/http-semantics.md`: if useful, `traces.get`'s `SERVICE_UNAVAILABLE` as the example of "not configured";
  - the `SKILL.md` mental-model diagram (Tempo next to Loki).
- [x] 14.2 Update `README.md` and `docs/human/` (`transversales.md`, `configuracion.md`, `docker-despliegue.md`, `desarrollo.md`, `arquitectura.md`, and `backend-api.md` for `v1.traces`). Spanish docs stay in Spanish.

## 15. Validation

- [x] 15.1 Run `bun run check-types` from the repo root and fix every error.
- [x] 15.2 Run Biome and `bun run tailwind:check`.
- [x] 15.3 Run `bun run test` from the repo root. Every suite, including the new `packages/telemetry` and `packages/db` suites, passes (telemetry 19, db 5, cron 54, api 172, frontend 237).
- [x] 15.4 Run `openspec validate add-opentelemetry --strict`.
- [ ] 15.5 Ask the user to run `bun run dev` (or `tempo:start` + `dev:local`) and confirm that a page load appears at `/admin/traces` as one trace spanning frontend → backend → SQL, and that the activity-log entry links to it. Don't probe the running app yourself.
