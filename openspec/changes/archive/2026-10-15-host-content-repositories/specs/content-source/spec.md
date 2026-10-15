## MODIFIED Requirements

### Requirement: Git repository is cloned and refreshed

The backend SHALL keep one clone per content repository, in its own folder under a dedicated clone root (`.content/` at the repo root in native dev, a named volume in Docker), named by the repository's id. A sync SHALL clone the repository when its folder holds no clone of the repository's current source, and otherwise fetch it; then it SHALL check out the repository's `ref` exactly as the source has it, discarding any local change in the clone. The source of an external repository SHALL be its URL; the source of a hosted repository (`content-git-hosting`) SHALL be its bare repository on the platform, read from disk, never through the platform's own HTTP endpoint. A sync of a hosted repository whose `ref` has never been pushed SHALL fail like any other sync whose `ref` the remote lacks. A failed clone or fetch SHALL NOT stop the backend or affect other repositories: it SHALL record and log the failure and keep using the last checkout, if any. Credentials SHALL travel only in the URL (for example a token for HTTPS), and the backend SHALL never log them. Folders under the clone root that belong to no stored repository SHALL be removed on the next sync of all repositories; the hosted root SHALL never be pruned by a sync.

#### Scenario: First boot

- **WHEN** the backend boots with a stored repository and an empty clone root
- **THEN** the backend SHALL clone it into its own folder and check out its `ref`

#### Scenario: Unreachable remote

- **WHEN** the remote cannot be reached on a refresh after a successful clone
- **THEN** the backend SHALL keep serving the content of the last checkout and log the failure without the URL's credentials

#### Scenario: Another repository

- **WHEN** an admin changes a repository's URL to a different repository
- **THEN** the next sync SHALL replace its clone with one of the new repository

#### Scenario: Leftover clone

- **WHEN** the clone root holds a folder that matches no stored repository, such as a clone left by a former configuration
- **THEN** the next sync of all repositories SHALL remove it

#### Scenario: Hosted repository synced

- **WHEN** the backend syncs the hosted repository `manual` after a push to its `ref`
- **THEN** it SHALL clone or fetch it from its bare repository on disk and check out the pushed commit

#### Scenario: Hosted repository moved to an external URL

- **WHEN** an admin gives the hosted repository `manual` an external URL
- **THEN** the next sync SHALL replace its clone with one of the external repository
