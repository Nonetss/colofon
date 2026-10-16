## MODIFIED Requirements

### Requirement: Single public HTTP entry point

The gateway (`apps/gateway/Caddyfile`, Caddy) SHALL serve an HTTP site on port `GATEWAY_HTTP_PORT` (default `80`). It SHALL forward `/rpc/*`, `/api/*`, `/git/*`, `/mcp`, `/scalar*` and `/openapi.json` to the backend's HTTP server (`BACKEND_HTTP_UPSTREAM`, default `backend:3000`) and every other request to the frontend's Astro server (`FRONTEND_HTTP_UPSTREAM`, default `frontend:4321`). Responses SHALL be compressed with zstd or gzip when the client accepts it, except git protocol responses under `/git/*`, whose packs are already compressed, which SHALL be streamed as the backend sends them. Because both apps are served on the same origin, the browser SHALL reach the API and Better Auth without cross-origin requests. The site's body (compression, security headers, `/health` and routing) SHALL live in `apps/gateway/routes.caddy`, imported by every gateway site, so production and dev never route differently. The production `Caddyfile` SHALL define only this HTTP site, with its admin API and automatic HTTPS disabled.

#### Scenario: API call on the page's origin

- **WHEN** the browser sends `POST /rpc/v1/...` or `GET /api/auth/get-session` to the public URL
- **THEN** the gateway SHALL forward it to the backend's HTTP server and relay the response, including its `Set-Cookie` headers, unchanged

#### Scenario: Page request

- **WHEN** the browser requests `/login`
- **THEN** the gateway SHALL forward it to the frontend and return the rendered page

#### Scenario: API documentation

- **WHEN** a client requests `/scalar` or `/openapi.json`
- **THEN** the gateway SHALL forward it to the backend

#### Scenario: Git over the public URL

- **WHEN** a writer runs `git push https://docs.example.com/git/manual.git main`
- **THEN** the gateway SHALL forward the git requests to the backend and stream its responses uncompressed

#### Scenario: MCP over the public URL

- **WHEN** an agent sends `POST https://docs.example.com/mcp`
- **THEN** the gateway SHALL forward it to the backend and relay the response, a streamed one included
