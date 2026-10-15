## MODIFIED Requirements

### Requirement: Single public HTTP entry point

The gateway (`apps/gateway/Caddyfile`, Caddy) SHALL serve an HTTP site on port `GATEWAY_HTTP_PORT` (default `80`). It SHALL forward `/rpc/*`, `/api/*`, `/scalar*` and `/openapi.json` to the backend's HTTP server (`BACKEND_HTTP_UPSTREAM`, default `backend:3000`) and every other request to the frontend's Astro server (`FRONTEND_HTTP_UPSTREAM`, default `frontend:4321`). Responses SHALL be compressed with zstd or gzip when the client accepts it. Because both apps are served on the same origin, the browser SHALL reach the API and Better Auth without cross-origin requests. The site's body (compression, security headers, `/health` and routing) SHALL live in `apps/gateway/routes.caddy`, imported by every gateway site, so production and dev never route differently. The production `Caddyfile` SHALL define only this HTTP site, with its admin API and automatic HTTPS disabled.

#### Scenario: API call on the page's origin

- **WHEN** the browser sends `POST /rpc/v1/...` or `GET /api/auth/get-session` to the public URL
- **THEN** the gateway SHALL forward it to the backend's HTTP server and relay the response, including its `Set-Cookie` headers, unchanged

#### Scenario: Page request

- **WHEN** the browser requests `/login`
- **THEN** the gateway SHALL forward it to the frontend and return the rendered page

#### Scenario: API documentation

- **WHEN** a client requests `/scalar` or `/openapi.json`
- **THEN** the gateway SHALL forward it to the backend

#### Scenario: Client-supplied trace context

- **WHEN** a request arrives at the gateway with a `traceparent` header
- **THEN** the gateway SHALL forward it like any other request header, and neither app SHALL start or continue a trace from it

### Requirement: Internal services are never exposed

In `compose.prod.yml` the gateway SHALL be the only service with `ports`. The frontend and backend SHALL use `expose` only, and the `db` service SHALL publish no port. Nothing outside the Docker network SHALL reach the backend, the frontend or Postgres except through the gateway's HTTP site.

#### Scenario: Published ports in production

- **WHEN** `compose.prod.yml` is inspected
- **THEN** only the `gateway` service SHALL declare `ports`, mapping the public port to the gateway's HTTP site, and no service SHALL publish `3000`, `4321` or `5432`

#### Scenario: Backend from the host in production

- **WHEN** the production stack runs and a client outside the Docker network connects to the backend's port `3000`
- **THEN** the connection SHALL fail, because that port is not published

#### Scenario: OTLP receiver from the host in production

- **WHEN** the production stack runs and a client outside the Docker network sends spans to port `4318`
- **THEN** the connection SHALL fail, because no service listens on or publishes that port
