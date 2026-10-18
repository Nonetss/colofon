# Site configuration (`doc.config.yaml`)

The site's name, the contract version it follows and the extra fields its
page headers accept. The contract is the guide's `repository/config` page. It is a **declaration**: while it is
broken, the platform keeps its last valid version, and nothing that depends
on it (every page header) changes.

## Keys

| Key | What it is |
| --- | --- |
| `name` | Required. The site's name, as the reader shows it. |
| `description` | Optional. One sentence on what the documentation is about. |
| `contract` | Required. The contract's major version, **quoted**: `"2"`. A repository that still says `plataforma: "1"` is on contract 1 (the guide's `repository/contract-1` page). |
| `header` | Optional. The extra fields the site's page headers accept. |

Any other key is reported. `contract` unquoted (`2`) is a number and fails:
"`contract` es la versión del contrato, entre comillas: "2"".

The file opens with a Spanish comment saying where the menu, pages, catalog
and diagrams are, and that keys are the contract while values, type ids and
field names are the site's own. Keep it.

## `header`

Every page header already has `title`, `description`, `icon`, `order` and
`updated`; `header` adds the site's own, each declared with a field kind
exactly like a catalog field (`colofon-catalog` skill,
`references/writing-a-type.md`). Read the site's `header` before writing a
header: those are the only extra fields a page may carry. For example:

```yaml
header:
  machines:
    type: list
    of: { type: ref, to: machines }
    optional: true
    description: Máquinas que explica la página
  open_questions:
    type: list
    of: { type: text }
    optional: true
    description: Preguntas aún abiertas; una ronda de preguntas las responde (colofon-questions)
```

| Common shape | Kind | What for |
| --- | --- | --- |
| The entities a page explains (`machines`, `files`…) | `list` of `ref` to the type | Links the header to them; each entity lists the page under "Páginas que la citan" |
| `open_questions` | `list` of `text` | What a page can't state yet; emptied by a question round (`colofon-questions` and `colofon-pending` read it) |

How pages fill them: `colofon-docs` skill, `references/header.md`.

## Rules for adding a header field

- **Declare before use**: a page using an undeclared field is reported.
- **`optional: true`** unless every page must have it; a required field
  fails every page without it.
- **A `ref` (or a `list` of `ref`) when it names catalog entities**: each id
  is checked, the header links them and each entity lists the page under
  "Páginas que la citan". That link is usually why a header field exists.
- **A `description`** on every field: the editor shows it as help and agents
  read it.
- Field names: lowercase, digits and underscores, starting with a letter
  (`diagram_types`), in the language of the site's other names.
- `header` **can't redeclare** the common fields: "`title` no se puede
  declarar: toda ficha lo tiene sin declararlo".
- A `ref` whose `to` names no type is reported: "…: `to: x` no es ningún tipo de
  catalog/ (hay: …)".
- Changing or removing a field: update every page that uses it in the same
  change (`grep -rn "^<field>:" docs`).
