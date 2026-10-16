# Writing a page of this guide

How a page of «Escribir documentación» reads. The pages under `docs/` follow
one shape so a writer who lands on any of them finds the same things in the
same places. Read `docs/repository/menu.mdx` or `docs/pages/components.mdx`
as the model.

## The shape

| Part | What it holds | Example in this guide |
| --- | --- | --- |
| Header | `titulo`, a `descripcion` that says what the reader learns, the entities it explains | `docs/repository/config.mdx` |
| The thing itself | A short, copyable example of the file or block, in a fence | The `menu.yaml` block of `docs/repository/menu.mdx` |
| Its parts | A keys table, then bullets for the rules a table can't hold | "Las claves" in `docs/repository/config.mdx` |
| Shown working | The real component or diagram after the block that writes it | The `<Callout>` in `docs/pages/components.mdx` |
| What gets reported | What happens when it is written wrong, and what still works | "Qué se reporta" in `docs/repository/menu.mdx` |
| Where next | On a section's `index.mdx`, a "¿Dónde encuentro…?" table | `docs/publishing/index.mdx` |

Not every page has every part; none has them in another order.

## Lead with the example

- **First the thing, then what each part does.** A reader should be able to
  copy the example and adapt it.
- Examples use a **realistic domain**, not `foo`: the guide's examples are a
  homelab (`machines`, `docker-01`, `network/dns`), so they read as a real
  site. Reuse it rather than inventing a second one.
- Comment a YAML example inline (`# una carpeta, con todas sus páginas`) when
  a line needs one word of explanation.

## Keys tables

```mdx
| Clave | Qué es |
| --- | --- |
| `nombre` | Obligatoria. El nombre del sitio, tal como lo muestra el lector. |
| `descripcion` | Opcional. Una frase sobre de qué trata la documentación. |
```

- Header `| Clave | Qué es |`; every key in backticks.
- The description starts with **"Obligatoria."** or **"Opcional."** (or
  "Obligatorias." / "Opcionales." for a group), then one or two sentences.
- After the table, a sentence for what happens with any other key ("Cualquier
  otra clave se reporta").
- A table of **reference data** (every file, field kind, header field,
  component, diagram type) is never a keys table typed by hand: it is
  `<Entities>` (`components.md`).

## Say what gets reported

Writers mostly arrive because something was reported. For every way to get it
wrong, say:

- **what is reported** (and where: on the page, on the repository's home for
  `menu.yaml` and diagrams, in the log);
- **what still works** ("el resto del menú se usa", "el resto de la tabla se
  renderiza igualmente");
- for a declaration (`doc.config.yaml`, `menu.yaml`, `_tipo.yaml`), that the
  platform keeps the last valid one.

Use a `| Escrito | Qué ocurre |` table when there are several cases
(`docs/pages/markdown.mdx`, "Qué rechaza"), bullets under "Qué se reporta"
otherwise. Quote the platform's messages as it shows them.

## Show it working

When this site can show the feature, show it **right after the fenced block
that writes it**, so the reader sees source and result together:

```mdx
<Entities type="field-kinds" group="family" columns="id,value,takes" />
```

followed by the same line unfenced. For a diagram, the `<Diagram>` of a real
file of `diagramas/`; for the catalog, a link to its generated page
(`[menu.yaml](catalogo:files/menu)`).

## "¿Dónde encuentro…?" tables

Section entry pages (and the home) end, or nearly end, with one:

```mdx
## ¿Dónde encuentro…?

| Quiero… | Página |
| --- | --- |
| Autocompletado y validación mientras escribo | [El editor](editor.mdx) |
```

One row per question a reader brings, phrased as they would ("Quiero…" or
"Pregunta"), each answered by a link. Add a row when a page is added.

## Words

- **Prose in Spanish**, direct, one idea per paragraph. The guide says "la
  plataforma", "una página", "el lector", "un administrador".
- **Platform UI words as the platform shows them**: "Otros", "Catálogo",
  "Referencia", "Páginas que la citan", "Sincronizar", "Revisar", "Ampliar",
  "Copiar en Markdown".
- Contract names (`titulo`, `catalogo:`, `_tipo.yaml`) and this site's ids are
  code: in backticks.
- A procedure is its own page with numbered steps, so a person and an agent
  follow it the same way.
- Repeated facts with the same shape go to the catalog; the page cites them.
- **Never a secret**, not even in an example: say where it lives and which
  account to use.

## Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| Explaining before showing | The reader came to copy; they scroll past the prose |
| A keys table without "Obligatoria." / "Opcional." | The one thing the reader must know is missing |
| Describing a feature without its failure | The page doesn't help the writer who was sent by a report |
| A feature described but not shown, when the site could show it | The guide stops being its own example |
| Restating another page's rules | Two copies drift; link the page instead |
| An unknown buried in the prose | A question round only finds it in `open_questions` (or a "_Pending…_" line) |
