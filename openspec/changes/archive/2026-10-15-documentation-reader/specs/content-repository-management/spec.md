## MODIFIED Requirements

### Requirement: Content repositories in the database

The platform SHALL keep its content repositories in the database, one record per git repository, with:
- `slug`: unique, 1 to 63 characters of lowercase letters, digits and single hyphens, neither starting nor ending with a hyphen, and none of the reserved names taken by the web's own top-level routes or by the paths the gateway sends to the backend (such as `admin`, `api`, `rpc`, `git`, `login`, `me` or `scalar`); it names the repository in the editor's schema URLs, in a hosted repository's git URL and in its reader routes (`/<slug>/…`), and SHALL NOT change after the repository is created;
- `name`: a display name, required;
- `url`: for an external repository, the git repository's `https://` or `http://` URL, with any credentials inside it; for a repository hosted by the platform (`content-git-hosting`), the marker `/git/<slug>.git` with its own slug;
- `ref`: the branch, tag or commit to check out, default `main`;
- the outcome of its last sync: when it ran, the commit checked out on success and the error on failure, each empty until the first sync.

A repository SHALL be hosted exactly when its `url` is its own marker. The marker SHALL only be stored by asking for a hosted repository, never typed as a URL.

#### Scenario: Two repositories

- **WHEN** an admin creates the repositories `documentacion` and `homelab`
- **THEN** both SHALL be stored, and each SHALL have its own schema catalog

#### Scenario: Invalid slug

- **WHEN** an admin creates a repository with the slug `Mi Repo`
- **THEN** the request SHALL fail input validation and nothing SHALL be stored

#### Scenario: Reserved slug

- **WHEN** an admin creates a repository with the slug `admin`
- **THEN** the request SHALL fail input validation with a Spanish message saying the name is reserved, and nothing SHALL be stored

#### Scenario: Hosted repository stored

- **WHEN** an admin creates the hosted repository `manual`
- **THEN** its stored `url` SHALL be `/git/manual.git`

#### Scenario: Marker typed as a URL

- **WHEN** an admin creates a repository sending `/git/manual.git` as its URL
- **THEN** the request SHALL fail input validation and nothing SHALL be stored
