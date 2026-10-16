## MODIFIED Requirements

### Requirement: Page view

A page SHALL show a header with its breadcrumbs (the repository, and the groups and sections above it, each section as a link and each group as text), its icon, title and description, its date (its `actualizado` as "Datos del …", marked for review as "Revisar · datos del …" when older than six months; when it sets none, its `editado` from `content-pages` "Last edit date" as "Editado el …", muted and never marked for review; no date when it has neither) and, when present, the site's header fields as a list of values, each named by the field's `etiqueta` (its field name when it has none), a `ficha` value linking to that page and a `ref` value linking to the entity's catalog page, titled with its label; then its body with the documentation prose styles; then links to the previous and next pages. Code blocks SHALL show their language and a "Copiar" control that copies the code. External links SHALL open in a new tab. Tables SHALL fit the reading column, their cells wrapping their text (a word longer than its column breaks), and SHALL scroll horizontally inside their frame, without widening the page, only when their columns cannot fit even wrapped. Headings SHALL show an anchor link on hover. A section page SHALL list its pages and subsections, with their titles and descriptions, after its body.

#### Scenario: Copying a code block

- **WHEN** the user presses "Copiar" on a code block
- **THEN** the block's code SHALL be copied to the clipboard and the control SHALL say "Copiado" for a moment

#### Scenario: Stale page

- **WHEN** a page says `actualizado: 2026-01-10` and today is 2026-10-15
- **THEN** its header SHALL mark the date for review

#### Scenario: Page dated only by git

- **WHEN** a page sets no `actualizado`, its `editado` is 2025-11-03 and today is 2026-10-15
- **THEN** its header SHALL show "Editado el" with that date, without marking it for review

#### Scenario: `actualizado` takes precedence

- **WHEN** a page says `actualizado: 2026-09-01` and its `editado` is 2026-10-14
- **THEN** its header SHALL show "Datos del" with 2026-09-01 and not the `editado` date

#### Scenario: Previous and next

- **WHEN** the user reaches the end of the page DNS, whose previous page is VPN
- **THEN** a link to VPN SHALL be offered as the previous page

#### Scenario: Breadcrumbs with a group

- **WHEN** the group "Críticas" of `casa` lists `containers/komodo` and the user opens `/casa/containers/komodo/new-stack`
- **THEN** the breadcrumbs SHALL be the repository, "Críticas" as text and "Komodo" as a link

#### Scenario: Long text in a table

- **WHEN** a table's last column holds sentences longer than the space left in the reading column
- **THEN** those cells SHALL wrap onto several lines and the table SHALL not scroll sideways

#### Scenario: Labelled header field

- **WHEN** `doc.config.yaml` declares the header field `files` with `etiqueta: Ficheros` and a page says `files: [diagram-file]`
- **THEN** its header SHALL list "Ficheros" with a link titled with the entity `diagram-file`'s label
