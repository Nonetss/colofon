## Why

Loki and Tempo came with the template: two extra services in every compose file, two admin screens (`/admin/logs`, `/admin/traces`) and an OpenTelemetry pipeline instrumenting the backend, the frontend, the database, the cron scheduler and the logger. This project, a documentation platform, does not use any of it, and it costs containers, dependencies, code paths and specs to keep. The user asked to remove all of it.

## What Changes

- **BREAKING** Remove the `loki`, `loki-native`, `tempo` and `tempo-native` services, their volumes and Tempo's inline config from `compose.yml`, `compose.dev.yml` and `compose.prod.yml`, and the root scripts `loki:start`, `loki:stop`, `tempo:start` and `tempo:stop`.
- **BREAKING** Remove the variables `LOKI_URL`, `TEMPO_URL`, `OTEL_EXPORTER_OTLP_ENDPOINT` and `OTEL_TRACES_SAMPLER_ARG` from the env schemas (`@nonete/env/server`, the frontend's `astro:env`), `.env.example`, the compose overrides and `scripts/setup-dev.sh`.
- **BREAKING** Remove the activity log: the `/admin/logs` screen, the `v1.logs` procedures, the logger's Loki stream and the page-view and API-call entries written only for it.
- **BREAKING** Remove the trace viewer: the `/admin/traces` screen and the `v1.traces` procedures.
- **BREAKING** Remove distributed tracing: the `@nonete/telemetry` package, the backend and frontend spans and trace propagation, the database query spans (`@nonete/db/tracing`), the cron run spans, `traceId`/`spanId` in log lines, the gateway's stripping of trace headers, and the OpenTelemetry dependencies.
- Logging keeps working as before on stdout (pino: pretty in development, JSON lines in production), with the request id on every backend request.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `activity-log`: every requirement removed; the capability goes away.
- `trace-viewer`: every requirement removed; the capability goes away.
- `distributed-tracing`: every requirement removed; the capability goes away.
- `structured-logging`: no Loki stream, no activity entries, no trace fields; stdout logging only.
- `environment-configuration`: the Loki, Tempo and OpenTelemetry variables leave the validated environment, the example and the compose overrides.
- `docker-dev-environment`: no Loki or Tempo services, native profiles, volumes or scripts.
- `docker-production-deployment`: no Loki or Tempo services, volumes or inline Tempo config.
- `admin`: no activity log or trace screens in the admin area.
- `http-gateway`: the gateway no longer strips trace headers.
- `unit-testing`: no telemetry suite or tracing test helpers.
- `list-filter-experience`, `rpc-api`, `http-server`, `frontend-data-table`, `frontend-data-fetching`: drop the requirements' references to the activity log, the trace list or tracing, where they use them as examples or rules.

## Impact

- Code removed: `packages/telemetry`, `packages/logger/src/loki-stream.ts`, `packages/db/src/tracing.ts`, `packages/api/src/v1/{logs,traces}`, `apps/frontend/src/features/admin/{logs,traces}`, `apps/frontend/src/pages/admin/{logs,traces}`, `apps/frontend/src/lib/telemetry.ts`, `apps/backend/src/middlewares/tracing.ts`, with their tests.
- Code changed: `packages/logger` (factory and backend logger), `packages/cron/src/scheduler.ts`, `packages/env`, `apps/backend/src/index.ts` and its request logger, `apps/frontend` (middleware, `astro.config.mjs`, `lib/logger.ts`, `app-surfaces.ts`, `icon-registry.ts`), `apps/gateway/routes.caddy`, the Dockerfiles and compose files, `turbo.json`, root `package.json` (scripts and catalog), `bun.lock`.
- Docs: `AGENTS.md`, `README.md`, `PRODUCT.md` where it mentions them, `docs/human/`, the architecture diagrams and the stack skill references.
- Running stacks: the existing `loki_data` and `tempo_data` volumes stay on the host until removed by hand; nothing deletes them.
