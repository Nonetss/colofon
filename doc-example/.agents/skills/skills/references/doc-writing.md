# `doc-writing`

`skills/doc-writing/SKILL.md`, the one skill this site serves: for any agent
writing or fixing a content repository of the platform, on any site. Read it
whole before changing it; it is short on purpose.

## What it says, and why

### Front matter

- `name: doc-writing`; the `description` names the files it covers (pages,
  `menu.yaml`, catalog types and entities, diagrams) and **when to use it**:
  before creating or editing any file of a content repository, or when
  something is reported as invalid. That second trigger matters: agents
  mostly arrive after a report.

### Opening line

"This skill says how to work, not what the contract holds." It tells the
agent the copy may be out of date and the guide is the truth.

### Before writing

| Rule | Why it is there |
| --- | --- |
| Read `/llms.txt`, then the page for what you are about to write (`llm.txt`) | The contract lives in the guide and is read live; the skill never copies it |
| Look at the repository's own `doc.config.yaml`, `menu.yaml` and `catalogo/*/_tipo.yaml` first; never use a field they don't declare | "Declare before use": every site declares its own header fields and types, and the platform rejects anything undeclared |

### Rules that never change

| Rule | Why it is there | Guide page that explains it |
| --- | --- | --- |
| The contract's names are Spanish and fixed, except a diagram's keys (English) | Translating them breaks validation; agents translate by habit | `docs/repository/index.mdx` |
| Pages have no code: Markdown and `Callout`, `Entities`, `Diagram` only | The platform never runs MDX; `import`, `export` and `{…}` are reported and dropped | `docs/pages/markdown.mdx`, `docs/pages/components.mdx` |
| YAML wins over MDX: the menu's title or icon is the one shown; icons go in the menu | Agents edit a header value nobody sees, then get a report | `docs/repository/menu.mdx`, `docs/pages/header.mdx` |
| Every `icono` is a Lucide icon name | Any other name is reported and not drawn | `docs/pages/header.mdx` |
| One entity per file, one diagram per file (drawn JSON, typed JSON, or `.svg`) | The platform reads one per file; it also tells the agent the three diagram forms exist and where their keys are | `docs/catalog/entities.mdx`, `docs/diagrams/index.mdx` |
| Never write a secret: where it lives and which account | Content is cloned to servers and read by agents | `docs/pages/index.mdx`, `docs/catalog/entities.mdx` |

### After writing

| Rule | Why it is there |
| --- | --- |
| Every YAML and diagram validates against the platform's schemas; every link, `ref`, `ficha` and diagram `entity` or `page` exists | The cheapest check, in the editor, before a push |
| After the push and sync, open the changed pages as an admin; `menu.yaml` and diagram problems are on the repository's home | Where the platform shows what it reported |

## When to change it

Change it **in the same change** as the guide page when one of its rules
changes on the platform:

| Platform change | Update in `doc-writing` |
| --- | --- |
| A component added or removed | The list in "Pages have no code" |
| The menu/header precedence changes | "YAML wins over MDX" |
| Icons stop being Lucide names | "Every `icono`…" |
| A new diagram form (not a new type: types are in the guide) | The forms named under "One entity per file…" |
| A new place where problems show, or the editor setting changes | "After writing" |
| The address of `llms.txt` / `llm.txt` changes | "Before writing" |

**Don't** change it for a new key, field kind, diagram type or budget: those
live in the guide, which the skill already sends the agent to.

## Checks

- Each rule in the tables above is still true on the platform and still
  stated the same way by its guide page.
- The description still names every kind of file it covers.
- No contract detail crept in (a keys list, a type list, a budget).
