# content-pages Specification

## Purpose
Defines how a page of a content repository (`docs/**/*.mdx`) is read without executing anything: its header, the MDX it may use, the render tree the platform builds from it, how links and images resolve, how pages form the navigation, and how problems in a page are reported.
## Requirements
### Requirement: Page header

A page SHALL start with a YAML front matter block holding its header. `titulo` and `descripcion` SHALL be required text; `icono` (a Lucide icon name, `content-contract` "Icon names"), `orden` (a number) and `actualizado` (a `YYYY-MM-DD` date) SHALL be optional; and the fields the site declares in `cabecera` of `doc.config.yaml` SHALL be accepted and validated with their field kinds, including `ref` and `ficha` values against the catalog and the pages. Any other header key SHALL be reported. A page whose header is missing or invalid SHALL still be listed and rendered, with its file name as title, and its problems reported. Where `menu.yaml` gives the page a title or an icon, that SHALL be shown instead of the header's (`content-menu`).

#### Scenario: Valid header

- **WHEN** `docs/red/dns.mdx` starts with `titulo: DNS`, `descripcion: Resolución de nombres`, `orden: 2`
- **THEN** the page SHALL have the title "DNS", that description and order 2, and no problem

#### Scenario: Site header field

- **WHEN** `doc.config.yaml` declares `cabecera: { maquinas: { tipo: lista, de: { tipo: ref, a: maquinas } } }` and a page says `maquinas: [nas, router]` while the catalog has no `router` machine
- **THEN** the page SHALL be reported with a problem on `maquinas` naming the missing id, and SHALL still render

#### Scenario: Missing title

- **WHEN** `docs/notas.mdx` has no front matter
- **THEN** the page SHALL be listed and rendered with the title "notas", and problems SHALL say that `titulo` and `descripcion` are required

#### Scenario: Unknown icon

- **WHEN** `docs/red/index.mdx` says `icono: netwrok`
- **THEN** the page SHALL be reported on `icono` as not being a Lucide icon name, and SHALL render without that icon

### Requirement: Last edit date

A page read from an `.mdx` file SHALL carry, as `editado`, the last commit date the source read for that file (`content-source` "Full history and last edit dates"), or nothing when none is recorded. `editado` SHALL NOT be a header key: a page header that says `editado` SHALL be reported like any other unknown key. `editado` SHALL be independent of `actualizado`: setting one SHALL NOT change the other. A folder page with no `index.mdx` SHALL have no `editado`.

#### Scenario: Page without `actualizado`

- **WHEN** `docs/red/dns.mdx` sets no `actualizado` and its last commit is of 2026-03-02
- **THEN** its header SHALL have no `actualizado` and `editado` 2026-03-02

#### Scenario: Page with both

- **WHEN** `docs/red/vpn.mdx` says `actualizado: 2026-01-10` and its last commit is of 2026-10-14
- **THEN** its header SHALL have `actualizado` 2026-01-10 and `editado` 2026-10-14

#### Scenario: Folder without index

- **WHEN** the folder `docs/red/` has pages but no `index.mdx`
- **THEN** its folder page SHALL have no `editado`

### Requirement: Accepted MDX

A page body SHALL be read as MDX with GitHub-flavoured Markdown (tables, task lists, strikethrough, autolinks and footnotes) and SHALL NOT be executed. `import` and `export` statements and `{…}` expressions SHALL be refused, each reported with its line, and left out of the render tree; an expression that holds only a comment (`{/* … */}`) SHALL be dropped without a problem. The platform provides three components, `<Callout>`, `<Entities>` (see "Entities component") and `<Diagram>` (`content-diagrams`). `<Callout>`, written as a block (on its own lines, or alone on one line), SHALL render as an alert holding its Markdown, of the kind its `type` names (`note` by default; `info` a note titled "Información", `tip`, `important`, `warning`, `caution`, and `danger` a caution titled "Peligro"), titled by its `title` when given and by its kind otherwise. An unknown `type`, an attribute other than `type` and `title`, or an attribute value in braces SHALL be reported with its line while the alert still renders, and a `<Callout>` inside a paragraph's text SHALL be reported as needing its own block and rendered as a notice. Every other JSX element SHALL be reported as a component the platform does not provide, with its name and line, and SHALL be rendered as a visible notice naming it in place of the element. A fenced code block whose language is `diagram` SHALL be reported with its line as a diagram that belongs in `diagrams/` and is shown with `<Diagram id="…" />`, and SHALL render as a notice saying so. A page that cannot be parsed SHALL be reported with the parser's line and message, and SHALL have no body.

