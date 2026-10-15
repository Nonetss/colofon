---
description: Start a new project from this template — generate the .env, rename the app in Docker Compose and the frontend, and detach the template's git remote
argument-hint: "[app name]"
---

Turn this checkout of the `stack` template into a new project.

**Arguments:** $ARGUMENTS

**Hard rules:** this command starts nothing — bringing the app up is the user's job. Never run `bun run dev`, `dev:local`, `dev:cert`, `gateway`, any `*:start`, `bun install` or any `docker`/`docker compose` command, not even to check the running state. Never kill or stop a process; never generate, push or run migrations; never commit.

Steps:

1. **App name.** If no name was passed in the arguments, ask the user for it with AskUserQuestion (header "Nombre"; offer a couple of example names and let them type their own through "Other"). Derive:
   - `slug`: lowercase kebab-case (`[a-z0-9-]`, starts with a letter), used in Docker names. Example: "Mi Tienda" → `mi-tienda`.
   - `db`: the slug with `-` replaced by `_`, used as the PostgreSQL database name. Example: `mi_tienda`.
   - `display`: the name as the user wrote it, for the UI. `DISPLAY` is its uppercase form, for the places that show `STACK` today.
   Confirm the derived values in one line before editing.

2. **Rename in Docker Compose.** Search first (`grep -n stack compose*.yml`) and replace only the app name, never the word in comments that describe the "dev stack":
   - `compose.yml`: `name: stack` → `name: <slug>`, every `container_name: stack-*` → `<slug>-*`.
   - `compose.dev.yml`: `name: stack-dev` → `name: <slug>-dev`, every `container_name: stack-dev-*` → `<slug>-dev-*`.
   - `compose.prod.yml`: `name: stack`, every `container_name: stack-*` and the `stack` network (its definition and every service's `networks:` entry) → `<slug>`. Leave the `ghcr.io/nonetss/stack-*` images alone: CI names them after the GitHub repository (`.github/workflows/docker-build.yml`), so tell the user to update them once the new repo exists.
   - In all three: `POSTGRES_DB: stack`, `pg_isready -U postgres -d stack` and the `@db:5432/stack` in `DATABASE_URL` → `<db>`.
   - Named volumes (`db_data`, `gateway_data`, …) need no edit: Compose prefixes them with the project name, so they become `<slug>-dev_db_data` and so on.
   - Root `package.json`: `"name": "stack"` → `"name": "<slug>"`, and the `stack-dev_gateway_data` volume in the `dev:cert` script → `<slug>-dev_gateway_data`.
   - `.env.example`: the `@db:5432/stack` database → `<db>` and `admin@stack.local` → `admin@<slug>.local`.
   - `scripts/setup-dev.sh`: `ADMIN_EMAIL="admin@stack.local"` → `admin@<slug>.local`.

3. **Rename in the frontend and the API docs.** Search `apps/frontend/src`, `apps/frontend/public` and `apps/backend/src` for `STACK`, `Stack` and `stack-` (skip `TanStack`/`TANSTACK`) and replace the app name:
   - `nameApp="STACK"` in `src/layouts/Layout.astro` and `src/layouts/Admin.astro`, the `STACK` texts and `aria-label` in `features/app-shell/guest/components/site-footer.astro`, `STACK · Acceso` in `features/auth/sign-in/components/sign-in-content.tsx` → `DISPLAY`.
   - `<title>STACK</title>` in `src/assets/logo.svg` and `public/logo.svg` → `DISPLAY`. Leave the `.stack-ink` CSS class as is.
   - `public/manifest.webmanifest`: `name`, `short_name` and `description` → `display`.
   - The service worker cache `stack-shell-v1` in `public/sw.js` and `src/layouts/service-worker.astro` → `<slug>-shell-v1`. Change both together: the layout deletes the cache that the worker creates.
   - `apps/backend/src/routers/docs.ts`: `Stack API` → `<display> API` (title and description).
   Don't touch docs, `AGENTS.md`, the `stack` skill or OpenSpec: there `stack` names the template and its skill, not the app.
   Then run `bunx biome check` on the edited files and `bun run check-types` to confirm nothing broke.

4. **Generate the `.env`.** Run `bash scripts/setup-dev.sh` now that `.env.example` carries the new database name. Don't pass `--force`.
   - If it created the file, show the admin email and password it printed, and stress that the password is stored only in `.env`.
   - If it skipped because `.env` already exists, replace the `/stack` database in its `DATABASE_URL` with `/<db>` so it matches the compose files, and say so. Don't change anything else in it.
   - Relay any warning about leftover `apps/*/.env` files; never delete them.

5. **Detach from the template.** Show `git remote -v`, then run `git remote rm origin`. If there is no `origin`, say so and move on. Tell the user to add their own remote with `git remote add origin <url>` when they have the repo.

6. **Summary.** End with a short report in Spanish:
   - The name used (`display`, `slug`, `db`) and the files that changed.
   - Whether `.env` was created (with the admin credentials) or kept.
   - That `origin` was removed.
   - That, when they want, they bring it up themselves with `bun run dev`, which starts the Docker Compose development stack (`compose.dev.yml`, project `<slug>-dev`: frontend and backend with hot reload, PostgreSQL, Loki, Tempo and the Caddy gateway) at `https://localhost:4321`. Mention `bun install` first if `node_modules` is missing, and `bun run dev:cert` once the gateway is up to export the local certificate authority for the browser. These are for the user to run.
   - The changes are not committed.
