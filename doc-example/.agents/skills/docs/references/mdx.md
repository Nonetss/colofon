# MDX without code

The platform parses each page as MDX (GitHub Markdown plus MDX syntax) but
**never runs it**: ESM, expressions and JSX are only recognised so they can be
reported with their line. The contract is `docs/pages/markdown.mdx` ("Qué
acepta", "Qué rechaza").

## What a page may hold

- **GitHub Markdown:** tables, task lists, strikethrough, autolinks,
  footnotes.
- **Headings from `##`.** `##` and `###` build the "En esta página" index;
  `##` to `####` get anchors.
- **Code blocks**, which keep their language and get a copy button.
- **Alerts:** a quote starting with `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`,
  `[!WARNING]` or `[!CAUTION]`.
- **Comments:** `{/* … */}` is dropped without a problem.
- **The three components**, each in a block of its own (`components.md`).

## What MDX reads as code

MDX treats `<` followed by a letter as the start of JSX, and `{` as the start
of an expression, **anywhere in prose**, including inside a table cell or a
list item. This guide talks about `<Diagram>`, `catalogo/<type>` and
`{ ruta: … }` constantly, so:

| Written in prose | What happens | Write instead |
| --- | --- | --- |
| `Usa <Diagram> para…` (bare) | Read as a component inside a paragraph: reported, or the parse fails | `` Usa `<Diagram>` para… `` |
| `catalogo/<type>/` (bare) | `<type>` read as an unknown component | `` `catalogo/<type>/` `` |
| `{ ruta: catalogo }` (bare) | Read as an expression: reported and dropped | `` `{ ruta: catalogo }` `` |
| `a < b` | Usually fine (space after `<`), but don't rely on it | `` `a < b` `` or "menor que" |

**Rule:** anything with `<` or `{` goes inside backticks or a code block,
always. Inside backticks and fences MDX reads nothing.

## Fences

- Examples of pages, components and files go in fenced blocks with their
  language: ` ```mdx `, ` ```yaml `, ` ```json `.
- **Never the language `diagram`:** the platform reports it ("Los diagramas
  van en diagramas/<id>.json y se muestran con `<Diagram id="…" />`") and
  shows a notice instead. A diagram is a file in `diagramas/`.
- To show a component *and* have it render, write it once fenced and once
  unfenced below.
- To show a fence inside a fence, use a longer outer fence (four backticks).

## Headings

- **No `#` in the body:** the title is `titulo`. Reported: "Un título de nivel
  1 (#) no va en el cuerpo: el título de la ficha es su `titulo`".
- **No emoji in `##` headings:** the anchor is built from the text by GitHub's
  slug rules, which drop the emoji and leave a stray hyphen, so links to it
  break.
- Short noun phrases ("Las claves", "Qué se reporta"); a heading is a link
  target, so renaming one breaks `#anchor` links to it.

## What the platform reports

| Written | Message (as shown) | What still renders |
| --- | --- | --- |
| `import …` / `export …` | "Las fichas no admiten `import`: solo Markdown y los componentes de la plataforma" | The rest of the page |
| An expression `{…}` | "Las fichas no admiten expresiones entre llaves {…}; para un comentario, {/* … */}" | The text around it |
| An unknown component | "El componente <X> no existe en la plataforma" | A notice naming it |
| A platform component inside a paragraph | "El componente <X> va en su propio bloque, con una línea en blanco antes y después" | — |
| A JSX fragment `<>…</>` | "Las fichas no admiten fragmentos JSX (<>…</>)" | — |
| A ```` ```diagram ```` fence | The diagram-file message above | A notice |
| A page that can't be parsed | "La ficha no se puede leer: …", with the parser's line | Only its header |

Every problem names the file and the line. Admins see them above the page;
other readers only see the page.

## Before finishing

Search the page for a bare `<` or `{` outside backticks and fences; there
must be none except the components themselves.
