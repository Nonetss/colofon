# agent-skills Specification

## Purpose

Serves Agent Skills that an agent can discover and install from the site's address: the platform's own skills, the same on every site, and the skills each content repository declares, over the Agent Skills discovery draft (`/.well-known/agent-skills/`).

## Requirements

### Requirement: Platform skills

The platform SHALL ship its own skills, each a `SKILL.md` in the Agent Skills format (YAML front matter with `name` and `description`, then the instructions), and SHALL serve them on every site to every caller, with or without a credential. It SHALL ship at least:

- `colofon`: how an agent works with the platform (the `llms.txt` indexes, the `llm.txt` routes, the MCP and its tools, the skills and the API key).
- `doc-writing`: how to write or change a content repository, with the contract's current names.

Platform skills SHALL say how to work and where to look on the site, not what the site holds, and SHALL NOT hold secrets.

#### Scenario: Without a credential

- **WHEN** a request without session or API key asks for `/.well-known/agent-skills/colofon/SKILL.md`
- **THEN** the response SHALL be status 200 with the `colofon` skill

### Requirement: Content skills

The skills of a content repository (its `skills/<name>/SKILL.md`, `content-contract`) SHALL be served as `<slug>-<name>`, where `<slug>` is the repository's slug. The served `SKILL.md` SHALL be the file with the value of its front matter's `name` replaced by `<slug>-<name>`, and every other byte unchanged. A content skill SHALL be served only to a caller with a credential whose user can read that repository in the reader, and SHALL follow the checkout the reader serves. A content skill whose published name equals a platform skill's name, or is longer than 64 characters, SHALL NOT be served.

#### Scenario: Two projects with the same skill name

- **WHEN** the repositories `casa` and `trabajo` both hold `skills/deploy/SKILL.md` and a user who can read both lists the skills
- **THEN** the list SHALL hold `casa-deploy` and `trabajo-deploy`, each with its own repository's text and `name` rewritten to its published name

#### Scenario: No credential

- **WHEN** a request without session or API key asks for `/.well-known/agent-skills/casa-deploy/SKILL.md`
- **THEN** the response SHALL be status 404

### Requirement: Skills discovery index

The web SHALL serve `/.well-known/agent-skills/index.json` as `application/json`, following the Agent Skills discovery draft v0.2.0: a top-level `$schema` of `https://schemas.agentskills.io/discovery/0.2.0/schema.json` and a `skills` array. It SHALL list every skill the caller can see: the platform skills first, ordered by name, then the content skills, by repository in the reader's navigation order and by name within one. Each entry SHALL have `name` (the published name), `type` `"skill-md"`, `description` (from the front matter), `url` (the full address of its `SKILL.md` on the public origin) and `digest` (`sha256:` followed by the lowercase hex SHA-256 of the exact bytes its `url` serves). It SHALL answer without a credential, listing then only the platform skills.

#### Scenario: Signed-in user

- **WHEN** a user who can read `casa` (holding `skills/deploy/SKILL.md`) requests the index with an API key
- **THEN** it SHALL list `colofon`, `doc-writing` and `casa-deploy`, in that order, each with its full `url` and a digest that matches the bytes served at that `url`

#### Scenario: Anonymous agent

- **WHEN** a request without session or API key asks for the index
- **THEN** the response SHALL be status 200 and list only the platform skills

### Requirement: Skill file route

The web SHALL serve `/.well-known/agent-skills/<name>/SKILL.md` for every skill the index lists to that caller, as `text/markdown; charset=utf-8`, with the bytes the index's digest is computed over. A name that names no skill the caller can see SHALL answer 404 with a short plain-text explanation in Spanish. The index and the skill files SHALL be sent with `Access-Control-Allow-Origin: *` and SHALL NOT be stored by shared caches, since they depend on the credential.

#### Scenario: Unknown skill

- **WHEN** a signed-in user requests `/.well-known/agent-skills/no-existe/SKILL.md`
- **THEN** the response SHALL be status 404 with a `text/plain` body
