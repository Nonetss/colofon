# agent-skills Specification

## Purpose

Serves Agent Skills that an agent can discover and install from the site's address: the platform's own skills, the same on every site, and the skills each content repository declares, over the Agent Skills discovery draft (`/.well-known/agent-skills/`).

## Requirements

### Requirement: Platform skills

The platform SHALL ship its own skills, each a folder holding a `SKILL.md` in the Agent Skills format (YAML front matter with `name` and `description`, then the instructions) and, optionally, other text files (such as `references/*.md`) that the `SKILL.md` points at. It SHALL serve them on every site to every caller, with or without a credential. Every platform skill's name SHALL be `colofon` or start with `colofon-`. The platform skills SHALL come from two folders of the platform's repository, and each SHALL be served with every file of its folder:

- `packages/api/skills/`, which holds `colofon`: how an agent works with the platform (the `llms.txt` indexes, the `llm.txt` routes, the MCP and every tool it can serve, `secrets`, `request` and `sync` included, the skills, how to refresh installed skills and the API key), and that writing a content repository starts by loading `colofon-documentation`;
- `doc-example/.agents/skills/`, the writing skills common to every content repository, which SHALL be the only copy of them in the platform's repository. It holds at least:
  - one skill per part of a content repository: `colofon-documentation` (the repository as a whole), `colofon-docs`, `colofon-catalog`, `colofon-diagrams`, `colofon-styles` and `colofon-skills`;
  - one skill per repeated writing task: `colofon-questions`, `colofon-pending`, `colofon-check`, `colofon-review`, `colofon-new-page` and `colofon-new-diagram`.

