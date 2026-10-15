# Content Source

## Purpose

Defines where the backend gets the content repository from, a local folder or a git repository, how it keeps it current and what it does when the content is missing or invalid.

## Requirements

### Requirement: Content source configuration

The backend SHALL read the content from `CONTENT_DIR`, a local folder, or from `CONTENT_REPO`, a git repository URL, checked out at `CONTENT_REF` (a branch, tag or commit, default `main`). A relative `CONTENT_DIR` SHALL be resolved against the repo root. Setting both `CONTENT_DIR` and `CONTENT_REPO` SHALL fail environment validation. With neither set, the backend SHALL start without content and log that no content source is configured.

#### Scenario: Both sources set

- **WHEN** the backend starts with `CONTENT_DIR` and `CONTENT_REPO` both set
- **THEN** environment validation SHALL fail and the backend SHALL NOT start

#### Scenario: No source

- **WHEN** the backend starts with neither variable set
- **THEN** it SHALL start, every other feature SHALL work, and the content features SHALL behave as for an empty content repository

### Requirement: Local folder is read in place

With `CONTENT_DIR`, the backend SHALL read the folder in place on each request that needs the content, so a saved change is visible on the next request without restarting the backend or running any command.

#### Scenario: New entity while editing

- **WHEN** a writer adds `catalogo/maquinas/nas-02.yaml` under `CONTENT_DIR`
- **THEN** the next request for the machines' schema SHALL list `nas-02` among the ids its references accept

### Requirement: Git repository is cloned and refreshed

With `CONTENT_REPO`, the backend SHALL keep a clone in a dedicated folder (`.content/` at the repo root in native dev, a named volume in Docker). On boot it SHALL clone the repository when the folder holds no clone of that URL, and otherwise fetch it; then it SHALL check out `CONTENT_REF` exactly as the remote has it, discarding any local change in the clone. A failed clone or fetch SHALL NOT stop the backend: it SHALL log the failure and keep using the last checkout, if any. Credentials SHALL travel only in the URL (for example a token for HTTPS), and the backend SHALL never log them.

#### Scenario: First boot

- **WHEN** the backend boots with `CONTENT_REPO` set and an empty clone folder
- **THEN** it SHALL clone the repository and check out `CONTENT_REF`

#### Scenario: Unreachable remote

- **WHEN** the remote cannot be reached on a refresh after a successful clone
- **THEN** the backend SHALL keep serving the content of the last checkout and log the failure without the URL's credentials

#### Scenario: Another repository

- **WHEN** `CONTENT_REPO` changes to a different URL and the backend restarts
- **THEN** it SHALL replace the clone with one of the new repository

### Requirement: Periodic refresh

With `CONTENT_REPO`, the backend SHALL refresh the clone every five minutes through a code-declared cron job, in addition to the refresh on boot. The job SHALL NOT be reachable over HTTP. With `CONTENT_DIR` or no source, the job SHALL do nothing.

#### Scenario: A push reaches the backend

- **WHEN** a writer pushes a new entity to `CONTENT_REF` of `CONTENT_REPO`
- **THEN** the backend SHALL serve it at the latest after the next five-minute refresh

### Requirement: Last valid content is kept

When the content's declarations (`doc.config.yaml` or a `_tipo.yaml`) are invalid, the backend SHALL keep using the last valid declarations it read and SHALL log each problem with its file and message. When it has never read valid declarations, it SHALL behave as without content.

#### Scenario: A broken push

- **WHEN** a commit breaks `catalogo/maquinas/_tipo.yaml` after the backend had read a valid version
- **THEN** the backend SHALL keep serving the previous declarations and log the problem on `catalogo/maquinas/_tipo.yaml`
