---
name: colofon-docs
description: The docs/ folder of a doc platform content repository, its pages in MDX. A decision guide for writing a page well - where it goes and what it is called, its header and the header fields the site declares in doc.config.yaml, how a page reads (the reader's answer first, procedures as steps, data from the catalog, what fails and what still works), MDX without code, the platform's three components (Callout, Entities, Diagram) and links to pages, entities, catalog tables and images. Use before writing, changing, moving or renaming any page under docs/, and when the platform reports a problem on one.
---

# Pages (`docs/`)

Every `docs/**/*.mdx` file is a page of the site. Its path is its URL, every
folder is a section with an `index.mdx`, and the platform reads it **without
running anything**: Markdown plus three components, nothing else. The rules
every page of every site follows are in the guide «Escribir documentación»
(its `pages/header`, `pages/markdown` and `pages/components` pages); this
skill is how to write pages well. What is particular to this site (its
sections, its header fields, its own conventions) is read from
`doc.config.yaml`, `menu.yaml` and the «Este sitio» section of `AGENTS.md`.
The repository as a whole (the menu, the contract's names, validation) is in
the `colofon-documentation` skill.

## 1. Philosophy

**A page answers what its reader came for.**

- The reader came with a question or a task: give them the answer, the
  example or the steps first, then why and the details.
- They often came because something **failed**: say what goes wrong, how it
  shows and what still works then.
- **Show, don't describe**, when the platform can: the real `<Entities>`
  table, the real `<Diagram>`, a `<Callout>` for the one trap that matters.
- **Data lives in the catalog, explanations on pages.** A page never retypes
  what `catalog/` holds; it lists it with `<Entities>` or links it.
- One idea per paragraph, straight to the point: it is read by someone who
  wasn't there, and by agents through its `llm.txt`.

## 2. Where to look

| Task | Read |
| --- | --- |
| Where a page goes, its file name, sections, moving or renaming one | [sections-and-naming.md](references/sections-and-naming.md) |
| The front matter: the common fields and the ones the site declares under `cabecera` | [header.md](references/header.md) |
| How a page is built: the answer first, procedures, reference tables, what fails, "¿Dónde encuentro…?", UI words | [writing-a-page.md](references/writing-a-page.md) |
| What MDX reads as code, backticks, fences, headings, what the platform reports | [mdx.md](references/mdx.md) |
| `<Callout>`, `<Entities>` and `<Diagram>`, with their attributes | [components.md](references/components.md) |
| Links to pages, entities, catalog tables, images and other files | [links.md](references/links.md) |
| This site's sections, header fields and page conventions | `doc.config.yaml` (`cabecera`), `menu.yaml` and `AGENTS.md` «Este sitio» |

A diagram itself is written in `diagrams/` (`colofon-diagrams` skill); a type or an
entity in `catalog/` (`colofon-catalog` skill).

## 3. Always true

- **Every folder under `docs/` is a section with its `index.mdx`**; files and
  folders lowercase, digits and hyphens.
- **`docs/catalog/` is reserved** by the platform: never create it.
- **Every page is shown by `menu.yaml`**, never in "Otros"
  (`colofon-documentation` skill, `references/menu.md`).
- **`titulo` and `descripcion` on every page**, `orden` on every page that is
  not a section's `index.mdx`, `actualizado` the date it was last checked
  against what it describes, and **no `icono`**: icons go in `menu.yaml`.
- **Declare before use:** a header field exists only if `doc.config.yaml`
  declares it under `cabecera`.
- **No code:** no `import`, `export` or `{…}` expressions, and nothing bare in
  prose that MDX could read as JSX or an expression: `<…>` and `{…}` go inside
  backticks or code blocks.
- **Components in a block of their own**, attributes as quoted strings.
- **Reference data comes from the catalog** through `<Entities>`: a table of
  things a catalog type holds is never typed by hand.
- **Prose in Spanish**; platform UI words as the platform shows them
  ("Otros", "Catálogo", "Páginas que la citan", "Sincronizar").
- **Never invent a fact.** What you can't settle from a source goes to the
  site's open questions (`references/header.md`), or is asked.
- **No secret anywhere**, not even in an example: write where it lives and
  which account to use.

## 4. Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| A page that opens with "Esta página explica…" | The `descripcion` and the title already say it; lead with the answer |
| A hand-typed table of what the catalog holds | It goes stale; `<Entities>` is rebuilt from the data on every read |
| `<Diagram>` or `catalog/<type>` bare in a sentence | MDX reads `<` and `{` as code: the page is reported or loses text |
| `# Título` in the body | The title is `titulo`; a level-1 heading is reported |
| An emoji in a `##` heading | The anchor no longer matches the heading text |
| `icono` in the header of a page the menu shows | The menu wins; a different value is reported and never shown |
| A ```` ```diagram ```` fence | Reported; diagrams are files in `diagrams/` |
| A new folder without a menu entry | Its pages land in "Otros" and are reported |
| Renaming a page without updating links, `ficha` fields and the menu | Broken links show as plain text and are reported |
| Copying a procedure instead of linking its page | Two copies, one of them wrong after the next change |
| A guess written as fact | The next reader trusts it; mark it as an open question instead |

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