#### Scenario: Import refused

- **WHEN** a page holds `import Foo from "./foo.js"`
- **THEN** the page SHALL be reported on that line as using `import`, which pages cannot use, and the rest of the page SHALL render

#### Scenario: Expression refused

- **WHEN** a paragraph holds `Hay {maquinas.length} máquinas`
- **THEN** the expression SHALL be reported and left out, and the text around it SHALL render

#### Scenario: Comment dropped

- **WHEN** a page holds `{/* revisar en enero */}`
- **THEN** nothing SHALL render for it and no problem SHALL be reported

#### Scenario: Unknown component

- **WHEN** a page holds `<Entidades tipo="servicios" />`
- **THEN** the page SHALL be reported on that line with "El componente <Entidades> no existe en la plataforma" and the page SHALL show a notice naming `Entidades` where it was

#### Scenario: Callout

- **WHEN** a page holds `<Callout type="info">` on its own line, a paragraph, and `</Callout>`
- **THEN** no problem SHALL be reported and the page SHALL show a note alert titled "Información" holding that paragraph, with its links pointing at the reader's routes

#### Scenario: Callout with an unknown type

- **WHEN** a page holds `<Callout type="rojo">` around a paragraph
- **THEN** the page SHALL be reported on that line with the accepted types, and the alert SHALL render as a note

#### Scenario: Inline diagram block

