# Site configuration (`doc.config.yaml`)

The site's name, the contract version it follows and the extra fields its
page headers accept. The contract is `docs/repository/config.mdx`; the file
is the `files/doc-config` entity. It is a **declaration**: while it is
broken, the platform keeps its last valid version, and nothing that depends
on it (every page header) changes.

## Keys

| Key | What it is | In this site |
| --- | --- | --- |
| `nombre` | Required. The site's name, as the reader shows it. | `Escribir documentación` |
| `descripcion` | Optional. One sentence on what the documentation is about. | "Cómo escribir un repositorio de contenido que publique la plataforma doc, …" |
| `plataforma` | Required. The contract's major version, **quoted**: `"1"`. | `"1"` |
| `cabecera` | Optional. The extra fields this site's page headers accept. | Four fields, below |

Any other key is reported. `plataforma` unquoted (`1`) is a number and fails:
"`plataforma` es la versión del contrato, entre comillas: "1"".

The file opens with a Spanish comment saying where the menu, pages, catalog
and diagrams are, and that keys are the contract while values, type ids and
field names are the site's own. Keep it.

## `cabecera`

Every page header already has `titulo`, `descripcion`, `icono`, `orden` and
`actualizado`; `cabecera` adds the site's own, each declared with a field kind
exactly like a catalog field (`catalog` skill,
`references/writing-a-type.md`).

```yaml
cabecera:
  files:
    tipo: lista
    de: { tipo: ref, a: files }
    opcional: true
    descripcion: Ficheros de un repositorio de contenido que explica la página
  components:
    tipo: lista
    de: { tipo: ref, a: components }
    opcional: true
    descripcion: Componentes de página que explica la página
  diagram_types:
    tipo: lista
    de: { tipo: ref, a: diagram-types }
    opcional: true
    descripcion: Tipos de diagrama que explica la página
  open_questions:
    tipo: lista
    de: { tipo: texto }
    opcional: true
    descripcion: Preguntas aún abiertas; una ronda de preguntas las responde (/doc:questions)
```

| Field | Kind | Used by |
| --- | --- | --- |
| `files` | `lista` of `ref` to `files` | Most pages: the files they explain |
| `components` | `lista` of `ref` to `components` | `docs/pages/components.mdx`, `docs/diagrams/index.mdx` |
| `diagram_types` | `lista` of `ref` to `diagram-types` | The family pages of `docs/diagrams/` |
| `open_questions` | `lista` of `texto` | Pages with something unknown; emptied by a question round |

How pages fill them: `docs` skill, `references/header.md`.

## Rules for adding a header field

- **Declare before use**: a page using an undeclared field is reported.
- **`opcional: true`** unless every page must have it; a required field
  fails every page without it.
- **A `ref` (or a `lista` of `ref`) when it names catalog entities**: each id
  is checked, the header links them and each entity lists the page under
  "Páginas que la citan". That link is the reason this site's fields exist.
- **A `descripcion`** on every field: the editor shows it as help and agents
  read it.
- Field names: lowercase, digits and underscores, starting with a letter
  (`diagram_types`), English like the rest of this site's names.
- `cabecera` **can't redeclare** the common fields: "`titulo` no se puede
  declarar: toda ficha lo tiene sin declararlo".
- A `ref` whose `a` names no type is reported: "…: `a: x` no es ningún tipo de
  catalog/ (hay: …)".
- Changing or removing a field: update every page that uses it in the same
  change (`grep -rn "^<field>:" docs`).
