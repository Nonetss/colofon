## Why

Today every content repository lives on an external git host (GitHub, Gitea…), and the platform only clones it. For a small, self-run documentation platform that is one more service to set up and one more set of credentials to manage. The platform already runs git and keeps the clones, so it can host the repositories itself: writers push straight to the platform and see their content right away, with nothing else to install.

## What Changes

- The backend serves git's smart HTTP protocol at `/git/<slug>.git`, so `git clone`, `git fetch` and `git push` work against the platform's own URL for a hosted content repository. **No credentials**: anyone who reaches the platform can clone and push (force pushes included) to a hosted repository. This is a deliberate choice for a home-made setup, in development and in production alike.
- A content repository can be **hosted by the platform** instead of pointing at an external URL. The platform keeps a bare repository for it in a dedicated folder (a named volume in Docker), created when the repository is created or switched to hosted, and removed when the repository is deleted.
- A push to a hosted repository starts a sync of that repository in the background, so its content is served without waiting for the five-minute refresh.
- The management procedures accept "hosted" as an alternative to a URL on create and edit, return whether a repository is hosted and its push URL, and read the branches of a hosted repository from its bare repository.
- `/admin/content` lets the admin choose between an external URL and "Alojado en la plataforma", and shows a hosted repository's push URL with a control to copy it.
- The gateway forwards `/git/*` to the backend.
- The compose files mount a new named volume on the hosted repositories' folder.

## Capabilities

### New Capabilities

- `content-git-hosting`: the platform as a git server for its hosted content repositories: the smart HTTP endpoint, which repositories it serves, no authentication, where the bare repositories live, and the sync a push starts.

### Modified Capabilities

- `content-repository-management`: a repository is either external (URL) or hosted; create/edit accept hosted; responses carry `hosted` and `pushUrl`; creating a hosted repository creates its bare repository and starts no sync; deleting one removes it; branches of a hosted repository; the admin screen's source choice and push URL.
- `content-source`: a hosted repository is cloned and fetched from its bare repository on the platform instead of a remote URL.
- `http-gateway`: the gateway forwards `/git/*` to the backend.
- `docker-production-deployment`: `compose.yml` and `compose.prod.yml` mount a named volume on the hosted repositories' folder.
- `docker-dev-environment`: the dev backend keeps the hosted repositories in a named volume.

## Impact

- Code: `packages/content` (bare repository helpers and the smart HTTP handler), `packages/api/src/v1/content` (input, output, handler, reader), `apps/backend` (a `/git/*` route), `apps/frontend/src/features/admin/content` (form, card, types), `apps/gateway/routes.caddy`, the three compose files, `.gitignore`.
- API: `v1.content.createRepository` and `updateRepository` accept `hosted`; repository outputs gain `hosted` and `pushUrl`. Existing clients keep working: sending a `url` behaves as before.
- Database: none. A hosted repository stores the marker `/git/<slug>.git` in its existing `url` column, so no schema change or migration is needed.
- Security: hosted repositories are writable by anyone who reaches the gateway. Accepted by the user; the design notes how to add a token later.
- Docs: `AGENTS.md` project map (`packages/content`), the stack skill's `workspaces.md` and `docker.md`, `README.md` where it describes content repositories.
