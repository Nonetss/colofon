---
title: Deploy with Docker Compose
description: Install with the script or by hand with compose.prod.yml, put it behind HTTPS and know what to back up.
order: 6
---

A deployment is a directory with two files: `compose.prod.yml`, which pulls the prebuilt images, and the `.env` it reads. The installer writes both; you can also write them by hand.

## With the installer

On a Linux host with Docker, the Compose plugin, `curl` and `openssl`, from an empty directory:

```bash
curl -fsSL https://raw.githubusercontent.com/Nonetss/colofon/main/scripts/bootstrap.sh | bash
```

It reads your answers from the terminal even when piped, and asks for:

1. The host **port** (default `4444`) and the **public URL** the browser will use. It warns you when the URL is plain `http://` and not `localhost`, because sign-in would fail.
2. The **trusted internal git hosts** users may add repositories from (optional; see [Configuration](../configuration/#content)).
3. The **first admin**: name, email and a password of at least 8 characters.

Then it generates `POSTGRES_PASSWORD`, `BETTER_AUTH_SECRET` and `SECRETS_ENCRYPTION_KEY` with `openssl`, writes `.env` with mode `600`, downloads `compose.prod.yml` if it is missing and, if you say so, pulls the images and starts the stack. It refuses to run when a `.env` already exists, so it never overwrites an installation. `PB_REF` (`… | PB_REF=v0.1.0 bash`) picks the branch or tag of `compose.prod.yml` it downloads; the images stay on `:main`.

## By hand

```bash
curl -fsSL https://raw.githubusercontent.com/Nonetss/colofon/main/compose.prod.yml -o compose.prod.yml
touch .env && chmod 600 .env
```

Generate the secrets:

| Variable | Generate with |
| --- | --- |
| `POSTGRES_PASSWORD` | `openssl rand -hex 32` |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 48` |
| `SECRETS_ENCRYPTION_KEY` (optional) | `openssl rand -base64 32` |

Then fill in `.env`, with the database password repeated inside `DATABASE_URL`:

```bash
FRONTEND_PORT='4444'
CORS_ORIGIN='https://docs.example.com'
POSTGRES_PASSWORD='…'
DATABASE_URL='postgresql://postgres:…@db:5432/colofon'
BETTER_AUTH_SECRET='…'
SECRETS_ENCRYPTION_KEY='…'

ADMIN_NAME='Admin'
ADMIN_EMAIL='admin@example.com'
ADMIN_PASSWORD='…'
```

Every variable is explained in [Configuration](../configuration/). Then start it:

```bash
docker compose -f compose.prod.yml --env-file .env pull
docker compose -f compose.prod.yml --env-file .env up -d
```

The backend applies the migrations and creates the admin on startup, so there is no setup step. After a minute or two, open the public URL and sign in.

## The images

`compose.prod.yml` pulls `ghcr.io/nonetss/colofon-gateway`, `colofon-frontend` and `colofon-backend`, built for `amd64` and `arm64` on every push to `main`, plus `postgres:17`. See [Upgrading](../upgrading/) to update them or pin one build.

## Behind HTTPS

Session cookies are `Secure`, so browsers only keep them over HTTPS or on `localhost`. Anything other machines reach needs HTTPS.

The gateway serves plain HTTP on `FRONTEND_PORT`. Put your reverse proxy (Caddy, Traefik, nginx…) in front of it, terminate TLS there and forward every path to that port: the site, the API, `/git/*` and `/mcp` all live on the same origin, and the gateway splits them. Keep `CORS_ORIGIN` on the `https://` URL the browser sees. HSTS belongs to that proxy.

## External PostgreSQL

To use a managed database, remove the `db` service and the backend's `depends_on` entry for it from `compose.prod.yml`, and point `DATABASE_URL` at it:

```bash
DATABASE_URL='postgresql://user:password@db.example.com:5432/colofon'
```

## What to back up

| What | Where | Why |
| --- | --- | --- |
| The database | the `db_data` volume, or your PostgreSQL | Users, API keys, saved secrets (encrypted) and the list of content repositories. |
| The hosted repositories | the `hosted_data` volume | The bare repository of each repository hosted on the platform. It may be the only copy of its history. |
| `.env` | next to `compose.prod.yml` | Above all `SECRETS_ENCRYPTION_KEY`: without it the saved secrets cannot be read. |

`content_data` holds only clones of the repositories and can be left out: the next sync rebuilds it. A dump of the bundled database:

```bash
docker compose -f compose.prod.yml exec db pg_dump -U postgres colofon > colofon.sql
```
