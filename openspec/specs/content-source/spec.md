# Content Source

## Purpose

Defines where the backend gets the content repository from, a local folder or a git repository, how it keeps it current and what it does when the content is missing or invalid.
## Requirements
### Requirement: Content source configuration

The backend SHALL read the content from the content repositories stored in the database (`content-repository-management`), each a git repository checked out at its `ref`. It SHALL NOT read the content's location from environment variables, and SHALL NOT read content from a local folder other than its own clones. With no repository stored, the backend SHALL start and work without content.

#### Scenario: No source

- **WHEN** the backend starts with no content repository stored
- **THEN** it SHALL start, every other feature SHALL work, and every schema endpoint SHALL answer `NOT_FOUND`

#### Scenario: Both sources set

- **WHEN** the backend starts with the retired `CONTENT_DIR` and `CONTENT_REPO` both still set in `.env`
- **THEN** it SHALL start normally and read no content from them

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

### Requirement: Full history and last edit dates

A sync SHALL fetch the full history of the repository's `ref`, not only its last commit, and a sync of a clone that holds only part of that history (a shallow clone left by an earlier version of the platform) SHALL deepen it to the full history. For the current checkout of each repository, the backend SHALL read, in a single pass over the history, the date (`YYYY-MM-DD`, from the committer date in the committer's time zone) of the last commit of the checked-out `ref` that touched each file present in the checkout. A file moved or renamed SHALL take the date of the commit that moved it. Reading the dates SHALL NOT be part of the sync: when they cannot be read, the sync SHALL still succeed, the failure SHALL be logged with the repository's slug, and the repository's pages SHALL be built without edit dates until its next successful sync.

#### Scenario: Two files edited on different days

- **WHEN** `docs/red/dns.mdx` was last changed by a commit of 2026-03-02 and `docs/red/vpn.mdx` by one of 2026-10-14, and the backend syncs the repository
- **THEN** it SHALL read 2026-03-02 for `docs/red/dns.mdx` and 2026-10-14 for `docs/red/vpn.mdx`

#### Scenario: Shallow clone from an earlier version

- **WHEN** the backend syncs a repository whose clone was fetched with only its last commit
- **THEN** the clone SHALL end up with the full history of the `ref`, and each file SHALL get the date of its own last commit, not that of the last commit of the repository

#### Scenario: Hosted repository

- **WHEN** the backend syncs the hosted repository `manual` after a push
- **THEN** it SHALL read each file's last commit date from the history pushed to its bare repository

#### Scenario: Dates cannot be read

- **WHEN** the history pass fails on a checkout that synced successfully
- **THEN** the sync SHALL count as successful, the failure SHALL be logged, and the repository's pages SHALL show no edit date until its next successful sync

### Requirement: Periodic refresh

The backend SHALL sync every stored content repository on boot, without delaying startup, and every five minutes through a code-declared cron job. The job SHALL NOT be reachable over HTTP. A repository that fails to sync SHALL NOT prevent the others from syncing. With no repository stored, the job SHALL do nothing.

#### Scenario: A push reaches the backend

- **WHEN** a writer pushes a new entity to the `ref` of a stored repository
- **THEN** the backend SHALL serve it at the latest after the next five-minute refresh

#### Scenario: One repository fails

- **WHEN** the periodic job runs with two repositories and the first one's remote is unreachable
- **THEN** the second SHALL still be synced

### Requirement: Last valid content is kept

For each repository, when the content's declarations (`doc.config.yaml`, `menu.yaml` or a `_type.yaml`) are invalid, the backend SHALL keep using the last valid declarations it read for that repository and SHALL log each problem with the repository's slug, the file and the message. When it has never read valid declarations for a repository, it SHALL behave as for that repository without content. A `menu.yaml` entry naming a path that does not exist SHALL NOT make the declarations invalid (`content-menu`).

#### Scenario: A broken push

- **WHEN** a commit breaks `catalog/maquinas/_type.yaml` after the backend had read a valid version
- **THEN** the backend SHALL keep serving the previous declarations of that repository and log the problem on `catalog/maquinas/_type.yaml`

#### Scenario: A broken menu

- **WHEN** a commit adds a key `orden` to a group of `menu.yaml` after the backend had read a valid version
- **THEN** the backend SHALL keep serving the previous declarations, its menu included, and log the problem on `menu.yaml`

