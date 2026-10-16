---
name: documentation
description: Map and conventions of this content repository as a whole, the "Escribir documentación" guide of the doc platform, which documents the content contract and uses every part of it. A decision guide for what goes where and which folder skill to load (docs, catalogo, diagramas, skills), the root files doc.config.yaml and menu.yaml, contract names vs this site's names, the rules that always apply, how content is validated (editor schemas, the platform's sync and reports) and question rounds (/doc:questions). Use before any change, to check where something belongs, before touching doc.config.yaml or menu.yaml, when the platform reports a problem, and before a question round.
---

# Documentation

This repository is **content only**: the pages, data and diagrams of the
guide **«Escribir documentación»**, which explains how to write a content
repository for the doc platform. The platform (a separate repository) clones
it, validates it against its contract and publishes it. Nothing here is built
or run.

## 1. Philosophy

**The guide documents the contract and uses it.** Its menu is a `menu.yaml`,
its reference tables come from its own catalog, its diagrams are files in
`diagramas/`. Every feature it describes should be shown working somewhere in
it, so its own files are the examples a reader copies.

- **The guide's pages are the source of truth for the contract.** When you
  need a rule (a header field, a menu key, a field kind, a diagram key), read
  the page that explains it under `docs/`; these skills only hold what is
  particular to writing *this* repository.
- **Two vocabularies.** The contract's names are Spanish and fixed
  (`references/contract-names.md`). Everything else is this site's own: its
  type ids, field names, enum values, folders and file names are English and
  stay so; its prose is Spanish.
- **The catalog describes the contract:** `files`, `field-kinds`,
  `header-fields`, `components` and `diagram-types`. A page that lists them
  uses `<Entities>`, never a hand-written table.
- **When the platform changes, this guide changes with it.** A page or entity
  that describes something the platform no longer does is a bug.

## 2. Mental model

```
this repository                         platform
  doc.config.yaml   site config   ──┐
  menu.yaml         sidebar       ──┤
  docs/**.mdx       pages         ──┼──▶ syncs the repo ──▶ reader, catalog pages,
  catalogo/<type>/  data          ──┤    validates it       editor schemas, llms.txt
  diagramas/        diagrams      ──┤
  skills/<name>/    agent skills  ──┘
```

Declarations (`doc.config.yaml`, `menu.yaml`, each `_tipo.yaml`) are read
first and, when broken, the last valid version is kept. Content (pages,
entities, diagrams) is checked one by one: a broken one is reported, the rest
published.

## 3. Where to look

Each content folder has its own skill (`.agents/skills/<folder>/`); load the
one for the folder you are about to change, plus this one. A task crossing
folders loads several.

| Task | Load or read |
| --- | --- |
| Writing, moving or renaming a page under `docs/` | the `docs` skill |
| Adding or changing a type, a field or an entity under `catalogo/` | the `catalogo` skill |
| Drawing, changing or reusing a diagram under `diagramas/` | the `diagramas` skill |
| Writing a skill under `skills/` for other agents | the `skills` skill |
| Where a file goes, the repository tree, naming | [layout.md](references/layout.md) |
| `menu.yaml`: its keys, this site's groups, adding an entry, "Otros" | [menu.md](references/menu.md) |
| `doc.config.yaml`: its keys, `cabecera` fields and their kinds, `plataforma` | [doc-config.md](references/doc-config.md) |
| Which names are the contract's and which are this site's | [contract-names.md](references/contract-names.md) |
| The editor's schemas, the platform's sync, where problems show, final checks | [validation.md](references/validation.md) |
| Running a question round (`/doc:questions`) | [question-rounds.md](references/question-rounds.md) |

## 4. Always true

- **No secret ever enters this repository**, not even in an example: write
  where it lives and which account to use.
- **Don't rename the contract.** Its names are fixed and Spanish (diagram
  keys English); translating one breaks validation.
- **Declare before use.** An entity field must be declared in its
  `_tipo.yaml`; a header field under `cabecera` in `doc.config.yaml`.
- **MDX has no code**, and nothing in the prose starts JSX or an expression:
  write component names, `<placeholders>` and braces inside backticks or code
  blocks, never bare in a sentence.
- **YAML wins over MDX.** Every page is shown by `menu.yaml`, none in
  "Otros"; icons of the pages the menu shows go in `menu.yaml`; a title set in
  the menu must match the page's `titulo`.
- **Every `icono` is a Lucide icon name** the platform knows.
- **One entity per file, one diagram per file.** Structured data goes to the
  catalog; explanations to a page.
- **Ids are lowercase**: digits and hyphens for files and folders; lowercase
  and underscores for field names.
- **Validate before calling it done** (`references/validation.md`).
- **Commits only when the user asks**, one sentence on what changes and why,
  never crediting an AI tool.

## 5. Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| Writing a rule into a skill instead of reading the guide's page | Two sources; the skill goes stale first |
| Translating `titulo`, `catalogo/`, `_tipo.yaml`, or a diagram's `nodes` | The platform no longer reads it; the file fails validation |
| Renaming an existing English id, field or folder "to Spanish" | Breaks every link, `ref`, `ficha`, menu entry and header citing it |
| A new folder under `docs/` without a menu entry | Its pages land in "Otros" and are reported |
| A feature described but shown nowhere in the guide | The guide stops being its own example |
| Fixing only the file the platform reported | The cause is often a declaration (`_tipo.yaml`, `doc.config.yaml`, `menu.yaml`) |
| A credential pasted "just for the example" | Content is cloned to servers and read by agents |

## 6. Before finishing

- Every YAML and JSON you touched validates in the editor.
- Every link, `ref`, `ficha`, menu entry and diagram `entity` or `page`
  points at something that exists, and no page lands in "Otros".
- A convention you changed is updated in the file that states it (`AGENTS.md`,
  this skill or a folder skill), in the same change.
- No secret anywhere.
