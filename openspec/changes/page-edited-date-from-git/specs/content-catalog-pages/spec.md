## ADDED Requirements

### Requirement: Entity page edit date

An entity's page SHALL carry, as `editado`, the last commit date the source read for its entity file (`catalogo/<type>/<id>.yaml`), independent of the entity's `actualizado`. The generated catalog index page and each type's page SHALL have no `editado`.

#### Scenario: Entity edited

- **WHEN** `catalogo/machines/docker-01.yaml` sets no `actualizado` and its last commit is of 2026-09-30
- **THEN** the page of `docker-01` SHALL have `editado` 2026-09-30 and no `actualizado`

#### Scenario: Type page

- **WHEN** the reader opens the generated page of the type `machines`
- **THEN** it SHALL have no `editado`, whatever the dates of its entity files
