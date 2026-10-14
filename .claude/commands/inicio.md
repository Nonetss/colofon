---
description: Set up a fresh checkout for development (prerequisites, root .env, dependencies) and optionally start the dev stack
argument-hint: "[docker|local|none] [--force]"
---

Set up this checkout for local development, end to end, following the README's "Getting Started" section and the `stack` skill (`references/commands.md`, `references/env.md`, `references/docker.md`).

**Arguments:** $ARGUMENTS

- `docker` → start the Docker dev stack at the end; `local` → start native dev; `none` → stop after installing. With no mode, ask the user (step 5).
- `--force` → pass `--force` to `scripts/setup-dev.sh`, overwriting the existing `.env`. Never add `--force` on your own: the current `.env` holds the user's secrets.

**Hard rules (from `AGENTS.md`):** never kill, stop or restart a running process or container; never generate, push or run migrations (the backend applies the committed ones on boot); never `curl` or browser-probe the running app; never commit the generated `.env` or `caddy-local-root.crt`.

Steps:

1. **Prerequisites.** Check, and report a table of found/missing with versions:
   - `bun --version` against `packageManager` in the root `package.json` (warn on a mismatch, don't fail).
   - `openssl version` (required by `setup-dev.sh`).
   - `docker --version` and `docker compose version` (needed for the dev stack, PostgreSQL, Loki, Tempo and the gateway).
   If `bun` or `openssl` is missing, stop and tell the user how to install it. If Docker is missing, continue but warn that only `none` is possible.

2. **Root `.env`.** Run `bun run setup:dev` (plus `--force` only if passed in the arguments).
   - If it skipped because `.env` already exists, say so and continue with the existing file.
   - If it created the file, show the user the admin email and password it printed, and stress that the password is not stored anywhere else except in `.env`.
   - Relay any warning about leftover `apps/*/.env` files; never delete them.

3. **Dependencies.** Run `bun install` at the repo root.

4. **Running state (read-only).** Run `docker compose -f compose.dev.yml ps` and check whether ports `4321`, `3000`, `4320` or `5432` are already in use (`ss -ltnp`). If something is already running, report it and do **not** start another stack on top of it; skip to step 7.

5. **Choose how to run.** If no mode was passed, ask the user with AskUserQuestion:
   - **Docker dev stack (Recommended)** — `bun run dev`: hot reload, PostgreSQL, Loki, Tempo and the gateway included.
   - **Native** — `bun run postgres:start`, `bun run loki:start`, `bun run tempo:start`, `bun run gateway` and `bun run dev:local`.
   - **Nothing** — stop here and print the commands.

6. **Start it.** Long-running commands (`bun run dev`, `bun run gateway`, `bun run dev:local`) go with `run_in_background`; the `*:start` ones are detached already.
   - Wait for the stack to come up by watching the output (Monitor or the background task output), not by probing the app. The backend applies migrations and seeds the admin on its first boot: confirm it from its logs.
   - Once the gateway has started, run `bun run dev:cert` and tell the user to import `caddy-local-root.crt` as a trusted certificate authority in the browser (Chrome: `chrome://certificate-manager`; Firefox: Settings → Privacy & Security → Certificates → Authorities → Import). This is needed only once per gateway volume.
   - If a step fails (port in use, image build error, env validation error on boot), stop and report the exact error; don't try to work around it by stopping other processes.

7. **Summary.** End with a short report:
   - What was done (prerequisites, `.env` created or kept, install, what is running and as which background task).
   - The app URL `https://localhost:4321` and the API docs at `https://localhost:4321/scalar` (admin session).
   - The admin credentials if they were generated in this run.
   - How to stop it: `bun run dev:down` for the Docker stack; for native, stopping the background tasks plus `bun run postgres:stop`, `loki:stop` and `tempo:stop`. Don't run them.
