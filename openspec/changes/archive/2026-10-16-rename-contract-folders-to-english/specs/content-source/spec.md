## MODIFIED Requirements

### Requirement: Last valid content is kept

For each repository, when the content's declarations (`doc.config.yaml`, `menu.yaml` or a `_type.yaml`) are invalid, the backend SHALL keep using the last valid declarations it read for that repository and SHALL log each problem with the repository's slug, the file and the message. When it has never read valid declarations for a repository, it SHALL behave as for that repository without content. A `menu.yaml` entry naming a path that does not exist SHALL NOT make the declarations invalid (`content-menu`).

#### Scenario: A broken push

- **WHEN** a commit breaks `catalog/maquinas/_type.yaml` after the backend had read a valid version
- **THEN** the backend SHALL keep serving the previous declarations of that repository and log the problem on `catalog/maquinas/_type.yaml`

#### Scenario: A broken menu

- **WHEN** a commit adds a key `orden` to a group of `menu.yaml` after the backend had read a valid version
- **THEN** the backend SHALL keep serving the previous declarations, its menu included, and log the problem on `menu.yaml`
