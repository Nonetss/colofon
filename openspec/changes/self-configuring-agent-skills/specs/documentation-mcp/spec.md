## MODIFIED Requirements

### Requirement: Skills tool

The `skills` tool SHALL take no arguments and return every skill the caller can see, as the skills discovery index lists them (`agent-skills`), in the same order. The text SHALL give one line per skill with its name, its repository's display title for a content skill (or that it is the platform's), its description and the full address of its `SKILL.md`, and, for a skill with other files, the paths of those files. It SHALL end saying that `skill` returns a skill's `SKILL.md` or one of its files. The result SHALL also carry the list as structured content, each with its name, repository slug (null for a platform skill), description, URL of its `SKILL.md` and the paths of its other files (empty for a single-file skill).

#### Scenario: Platform and content skills

- **WHEN** the caller can read `casa`, which serves `casa-deploy`, and calls `skills`
- **THEN** the text SHALL list `colofon` and the `colofon-*` writing skills as the platform's and `casa-deploy` as Casa's, each with its address, and SHALL NOT list `doc-writing`

#### Scenario: Skill with files

- **WHEN** the agent calls `skills`
- **THEN** the entry of `colofon-diagrams` SHALL list its files, such as `references/type-bar.md`, and the entry of `colofon` SHALL list none

### Requirement: Skill tool

The `skill` tool SHALL take a skill's published name and, optionally, the path of one of its files. Without a path it SHALL return that skill's `SKILL.md` text; with one, that file's text. Either SHALL be identical to what its route serves the caller (`/.well-known/agent-skills/<name>/SKILL.md` or `/.well-known/agent-skills/<name>/<path>`). A name that names no skill the caller can see SHALL return a tool error result that says to call `skills` to list them. A path that names no file of that skill SHALL return a tool error result listing the skill's files.

#### Scenario: Reading a skill

- **WHEN** the agent calls `skill` with `name: "colofon"`
- **THEN** the text SHALL be identical to `/.well-known/agent-skills/colofon/SKILL.md`

#### Scenario: Reading a reference

- **WHEN** the agent calls `skill` with `name: "colofon-diagrams"` and `path: "references/type-bar.md"`
- **THEN** the text SHALL be identical to `/.well-known/agent-skills/colofon-diagrams/references/type-bar.md`

#### Scenario: Unknown skill

- **WHEN** the agent calls `skill` with `name: "no-existe"`
- **THEN** the result SHALL be marked as an error, saying to call `skills`

#### Scenario: Unknown file

- **WHEN** the agent calls `skill` with `name: "colofon-diagrams"` and `path: "references/no-existe.md"`
- **THEN** the result SHALL be marked as an error, listing the files of `colofon-diagrams`
