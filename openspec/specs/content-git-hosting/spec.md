# content-git-hosting Specification

## Purpose
Makes the platform the git server of its hosted content repositories: writers clone, fetch and push them over HTTP at the platform's own URL, and each push reaches the served content right away.

## Requirements

### Requirement: Smart HTTP git endpoint

The backend SHALL serve git's smart HTTP protocol for each hosted content repository at `/git/<slug>.git`, where `<slug>` is the repository's slug, so a standard git client can `clone`, `fetch`, `ls-remote` and `push` against `<platform origin>/git/<slug>.git`. It SHALL serve both the fetch service (`git-upload-pack`) and the push service (`git-receive-pack`): the ref advertisement on `GET /git/<slug>.git/info/refs?service=<service>` and the service itself on `POST /git/<slug>.git/<service>`. It SHALL accept request bodies sent with `Content-Encoding: gzip`. It SHALL NOT serve git's dumb HTTP protocol. A request for a slug with no stored repository, for a repository that is not hosted, for any other service or for any other path under `/git/` SHALL answer `404`.

#### Scenario: Cloning a hosted repository

- **WHEN** a writer runs `git clone https://docs.example.com/git/manual.git` and `manual` is a hosted repository with commits on `main`
- **THEN** the clone SHALL succeed and check out `main`

#### Scenario: Pushing to a hosted repository

- **WHEN** a writer pushes a new commit to `main` of the hosted repository `manual`
- **THEN** the push SHALL succeed and a later clone SHALL include that commit

#### Scenario: External repository

- **WHEN** a client requests `/git/homelab.git/info/refs?service=git-upload-pack` and `homelab` is a stored repository with an external URL
- **THEN** the backend SHALL answer `404`

#### Scenario: Unknown repository

- **WHEN** a client pushes to `/git/no-existe.git`
- **THEN** the backend SHALL answer `404` and SHALL NOT create any repository

### Requirement: No authentication on hosted repositories

The git endpoint SHALL NOT require credentials, a session or an API key for any operation: anyone who reaches the platform SHALL be able to clone, fetch and push to every hosted repository, including non-fast-forward pushes and branch deletions. This SHALL hold for platform repositories and for those that belong to a user, whether private or shared with organizations, and in every environment, production included.

#### Scenario: Push without credentials

- **WHEN** a client with no session and no credentials in the URL pushes to a hosted repository
- **THEN** the push SHALL succeed

#### Scenario: Force push

- **WHEN** a writer runs `git push --force` that rewrites `main` of a hosted repository
- **THEN** the push SHALL succeed and `main` SHALL point at the pushed commit

#### Scenario: A user's private hosted repository

- **WHEN** a client with no credentials clones, then pushes to, `/git/notas.git`, where `notas` is a hosted repository that belongs to `ana` and is not shared
- **THEN** the clone and the push SHALL succeed, and the push SHALL start a sync of `notas`

### Requirement: Hosted repositories are stored by the platform

The backend SHALL keep one bare git repository per hosted content repository, in its own folder under a dedicated hosted root (`.hosted/` at the repo root in native dev, a named volume in Docker), separate from the clone root, named by the repository's id. A hosted repository's bare repository SHALL have its `HEAD` pointing at the repository's `ref` when it is created. When the bare repository is missing for a hosted repository, the endpoint SHALL create it empty before serving the request.

#### Scenario: Volume recreated empty

- **WHEN** a client pushes to a hosted repository whose bare repository folder was removed
- **THEN** the backend SHALL create an empty bare repository and accept the push

#### Scenario: Default branch of a new hosted repository

- **WHEN** a writer clones a hosted repository created with the ref `produccion`, after pushing to `produccion`
- **THEN** the clone SHALL check out `produccion`

### Requirement: A push reaches the served content

When a push to a hosted repository ends, the backend SHALL start a sync of that repository without making the push wait for it, so the pushed content of its `ref` is served without waiting for the periodic refresh. A push SHALL start a sync even when it updates a branch other than the repository's `ref`.

#### Scenario: Entity pushed

- **WHEN** a writer pushes a new entity to the `ref` of the hosted repository `manual`
- **THEN** the push SHALL answer without waiting for the sync, and the backend SHALL serve the new entity in `manual`'s schemas once that sync ends

### Requirement: Deleting a hosted repository

Deleting a hosted repository, by an admin or by the user who owns it, SHALL delete its bare repository along with its clone, so that a later request to its git URL answers `404` and a new repository created with the same slug starts empty.

#### Scenario: Owner deletes a hosted repository

- **WHEN** `ana` deletes her hosted repository `notas`, which has commits
- **THEN** its bare repository SHALL be removed and a clone of `/git/notas.git` SHALL get `404`

#### Scenario: Slug reused

- **WHEN** `ana` deletes `notas` and then creates a new hosted repository `notas`
- **THEN** the new repository SHALL have no branches
