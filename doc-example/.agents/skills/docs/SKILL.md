---
name: docs
description: The docs/ folder of this content repository, the pages of the "Escribir documentación" guide in MDX. A decision guide for writing a page of this guide well - where it goes and what it is called, its header and this site's header fields (files, components, diagram_types, open_questions), how a page of the guide reads (example first, keys tables, what gets reported, shown working), MDX without code, the platform's three components (Callout, Entities, Diagram) and links to pages, entities, catalog tables and images. Use before writing, changing, moving or renaming any page under docs/, and when the platform reports a problem on one.
---

# Pages (`docs/`)

Every `docs/**/*.mdx` file is a page of the guide «Escribir documentación».
Its path is its URL, every folder is a section with an `index.mdx`, and the
platform reads it **without running anything**: Markdown plus three
components, nothing else. The rules every page of every site follows are in
the guide itself (`docs/pages/header.mdx`, `docs/pages/markdown.mdx`,
`docs/pages/components.mdx`); this skill is how **this guide's** pages are
written. The repository as a whole (the menu, the contract's names,
validation) is in the `documentation` skill.

## 1. Philosophy

**A page of this guide is a working example of itself.**

- The reader came to copy something: give them the file or block first, then
  what each part does.
- They often came because something was **reported**: say what gets reported
  and what still works then.
- **Show it working** when this site can: the real `<Callout>`, the real
  `<Entities>` table, the real `<Diagram>` right after the block that writes
  it.
- **Data lives in the catalog, explanations on pages.** A page never retypes
  what `catalog/` holds; it lists it with `<Entities>` or links it.
- One idea per paragraph, straight to the point: it is read by someone who
  wasn't there, and by agents through its `llm.txt`.

## 2. Where to look

| Task | Read |
| --- | --- |
| Where a page goes, its file name, sections, moving or renaming one | [sections-and-naming.md](references/sections-and-naming.md) |
| The front matter: common fields and this site's `files`, `components`, `diagram_types`, `open_questions` | [header.md](references/header.md) |
| How a page of this guide is built: example first, keys tables, "Qué se reporta", "¿Dónde encuentro…?", UI words | [writing-a-page.md](references/writing-a-page.md) |
| What MDX reads as code, backticks, fences, headings, what the platform reports | [mdx.md](references/mdx.md) |
| `<Callout>`, `<Entities>` and `<Diagram>`, with their attributes | [components.md](references/components.md) |
| Links to pages, entities, catalog tables, images and other files | [links.md](references/links.md) |

A diagram itself is written in `diagrams/` (`diagrams` skill); a type or an
entity in `catalog/` (`catalog` skill).

## 3. Always true

- **Every folder under `docs/` is a section with its `index.mdx`**, at most
  `docs/<topic>/<page>.mdx` deep; files and folders lowercase, digits and
  hyphens.
- **`docs/catalog/` is reserved** by the platform: never create it.
- **Every page is shown by `menu.yaml`**, never in "Otros"
  (`documentation` skill, `references/menu.md`).
- **`titulo` and `descripcion` on every page**, `orden` on every page that is
  not a section's `index.mdx`, `actualizado` the date it was last checked
  against the platform, and **no `icono`**: icons go in `menu.yaml`.
- **Declare before use:** a header field exists only if `doc.config.yaml`
  declares it under `cabecera`.
- **No code:** no `import`, `export` or `{…}` expressions, and nothing bare in
  prose that MDX could read as JSX or an expression: `<…>` and `{…}` go inside
  backticks or code blocks.
- **Components in a block of their own**, attributes as quoted strings.
- **Reference data comes from the catalog** through `<Entities>`: a table of
  files, field kinds, header fields, components or diagram types is never
  typed by hand.
- **Prose in Spanish**; platform UI words as the platform shows them
  ("Otros", "Catálogo", "Páginas que la citan", "Sincronizar").
- **No secret anywhere**, not even in an example: write where it lives and
  which account to use.

## 4. Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| A page that opens with "Esta página explica…" | The `descripcion` and the title already say it; lead with the example |
| A hand-typed table of keys the catalog holds | It goes stale; `<Entities>` is rebuilt from the data on every read |
| `<Diagram>` or `catalog/<type>` bare in a sentence | MDX reads `<` and `{` as code: the page is reported or loses text |
| `# Título` in the body | The title is `titulo`; a level-1 heading is reported |
| An emoji in a `##` heading | The anchor no longer matches the heading text |
| `icono` in the header of a page the menu shows | The menu wins; a different value is reported and never shown |
| A ```` ```diagram ```` fence | Reported; diagrams are files in `diagrams/` |
| A new folder without a menu entry | Its pages land in "Otros" and are reported |
| Renaming a page without updating links, `page:` fields and the menu | Broken links show as plain text and are reported |
| Copying a procedure instead of linking its page | Two copies, one of them wrong after the next change |

## 5. Before finishing

- Every page has `titulo` and `descripcion`, and its folder has an
  `index.mdx`.
- Every header field is declared in `doc.config.yaml`, and every id it cites
  exists in `catalog/`.
- Every link, image and `<Diagram id>` points at something that exists.
- The page is shown by `menu.yaml` (not in "Otros"), and a title set in the
  menu equals its `titulo`.
- No `<`, `{`, `import` or `export` outside backticks and code blocks.
- No secret anywhere in the page, not even in an example.