- **WHEN** a page holds a fenced block opened with ` ```diagram `
- **THEN** the page SHALL be reported on that line saying diagrams go in `diagrams/` and are shown with `<Diagram id="…" />`, and a notice SHALL render in place of the block

#### Scenario: Syntax error

- **WHEN** a page holds an unclosed `<div`
- **THEN** the page SHALL be reported with the line and the parser's message and SHALL have no body

### Requirement: Entities component

`<Entities type="…" />`, written as a block, SHALL render a table of the valid entities of the catalog type its `type` names, as part of the page's render tree. `columns` (field names separated by commas, `id` included) SHALL choose the columns in that order; without it the columns SHALL be the type's `vista.columnas`, and without those the type's `etiqueta` field (or `id` when the type has none) followed by every other declared field in declaration order. Each column's header SHALL be its field's `etiqueta`, or its field name when it has none (`id`, `fuente` and `actualizado` keep their name). Rows SHALL be ordered by the entity's label: its `etiqueta` value, or its id when the type has no `etiqueta` or the entity leaves it out. The label column (the `etiqueta` field, or `id`) SHALL show the label, linked to the entity's page — the value of the first `ficha` field its type declares — or, when the entity has none, to its generated catalog page (`content-catalog-pages`).

Other cells SHALL show their value by field kind: `texto`, `numero`, `entero`, `fecha`, `ip` and `enum` as written; `booleano` as "Sí" or "No"; `ref` as the referenced entity's label, linked to its page, or to its generated catalog page when it has none; `ficha` as a link to that page titled with the page's title; `url` and `email` as links out; `lista` as its values shown by their kind and joined by commas; `objeto` as its `name: value` pairs joined by semicolons. An absent optional value SHALL leave the cell empty.

`group` SHALL split the table into one block per value of the field it names, each preceded by that value shown by its kind, in the order of the field's `valores` for an `enum` and by shown value otherwise, with a last block for the entities that leave the field out; the group field's own column SHALL be left out of every block. A type with no valid entities SHALL render a line saying so.

An attribute other than `type`, `columns` and `group`, an attribute value in braces, a column or `group` naming a field the type does not declare, and an entity file that fails its type's schema SHALL each be reported with the component's line (the entity file's problem naming the file); the unknown column or group SHALL be left out and the invalid entity left out of the table, while the rest renders. A missing or unknown `type` SHALL be reported naming the catalog's types and SHALL render a notice in place of the table. An `<Entities>` inside a paragraph's text SHALL be reported as needing its own block and rendered as a notice.

#### Scenario: Grouped table with chosen columns

- **WHEN** the catalog type `services` declares `category` as an `enum` with `valores: [network, containers, backups]` and a page holds `<Entities type="services" group="category" columns="name,status,summary" />`
- **THEN** the page SHALL show a "network" block, then "containers", then "backups", each a table with the columns `name`, `status` and `summary` holding the services of that category ordered by name, and no problem SHALL be reported

#### Scenario: Columns from the type's view

- **WHEN** the type `machines` declares `etiqueta: name`, `vista: { columnas: [name, ip, kind, location, purpose] }` and `location` as a `ref` to `locations`, and a page holds `<Entities type="machines" />`
- **THEN** the table SHALL have those five columns, the machine `docker-01` without a `name` SHALL show `docker-01` in the `name` column, and its `location` SHALL show the label of the referenced location

#### Scenario: Entity linked to its page

- **WHEN** the service `komodo` has `page: containers/komodo` in repository `casa`, and the service `adguard` has no `page`
- **THEN** "Komodo" SHALL link to `/casa/containers/komodo` and "AdGuard" SHALL link to `/casa/catalog/services/adguard`

#### Scenario: Unknown column

- **WHEN** a page holds `<Entities type="services" columns="name,owner" />` and `services` declares no `owner`
- **THEN** the page SHALL be reported on that line naming `owner`, and the table SHALL render with the `name` column only

#### Scenario: Unknown type

- **WHEN** a page holds `<Entities type="servers" />` and the catalog has no `servers` type
- **THEN** the page SHALL be reported naming `servers` and the catalog's types, and a notice SHALL render where the table would be

#### Scenario: Invalid entity

- **WHEN** `catalog/machines/nas.yaml` lacks the required field `ip` and a page holds `<Entities type="machines" />`
- **THEN** the page SHALL be reported naming `catalog/machines/nas.yaml` and the missing field, and the table SHALL hold every other machine

#### Scenario: Labelled column

- **WHEN** the type `field-kinds` declares `family: { tipo: enum, valores: [scalar], etiqueta: Familia }` and `example: { tipo: texto }`, and a page holds `<Entities type="field-kinds" columns="id,family,example" />`
- **THEN** the table's headers SHALL be `id`, "Familia" and `example`

### Requirement: Render tree

The platform SHALL turn each page body into an HTML tree that holds only elements, attributes and URLs from a fixed allow-list: no raw HTML from the content, no script, style or event-handler attributes, and only `http:`, `https:`, `mailto:`, relative and `#` URLs. Headings of levels 2 to 4 SHALL carry an id made from their text (lowercase, accents kept, spaces as hyphens, a numeric suffix for repeats), and the page's level 2 and 3 headings SHALL be listed with their ids and text in order. A level 1 heading in the body SHALL be reported, since the title comes from the header. Fenced code blocks SHALL keep their language. A blockquote whose first line is `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]` or `[!CAUTION]` SHALL become an alert of that kind titled "Nota", "Consejo", "Importante", "Aviso" or "Precaución".

#### Scenario: Script link removed

- **WHEN** a page links `[pulsa](javascript:alert(1))`
- **THEN** the rendered link SHALL have no `href`

#### Scenario: Repeated headings

- **WHEN** a page has two `## Configuración` headings
- **THEN** their ids SHALL be `configuración` and `configuración-1`

#### Scenario: Alert

- **WHEN** a page holds `> [!WARNING]` followed by `> No reiniciar en horario laboral`
- **THEN** it SHALL render as a warning alert titled "Aviso" holding that text

### Requirement: Links and images

A relative link to another page (`.mdx`, with or without an anchor) SHALL be rewritten to that page's reader route in the same repository, keeping the anchor; a link to a page that does not exist SHALL be reported and rendered as plain text. A `catalog:<type>/<id>` link SHALL point to the reader route of that entity's page (the value of the first `ficha` field its type declares) and, when the entity has no page, to its generated catalog page; a `catalog:<type>` link SHALL point to the type's generated page; a link to a type or entity that does not exist SHALL be reported and rendered as plain text. A relative image under `docs/` with a `png`, `jpg`, `jpeg`, `gif`, `webp`, `avif` or `svg` extension SHALL be rewritten to the repository's file URL; a missing image, or a relative link or image to any other file or outside `docs/`, SHALL be reported. Absolute `http`/`https` links SHALL be kept.

