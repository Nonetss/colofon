---
title: Your first repository
description: Sign in as the admin, register a content repository, sync it and read it, then hand the site to people and agents.
order: 2
---

This walkthrough takes a fresh installation to its first published documentation. The interface is in Spanish, so the labels below are quoted as they appear.

## 1. Sign in as the admin

On its first start the backend creates the admin described by `ADMIN_EMAIL`, `ADMIN_PASSWORD` and `ADMIN_NAME` in `.env` (the installer asks for them). Open the public URL and sign in with them at `/login`. Every page except `/login` and `/signup` needs a session.

With no repository yet, the site starts and works, but the reader has nothing to show. Admins reach the admin panel from **Administración** in the account menu.

## 2. Register a content repository

A content repository is a git repository with your pages, catalog and diagrams (see [Writing content](../content/)). Open **Contenido** (`/admin/content`) and choose **Añadir repositorio**. Give it a name and a slug, its name in URLs (`/<slug>/…`), which can't change once created. Then pick its **Origen**:

- **URL externa**: an `https://` git URL (GitHub, Gitea…). Once the URL is complete, the form lists the remote's branches to pick the ref and the folders that hold a `doc.config.yaml` to pick the **Carpeta del contenido** (the root by default), so the content can live in a folder of a code repository. For a private repository, add a user and an access token with read access; the platform never shows or logs it.
- **Alojado en la plataforma**: the platform is the git server. Clone and push to `<public URL>/git/<slug>.git`:

  ```bash
  git remote add colofon https://docs.example.com/git/manual.git
  git push colofon main
  ```

  Hosted repositories take **no credentials**: anyone who can reach the platform can clone and push to them, `--force` included. Keep the platform on a network you trust.

## 3. Sync and read

Creating an external repository starts its first sync; a push to a hosted one syncs it at once. After that, every repository is synced on startup, every five minutes, when its URL or ref changes, and from the sync button on its card, which shows the last sync with its commit or its full error.

Read it at `/<slug>`: its `docs/index.mdx` with a sidebar of sections and pages. The home `/` lists every repository with its sections, and the navbar search (`⌘K` / `Ctrl+K`) jumps to any page. If a page has problems (an unknown field, a broken link, a component the platform doesn't provide), admins see the full list on the page; other users only see that it has some.

## 4. Invite people

Anyone who can reach the site can create an account at `/signup`, and every signed-in user can read every repository the admins registered. Admins manage accounts at `/admin/users` (create, change the role or password, ban, delete). See [Users and sign-in](../authentication/).

## 5. Your own repositories

Every user can also add repositories of their own from **Repositorios** (`/me/repositories`). They are readable only by their owner, admins included: nobody else sees them in the reader, the search, the skills or the agents' tools. A user's repository is always external, over `https://`, and its host can't be a private or loopback address unless the server lists it in `TRUSTED_GIT_HOSTS`.

When the server has `SECRETS_ENCRYPTION_KEY` set, the same page saves **git credentials** (a host, a username and a token, stored encrypted). A repository then picks the credential for its host instead of carrying a token in its URL, and replacing the token takes effect on the next sync.

## 6. Connect an agent

Create an API key at `/me/api-keys`. The dialog shows the key once, with ready-to-copy text for each way of connecting an AI: the setup prompt, the documentation MCP for Claude Code, Codex and Cursor, and plain `llms.txt` for an AI without MCP. See [For AI agents](../agents/).
