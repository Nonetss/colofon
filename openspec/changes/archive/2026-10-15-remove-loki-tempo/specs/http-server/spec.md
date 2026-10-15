## MODIFIED Requirements

### Requirement: Global request logging and session resolution

The system SHALL apply request logging to all routes, and session resolution to every route except Better Auth's own `/api/auth/*`, before dispatching to any router. On `/api/auth/*`, `user` and `session` SHALL be `null` in the request context, because Better Auth resolves the session itself. Request logging SHALL be emitted through the shared structured logger (not Hono's default logger), producing a leveled, structured entry per request that shares format and level configuration with application logs. The "request completed" entry SHALL carry the status, latency and, when signed in, the user, at `error` for a 5xx status, `warn` for a 4xx status and `info` otherwise.

#### Scenario: Every request resolves a session

- **WHEN** any request outside `/api/auth/*` reaches the application
- **THEN** the session resolution middleware SHALL run before the route handler so `user` and `session` are available

#### Scenario: One session lookup for Better Auth's routes

- **WHEN** the frontend's server calls `GET /api/auth/get-session`
- **THEN** the session SHALL be resolved once, by Better Auth, and not also by the backend's session middleware

#### Scenario: Every request is logged structurally

- **WHEN** any request reaches the application
- **THEN** a structured request-log entry SHALL be emitted through the shared logger with a severity level, in the same format (JSON in production) as application logs

#### Scenario: Failed request level

- **WHEN** a request completes with status `404`
- **THEN** its "request completed" entry SHALL be logged at `warn`

### Requirement: Graceful shutdown

On `SIGINT` or `SIGTERM` the backend SHALL shut down in this order: end open server-pushed event subscriptions, stop accepting new HTTP connections and let in-flight HTTP requests complete, stop the cron scheduler, close the shared database pool, and exit. The database pool SHALL be closed only after HTTP and cron have stopped. The process SHALL exit with status `0` when every step succeeds. A step that fails SHALL be logged and SHALL NOT prevent the remaining steps from running. A failure in any step SHALL make the process exit with a non-zero status.

#### Scenario: In-flight request completes during shutdown

- **WHEN** the backend receives `SIGTERM` while an HTTP request is being processed
- **THEN** new connections SHALL be refused, and the in-flight request SHALL receive its normal response before the database pool is closed

#### Scenario: Open event subscriptions end before the drain

- **WHEN** the backend receives `SIGTERM` while a client is subscribed to cron run events
- **THEN** that subscription's stream SHALL end normally before the HTTP drain starts, so it does not hold the drain until its timeout

#### Scenario: Clean shutdown

- **WHEN** the backend receives `SIGINT` or `SIGTERM` and every shutdown step succeeds
- **THEN** the process SHALL release all of its database connections and exit with status `0`

#### Scenario: A shutdown step fails

- **WHEN** one shutdown step throws (for example, stopping the cron scheduler fails)
- **THEN** the failure SHALL be logged, the database pool SHALL still be closed, and the process SHALL exit with a non-zero status

#### Scenario: Tracer flush fails

- **WHEN** the backend shuts down
- **THEN** it SHALL exit right after closing the database pool, with no tracer provider to shut down or spans to flush
