# content-pages Specification

## Purpose
Defines how a page of a content repository (`docs/**/*.mdx`) is read without executing anything: its header, the MDX it may use, the render tree the platform builds from it, how links and images resolve, how pages form the navigation, and how problems in a page are reported.

## Requirements

### Requirement: Page header

A page SHALL start with a YAML front matter block holding its header. `titulo` and `descripcion` SHALL be required text; `icono` (a Lucide icon name in kebab-case), `orden` (a number) and `actualizado` (a `YYYY-MM-DD` date) SHALL be optional; and the fields the site declares in `cabecera` of `doc.config.yaml` SHALL be accepted and validated with their field kinds, including `ref` and `ficha` values against the catalog and the pages. Any other header key SHALL be reported. A page whose header is missing or invalid SHALL still be listed and rendered, with its file name as title, and its problems reported.

#### Scenario: Valid header

- **WHEN** `docs/red/dns.mdx` starts with `titulo: DNS`, `descripcion: Resolución de nombres`, `orden: 2`
- **THEN** the page SHALL have the title "DNS", that description and order 2, and no problem

#### Scenario: Site header field

- **WHEN** `doc.config.yaml` declares `cabecera: { maquinas: { tipo: lista, de: { tipo: ref, a: maquinas } } }` and a page says `maquinas: [nas, router]` while the catalog has no `router` machine
- **THEN** the page SHALL be reported with a problem on `maquinas` naming the missing id, and SHALL still render

#### Scenario: Missing title

- **WHEN** `docs/notas.mdx` has no front matter
- **THEN** the page SHALL be listed and rendered with the title "notas", and problems SHALL say that `titulo` and `descripcion` are required

### Requirement: Accepted MDX

A page body SHALL be read as MDX with GitHub-flavoured Markdown (tables, task lists, strikethrough, autolinks and footnotes) and SHALL NOT be executed. `import` and `export` statements and `{…}` expressions SHALL be refused, each reported with its line, and left out of the render tree; an expression that holds only a comment (`{/* … */}`) SHALL be dropped without a problem. Every JSX element SHALL be reported as a component the platform does not provide, with its name and line, and SHALL be rendered as a visible notice naming it in place of the element. A page that cannot be parsed SHALL be reported with the parser's line and message, and SHALL have no body.

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

#### Scenario: Syntax error

- **WHEN** a page holds an unclosed `<div`
- **THEN** the page SHALL be reported with the line and the parser's message and SHALL have no body

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

A relative link to another page (`.mdx`, with or without an anchor) SHALL be rewritten to that page's reader route in the same repository, keeping the anchor; a link to a page that does not exist SHALL be reported and rendered as plain text. A relative image under `docs/` with a `png`, `jpg`, `jpeg`, `gif`, `webp`, `avif` or `svg` extension SHALL be rewritten to the repository's file URL; a missing image, or a relative link or image to any other file or outside `docs/`, SHALL be reported. Absolute `http`/`https` links SHALL be kept.

#### Scenario: Link to another page

- **WHEN** `docs/red/index.mdx` of repository `casa` links `[DNS](dns.mdx#zonas)`
- **THEN** the link SHALL point to `/casa/red/dns#zonas`

#### Scenario: Broken link

- **WHEN** a page links `[viejo](antiguo.mdx)` and no such page exists
- **THEN** the page SHALL be reported naming `antiguo.mdx` and the text "viejo" SHALL render without a link

#### Scenario: Image in the repository

- **WHEN** `docs/red/dns.mdx` of repository `casa` shows `![esquema](img/zonas.svg)` and the file exists
- **THEN** the image SHALL load from the file URL of `casa` for `red/img/zonas.svg`

### Requirement: Navigation tree

A repository's pages SHALL form a tree: `docs/index.mdx` is the repository's home, each folder under `docs/` is a section titled and described by its `index.mdx` (by its folder name when it has none), and each other `.mdx` file is a page of its folder's section. Within a section, sections and pages SHALL be ordered by `orden` (pages without one last) and then by title in Spanish collation. The reading order SHALL visit each section's index before its pages and subsections, depth first, and give every page its previous and next page and its breadcrumbs (the sections above it).

#### Scenario: Order inside a section

- **WHEN** `docs/red/` holds `dns.mdx` (`orden: 2`), `vpn.mdx` (`orden: 1`) and `anexo.mdx` (no `orden`)
- **THEN** the section "red" SHALL list VPN, DNS and Anexo, in that order

#### Scenario: Folder without index

- **WHEN** `docs/varios/` holds pages but no `index.mdx`
- **THEN** it SHALL be a section titled "varios", and its route SHALL show the list of its pages

#### Scenario: Previous and next

- **WHEN** the section "red" lists VPN then DNS
- **THEN** VPN's next page SHALL be DNS and DNS's previous page SHALL be VPN

### Requirement: Page problems are reported per file

Every problem in a page SHALL be reported, not only the first, with the page's path relative to the content root, the line when there is one, and a message in Spanish. Problems in one page SHALL NOT stop the other pages from being listed or rendered, and SHALL be logged once per distinct set per repository and commit.

#### Scenario: Two problems in one page

- **WHEN** a page has no `descripcion` and links to a missing page
- **THEN** both problems SHALL be reported for that page, and every other page SHALL render normally