#### Scenario: Link to another page

- **WHEN** `docs/red/index.mdx` of repository `casa` links `[DNS](dns.mdx#zonas)`
- **THEN** the link SHALL point to `/casa/red/dns#zonas`

#### Scenario: Broken link

- **WHEN** a page links `[viejo](antiguo.mdx)` and no such page exists
- **THEN** the page SHALL be reported naming `antiguo.mdx` and the text "viejo" SHALL render without a link

#### Scenario: Link to an entity

- **WHEN** a page of repository `casa` links `[Komodo](catalog:services/komodo)` and `komodo` has `page: containers/komodo`, and links `[docker-01](catalog:machines/docker-01)` and `docker-01` has no page
- **THEN** "Komodo" SHALL link to `/casa/containers/komodo`, "docker-01" SHALL link to `/casa/catalog/machines/docker-01`, and no problem SHALL be reported

#### Scenario: Link to a type

- **WHEN** a page of repository `casa` links `[Stacks](catalog:stacks)`
- **THEN** "Stacks" SHALL link to `/casa/catalog/stacks`

#### Scenario: Link to a missing entity

- **WHEN** a page links `[viejo](catalog:machines/old-01)` and `machines` has no `old-01`
- **THEN** the page SHALL be reported naming `catalog:machines/old-01` and "viejo" SHALL render without a link

#### Scenario: Image in the repository

- **WHEN** `docs/red/dns.mdx` of repository `casa` shows `![esquema](img/zonas.svg)` and the file exists
- **THEN** the image SHALL load from the file URL of `casa` for `red/img/zonas.svg`

### Requirement: Navigation tree

A repository's pages SHALL form a tree: `docs/index.mdx` is the repository's home, each folder under `docs/` that holds at least one page besides its `index.mdx` (directly or in a subfolder) is a section titled and described by its `index.mdx` (by its folder name when it has none), and each other `.mdx` file is a page of its folder's section. A folder whose only page is its `index.mdx` SHALL be a page, not a section: it SHALL have no children, and its route SHALL show its `index.mdx`. Within a section, sections and pages SHALL be ordered by `orden` (pages without one last) and then by title in Spanish collation. The reading order SHALL visit each section's index before its pages and subsections, depth first, and give every page its previous and next page and its breadcrumbs (the sections above it). When the repository has a valid `menu.yaml`, the top of the navigation, the reading order and the breadcrumbs SHALL follow it instead (`content-menu`), and each folder it shows SHALL keep the order described here inside it.

#### Scenario: Order inside a section

- **WHEN** `docs/red/` holds `dns.mdx` (`orden: 2`), `vpn.mdx` (`orden: 1`) and `anexo.mdx` (no `orden`)
- **THEN** the section "red" SHALL list VPN, DNS and Anexo, in that order

#### Scenario: Folder without index

- **WHEN** `docs/varios/` holds pages but no `index.mdx`
- **THEN** it SHALL be a section titled "varios", and its route SHALL show the list of its pages

#### Scenario: Folder with only an index

- **WHEN** `docs/diagrams/` holds only `index.mdx`, titled "Diagramas"
- **THEN** "Diagramas" SHALL be a page with no children at the route `diagrams`, ordered among its siblings by its `orden` and title

#### Scenario: Previous and next

- **WHEN** the section "red" lists VPN then DNS
- **THEN** VPN's next page SHALL be DNS and DNS's previous page SHALL be VPN

#### Scenario: Order kept inside a menu entry

- **WHEN** `menu.yaml` lists the folder `red` and `docs/red/` holds `dns.mdx` (`orden: 2`) and `vpn.mdx` (`orden: 1`)
- **THEN** the section "red" SHALL list VPN then DNS inside its group

### Requirement: Page problems are reported per file

Every problem in a page SHALL be reported, not only the first, with the page's path relative to the content root, the line when there is one, and a message in Spanish. Problems in one page SHALL NOT stop the other pages from being listed or rendered, and SHALL be logged once per distinct set per repository and commit.

#### Scenario: Two problems in one page

- **WHEN** a page has no `descripcion` and links to a missing page
- **THEN** both problems SHALL be reported for that page, and every other page SHALL render normally

