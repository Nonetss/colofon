## MODIFIED Requirements

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
