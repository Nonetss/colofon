## 1. Readers: screens and procedures

- [x] 1.1 Remove `apps/frontend/src/features/admin/logs`, `apps/frontend/src/features/admin/traces`, `apps/frontend/src/pages/admin/{logs,traces}`, their unit tests under `apps/frontend/tests/unit/features/admin/traces/`, and their entries in `app-surfaces.ts`, `site-nav.ts` and `icon-registry.ts` (plus any admin overview link), updating the registry tests; verify `bun run --filter frontend check-types` and `turbo run test --filter=frontend`
- [x] 1.2 Remove `packages/api/src/v1/logs`, `packages/api/src/v1/traces` and their tests, and their keys in `src/v1/router.ts`; verify `bun run --filter @nonete/api check-types` and `turbo run test --filter=@nonete/api` (the three failing `traces.search` tests go with the feature)

## 2. Writers: logging and OpenTelemetry

- [x] 2.1 In `packages/logger`, remove `loki-stream.ts`, the `lokiUrl` option and the `activeTraceFields` mixin, and drop its `@nonete/telemetry` dependency; in the frontend's `lib/logger.ts` drop `lokiUrl`; verify `bun run --filter @nonete/logger check-types`
- [x] 2.2 In `apps/backend`, remove `startTelemetry`, `ORPCInstrumentation`, `pgTracing` and the `requestTracing` middleware (`middlewares/tracing.ts`) from `src/index.ts`, and the activity classification (`isActivityLoggedPath`, the excluded paths, `type: "api_call"`) from `middlewares/request-logger.ts`, keeping the request id and the received/completed lines; verify `bun run --filter backend check-types`
- [x] 2.3 In `apps/frontend`, remove `lib/telemetry.ts`, the SSR span, the trace header injection and the page-view log lines from `middleware.ts`, and the `LOKI_URL`, `OTEL_EXPORTER_OTLP_ENDPOINT` and `OTEL_TRACES_SAMPLER_ARG` entries of `astro:env` in `astro.config.mjs`; verify `bun run --filter frontend check-types`
- [x] 2.4 Remove the run spans from `packages/cron/src/scheduler.ts` and the span assertions from its tests; remove `packages/db/src/tracing.ts`, its test and the `./tracing` export; verify `turbo run test --filter=@nonete/cron --filter=@nonete/db`
- [x] 2.5 Delete `packages/telemetry` and every dependency on it, on `@opentelemetry/*` and on `@orpc/opentelemetry` (workspace `package.json`s and the root catalog), drop `@nonete/telemetry#build` from `turbo.json`, and run `bun install`; verify `bun run check-types` and that `grep -rn "@nonete/telemetry\|@opentelemetry" apps packages package.json` finds nothing outside `node_modules`

## 3. Infrastructure and configuration

- [x] 3.1 Remove `LOKI_URL`, `TEMPO_URL`, `OTEL_EXPORTER_OTLP_ENDPOINT` and `OTEL_TRACES_SAMPLER_ARG` from `packages/env/src/server.ts`, `.env.example`, `scripts/setup-dev.sh` and `packages/api/tests/{setup.ts,fixtures/env.ts}`; verify `bun run test`
- [x] 3.2 Remove the `loki`, `loki-native`, `tempo` and `tempo-native` services, the `loki_data`/`tempo_data` volumes, Tempo's inline `configs`, the apps' Loki/Tempo/OTel overrides and the `packages/telemetry/src` sync entries from `compose.dev.yml`, `compose.yml` and `compose.prod.yml`; remove the `loki:*`/`tempo:*` root scripts and the `COPY packages/telemetry/package.json` lines from the four Dockerfiles; verify `docker compose -f <file> config` for each compose file (never start or stop the user's stack)
- [x] 3.3 Remove the trace header stripping from `apps/gateway/routes.caddy`; verify with `docker run --rm -v "$PWD/apps/gateway:/etc/caddy:ro" caddy:2-alpine caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile`

## 4. Documentation

- [x] 4.1 Update `AGENTS.md`, the stack skill (`SKILL.md` mental model and references: `workspaces.md`, `commands.md`, `env.md`, `docker.md`, `testing.md`, `writing-unit-tests.md`, `aliases-and-deps.md`, the frontend and api references that mention logs, traces or tracing) and `openspec/config.yaml` if it names them; verify every path they cite exists
- [x] 4.2 Update `README.md`, `PRODUCT.md` and `docs/human/` (architecture, development, configuration, Docker, cross-cutting features) and the diagrams that show Loki or Tempo (`docs/diagrams/*.html`, re-exported to `docs/img/*.svg` with their token block and fonts); verify the links resolve

## 5. Verification

- [x] 5.1 Run `bun run check-types`, `bunx biome check .`, `bun run tailwind:check` and `bun run test`, all green
- [x] 5.2 Search the repo (excluding `node_modules`, `dist` and `openspec/changes/archive`) for `loki`, `tempo`, `otel`, `opentelemetry`, `telemetry`, `traceId`, `spanId`, `withSpan`, `pgTracing`, `/admin/logs` and `/admin/traces`, and fix or justify every hit
- [x] 5.3 Hand the user the stack cleanup: recreate the dev stack and, if they want, remove the old `loki_data`/`tempo_data` volumes; nothing in this change stops containers or deletes volumes
