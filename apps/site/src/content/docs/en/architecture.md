---
title: Architecture
description: The services of the stack, how the gateway routes each request and where the content lives.
order: 8
---

`compose.prod.yml` runs four services on one Docker network. Only the gateway publishes a port; the rest are reachable only inside the network.

| Service | Image | Does |
| --- | --- | --- |
| `gateway` | `ghcr.io/nonetss/colofon-gateway` | Caddy. The single public entry point, on `FRONTEND_PORT` (container port `80`). |
| `frontend` | `ghcr.io/nonetss/colofon-frontend` | Astro rendered on the server, with React islands: the documentation reader, `/me` and `/admin`. Port `4321`. |
| `backend` | `ghcr.io/nonetss/colofon-backend` | Hono and oRPC on Bun: the API, the git server of hosted repositories and the MCP. Port `3000`. |
| `db` | `postgres:17` | Users, sessions, API keys, the content repositories and the scheduled jobs. |

## One origin

The gateway serves the site, the API and the hosted git repositories from the same host, so the browser never makes cross-origin calls and session cookies just work. Its routes live in `apps/gateway/routes.caddy`:

| Request | Goes to |
| --- | --- |
| `/rpc/*`, `/api/*`, `/git/*`, `/mcp`, `/scalar*`, `/openapi.json` | `backend:3000` |
| `/health` | answers `ok` (the compose healthcheck) |
| any other path | `frontend:4321` |

It also compresses responses (except git packs under `/git/*`) and sets a few security headers. HSTS belongs to whatever terminates TLS in front of it.

The frontend renders every page on the server. It reaches the backend directly at `BACKEND_URL` (`http://backend:3000`) to look up the session and read the pages, not through the gateway.

## Startup

When the backend starts it:

1. Starts syncing every content repository, without waiting for it.
2. Applies the pending database migrations and creates the admin from `ADMIN_*` if it does not exist yet.
3. Starts the cron scheduler, which syncs the content again every five minutes.

Services start in order (database, backend, frontend, gateway), each one waiting for the previous one's healthcheck.

## Where the content lives

Each content repository is a row in the database with its git URL, branch and content folder. The backend keeps a clone of each one and serves the pages from it:

| Volume | Path in the backend | Holds |
| --- | --- | --- |
| `content_data` | `/app/.content` | One clone per repository. Disposable: the next sync rebuilds it. |
| `hosted_data` | `/app/.hosted` | The bare repository of each repository hosted on the platform, possibly the only copy of its history. |
| `db_data` | (the `db` service) | The database. |

A repository is synced on startup, every five minutes, when it is created or its URL or branch changes, and on demand from its card or the MCP's `sync` tool. A hosted repository is synced as soon as someone pushes to it at `/git/<slug>.git`.

## Content is read, never run

The backend reads MDX pages into a sanitized HTML tree. Only Markdown and the platform's components (`<Callout>`, `<Entities>`, `<Diagram>`) are allowed; `import`, `export`, expressions and other JSX are reported as problems and dropped, never executed. Diagrams are drawn as SVG on the server, and a repository's `styles/` are cleaned through an allow-list before they reach the page.

If a commit leaves the content invalid, the backend keeps serving the last valid version and shows the problems to admins.
