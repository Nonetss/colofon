## MODIFIED Requirements

### Requirement: Application composition

The backend (`apps/backend`) SHALL compose a single Hono application served by Bun that mounts the authentication router, the RPC router, the documentation router and the MCP router (`/mcp`), and SHALL respond to `GET /` with a health string. On startup it SHALL seed the admin user and start the cron scheduler.

#### Scenario: Root health endpoint

- **WHEN** a client requests `GET /`
- **THEN** the system SHALL return `"OK"`

#### Scenario: Startup failure

- **WHEN** the startup bootstrap (admin seed or cron start) throws
- **THEN** the backend SHALL log the error and exit with a non-zero status

#### Scenario: MCP route

- **WHEN** an authenticated client sends `POST /mcp` with an MCP request
- **THEN** the backend SHALL answer it with the MCP server, without going through the `/rpc` or `/api` handlers
