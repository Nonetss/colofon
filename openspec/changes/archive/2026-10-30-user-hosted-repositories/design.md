## Context

A hosted repository isn't a column. It is a row whose `url` is the marker `/git/<slug>.git` (`isHosted` in `packages/api/src/v1/content/hosting.ts`), and its bare repository lives under the hosted root in a folder named by the row's id. `owner_id` is already nullable, and `content_repository_share` points at any repository, so the schema already allows a hosted repository with an owner and shares. Today only the admin procedures can create one, and `createMyRepository` takes only `url: userUrl`.

The git endpoint (`createGitHosting`) resolves the slug with `repositories.find(slug, "all")`. So it would already serve a user's hosted repository with no credentials, which is what we want.

What doesn't handle a user's hosted repository yet:

- `reader.ts` `runSync` runs `checkRemote` on the URL of every repository with an owner. The marker isn't an https URL, so the check would fail. `repoSyncFor` also passes `httpsOnly: ownerId !== null`, which would refuse the bare repository on disk.
- `ownBranchesUrlOf` (`listMyBranches`) returns `row.url` and runs `checkRemote` on it. `listMyContentFolders` likewise reads the stored URL.
- `deleteMyRepository` removes the clone (`reader.remove`) but not the bare repository. `deleteRepository` (admin) already does.
- `ownRepository` (output) leaves out `hosted` and `pushUrl`.

## Goals / Non-Goals

**Goals:**

- A user can create a hosted repository of their own from `/me/repositories` and manage it (edit name/ref/path, sync, share, delete) like an external one.
- Sharing, visibility in the reader, search, MCP and `llms.txt` work for it unchanged.

**Non-Goals:**

- Authenticating the git endpoint. It stays open for everyone, as the user asked; credentials come in a later change.
- A code browser for users (the admin's `/admin/git/<slug>` stays admin-only and lists only platform repositories).
- Switching a user's repository between hosted and external after creation.
- `add_repository` in the MCP creating hosted repositories.
- Deleting the bare repositories of a deleted user (see Risks).

## Decisions

### 1. `createMyRepository` takes `url` or `hosted`, as the admin's does

`url: userUrl.optional()` plus `hosted: hosted.optional()` and the same `oneSource(false)` refine as `createRepository`. The handler computes the stored URL with the existing `createdUrlOf` (marker or URL). For a hosted repository it skips `createdCredential`, or sends no credential, since `createdCredential` already accepts an absent id. After the insert it reuses the admin's branch: `ensureHostedRepo` when hosted, `syncInBackground` otherwise.

Alternative: a separate `createMyHostedRepository` procedure. Rejected because it duplicates the slug/conflict logic and departs from the admin contract the frontend already knows.

### 2. The source is fixed after creation

`updateMyRepository` doesn't get `hosted`. If the row is hosted and the input brings `url` or `credentialId`, it answers `BAD_REQUEST` ("Un repositorio alojado no tiene URL ni credencial"). This avoids switching sources and the orphan bare repository that comes with it. Admins keep their switch.

### 3. "External with an owner" replaces "has an owner" in the reader's sync

In `runSync`, the check becomes `repository.ownerId !== null && !isHosted(repository)`, and in `repoSyncFor`, `httpsOnly: repository.ownerId !== null && !isHosted(repository)`. The marker isn't a remote, and `resolveSource` already turns it into the bare folder. Each condition is one small named helper (`hasRemoteToVet(repository)`) instead of repeating the conjunction.

### 4. Branches and folders of a user's hosted repository read the bare repository

`ownBranchesUrlOf` returns `gitSourceOf(row, hostedRoot)` when the row is hosted, and `listMyBranches` skips `checkRemote` and `httpsOnly` for it. For a slug, `listMyContentFolders` does the same with `bare: true`, as the admin's `foldersSourceOf` does. With nothing pushed yet, the bare repository has no branches: the answer is an empty list and the form lets the user type the ref.

### 5. Deleting removes the bare repository

`deleteMyRepository` copies the admin's step: `rm(hostedFolder(hostedRoot, row.id), { recursive: true, force: true })` when hosted. If both end up identical, the two handlers share one helper (`removeHostedFolder`).

### 6. `ownRepository` keeps `hosted` and `pushUrl`

The `.omit` drops only `catalogUrl`, and `toOwnRepository` fills `hosted: isHosted(row)` and `pushUrl: pushUrlOf(row)`. The MCP's `my_repositories` maps its own fields and needs no change.

### 7. Frontend: the profile form reuses the admin pattern without importing it

The profile slice can't import another slice's private folders. `RepositorySource` and the branch-source logic for hosted repositories are added to `features/profile/repositories/model/repository-form.ts`, which already has its own `branchesSource`. They mirror `features/admin/content/model/branches-source.ts`: hosted and stored gives `{ slug }`, hosted and new gives `skipToken`. The form adds a source select (`Repositorio externo` / `Alojado en la plataforma`), shown only on creation, and hides URL and credential when the source is hosted. The card shows `pushUrl` with `CopyableUrl`.

`CopyableUrl` moves from `features/admin/shared` to `components/shared/data-display` (or wherever `copy-button.tsx` lives, `components/shared/form`), because it will then have consumers in two domains. The admin re-exports or imports it from there.

## Risks / Trade-offs

- **A private hosted repository is readable and writable over git by anyone who knows or guesses its slug.** The user accepted this on purpose. The slug is visible to anyone the repository is shared with, and isn't secret. Mitigation: the form's copy for hosted repositories warns that the git URL has no protection for now, and the follow-up change adds authentication to the endpoint.
- **Bare repositories of deleted users stay on disk.** The cascade deletes the rows but not the folders under the hosted root. They take space and are unreachable, since there is no row to resolve them. Pruning them automatically by comparing against the listed rows risks deleting irrecoverable git history if a listing comes back wrong, so it is left for later, with the owner's explicit deletion as the path that cleans up.
- **The slug is global.** A user's hosted repository takes the URL `/git/<slug>.git` at the same level as the admin's. This is already the case for external repositories (a unique slug), so nothing new.
