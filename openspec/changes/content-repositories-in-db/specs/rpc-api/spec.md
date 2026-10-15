## MODIFIED Requirements

### Requirement: Cross-site request protection

The API handlers SHALL resist CSRF attacks based on the session cookie without relying on a client-side plugin:

- The RPC handler under `/rpc` SHALL accept the `POST`, `PUT`, `PATCH` and `DELETE` methods for every procedure, SHALL accept `QUERY` only for procedures whose declared HTTP method is `GET` or `QUERY`, and SHALL reject `GET`.
- The OpenAPI handler under `/api` SHALL reject `GET` requests that a browser makes as a top-level navigation from another site (`Sec-Fetch-Site` `cross-site` or `none` with `Sec-Fetch-Mode: navigate` and `Sec-Fetch-Dest: document`), and SHALL let through requests without Fetch Metadata headers (server-to-server clients). The public content schema endpoints (`/api/v1/content/schemas/{repository}` and below) SHALL be exempt: they are read-only, never use the session, and are opened from editors and from the address bar.
- Authentication cookies SHALL be marked `SameSite=Lax` or stricter, so browsers do not send them on cross-site unsafe methods. `QUERY` is not a CORS-safelisted method, so a cross-site `QUERY` needs a preflight that only the configured origin passes.

#### Scenario: GET to the RPC handler

- **WHEN** a client sends `GET /rpc/v1/health/check`
- **THEN** the system SHALL NOT invoke the procedure and SHALL respond with an error

#### Scenario: QUERY to a read procedure over RPC

- **WHEN** the frontend sends `QUERY /rpc/v1/comment/counts` from its own origin
- **THEN** the procedure SHALL run with the session's context

#### Scenario: QUERY to a write procedure over RPC

- **WHEN** a client sends `QUERY /rpc/v1/comment/create`
- **THEN** the system SHALL NOT invoke the procedure and SHALL respond with an error

#### Scenario: Cross-site navigation to a REST GET

- **WHEN** a browser navigates from another site to `GET /api/v1/cron/list` carrying the session cookie
- **THEN** the system SHALL respond `403 Forbidden` without invoking the procedure

#### Scenario: Server-to-server REST call

- **WHEN** a server-side client calls `GET /api/v1/cron/list` with a user's credentials and no `Sec-Fetch-*` headers
- **THEN** the procedure SHALL run with that user's context

#### Scenario: Same-origin call from the frontend

- **WHEN** the frontend calls a procedure over `/rpc` with `POST` from its own origin
- **THEN** the procedure SHALL run with the session's context

#### Scenario: Catalog URL opened from the address bar

- **WHEN** a user pastes `https://<host>/api/v1/content/schemas/documentacion` in the browser's address bar (`Sec-Fetch-Site: none`, `Sec-Fetch-Mode: navigate`, `Sec-Fetch-Dest: document`)
- **THEN** the system SHALL answer the repository's schema catalog
