---
title: Configuration
description: The environment variables of a deployment, grouped by what they do.
order: 5
---

Every service reads its configuration from the `.env` next to `compose.prod.yml`. The installer writes one for you; [`.env.example`](https://github.com/Nonetss/colofon/blob/main/.env.example) lists every variable with its default and a comment. The backend validates them on startup and refuses to start with a message naming the variable that is wrong.

Keep the values single-quoted, as the installer writes them: Compose then reads them literally, with no `$VAR` interpolation.

## Public URL and port

| Variable | What it is |
| --- | --- |
| `FRONTEND_PORT` | Host port the gateway publishes. Default `4444`. |
| `CORS_ORIGIN` | The public URL the browser sees, such as `https://docs.example.com`. One URL, no trailing path. |

`CORS_ORIGIN` is used for more than CORS: `compose.prod.yml` also passes it as `BETTER_AUTH_URL`, so sign-in callbacks are built from it, and the full links in `/llms.txt` and each page's `llm.txt` use it. If the URL you open in the browser does not match it, sign-in fails.

## Database

| Variable | What it is |
| --- | --- |
| `POSTGRES_PASSWORD` | Password of the bundled `db` service. Required by `compose.prod.yml`. |
| `DATABASE_URL` | Where the backend connects. With the bundled database, `postgresql://postgres:<password>@db:5432/colofon`. |

Generate the password with `openssl rand -hex 32`: it ends up inside `DATABASE_URL`, where `/`, `+` and `=` would need escaping. To use an external PostgreSQL, see [Deploy](../deploy/#external-postgresql).

## Authentication

| Variable | What it is |
| --- | --- |
| `BETTER_AUTH_SECRET` | Signs sessions and cookies. Required, at least 32 characters (`openssl rand -base64 48`). Changing it signs everyone out. |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | The admin created on startup when all three are set. Idempotent by email: it is never recreated or overwritten. |
| `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_DISCOVERY_URL` | An OIDC sign-in provider, turned on only when all three are set. See [Authentication](../authentication/). |

## Secrets

| Variable | What it is |
| --- | --- |
| `SECRETS_ENCRYPTION_KEY` | Encrypts the secrets users save at `/me`, which the MCP's `request` tool fills into the calls an agent makes. The Base64 of exactly 32 bytes (`openssl rand -base64 32`). Optional: without it, secrets are off. |

> Losing or changing `SECRETS_ENCRYPTION_KEY` makes every stored secret unreadable; users have to save them again. Back it up with `.env`.

## Content

| Variable | What it is |
| --- | --- |
| `TRUSTED_GIT_HOSTS` | Internal git hosts users may add repositories from, comma separated (`git.home.lan,gitea.lan`). Exact names, no wildcards. Optional. |

The backend clones every repository from inside your network, so a repository a user adds from their profile (`/me/repositories`) is refused when its host resolves to a private address. List here the internal hosts you trust, such as a Gitea at home; their URLs must still use `https://`. The repositories admins add at `/admin/content` are not checked this way.

## Logs

| Variable | What it is |
| --- | --- |
| `LOG_LEVEL` | Minimum severity: `fatal`, `error`, `warn`, `info` (default), `debug` or `trace`. |

Logs go to the containers' standard output as JSON lines; read them with `docker compose logs`.
