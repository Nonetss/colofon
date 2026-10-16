# Pages

The rules every page follows are in the guide itself: the header in
`docs/pages/header.mdx`, the body in `docs/pages/markdown.mdx`, the
components in `docs/pages/components.mdx`. This reference holds how **this
guide's** pages are written.

## The header

```mdx
---
titulo: The menu
descripcion: menu.yaml decides what the sidebar shows, grouped and ordered, wherever the pages are stored
files: [menu]
orden: 2
actualizado: 2026-10-15
---
```

- `titulo` and `descripcion` always. `descripcion` is one sentence that says
  what the reader learns, not "This page explains…".
- `orden` on every page that is not a section's `index.mdx`.
- `actualizado`: the date the page was last checked against the platform.
- This site's fields (declared in `doc.config.yaml`): `files` and
  `components`, the catalog entities the page explains, so each entity's page
  lists it; `open_questions`, what is still unknown.
- No `icono`: icons are given in `menu.yaml`.

## How a page of the guide reads

- **Lead with the thing itself:** a short example of the file or block, then
  what each part does. A reader should be able to copy the example and adapt
  it.
- **Tables for keys and options** (`| Key | What it is |`), with "Required."
  or "Optional." first.
- **Say what gets reported** when it is written wrong, and what still works
  then: writers mostly arrive here because something was reported.
- **Show it working** when this site can: a real `<Callout>`, a real
  `<Entities>` table, a real `<Diagram>`, after the code block that writes it.
- **Reference data comes from the catalog**, through `<Entities>`. A table of
  field kinds, header fields, files or components is never typed by hand.
- **Sections that end with a "Where do I find…?" table** send each question to
  the page that answers it; use it on section entry pages.
- Platform UI words stay as the platform shows them (Spanish): "Otros",
  "Catálogo", "Páginas que la citan", "Sincronizar".

## MDX without code

- **Forbidden:** `import`, `export` and expressions between braces.
- **Nothing bare that MDX could read as JSX or an expression:** a `<` or a `{`
  in prose starts a component or an expression. Put `<Diagram>`,
  `catalogo/<type>`, `{ ruta: … }` and the like inside backticks or code
  blocks, always.
- **Examples of pages, components and diagrams go in fenced blocks**
  (` ```mdx `, ` ```yaml `). Never use the language `diagram` for a fence: the
  platform reports it.
- **No emoji in `##` headings**: they break the heading anchors.

## Links

| To link to… | Write |
| --- | --- |
| Another page | Its relative path with `.mdx`: `[The menu](../repository/menu.mdx)` |
| An entity | `catalogo:<type>/<id>`: `[menu.yaml](catalogo:files/menu)` |
| A type's table | `catalogo:<type>`: `[Field kinds](catalogo:field-kinds)` |

## Before finishing

- Every page has `titulo` and `descripcion`, and its folder has an `index.mdx`.
- Every header field is declared, and every cited id exists in `catalogo/`.
- Every link points at a page or an entity that exists.
- The page is shown by `menu.yaml` (not in "Otros").
