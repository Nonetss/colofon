## ADDED Requirements

### Requirement: Content folder of a repository

A content repository SHALL have a `path`, the folder inside its git repository where its content lives, empty by default (the root of the repository). It SHALL be a relative path with `/` separators, at most 255 characters, whose segments are neither empty, `.`, `..` nor start with a dot, and that does not start with `/`; anything else SHALL fail input validation with a Spanish message and store nothing. Unlike the `slug`, it SHALL be editable.

The create and edit procedures, both the admin's and the owner's (`user-content-repositories`), SHALL accept `path`, edit keeping it when omitted, and every repository in a response SHALL carry it. Editing only the `path` SHALL NOT start a sync, since the clone is the same; it SHALL make the next read use the new folder. Creating SHALL start a sync as before.

The admin screen's form and the profile's repositories form SHALL offer it as an optional “Carpeta del contenido” field, empty meaning the root, and both cards SHALL show it when it is not empty.

#### Scenario: Site in a docs folder

- **WHEN** an admin creates a repository for this monorepo with the path `docs`
- **THEN** it SHALL be stored with the path `docs`, and its declarations and pages SHALL be read from that folder of the clone

#### Scenario: Default

- **WHEN** an admin creates a repository without a path
- **THEN** its path SHALL be empty and its content SHALL be read from the root, as before

#### Scenario: Path that climbs

- **WHEN** a user creates a repository with the path `../fuera` or `/etc`
- **THEN** the request SHALL fail input validation and nothing SHALL be stored

#### Scenario: Moving the content

- **WHEN** an owner edits only the path of their repository from empty to `documentacion`
- **THEN** no sync SHALL start and the next read SHALL use `documentacion` of the existing clone

#### Scenario: Form

- **WHEN** a user opens the creation form
- **THEN** it SHALL offer an optional “Carpeta del contenido” field, empty by default
