## MODIFIED Requirements

### Requirement: Icon names

Every `icono` the contract accepts (in `_tipo.yaml`, `menu.yaml` and page headers; diagram boxes take no icon) SHALL be the name of an icon of the Lucide version the web draws, in lowercase kebab-case as Lucide names it (`server`, `map-pin`). The platform SHALL hold that list of names, matching the Lucide version the web uses, and SHALL report any other value as not being a Lucide icon name.

#### Scenario: Valid icon

- **WHEN** a `_tipo.yaml` sets `icono: map-pin`
- **THEN** the declaration SHALL be valid

#### Scenario: A name Lucide does not have

- **WHEN** a `_tipo.yaml` sets `icono: cohete`
- **THEN** the platform SHALL report on `icono` that it is not a Lucide icon name