The platform SHALL NOT serve a skill named `doc-writing`. Platform skills SHALL say how to work and where to look, not what one site holds, and SHALL NOT hold secrets. A platform skill whose folder is broken (no `SKILL.md`, a front matter `name` other than its folder's, a missing `description`) SHALL fail the platform's tests rather than be served.

#### Scenario: Without a credential

- **WHEN** a request without session or API key asks for `/.well-known/agent-skills/colofon/SKILL.md`
- **THEN** the response SHALL be status 200 with the `colofon` skill

#### Scenario: Writing skills served

- **WHEN** an agent lists the skills without a credential
- **THEN** the list SHALL hold `colofon`, `colofon-documentation`, `colofon-docs`, `colofon-catalog`, `colofon-diagrams`, `colofon-styles`, `colofon-skills` and the six task skills, and SHALL NOT hold `doc-writing`

#### Scenario: One source

- **WHEN** a reference under `doc-example/.agents/skills/colofon-diagrams/references/` changes and the backend restarts
- **THEN** the served `colofon-diagrams` SHALL carry the changed file, with no other copy edited

### Requirement: Content skills

The skills of a content repository (its `skills/<name>/SKILL.md`, `content-contract`) SHALL be served as `<slug>-<name>`, where `<slug>` is the repository's slug. The served `SKILL.md` SHALL be the file with the value of its front matter's `name` replaced by `<slug>-<name>`, and every other byte unchanged. A content skill SHALL be served only to a caller with a credential whose user can read that repository in the reader, and SHALL follow the checkout the reader serves. A content skill whose published name equals a platform skill's name, or is longer than 64 characters, SHALL NOT be served.

#### Scenario: Two projects with the same skill name

- **WHEN** the repositories `casa` and `trabajo` both hold `skills/deploy/SKILL.md` and a user who can read both lists the skills
- **THEN** the list SHALL hold `casa-deploy` and `trabajo-deploy`, each with its own repository's text and `name` rewritten to its published name

#### Scenario: No credential

- **WHEN** a request without session or API key asks for `/.well-known/agent-skills/casa-deploy/SKILL.md`
- **THEN** the response SHALL be status 404

### Requirement: Skills discovery index

The web SHALL serve `/.well-known/agent-skills/index.json` as `application/json`, following the Agent Skills discovery draft v0.2.0: a top-level `$schema` of `https://schemas.agentskills.io/discovery/0.2.0/schema.json` and a `skills` array. It SHALL list every skill the caller can see: the platform skills first, ordered by name, then the content skills, by repository in the reader's navigation order and by name within one. Each entry SHALL have `name` (the published name), `type`, `description` (from the front matter), `url` and `digest`:

- a skill whose folder holds only its `SKILL.md` (every content skill, and a platform skill without other files) SHALL be `type` `"skill-md"`, its `url` the full address of its `SKILL.md` on the public origin and its `digest` `sha256:` followed by the lowercase hex SHA-256 of the exact bytes that `url` serves;
- a platform skill whose folder holds other files SHALL be `type` `"archive"`, its `url` the full address of its archive (`/.well-known/agent-skills/<name>.tar.gz`) and its `digest` `sha256:` followed by the lowercase hex SHA-256 of the archive's exact bytes.

It SHALL answer without a credential, listing then only the platform skills.

#### Scenario: Signed-in user

- **WHEN** a user who can read `casa` (holding `skills/deploy/SKILL.md`) requests the index with an API key
- **THEN** it SHALL list the platform skills ordered by name, then `casa-deploy`, each with its full `url` and a digest that matches the bytes served at that `url`

#### Scenario: Skill with references

- **WHEN** the index lists `colofon-diagrams`, whose folder holds `SKILL.md` and `references/`
- **THEN** its entry SHALL be `type: "archive"` with `url` ending in `/.well-known/agent-skills/colofon-diagrams.tar.gz`

#### Scenario: Anonymous agent

- **WHEN** a request without session or API key asks for the index
- **THEN** the response SHALL be status 200 and list only the platform skills

### Requirement: Skill file route

The web SHALL serve `/.well-known/agent-skills/<name>/SKILL.md` for every skill the index lists to that caller, as `text/markdown; charset=utf-8`, with the bytes a `skill-md` entry's digest is computed over. For a platform skill with other files, it SHALL also serve each of them at `/.well-known/agent-skills/<name>/<path>`, where `<path>` is the file's path inside the skill's folder, as `text/markdown; charset=utf-8` for a `.md` file and `text/plain; charset=utf-8` otherwise. A name that names no skill the caller can see, or a path that names no file of that skill (`..` segments included), SHALL answer 404 with a short plain-text explanation in Spanish. The index, the skill files and the archives SHALL be sent with `Access-Control-Allow-Origin: *` and SHALL NOT be stored by shared caches, since they depend on the credential.

#### Scenario: Unknown skill

- **WHEN** a signed-in user requests `/.well-known/agent-skills/no-existe/SKILL.md`
- **THEN** the response SHALL be status 404 with a `text/plain` body

#### Scenario: Reading one reference

- **WHEN** a request without credential asks for `/.well-known/agent-skills/colofon-diagrams/references/type-bar.md`
- **THEN** the response SHALL be status 200, `text/markdown; charset=utf-8`, with that file's text

#### Scenario: Path outside the skill

- **WHEN** a request asks for `/.well-known/agent-skills/colofon-diagrams/../colofon/SKILL.md` or a file the skill doesn't hold
- **THEN** the response SHALL be status 404

### Requirement: Skill archive route

The web SHALL serve `/.well-known/agent-skills/<name>.tar.gz` for every skill the index lists as `type: "archive"`, as `application/gzip`. The body SHALL be a gzip-compressed tar archive whose root holds the skill folder's contents (its `SKILL.md` at the root, no wrapper folder), with no absolute path and no `..` segment. The archive's bytes SHALL depend only on the skill's files: the same files SHALL give the same bytes, and hence the same digest, across requests and restarts. A name the index doesn't list as an archive to that caller SHALL answer 404 with a short plain-text explanation in Spanish.

#### Scenario: Downloading an archive

- **WHEN** an agent downloads `/.well-known/agent-skills/colofon-diagrams.tar.gz` and extracts it into an empty folder
- **THEN** the folder SHALL hold `SKILL.md` and `references/` exactly as in `doc-example/.agents/skills/colofon-diagrams/`, and the SHA-256 of the downloaded bytes SHALL match the index's digest

#### Scenario: Stable digest

- **WHEN** the backend restarts without any skill file changing
- **THEN** every archive's digest in the index SHALL be the same as before

#### Scenario: Single-file skill

- **WHEN** a request asks for `/.well-known/agent-skills/colofon.tar.gz` and `colofon` holds only its `SKILL.md`
- **THEN** the response SHALL be status 404

### Requirement: Setup prompt

The profile page (`/me`), in its "Skills para tu IA" section, SHALL show one text for the user to paste into their AI, with a copy control. Once followed, the AI SHALL have installed every skill the user can see, with no further step by the user. The text SHALL be in Spanish and SHALL:

- ask the AI to configure itself for the documentation at the site's public origin;
- give the API key placeholder, to replace with one of the user's keys, saying that without a key only the platform's skills are installed;
- point at the setup procedure in the full address of `/llms.txt`, which the AI SHALL follow.

The same text, carrying the key, SHALL be offered when a key is created (`api-key-management`).

#### Scenario: Copying the prompt

- **WHEN** a signed-in user on `https://doc.example.com/me` copies the "Skills para tu IA" text
- **THEN** the copied text SHALL name `https://doc.example.com/llms.txt` and the `x-api-key` header with the key placeholder, and ask the AI to follow the setup procedure there
