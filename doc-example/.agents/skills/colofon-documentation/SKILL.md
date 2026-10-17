---
name: colofon-documentation
description: Map and conventions of a colofon content repository as a whole. A decision guide for what goes where and which writing skill to load (colofon-docs, colofon-catalog, colofon-diagrams, colofon-styles, colofon-skills, and the task skills colofon-new-page, colofon-new-diagram, colofon-check, colofon-review, colofon-pending, colofon-questions), the root files doc.config.yaml and menu.yaml, contract names vs the site's own names, where the contract is explained (the «Escribir documentación» guide) and where the site's own conventions are (its declarations and the «Este sitio» section of AGENTS.md), the rules that always apply, how content is validated (editor schemas, the platform's sync and reports) and question rounds (colofon-questions). Use before any change, to check where something belongs, before touching doc.config.yaml or menu.yaml, when the platform reports a problem, and before a question round.
---

# Documentation

A colofon site is **content only**: the pages, data and diagrams of one
documentation site of the colofon platform. The platform (a separate
repository) clones the git repository, reads the site from its **content
root**, validates it against its contract and publishes it. Nothing there is
built or run.

The content root is the top of the git repository, or a folder of it when the
repository is registered with a **content folder** (`docs`, for the
documentation of a code repository). Every path in these skills (`docs/`,
`catalog/`, `menu.yaml`, `questions.md`…) is relative to the content root, so
with a content folder `docs` the home is `docs/docs/index.mdx` of the
repository. When you are asked to document a project from inside its own
code repository, put the site in a folder and tell the user the folder to
type in the platform; see `references/layout.md`, «In a code repository».

## 1. Philosophy

**The skills are the platform's; the site is yours.** The writing skills
(`colofon-documentation`, this one, and every other `colofon-*` skill) are
the same for every colofon content repository: they say how to write
documentation for the platform, never what one site holds. The platform
serves them at `/.well-known/agent-skills/`, and you install them for the
whole user with the setup prompt on the platform's `/me/skills` page (or the
"Configurar tu agente" procedure of its `/llms.txt`). A content repository
**never copies or edits them**: it holds only its content and its
`AGENTS.md`. Their only source is `doc-example/.agents/skills/`, inside the
platform's repository; they change only there.

- **The contract is explained in the guide «Escribir documentación»**, the
  site published on the platform as repository `doc-example`. When you need a
  rule (a header field, a menu key, a field kind, a diagram key), read the
  guide's page for it; these skills cite pages by route ("the guide's
  `repository/menu` page") and hold how to write well with the contract.
- **The site is read from its own files.** Which header fields exist
  (`doc.config.yaml`, `cabecera`), the sidebar's groups (`menu.yaml`), the
  catalog types and their fields (`catalog/*/_type.yaml`), its sections
  (`docs/`) and its diagrams (`diagrams/`). Never assume one site's types,
  groups or fields in another.
- **What no file declares is in `AGENTS.md`, section «Este sitio»**: what the
  site documents, its id and naming rules, which page explains what, its
  diagrams and styles, its own procedures. A new convention of the site goes
  there, never into a skill.
- **Two vocabularies.** The contract's names are fixed
  (`references/contract-names.md`). Everything else (type ids, field names,
  values, folders, file names, prose) is the site's own; once it exists it is
  never renamed.

## 2. Mental model

```
this repository                         platform
  doc.config.yaml   site config   ──┐
  menu.yaml         sidebar       ──┤
  docs/**.mdx       pages         ──┼──▶ syncs the repo ──▶ reader, catalog pages,
  catalog/<type>/   data          ──┤    validates it       editor schemas, llms.txt
  diagrams/         diagrams      ──┤
  styles/           own styles    ──┤
  skills/<name>/    served skills ──┘

  AGENTS.md         for you: the rules and «Este sitio»     (never read by the platform)

platform ──▶ /.well-known/agent-skills/ ──▶ colofon-* writing skills, installed for you
```

Declarations (`doc.config.yaml`, `menu.yaml`, each `_type.yaml`) are read
first and, when broken, the last valid version is kept. Content (pages,
entities, diagrams, styles) is checked one by one: a broken one is reported,
the rest published.

`skills/` and the `colofon-*` skills are different things: `skills/` holds
what the platform **serves to agents that read** the site (about the
documented project, so it differs per site); the `colofon-*` skills are what
**you, the agent writing here**, load (the same for every site).

## 3. Reading the guide

