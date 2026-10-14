## Context

- **Runtime:** both apps run on Bun. The backend is bundled by tsdown into `dist/index.mjs`; the frontend's Astro standalone server is bundled by Vite. Neither runtime image has `node_modules`. This is already why `@nonete/logger` pushes to Loki through its own synchronous stream instead of `pino.transport()`.
- **Today's observability:**
  - pino logs go to stdout and, with `LOKI_URL`, to Loki.
  - `requestLogger` gives every backend request a server-generated `requestId`, which oRPC's `PinoHandlerPlugin` reuses.
  - Nothing measures time per layer or follows a request across the frontend → backend hop.
- **oRPC v2 (`2.0.0-beta.42`)** has backend-agnostic tracing built in:
  - `@orpc/shared` exposes `setTracer(tracer)`, and the server already wraps `find_procedure`, `decode_input`, each `middleware.<name>`, `validate_input`/`validate_output` and `call_procedure` in spans when a tracer is set.
  - `@orpc/opentelemetry@2.0.0-beta.42` provides `ORPCInstrumentation`. Its `enable()` only calls `setTracer` with an OpenTelemetry adapter; it patches no modules.
- **Database:** Drizzle `1.0.0-rc` ships its tracing compiled out (`hasTelemetry = false`), so it emits no spans. `@nonete/db` builds the pool implicitly with `drizzle(env.DATABASE_URL, …)`.
- **Constraints:**
  - No module patching may be relied on. `require-in-the-middle`/`import-in-the-middle` don't work reliably on Bun and have nothing to hook into a bundle.
  - Only the gateway publishes a port in production.
  - Unit tests are hermetic.
  - No casts in TypeScript.
  - Every optional integration (Loki today) is off when its variable is unset.

## Goals / Non-Goals

**Goals:**
- One trace per backend request, with HTTP → oRPC pipeline → SQL queries nested in it, and one per cron run.
- One trace per frontend SSR request that continues into the backend's session lookup.
- Browsing traces inside the app (`/admin/traces`), and moving from an activity-log entry to its trace and back, without a separate observability UI or changing how logs are shipped.
- Zero behavior change and negligible cost when `OTEL_EXPORTER_OTLP_ENDPOINT` is unset, in dev, CI and tests.
- Works in the bundled production images on Bun.

**Non-Goals:**
- Metrics (`MeterProvider`, RED dashboards). The SDK setup leaves room for them, but nothing is emitted in this change.
- Browser tracing (`sdk-trace-web`), so no spans from React islands.
- Caddy's own `tracing` directive.
- Shipping logs over OTLP instead of the Loki push stream.
- Auto-instrumentation of Better Auth internals beyond the HTTP span.
- A separate observability UI (Grafana, Jaeger UI). Traces are browsed only from the in-app viewer.
- Tail sampling or an OpenTelemetry Collector. The apps export straight to Tempo, and a collector can be inserted later by changing only the endpoint.

## Decisions

### 1. Manual SDK setup in a new `@nonete/telemetry` package, no `sdk-node`

`startTelemetry({ serviceName, endpoint, sampleRatio, instrumentations, spanProcessor? })` builds the pipeline from small pieces:
- A `BasicTracerProvider` (`@opentelemetry/sdk-trace-base`) with a resource (`service.name`, `deployment.environment.name`).
- `ParentBasedSampler(TraceIdRatioBasedSampler(sampleRatio))`.
- `BatchSpanProcessor(OTLPTraceExporter({ url: endpoint + "/v1/traces" }))` from `@opentelemetry/exporter-trace-otlp-http`.
- Registered globally through `@opentelemetry/api` (`trace.setGlobalTracerProvider`, `context.setGlobalContextManager(new AsyncLocalStorageContextManager())`, `propagation.setGlobalPropagator(new W3CTraceContextPropagator())`).
- `registerInstrumentations` for the instrumentations it is given.

It returns `{ shutdown(): Promise<void> }`. Without an endpoint it registers nothing and returns a handle whose `shutdown` resolves immediately, so `@opentelemetry/api` keeps its built-in no-op tracer and every span helper costs almost nothing. The optional `spanProcessor` lets tests swap in a `SimpleSpanProcessor(InMemorySpanExporter)`.

