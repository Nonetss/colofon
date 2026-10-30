## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Deleting a hosted repository

Deleting a hosted repository, by an admin or by the user who owns it, SHALL delete its bare repository along with its clone, so that a later request to its git URL answers `404` and a new repository created with the same slug starts empty.

#### Scenario: Owner deletes a hosted repository

- **WHEN** `ana` deletes her hosted repository `notas`, which has commits
- **THEN** its bare repository SHALL be removed and a clone of `/git/notas.git` SHALL get `404`

#### Scenario: Slug reused

- **WHEN** `ana` deletes `notas` and then creates a new hosted repository `notas`
- **THEN** the new repository SHALL have no branches
