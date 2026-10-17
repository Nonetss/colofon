# Site configuration (`doc.config.yaml`)

The site's name, the contract version it follows and the extra fields its
page headers accept. The contract is the guide's `repository/config` page. It is a **declaration**: while it is
broken, the platform keeps its last valid version, and nothing that depends
on it (every page header) changes.

## Keys

| Key | What it is |
| --- | --- |
| `nombre` | Required. The site's name, as the reader shows it. |
| `descripcion` | Optional. One sentence on what the documentation is about. |
| `plataforma` | Required. The contract's major version, **quoted**: `"1"`. |
| `cabecera` | Optional. The extra fields the site's page headers accept. |

Any other key is reported. `plataforma` unquoted (`1`) is a number and fails:
"`plataforma` es la versión del contrato, entre comillas: "1"".

The file opens with a Spanish comment saying where the menu, pages, catalog
and diagrams are, and that keys are the contract while values, type ids and
field names are the site's own. Keep it.

## `cabecera`

Every page header already has `titulo`, `descripcion`, `icono`, `orden` and
`actualizado`; `cabecera` adds the site's own, each declared with a field kind
exactly like a catalog field (`catalog` skill,
`references/writing-a-type.md`). Read the site's `cabecera` before writing a
header: those are the only extra fields a page may carry. For example:

```yaml
cabecera:
  machines:
    tipo: lista
    de: { tipo: ref, a: machines }
    opcional: true
    descripcion: Máquinas que explica la página
  open_questions:
    tipo: lista
    de: { tipo: texto }
    opcional: true
    descripcion: Preguntas aún abiertas; una ronda de preguntas las responde (/doc:questions)
```

| Common shape | Kind | What for |
| --- | --- | --- |
| The entities a page explains (`machines`, `files`…) | `lista` of `ref` to the type | Links the header to them; each entity lists the page under "Páginas que la citan" |
| `open_questions` | `lista` of `texto` | What a page can't state yet; emptied by a question round (`/doc:questions` and `/doc:pending` read it) |

How pages fill them: `docs` skill, `references/header.md`.

## Rules for adding a header field

- **Declare before use**: a page using an undeclared field is reported.
- **`opcional: true`** unless every page must have it; a required field
  fails every page without it.
- **A `ref` (or a `lista` of `ref`) when it names catalog entities**: each id
  is checked, the header links them and each entity lists the page under
  "Páginas que la citan". That link is usually why a header field exists.
- **A `descripcion`** on every field: the editor shows it as help and agents
  read it.
- Field names: lowercase, digits and underscores, starting with a letter
  (`diagram_types`), in the language of the site's other names.
- `cabecera` **can't redeclare** the common fields: "`titulo` no se puede
  declarar: toda ficha lo tiene sin declararlo".
- A `ref` whose `a` names no type is reported: "…: `a: x` no es ningún tipo de
  catalog/ (hay: …)".
- Changing or removing a field: update every page that uses it in the same
  change (`grep -rn "^<field>:" docs`).
