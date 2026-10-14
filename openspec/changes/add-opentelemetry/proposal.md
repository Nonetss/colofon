## Why

The only observability today is pino logs shipped to Loki and browsed at `/admin/logs`, correlated per request by `requestId`. Nothing shows where a slow request spends its time (session lookup, procedure, which SQL queries) or links a frontend SSR page to the backend calls it makes. OpenTelemetry tracing answers both. oRPC v2 already traces its own pipeline through a pluggable tracer (`setTracer` in `@orpc/shared`, backed by `@orpc/opentelemetry`), so the hardest layer only needs to be switched on.

We don't want to run a separate observability UI (Grafana) with its own login and public surface. Traces are stored in Grafana Tempo as an internal service, the same way Loki stores logs, and browsed from an admin screen inside the app, the same way `/admin/logs` browses Loki.

## What Changes

- **New `@nonete/telemetry` package** (`packages/telemetry`):
  - Sets up the OpenTelemetry trace SDK by hand: a tracer provider, `AsyncLocalStorage` context, W3C trace-context propagation, a parent-based ratio sampler and a batching OTLP/HTTP exporter. It does no module patching, so it keeps working inside the bundled images (no `node_modules`) and on Bun.
  - Telemetry is off unless `OTEL_EXPORTER_OTLP_ENDPOINT` is set.
  - An API-only subpath (`@nonete/telemetry/span`) with span helpers for the other packages.
- **Backend traces:**
  - One server span per HTTP request, plus oRPC's own spans, enabled through `ORPCInstrumentation` from `@orpc/opentelemetry` (pinned to `2.0.0-beta.42` like the rest of oRPC).
  - A client span per PostgreSQL query, from a traced `pg` client in `@nonete/db`. It records the query text with placeholders, never parameter values.
  - A root span per cron run.
  - Pending spans are flushed during graceful shutdown.
- **Frontend SSR traces:** a server span per Astro request. The SSR session lookup carries `traceparent`, so a page and its backend work share one trace.
- **Log ↔ trace correlation:** while a sampled span is active, log lines carry `traceId`/`spanId`.
- **Untrusted trace headers stripped:** the gateway removes inbound `traceparent`/`tracestate`/`baggage` from public requests.
- **Trace storage:** a Grafana Tempo service (OTLP receiver plus query API), internal only, in `compose.dev.yml`, `compose.yml` and `compose.prod.yml`. Native dev gets `tempo-native` with `bun run tempo:start`/`tempo:stop`, like `loki:start`. **No Grafana.**
- **In-app trace viewer:**
  - New admin-only `v1.traces.search` (recent traces filtered by service, errors only, minimum duration, root-span name and time range) and `v1.traces.get` (one trace's spans, already arranged as a tree with offsets for a waterfall). Both read Tempo's HTTP API at `TEMPO_URL`, like `v1.logs.query` reads Loki.
  - A new admin page `/admin/traces` lists search results. `/admin/traces/<traceId>` shows the waterfall, with each span's attributes and events.
- **Activity log:**
  - Each entry exposes its `traceId`, and its detail links to the trace.
  - `v1.logs.query` takes a `traceId` filter, so a trace links back to its log entries.
- **Environment:** new optional `OTEL_EXPORTER_OTLP_ENDPOINT` and `OTEL_TRACES_SAMPLER_ARG` (backend and frontend), and `TEMPO_URL` (backend).
- Out of scope: metrics, browser-side tracing, Caddy's own tracing and any third-party observability UI.

## Capabilities

### New Capabilities

- `distributed-tracing`: the opt-in OpenTelemetry trace pipeline. It covers which spans the backend, the frontend's server, the database layer and cron emit; propagation; sampling; export; behavior when disabled; and flushing on shutdown.
- `trace-viewer`: the admin-only trace search and trace detail procedures over Tempo, the `/admin/traces` screens, and their behavior when Tempo isn't configured or reachable.

### Modified Capabilities

- `structured-logging`: log lines written inside a sampled span carry `traceId` and `spanId`.
- `activity-log`: entries expose `traceId`, the query filters by it, and the entry detail links to the trace.
- `http-server`: graceful shutdown ends by flushing the tracer provider, and a tracing failure never changes the exit status.
- `http-gateway`: the gateway strips inbound trace-context headers, and Tempo is among the services that are never published.
- `docker-dev-environment`: the dev stack adds Tempo, plus a native-profile `tempo-native` with `tempo:start`/`tempo:stop`.
- `docker-production-deployment`: `compose.yml` and `compose.prod.yml` run Tempo with a persistent volume and point the apps at it.
- `environment-configuration`: the server env adds `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_TRACES_SAMPLER_ARG` and `TEMPO_URL`, and the compose files may override the first and the last with container-network addresses.

## Impact

- **Code:**
  - New `packages/telemetry`.
  - New `packages/api/src/v1/traces/`.
  - `packages/api/src/v1/logs/`: `traceId` in its output and filter.
  - `apps/backend`: `src/index.ts` startup and shutdown, plus a tracing middleware.
  - `packages/db/src/index.ts`: explicit `pg` pool with the traced client.
  - `packages/cron/src/scheduler.ts`.
  - `packages/logger/src/factory.ts`.
  - `packages/env/src/server.ts`.
  - `apps/frontend`: `src/middleware.ts`, `src/lib/telemetry.ts`, the `astro:env` schema, a new `features/admin/traces` feature, two pages under `src/pages/admin/traces/`, two `app-surfaces` entries, and the trace link and filter in `features/admin/logs`.
- **Dependencies:** `@opentelemetry/api`, `sdk-trace-base`, `resources`, `core`, `context-async-hooks`, `exporter-trace-otlp-http`, `instrumentation`, `semantic-conventions`; `@orpc/opentelemetry@2.0.0-beta.42`. All go through the root catalog.
- **Infrastructure:** a Tempo service and the `tempo_data` volume in the three compose files, configured there like Loki (no config file in the repo), and a header-stripping rule in `apps/gateway/routes.caddy`.
- **Docs:**
  - `.env.example`, `README.md`, `docs/human/*`, `AGENTS.md` project map.
  - `stack` skill references: `workspaces.md`, `env.md`, `docker.md`, `commands.md`.
- **No database migration.** The API gains `v1.traces.*`, and `v1.logs.query` gains an optional input and an output field (additive).