**Package layout.** The package follows the shared-package conventions: raw TS source, `"#*": "./src/*.ts"` imports, `build: "true"`. It exposes:
- `@nonete/telemetry`: the SDK setup.
- `@nonete/telemetry/span`: depends only on `@opentelemetry/api`. Exports `withSpan(tracerName, spanName, options, fn)` (starts an active span, records an exception and error status on throw, always ends), `withServerSpan(request, name, fn)` (extracts the parent from the request's headers, starts a `SERVER` span with the HTTP attributes, lets `fn` rename it once the route is known, sets the response status and marks 5xx as error), `injectTraceHeaders(headers)` and `activeTraceFields()` (returns `{ traceId, spanId }` for an active sampled span, otherwise `{}`).
- `@nonete/telemetry/testing`: the in-memory provider for test suites.

`@nonete/db`, `@nonete/cron`, `@nonete/logger` and the frontend import only `/span`. Only the two app entrypoints import the SDK.

**Alternatives considered:**
- `@opentelemetry/sdk-node` with `auto-instrumentations-node`: depends on module hooks (dead on Bun and in a bundle) and drags in dozens of instrumentations we can't use.
- Hand-rolled spans without OpenTelemetry: loses oRPC's integration and the standard exporters.
- Putting the SDK in `@nonete/logger`: mixes two concerns, and the frontend's logger would pull in the SDK.

### 2. oRPC through `ORPCInstrumentation`, pinned with the rest of oRPC

`@orpc/opentelemetry` is added to the root catalog at exactly `2.0.0-beta.42`, like every `@orpc/*` package, and the backend passes `new ORPCInstrumentation()` to `startTelemetry`. Its spans nest under the HTTP span because both use the global context manager.

- Its peer `@opentelemetry/instrumentation` is only used for `InstrumentationBase`. With no module definitions it installs no hooks, but it imports `require-in-the-middle`/`import-in-the-middle`, so the tsdown and Vite bundles must be checked to build and start (task 2.x).
- Alternative: our own `Tracer` adapter for `setTracer`, about 60 lines that copy what the package already ships. It stays as the fallback if the bundle check fails.

### 3. HTTP server span: one Hono middleware, first in the chain

`apps/backend/src/middlewares/tracing.ts` is a thin Hono wrapper around `withServerSpan` (Decision 1), so the logic lives in the tested `@nonete/telemetry` suite (`apps/backend` has no unit suite and doesn't get one). It runs before `requestLogger`, so every line that middleware writes carries the trace fields. For each request it:
- extracts the parent context from the request headers through the global propagator;
- starts a `SERVER` span named `METHOD` and, after `next()`, renames it to `METHOD <route>` from Hono's matched route (`/rpc/*` for oRPC; the procedure path is on the oRPC spans);
- sets `http.request.method`, `url.path`, `http.route`, `http.response.status_code` and `user_agent.original`;
- marks 5xx as error and ends the span. For event-stream responses the span ends when the response is returned, not when the stream closes, so a long subscription doesn't hold a span open for minutes.

**Resolved during apply:** `@hono/otel`'s `httpInstrumentationMiddleware` (1.2.0) does all of the above (with `url.full` instead of `url.path`), so the backend uses it behind a small wrapper that skips `GET /`. `withServerSpan` stays for the frontend's Astro middleware.

The health route (`GET /`, hit every 10 s by the compose healthcheck) is not traced, so it doesn't flood Tempo.

### 4. Inbound trace headers: trusted only from inside the network

The gateway's shared `routes.caddy` removes `traceparent`, `tracestate` and `baggage` from every public request (`request_header -…`). The backend therefore continues a trace only when called directly over the private network: the frontend SSR's `BACKEND_URL` lookups, which never go through the gateway. This mirrors the existing rule that callers can't choose their `requestId`, and it stops a public client from pinning traces to ids of its choosing or skipping sampling with a forged `sampled` flag.

### 5. PostgreSQL spans from a traced `pg` client

`@nonete/db` builds the pool explicitly (`new Pool({ connectionString, Client: TracedClient })`) and passes it to `drizzle({ client: pool, relations })`. `TracedClient` extends `pg.Client` and wraps `query` in a `CLIENT` span:
- name `<OPERATION>` (the first SQL keyword: `SELECT`, `INSERT`, …);
- `db.system.name = "postgresql"`, `db.namespace` = database name, `db.query.text` = the parameterized text (placeholders only, no values), and `db.response.returned_rows` on success;
- exception and error status on failure.

Pool-level `query()` and transaction clients (`pool.connect()`) both end in `Client.query`, so one override covers both. Callback-style calls (not used by Drizzle) are forwarded untouched.

The override must keep `pg`'s overloaded `query` signature without a cast (code-style rule). If that can't be done with a typed rest-args override plus a guard, apply stops and asks rather than casting.

**Alternatives:**
- `@opentelemetry/instrumentation-pg`: module patching, ruled out.
- Drizzle's `logger` option: called before the query with no end hook, so it gives no duration.
- Wrapping `db` with a Proxy: fragile across Drizzle's query builders.

`closeDb()` keeps ending the same pool.

### 6. Cron: a root span per run

`performRun` runs inside `withSpan("@nonete/cron", "cron.run <handlerKey>", { root: true, links, attributes })`:
- attributes `cron.job.id`, `cron.job.handler_key`, `cron.run.id`, `cron.trigger` (`schedule` | `manual`), and the final `cron.run.status`;
- error status when the run fails.

A manual run (`runJobNow`) starts its own root trace with a span link to the request span that triggered it, so a long run isn't counted as part of the admin's request latency but stays navigable from it. The procedure call inside the run, and its SQL, nest under the run span.

### 7. Logs carry `traceId`/`spanId` through a pino `mixin`

`createLogger` sets `mixin: activeTraceFields`, so pino evaluates it on every log call and reads the active span at that moment.
- Fields are camelCase like `requestId`, and only present when the span is sampled. An unsampled trace id would link to nothing in Tempo.
- `requestId` stays: it is the activity log's key and works with tracing off.
- Loki labels are unchanged (`service` only). The ids live in the line, where the activity log reads `traceId` (Decision 10).

The frontend logger gets the same mixin through the shared factory.

### 8. Frontend: span per SSR request, propagation on the session lookup

`apps/frontend/src/lib/telemetry.ts` starts telemetry once per process. It is guarded by `globalThis`, because Vite's dev SSR re-evaluates modules, and is read from `astro:env/server` (`OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_TRACES_SAMPLER_ARG`), with service name `stack-frontend`. `middleware.ts` imports it, wraps `onRequest` in `withSpan(..., { kind: SERVER })` named `GET <path pattern>`, and passes `injectTraceHeaders(...)` into `authServer.getSession`'s `fetchOptions.headers`. Public paths (`/login`, static assets) are not traced.

There is no shutdown hook in Astro's standalone server, so the frontend relies on the batch processor's 5 s schedule. Spans from the last few seconds before a container stop can be lost (accepted, see Risks).

### 9. Storage: Tempo as an internal service, no Grafana

**Tempo** (`grafana/tempo:3.1.0`, monolithic mode `-target=all`, which needs no Kafka) runs as `tempo` in all three compose files, `expose` only, like Loki:
- OTLP HTTP receiver on `4318` and the query API on `3200`. No gRPC receiver: the apps only export over HTTP.
- Local storage in a `tempo_data` volume, `168h` retention (traces are bulkier than logs, so a week rather than Loki's 30 days).

**No config file in the repo, like Loki.** Loki runs from its image's built-in config plus flags in `command`. Tempo is configured the same way as far as it can be: target, ports, storage, log level and usage reporting are flags. Tempo 3.1 has no flags for its receivers, and starts with OTLP off when none are configured (checked during apply). So the few lines only YAML can express go in a top-level compose `configs:` entry with inline `content:` in each compose file:
- the OTLP HTTP receiver on `0.0.0.0:4318`;
- `overrides.defaults.compaction.block_retention: 168h`.

`compose.prod.yml` stays self-contained, which a deployment directory needs: it holds only that file and `.env`. Like Loki's flags, the block is repeated in each compose file. `compose.dev.yml` shares one definition between `tempo` and `tempo-native` through an `x-tempo` anchor, as it does with `x-loki`.

**Native dev:** `tempo-native` runs under the `native` profile, published on `127.0.0.1:4318` and `127.0.0.1:3200`, and is started with `bun run tempo:start`/`tempo:stop`, mirroring `loki-native`.

**Alternatives:**
- A `tempo.yaml` in the repo (the first draft, `apps/observability/`): rejected by the user, to match Loki. It also forced `compose.prod.yml` to carry a copy anyway.
- Grafana: a full UI, but one more service with its own login and a public `/grafana/` route. Rejected by the user in favor of an in-app viewer.
- Jaeger all-in-one: has a UI and in-memory or Badger storage, but its UI is a separate app as well, and Tempo's search API (TraceQL) is a better base for our own viewer.

### 10. In-app trace viewer over Tempo's HTTP API

**API** (`packages/api/src/v1/traces/`, admin-only, following `v1.logs`):
- `traces.search` (`GET`):
  - Input: `service?` (`stack-backend` | `stack-frontend`), `errorsOnly?`, `minDurationMs?`, `name?` (substring of the root span name), `from?`/`to?` (ISO, default last 24 h), `limit` (default 50, max 200).
  - The handler builds a TraceQL query (`{ resource.service.name = "…" && status = error && duration > 500ms && name =~ ".*…*" }`, values escaped by hand like the LogQL builder) and calls `GET <TEMPO_URL>/api/search?q=…&start=…&end=…&limit=…`.
  - Returns `{ traces: [{ traceId, rootService, rootName, startTime, durationMs }] }`, newest first.
  - **No cursor:** Tempo's search API has no pagination, so the list is capped by `limit` and narrowed with the time range. This is the one admin list that doesn't use keyset pagination, and the reason is documented in the router's `description`.
- `traces.get` (`GET`):
  - Input: `traceId` (32 hex chars). The handler calls `GET <TEMPO_URL>/api/v2/traces/<traceId>`.
  - It normalizes the OTLP JSON: ids arrive base64-encoded (proto3 JSON mapping) and are converted to hex; nanosecond strings become ms offsets; attribute `AnyValue`s are flattened to JSON scalars and arrays.
  - It returns spans **already laid out for a waterfall**: depth-first order, siblings by start time, each with `depth`, `offsetMs` from the trace start, `durationMs`, `service`, `kind`, `status` (`unset` | `ok` | `error`), `statusMessage`, `attributes` and `events` (`name`, `offsetMs`, `attributes`). Spans whose parent is missing (not yet flushed, or sampled out upstream) are treated as roots.
  - Output caps at 2000 spans with `truncated: true` beyond that.
  - Putting the layout in the handler keeps it in the tested `packages/api` suite. Frontend feature slices aren't unit-tested.
- **Errors and degraded modes:**
  - `TEMPO_URL` unset: `search` returns an empty list (like `logs.query` without `LOKI_URL`), and `get` throws `errors.SERVICE_UNAVAILABLE` ("El almacén de trazas no está configurado").
  - Tempo unreachable or answering 5xx: `errors.BAD_GATEWAY`.
  - Tempo 404 on `get`: `errors.NOT_FOUND` ("Traza no encontrada").
  - Tempo's JSON is validated with zod before it is used, never cast.

**Frontend** (`apps/frontend/src/features/admin/traces/`, slices per the feature-structure reference):
- `/admin/traces` (`pages/admin/traces/index.astro`, surface `admin-traces`):
  - a `DataTableView` of search results (columns: start time, root name, service, duration, error badge) with header filters for service, errors-only, minimum duration, name and date range;
  - browser sort with the sort kept in the URL (`useSortQueryParam`, default `startTime desc`);
  - each row links to the detail page;
  - the empty state mentions `TEMPO_URL`, like the logs page mentions `LOKI_URL`.
- `/admin/traces/<traceId>` (`pages/admin/traces/[traceId].astro`, surface `admin-trace`, not in the nav):
  - header with the root span, service, total duration, start, span and error counts, and a link to the trace's activity-log entries (`/admin/logs?traceId=…`);
  - the waterfall: one row per span with name, a service tag and duration, indented by `depth`, and a bar positioned and sized as percentages of the trace duration (status token for errors, palette tokens per service);
  - selecting a row shows its attributes (the existing `JsonView`) and events;
  - a `truncated` banner when needed.
- Reuse first: `DataTableView`, `ResourceOverview`, `JsonView`, `Text`, `Hint` and the filter components from `components/shared`. The waterfall is a new slice component. It isn't a TanStack Charts chart: it is rows of HTML with proportional bars, which keeps names, selection and keyboard access simple.

**Activity log both ways:**
- `logsOutput` entries gain `traceId: string | null`, read from the line, and the log detail shows a "Ver traza" link when it is set.
- `logsInput` gains `traceId?` (hex), added to the LogQL pipeline as `| traceId="…"`, and the logs page reads it from the URL.
- The activity log's existing type filter (page views and API calls) still applies, so a trace links to its request's entry, not to every line it produced.

**Alternative:** a trace sheet opened in place from `/admin/logs`. Rejected: a page per trace is linkable and shareable, and keeps `features/admin/logs` from importing another feature's components.

### 11. Environment

| Variable | Read by | Value |
|---|---|---|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `@nonete/env/server` and `astro:env` | optional URL, the OTLP/HTTP base; `/v1/traces` is appended |
| `OTEL_TRACES_SAMPLER_ARG` | `@nonete/env/server` and `astro:env` | optional number in `[0, 1]`, default `1` |
| `TEMPO_URL` | `@nonete/env/server` | optional URL of Tempo's query API (e.g. `http://tempo:3200`), read by `v1.traces`; unset means the viewer shows nothing |

The standard `OTEL_*` names are used on purpose: anyone who knows OpenTelemetry finds them, and nothing else reads them under another name. The compose files override `OTEL_EXPORTER_OTLP_ENDPOINT: http://tempo:4318` (both apps) and `TEMPO_URL: http://tempo:3200` (backend), container-network addresses like `LOKI_URL`. `.env.example` sets both to their `localhost` equivalents for native dev. The test preloads blank them like the other optional integrations.

### 12. Lifecycle on the backend

- `startTelemetry` is the first call in `src/index.ts`, behind a `globalThis.__backendTelemetry` guard so `bun --hot` reloads don't register a second provider. It must run before anything creates spans, but it only needs `@nonete/env`, so import order doesn't matter: no patching happens at import time.
- Graceful shutdown gets a last step after `closeDb()`: `telemetry.shutdown()`, which flushes the batch. It is bounded by the existing overall shutdown timeout. A failure is logged at `warn` and never makes the exit status non-zero, so tracing can't turn a clean stop into a failed one.

## Risks / Trade-offs

- **Bundled `@opentelemetry/instrumentation` may not load on Bun or inside the tsdown/Vite bundle** (it imports module-hook libraries even when no hooks are installed). → Build both images and start them (task group 2). Fallback: Decision 2's own `setTracer` adapter, which drops the dependency.
- **The OTLP exporter on Bun:** `exporter-trace-otlp-http` uses `node:http` in its Node build. → Bun implements it. If exports fail, the exporter swallows and logs through OTel's diag logger, never the app's. Verify spans reach Tempo in the dev stack.
- **SQL text in spans could leak data written as literals instead of parameters.** → Drizzle always parameterizes, and the span gets the text as sent, never `values`. Raw `sql\`\`` with interpolated literals is already disallowed by review.
- **Trace volume:** every request plus every SQL query. → `OTEL_TRACES_SAMPLER_ARG` lowers it. `GET /` health probes and the frontend's public/static paths aren't traced. Tempo retention is 7 days.
- **Frontend spans lost on container stop** (no shutdown hook). → Accepted: at most one batch interval (5 s) of SSR spans.
- **Tempo's API shape** (`/api/v2/traces`, base64 ids, `/api/search` fields) may differ between Tempo versions. → Pin the Tempo image, validate responses with zod, and cover the normalization with fixtures in the handler tests. A response that fails validation answers `BAD_GATEWAY`.
- **Search without pagination** returns at most `limit` traces. → Acceptable for an admin tool. The time range and filters narrow it, and the page says when the limit was hit.
- **Very large traces** (a cron run with thousands of queries). → The 2000-span cap with a `truncated` flag keeps the response and the DOM bounded.
- **Typing `TracedClient.query` without a cast** may not be possible with `pg`'s overloads. → Apply stops and asks before any cast (Decision 5).
- **`ParentBasedSampler` trusts the frontend's sampling decision on the backend.** → Intended: both read the same ratio, and public requests can't set it (Decision 4).

## Migration Plan

1. Merge with `OTEL_EXPORTER_OTLP_ENDPOINT` unset everywhere except the compose files. Native dev without `tempo:start` behaves exactly as before (the exporter fails quietly if nothing listens on `:4318`; unset the variable to avoid even that).
2. Production: pull the new `compose.prod.yml` (it adds `tempo` and the overrides). No new secret is needed.
3. Rollback: unset `OTEL_EXPORTER_OTLP_ENDPOINT` (tracing off, no redeploy of code needed), or revert the change. The `tempo_data` volume can be dropped independently. No database migration is involved.

## Open Questions

- Whether `@hono/otel` fits (Decision 3) is settled during apply. Either way, the behavior in the spec is the same.
- Follow-ups, not part of this change: metrics, and showing every log line of a trace (not only its activity-log entry) on the trace page.
