# Distributed Tracing

## Purpose

Opt-in OpenTelemetry tracing across the backend, the frontend SSR server, oRPC procedures, database queries and cron runs, exported over OTLP to Tempo with sampling, propagation and clean shutdown.

## Requirements

### Requirement: Opt-in trace pipeline

`@nonete/telemetry` SHALL export `startTelemetry({ serviceName, endpoint, sampleRatio, instrumentations })`, which registers a global OpenTelemetry tracer provider, an `AsyncLocalStorage` context manager and the W3C trace-context propagator. It SHALL export spans in batches over OTLP/HTTP to `<endpoint>/v1/traces`. Spans SHALL carry the resource attributes `service.name` (`stack-backend` or `stack-frontend`, the same values as the logger's `service`) and `deployment.environment.name` (`NODE_ENV`). When `endpoint` is not set, it SHALL register nothing and return a handle whose `shutdown()` resolves immediately. The pipeline SHALL NOT rely on module patching (`require-in-the-middle`, `import-in-the-middle`, or `--require`/`--import` preloads).

#### Scenario: Tracing disabled

- **WHEN** the backend starts without `OTEL_EXPORTER_OTLP_ENDPOINT`
- **THEN** no tracer provider SHALL be registered, no export SHALL be attempted and the application SHALL behave as before

#### Scenario: Tracing enabled

- **WHEN** the backend runs with `OTEL_EXPORTER_OTLP_ENDPOINT=http://tempo:4318`
- **THEN** finished spans SHALL be sent to `http://tempo:4318/v1/traces` with `service.name=stack-backend`

#### Scenario: Bundled runtime

- **WHEN** the backend or frontend runs from its bundled production image with no `node_modules`
- **THEN** tracing SHALL work without resolving any module at runtime

#### Scenario: Exporter unreachable

- **WHEN** the OTLP endpoint does not answer
- **THEN** the failed export SHALL NOT throw into application code, SHALL NOT be written to the application log and SHALL NOT affect the request being served

### Requirement: Sampling

Root spans SHALL be sampled with probability `OTEL_TRACES_SAMPLER_ARG` (default `1`). Spans with a parent SHALL follow the parent's sampling decision.

#### Scenario: Ratio applied to new traces

- **WHEN** `OTEL_TRACES_SAMPLER_ARG=0` and a request arrives with no trace context
- **THEN** none of its spans SHALL be exported

#### Scenario: Child follows parent

- **WHEN** the frontend sampled a trace and calls the backend with its `traceparent`
- **THEN** the backend's spans for that call SHALL be sampled in the same trace

### Requirement: Backend HTTP server span

Every backend HTTP request SHALL run inside a `SERVER` span, except the `GET /` health probe and the trace viewer's own procedures (`/rpc/v1/traces/*`, `/api/v1/traces/*`). The viewer's requests SHALL run with tracing suppressed, so neither they nor any oRPC or query span inside them is recorded. The span SHALL be started before any other middleware, so that request logging, session resolution and oRPC handling run inside it. It SHALL be named `<METHOD> <route>`, where the route is the request path for `/rpc/*` and `/api/*` (an oRPC procedure path, or a fixed Better Auth route, never carrying an id) and Hono's matched pattern for any other path, and SHALL carry `http.request.method`, `url.full`, `http.route` and `http.response.status_code`. A response with a 5xx status SHALL mark the span as an error. For an event-stream response, the span SHALL end when the response is returned, not when the stream closes.

#### Scenario: oRPC request

- **WHEN** a client calls `POST /rpc/v1/cron/list`
- **THEN** one `SERVER` span named `POST /rpc/v1/cron/list` SHALL be recorded with `http.response.status_code` set, and the oRPC and database spans of that call SHALL be its descendants

#### Scenario: Unknown path

- **WHEN** a scanner requests `/wp-login.php`
- **THEN** its span SHALL be named after Hono's matched pattern (`GET /*`), not after the path

#### Scenario: Server error

- **WHEN** a request ends with status `500`
- **THEN** its server span SHALL have error status

#### Scenario: The trace viewer leaves no trace

- **WHEN** an administrator opens `/admin/traces`, which calls `traces.search` and `traces.get`
- **THEN** no span of those calls SHALL be recorded, so the list never fills with the viewer watching itself

#### Scenario: Health probe

- **WHEN** the compose healthcheck requests `GET /`
- **THEN** no span SHALL be recorded

### Requirement: oRPC procedure spans

The backend SHALL enable oRPC's built-in tracing through `ORPCInstrumentation` from `@orpc/opentelemetry`, at the same exact version as the other `@orpc/*` packages. Procedure lookup, input decoding, each middleware, input/output validation and the handler call SHALL be recorded as spans nested under the HTTP server span. A procedure error SHALL be recorded on its span. Each middleware span SHALL be named after the middleware (`middleware.requireAdmin`), so the access middlewares in `packages/api` SHALL be named functions.

#### Scenario: Procedure call is traced

- **WHEN** an authenticated client calls a procedure over `/rpc`
- **THEN** the trace SHALL contain oRPC's spans for that call (including `call_procedure`) under the request's server span

#### Scenario: Middleware span names

- **WHEN** an administrator calls an admin-only procedure
- **THEN** its middleware span SHALL be named `middleware.requireAdmin`, never `middleware.`

#### Scenario: Procedure rejection

- **WHEN** a procedure throws `errors.NOT_FOUND()`
- **THEN** the exception SHALL be recorded on the oRPC span

### Requirement: Database query spans

Every PostgreSQL query issued through `@nonete/db` inside a trace, whether through the pool or a transaction client, SHALL run inside a `CLIENT` span named `pg.query:<OPERATION> <database>` (for example `pg.query:SELECT stack`). The span SHALL carry `db.system.name=postgresql`, `db.namespace` and `db.query.text` with the parameterized text. It SHALL NOT include parameter values. A failed query SHALL record the exception and mark the span as an error. A query outside any trace (startup migrations, the scheduler's polling) SHALL get no span. The instrumentation SHALL be applied to the `pg` module the process imports, without module hooks. When no tracer provider is registered, queries SHALL behave exactly as before.

#### Scenario: Query inside a request

- **WHEN** a procedure reads a table through Drizzle while handling a request
- **THEN** a `pg.query:SELECT stack` span with the placeholder query text SHALL be recorded as a descendant of the request's spans

#### Scenario: Parameter values are not recorded

- **WHEN** a query runs with a parameter `"secret@example.com"`
- **THEN** no attribute of its span SHALL contain that value

#### Scenario: Failing query

- **WHEN** a query is rejected by PostgreSQL
- **THEN** its span SHALL have error status, and the error SHALL still reach the caller unchanged

#### Scenario: Query outside a trace

- **WHEN** the backend applies migrations at startup
- **THEN** no query span SHALL be recorded for them

### Requirement: Cron run spans

Each cron run, whether scheduled or manually triggered, SHALL execute inside a span named `cron.run <handlerKey>` that starts a new trace. The span SHALL carry `cron.job.id`, `cron.job.handler_key`, `cron.run.id`, `cron.trigger` (`schedule` or `manual`) and the run's final `cron.run.status`. A failed run SHALL mark it as an error. A manually triggered run's span SHALL carry a link to the span of the request that triggered it.

#### Scenario: Scheduled run

- **WHEN** the scheduler fires a job
- **THEN** a root span `cron.run <handlerKey>` SHALL be recorded with `cron.trigger=schedule`, and the procedure and query spans of the run SHALL be its descendants

#### Scenario: Manual run

- **WHEN** an admin triggers a job with `runNow`
- **THEN** the run's span SHALL be the root of its own trace, carry `cron.trigger=manual` and link to the triggering request's span

#### Scenario: Failed run

- **WHEN** a run ends with status `failed`
- **THEN** its span SHALL have error status and `cron.run.status=failed`

### Requirement: Frontend SSR spans and propagation

The frontend's server SHALL start telemetry once per process (`service.name=stack-frontend`) from the `astro:env` variables `OTEL_EXPORTER_OTLP_ENDPOINT` and `OTEL_TRACES_SAMPLER_ARG`. Every request handled by its middleware outside the public paths SHALL run inside a `SERVER` span. The SSR session lookup SHALL send the active trace context to the backend as `traceparent`, so that the backend's spans for that lookup join the page's trace.

#### Scenario: Page and its session lookup share a trace

- **WHEN** a signed-in user loads `/crons` with tracing enabled in both apps
- **THEN** the frontend's server span and the backend's spans for the session lookup SHALL share one trace id, with the backend span as a descendant of the frontend span

#### Scenario: Public page

- **WHEN** a visitor loads `/login`
- **THEN** the frontend SHALL record no span for it

### Requirement: Spans flushed on backend shutdown

During graceful shutdown, after the database pool is closed, the backend SHALL shut down the tracer provider, exporting every finished span still in the batch. A failure or timeout in this step SHALL be logged at `warn` and SHALL NOT change the process's exit status.

#### Scenario: Pending spans exported on stop

- **WHEN** the backend receives `SIGTERM` with finished spans waiting in the batch
- **THEN** those spans SHALL be exported before the process exits

#### Scenario: Exporter down at shutdown

- **WHEN** the exporter cannot reach the endpoint during shutdown and every other step succeeds
- **THEN** the process SHALL exit with status `0`

### Requirement: Telemetry survives hot reload

`bun --hot` reloads of the backend and Vite SSR reloads of the frontend SHALL NOT register a second tracer provider or a second instrumentation.

#### Scenario: Backend reloaded

- **WHEN** a dependency of the backend changes and `bun --hot` re-executes `src/index.ts`
- **THEN** exactly one tracer provider SHALL remain registered and spans SHALL NOT be exported twice
