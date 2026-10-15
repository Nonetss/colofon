## Context

Observability came from the template as three layers that depend on each other (see proposal.md for why they go):

- **Storage**: the `loki` and `tempo` services (plus `loki-native` and `tempo-native` for native dev) in every compose file, with their volumes, Tempo's inline `configs` and the `loki:*`/`tempo:*` scripts.
- **Readers**: the activity log (`/admin/logs`, `v1.logs`, reading Loki) and the trace viewer (`/admin/traces`, `v1.traces`, reading Tempo and linking traces to Loki lines).
- **Writers**: the logger's Loki stream (`packages/logger/src/loki-stream.ts`), the `type: "api_call"` and page-view entries written for the activity log, and the OpenTelemetry pipeline: `@nonete/telemetry` (`startTelemetry`, `withSpan`, `withServerSpan`, `injectTraceHeaders`, `activeTraceFields`, the in-memory test pipeline), used by the backend (`startTelemetry`, `middlewares/tracing.ts`, `ORPCInstrumentation`), the frontend (`lib/telemetry.ts`, the SSR span and trace header injection in `middleware.ts`), the database (`@nonete/db/tracing`, `pgTracing`), the cron scheduler (run spans) and the logger (`traceId`/`spanId` mixin).

Pino logging to stdout, the backend's request id and the `request completed` line do not depend on any of this.

## Goals / Non-Goals

**Goals:**
- No code, dependency, service, variable, script, screen or spec about Loki, Tempo or OpenTelemetry remains (archived OpenSpec changes excepted).
- Logging keeps its current stdout behaviour and request ids.
- Every remaining suite, type check and Biome pass stays green.

**Non-Goals:**
- Replacing them with another log or trace backend.
- Touching the user's running Docker stack or deleting its `loki_data`/`tempo_data` volumes.
- Any database migration: none of this is stored in PostgreSQL.

## Decisions

### Remove bottom-up: readers, then writers, then storage

The screens and procedures go first (frontend features and pages, `app-surfaces.ts` and `icon-registry.ts` entries, `v1.logs`/`v1.traces` and their tests), so nothing reads Loki or Tempo. Then the writers (Loki stream, activity fields, every OpenTelemetry call and the `@nonete/telemetry` package). Then the infrastructure (compose, scripts, env, Dockerfiles, turbo, catalog). Each step type-checks on its own, which keeps a failing check pointing at one layer.

### Keep request logging, drop the activity classification

`requestLogger` keeps generating the request id and logging `request received` / `request completed` with status and latency. It drops `isActivityLoggedPath`, the excluded-path list and the `type: "api_call"` field, which only existed so the activity log could filter Loki. The user id and email on the completed line stay: they are ordinary request context in stdout. The frontend stops logging page views, which only existed to feed the activity log; its logger stays for real errors.

Alternative considered: keep the `type` field "just in case". Rejected: nothing reads it, and the spec that defined it goes away.

### The gateway stops stripping trace headers

`routes.caddy` strips inbound `traceparent`/`tracestate`/`baggage` only so external callers can't join our traces. With no tracing, nothing reads those headers, so the rule goes with the rest.

### Remove the OpenTelemetry catalog entries and run `bun install`

The `@opentelemetry/*` and `@orpc/opentelemetry` catalog entries go from the root `package.json` together with every workspace dependency on them and on `@nonete/telemetry`; `bun install` rewrites `bun.lock`. Every Dockerfile drops the `COPY packages/telemetry/package.json` line in the same change, because `--frozen-lockfile` rejects a manifest the lockfile doesn't know.

## Risks / Trade-offs

- [A reference left behind (an import, a `#` alias, a compose `sync` entry, a doc path) breaks a build or points at a missing file] → The tasks end with a repo-wide search for every removed name (`loki`, `tempo`, `otel`, `telemetry`, `traceId`, `withSpan`, `pgTracing`, `/admin/logs`, `/admin/traces`), excluding archived changes, plus the full validation.
- [The registry tests (`app-surfaces`, `site-nav`, `icon-registry`) assert the current surfaces] → Update them in the same task that removes the surfaces.
- [The user's dev stack keeps orphan `loki`/`tempo` containers and volumes until it is recreated] → The tasks hand the cleanup command to the user (`bun run dev:down` then `bun run dev`, and `docker volume rm` for the old volumes if wanted); nothing here stops or deletes them.
- [Diagrams (`docs/diagrams/*.html` exported to `docs/img/*.svg`) show Loki and Tempo] → Edit the HTML sources and re-export the SVGs, keeping the token block and fonts as `docs/human/README.md` requires.

## Migration Plan

1. Merge; `bun install` has already rewritten `bun.lock`.
2. Recreate the dev stack (`bun run dev:down && bun run dev`); the old Loki and Tempo containers are not part of it any more. Remove `doc-dev_loki_data` and `doc-dev_tempo_data` by hand if the data isn't wanted.
3. In production, `docker compose -f compose.prod.yml up -d --remove-orphans` drops the old services; their volumes stay until removed.
4. Remove `LOKI_URL`, `TEMPO_URL`, `OTEL_EXPORTER_OTLP_ENDPOINT` and `OTEL_TRACES_SAMPLER_ARG` from any `.env`; left in place they are simply ignored.

Rollback: revert the change and run `bun install`.
