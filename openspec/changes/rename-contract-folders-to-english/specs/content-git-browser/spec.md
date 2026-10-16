## MODIFIED Requirements

### Requirement: Folders of a hosted repository

The backend SHALL expose to admins, under the `v1.content` procedures, a read-only `GET` procedure that lists the entries of one folder of a hosted repository on one of its branches. It SHALL take the repository's `slug`, a `branch` name and a `path` relative to the repository root, empty for the root. Each entry SHALL carry its name, its path from the root, its kind (`folder`, `file` or `submodule`) and, for a file, its size in bytes. Entries SHALL be ordered folders first, then by name. A `path` that is absolute, ends in `/`, has an empty, `.` or `..` segment, or is longer than 1024 characters SHALL fail input validation.

It SHALL answer `NOT_FOUND` for an unknown slug, for a repository that is not hosted, for a `branch` that is not a branch of the repository, and for a `path` that is not a folder on that branch. It SHALL NOT write anything, not even a missing bare repository: a hosted repository nothing has been pushed to has no branches. A request without a session SHALL answer `UNAUTHORIZED` and one from a non-admin `FORBIDDEN`.

#### Scenario: Root of a branch

- **WHEN** an admin lists the root of `main` of the hosted repository `manual`, which holds `doc.config.yaml`, `docs/` and `catalog/`
- **THEN** the backend SHALL answer `catalog` and `docs` as folders, then `doc.config.yaml` as a file with its size

#### Scenario: Nested folder

- **WHEN** an admin lists the path `docs/red` of `main` of `manual`
- **THEN** each entry SHALL carry its path from the root, such as `docs/red/dns.mdx`

#### Scenario: Another branch

- **WHEN** an admin lists the root of `borrador` of `manual`, a branch with a file that `main` lacks
- **THEN** the answer SHALL include that file

#### Scenario: Unknown branch or path

- **WHEN** an admin lists `main` of `manual` at the path `no-existe`, or the root of the branch `no-existe`
- **THEN** the backend SHALL answer `NOT_FOUND`

#### Scenario: External repository

- **WHEN** an admin lists the root of `main` of `homelab`, an external repository
- **THEN** the backend SHALL answer `NOT_FOUND`

#### Scenario: Escaping the root

- **WHEN** an admin lists the path `docs/../..`
- **THEN** the request SHALL fail input validation
