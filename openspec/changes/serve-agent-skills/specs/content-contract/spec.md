## ADDED Requirements

### Requirement: Skills folder

A content repository MAY hold `skills/`, with one folder per skill holding its `SKILL.md`. The folder's name SHALL be the skill's name: 1 to 64 lowercase letters, digits and single hyphens, neither starting nor ending with a hyphen. `SKILL.md` SHALL start with YAML front matter holding `name`, equal to the folder's name, and `description`, a non-empty text of at most 1024 characters. A skill whose folder name, front matter or `SKILL.md` breaks these rules, or a file directly under `skills/`, SHALL be reported as a site problem with the file's path and a message in Spanish, and that skill SHALL be left out. The repository's other skills and the rest of its content SHALL still be read. Files other than `SKILL.md` inside a skill's folder SHALL be ignored.

#### Scenario: A valid skill

- **WHEN** a repository holds `skills/deploy/SKILL.md` with front matter `name: deploy` and a description
- **THEN** the skill `deploy` SHALL be read with that description and its text

#### Scenario: Name that doesn't match its folder

- **WHEN** `skills/deploy/SKILL.md` has `name: despliegue`
- **THEN** a site problem SHALL name `skills/deploy/SKILL.md` and say that `name` must be `deploy`, and the skill SHALL be left out

#### Scenario: Missing front matter

- **WHEN** `skills/red/SKILL.md` has no front matter
- **THEN** a site problem SHALL name that file, and the repository's other skills SHALL still be read
