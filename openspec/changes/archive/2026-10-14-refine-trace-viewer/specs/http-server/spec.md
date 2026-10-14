## MODIFIED Requirements

### Requirement: Global request logging and session resolution

The system SHALL apply request logging to all routes, and session resolution to every route except Better Auth's own `/api/auth/*`, before dispatching to any router. On `/api/auth/*`, `user` and `session` SHALL be `null` in the request context, because Better Auth resolves the session itself and those routes are not activity-logged. Request logging SHALL be emitted through the shared structured logger (not Hono's default logger), producing a leveled, structured entry per request that shares format and level configuration with application logs. The "request completed" entry SHALL carry the status, latency and, when signed in, the user, at `error` for a 5xx status, `warn` for a 4xx status and `info` otherwise.

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
