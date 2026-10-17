# Writing a page

How a page reads, so a reader who lands on any of them finds the same things
in the same places. Before writing, read the section's `index.mdx` and a
neighbouring page: a new page reads like the ones next to it. Conventions
particular to this site (a shape its pages share, words it uses) are in the
«Este sitio» section of `AGENTS.md`.

## The shape

| Part | What it holds |
| --- | --- |
| Header | `titulo`, a `descripcion` that says what the reader learns or can do, the entities the page is about (`header.md`) |
| The answer | What the reader came for, first: the fact, the example to copy, the table, or the steps |
| The details | Why it is so, the options, the rules a table can't hold |
| Shown, not described | The `<Entities>` table, the `<Diagram>`, the screenshot, right where the text needs it |
| When it goes wrong | What fails, how it shows, what to do, and what still works meanwhile |
| Where next | On a section's `index.mdx`, a "¿Dónde encuentro…?" table |

Not every page has every part; none has them in another order.

## Lead with the answer

- **First the thing, then what each part does.** A reader should be able to
  stop after the first screen with what they came for.
- Examples use the **site's real domain**, not `foo`: real names, real
  paths, real commands (never real secrets).
- Comment a YAML or shell example inline when a line needs one word of
  explanation.

## Kinds of page

| Page | Leads with | Then |
| --- | --- | --- |
| A thing (a machine, a service, a file format) | What it is and what it is for, in one or two sentences, then its key facts | How it is set up, what depends on it, where its data lives |
| A procedure | The steps, numbered, each one action, with the exact command or screen | What to check after, and what to do when a step fails |
| A reference | The table (an `<Entities>` when it is catalog data) | The rules a table can't hold, as bullets |
| A section's `index.mdx` | What the topic covers, an overview diagram when it helps | The "¿Dónde encuentro…?" table |

- **A procedure is its own page** with numbered steps, so a person and an
  agent follow it the same way.
- **A table of options** that are not catalog data is a Markdown table; when
  it lists keys, say for each one whether it is required ("Obligatoria." /
  "Opcional.") and what happens with any other.
- **A table of repeated data** (every machine, every file, every service) is
  never typed by hand: it is `<Entities>` of a catalog type (`components.md`).

## Say what goes wrong

Readers often arrive because something failed. For every common way it goes
wrong, say:

- **what fails and how it shows** (the error as it is printed, the screen,
  the report: quote messages exactly);
- **what to do**;
- **what still works** meanwhile.

Use a `| Síntoma | Causa | Qué hacer |` (or `| Escrito | Qué ocurre |`) table
when there are several cases, bullets otherwise.

## "¿Dónde encuentro…?" tables

Section entry pages (and the home) end, or nearly end, with one:

```mdx
## ¿Dónde encuentro…?

| Quiero… | Página |
| --- | --- |
| Restaurar una VM desde una copia | [Restaurar](restore.mdx) |
```

One row per question a reader brings, phrased as they would ("Quiero…" or
"Pregunta"), each answered by a link. Add a row when a page is added.

## Words

- **Prose in Spanish**, direct, one idea per paragraph.
- **Platform UI words as the platform shows them**: "Otros", "Catálogo",
  "Páginas que la citan", "Sincronizar", "Revisar", "Ampliar",
  "Copiar en Markdown". The same for the UI words of the systems a page
  documents: as their screens show them.
- Contract names (`titulo`, `catalog:`, `_type.yaml`), ids, paths, commands
  and values are code: in backticks.
- Repeated facts with the same shape go to the catalog; the page cites them.
- **Never a secret**, not even in an example: say where it lives and which
  account to use.

## Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| Explaining before answering | The reader came for the answer; they scroll past the prose |
| A procedure as a paragraph | Steps get skipped; nobody can say which one failed |
| Describing something without how it fails | The page doesn't help the reader who was sent by a failure |
| Describing in prose what a table or diagram shows better | Harder to scan, and it drifts from the data |
| Restating another page's facts | Two copies drift; link the page instead |
| An unknown buried in the prose | A question round only finds it in `open_questions` (or a "_Pending…_" line) |
