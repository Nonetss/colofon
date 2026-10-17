---
title: Development
description: Run colofon from a checkout, with the Docker dev stack or natively, and the checks a change goes through.
order: 9
---

Colofon is a Turborepo monorepo on Bun: an Astro frontend and a Hono/oRPC backend in `apps/`, the shared TypeScript packages in `packages/` (API, auth, database, content, cron, env, logger) and the Caddy gateway in `apps/gateway`. You need Bun `1.4.2` and Docker with the Compose plugin.

## Set up

```bash
git clone https://github.com/Nonetss/colofon.git
cd colofon
bun install
bun run setup:dev
```

`setup:dev` writes the root `.env` from `.env.example`, with generated secrets and the admin seed turned on. It is the only env file: every workspace and compose file reads it. An existing `.env` is kept unless you pass `--force`.

## Run it

Two ways, on the same host ports, so only one runs at a time:

| Command | What it starts |
| --- | --- |
| `bun run dev` | The Docker dev stack (`compose.dev.yml`) with hot reload: the gateway, frontend, backend and PostgreSQL. `bun run dev:down` removes it. |
| `bun run dev:local` | The apps natively through Turbo. It needs a PostgreSQL (`bun run postgres:start` starts the dev one on `127.0.0.1:5432`) and the dev gateway in another terminal: `bun run gateway`. |

Either way, open **`https://localhost:4321`**. The dev gateway serves it over HTTP/2 with a certificate from its own local authority, in front of `astro dev` on `:4320`, so dev routes exactly like production. Sign-in only works on that origin.

To get rid of the certificate warning, export the local authority once the gateway has started and import it in the browser as a trusted authority:

```bash
bun run dev:cert   # writes caddy-local-root.crt
```

The backend applies the migrations and creates the admin from `.env` on startup, as in production.

## Content to look at

`doc-example/` holds a sample content repository, the kind of documentation the platform renders. The platform never reads it from disk: to see it rendered, register it as a content repository at `/admin/content`.

## Checks

| Command | Checks |
| --- | --- |
| `bun run check-types` | TypeScript in every workspace (`tsc`, and `astro check` in the frontend). |
| `bun run check` | Biome: format, lint and import order, applying fixes. |
| `bun run test` | The unit tests of `packages/api`, `packages/content`, `packages/cron` and `apps/frontend`. They need no database or network. |
| `bun run tailwind:check` | Tailwind class linting with `tailwint`. |

## Spec first

Every capability has a spec under `openspec/specs/`. Changes go through OpenSpec: `openspec new change <name>`, then proposal, specs and design, tasks, implementation, and finally the specs are synced and the change archived. Read the spec of an area before changing it; it is the authoritative description of what the code must do.

Commits follow Conventional Commits (`feat(frontend): …`, `fix(api): …`). Database migrations are generated, reviewed and committed by hand with the `db:*` scripts.