The guide is published like any site. Read a page by its route (the path
under its `docs/` without `.mdx`; a folder's `index.mdx` is the folder):

- with the documentation MCP, the `read` tool on `/doc-example/<route>`;
- or at `<site>/doc-example/<route>/llm.txt`, with the user's API key in
  `x-api-key` (`<site>/doc-example/llms.txt` lists every page);
- in the `doc-example` repository itself, the file `docs/<route>.mdx`.

Its "Referencia" pages (`catalog/files`, `catalog/field-kinds`,
`catalog/header-fields`, `catalog/components`, `catalog/diagram-types`) are
the contract's tables. If you can't reach the guide, say so instead of
guessing a rule; the skills' references still hold the common rules.

## 4. Where to look

Each content folder has its own skill (`colofon-<folder>`); load the one for
the folder you are about to change, plus this one. A task crossing folders
loads several. Repeated tasks have their own skill too, invoked by name
(`/colofon-new-page` in Claude Code).

| Task | Load or read |
| --- | --- |
| Writing, moving or renaming a page under `docs/` | the `colofon-docs` skill |
| Adding or changing a type, a field or an entity under `catalog/` | the `colofon-catalog` skill |
| Drawing, changing or reusing a diagram under `diagrams/` | the `colofon-diagrams` skill |
| Restyling the site's pages with `styles/` (theme variables, a module) | the `colofon-styles` skill |
| Writing a skill under `skills/` for agents that read the site | the `colofon-skills` skill |
| What the site documents, its own conventions and procedures | `AGENTS.md`, «Este sitio» |
| Where a file goes, the repository tree, naming | [layout.md](references/layout.md) |
| `menu.yaml`: its keys, adding an entry, "Otros" | [menu.md](references/menu.md) |
| `doc.config.yaml`: its keys, `cabecera` fields and their kinds, `plataforma` | [doc-config.md](references/doc-config.md) |
| Which names are the contract's and which are the site's | [contract-names.md](references/contract-names.md) |
| The editor's schemas, the platform's sync, where problems show, final checks | [validation.md](references/validation.md) |
| Running a question round (`colofon-questions`) | [question-rounds.md](references/question-rounds.md) |
| Writing a new page with its header and menu entry | the `colofon-new-page` skill |
| Drawing a new diagram | the `colofon-new-diagram` skill |
| What the platform would report, without editing | the `colofon-check` skill |
| Reviewing one file against these conventions | the `colofon-review` skill |
| What is still open or stale, by section | the `colofon-pending` skill |

## 5. Always true

- **The writing skills are the platform's.** Never copy them into a site's
  repository or edit an installed copy. If one is wrong or missing something,
  tell the user: it is fixed in `doc-example/.agents/skills/` and every agent
  gets it with the next install. A convention of this site goes to
  `AGENTS.md`, «Este sitio».
- **No secret ever enters this repository**, not even in an example: write
  where it lives and which account to use.
- **Don't rename the contract.** Its names are fixed; translating one breaks
  validation.
- **Declare before use.** An entity field must be declared in its
  `_type.yaml`; a header field under `cabecera` in `doc.config.yaml`.
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

## 6. Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| Copying the writing skills into a site's repository, or editing them to fit it | The next install overwrites the installed copy, and the copy in the repository drifts from the platform's; the site's convention goes in `AGENTS.md` «Este sitio» |
| Writing a rule of the contract into `AGENTS.md` or a page instead of reading the guide | Two sources; the copy goes stale first |
| Assuming the types, header fields or menu groups of another site | Each site declares its own: read its `doc.config.yaml`, `menu.yaml` and `_type.yaml` |
| Translating `titulo`, `catalog/`, `_type.yaml`, or a diagram's `nodes` | The platform no longer reads it; the file fails validation |
| Renaming an existing id, field or folder | Breaks every link, `ref`, `ficha`, menu entry and header citing it |
| A new folder under `docs/` without a menu entry | Its pages land in "Otros" and are reported |
| Fixing only the file the platform reported | The cause is often a declaration (`_type.yaml`, `doc.config.yaml`, `menu.yaml`) |
| A credential pasted "just for the example" | Content is cloned to servers and read by agents |

## 7. Before finishing

- Every YAML and JSON you touched validates in the editor.
- Every link, `ref`, `ficha`, menu entry and diagram `entity` or `page`
  points at something that exists, and no page lands in "Otros".
- A convention of the site you added or changed is written in `AGENTS.md`,
  «Este sitio», in the same change; no writing skill was copied or edited.
- No secret anywhere.
