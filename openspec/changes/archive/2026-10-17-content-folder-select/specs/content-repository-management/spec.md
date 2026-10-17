## ADDED Requirements

### Requirement: Content folders of a repository

The backend SHALL expose to admins a procedure that lists the content folders of a git repository at a ref, and to every signed-in user an equivalent one limited to their own repositories (`user-content-repositories`). A content folder is a folder of the repository that contains a `doc.config.yaml`; the root counts as the empty path. It SHALL take the repository as in the branches procedure (a typed URL or the slug of a stored repository, one of the two) and an optional `ref`, defaulting to the remote's HEAD, and SHALL read only the repository's tree at that ref, never file contents. The answer SHALL list the folders as paths that are valid content paths, root first and then in alphabetical order, at most 50. Its input SHALL travel in the request body, never in the query string. An unknown slug SHALL answer `NOT_FOUND`, a remote or ref that can't be read `BAD_GATEWAY` with the git error without credentials, and a repository with no `doc.config.yaml` an empty list. A hosted repository SHALL be read from its bare repository on disk. The user's procedure SHALL refuse the URLs the user rules refuse (`BAD_REQUEST`) before any read.

#### Scenario: Site inside docs

- **WHEN** an admin lists the folders of a repository whose only `doc.config.yaml` is at `docs/doc.config.yaml`
- **THEN** the answer SHALL be `docs`

#### Scenario: Root and subfolder

- **WHEN** a repository has `doc.config.yaml` at its root and at `ejemplo/doc.config.yaml`
- **THEN** the answer SHALL list the root first and then `ejemplo`

#### Scenario: Other branch

- **WHEN** the branch `produccion` holds the site in `sitio` and `main` holds it in `docs`, and the folders are listed for `produccion`
- **THEN** the answer SHALL be `sitio`

#### Scenario: Remote that can't be read

- **WHEN** a remote rejects the credentials
- **THEN** the procedure SHALL answer `BAD_GATEWAY` with git's error and no credential in it

#### Scenario: A user asks for an internal address

- **WHEN** a user lists the folders of `https://192.168.1.10/x.git`
- **THEN** the backend SHALL answer `BAD_REQUEST` and read nothing

### Requirement: Content folder select

The “Carpeta del contenido” field of the admin form and of the profile's form SHALL be a select of the repository's content folders once they can be read: from the typed URL and the chosen ref once the URL is complete, from the stored repository while editing with the URL left empty, or from the platform's own bare repository for a hosted one. The root SHALL show as “Raíz del repositorio”. The options SHALL include the current value even when it isn't among the folders found, and SHALL refresh when the chosen branch changes. While the folders can't be read, or none is found, the field SHALL be a text field, with the reason as its hint when the read failed. Choosing the only folder found while creating SHALL NOT be automatic: the field starts at the root until the user chooses.

#### Scenario: Choosing the folder

- **WHEN** a user types the URL of a repository whose site is in `docs`
- **THEN** the field SHALL become a select offering “Raíz del repositorio” and `docs`

#### Scenario: Changing the branch

- **WHEN** the user picks another branch in the same form
- **THEN** the folders SHALL be read again for that branch

#### Scenario: Folder typed before

- **WHEN** an edited repository has the folder `antiguo`, which the listing doesn't find
- **THEN** the select SHALL still offer `antiguo`, selected

#### Scenario: Unreadable remote

- **WHEN** the folders can't be read
- **THEN** the field SHALL stay a text field and say why
