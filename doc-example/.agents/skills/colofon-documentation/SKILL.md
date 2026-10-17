---
name: documentation
description: Map and conventions of a colofon content repository as a whole. A decision guide for what goes where and which folder skill to load (docs, catalog, diagrams, styles, skills), the root files doc.config.yaml and menu.yaml, contract names vs the site's own names, where the contract is explained (the «Escribir documentación» guide) and where the site's own conventions are (its declarations and the «Este sitio» section of AGENTS.md), the rules that always apply, how content is validated (editor schemas, the platform's sync and reports) and question rounds (/doc:questions). Use before any change, to check where something belongs, before touching doc.config.yaml or menu.yaml, when the platform reports a problem, and before a question round.
---

# Documentation

This repository is **content only**: the pages, data and diagrams of one
documentation site of the colofon platform. The platform (a separate
repository) clones it, validates it against its contract and publishes it.
Nothing here is built or run.

## 1. Philosophy

**The skills are common; the site is yours.** Everything under `.agents/`
(these skills and the `/doc:` commands) is the same in every colofon content
repository: it says how to write documentation for the platform, never what
one site holds. It is copied unchanged from the template repository
(`doc-example`) and **never edited in a site's repository**; it changes only
there, and every site copies it again.

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
  there, never into `.agents/`.
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
  .agents/          for you: common skills and /doc: commands
```

Declarations (`doc.config.yaml`, `menu.yaml`, each `_type.yaml`) are read
first and, when broken, the last valid version is kept. Content (pages,
entities, diagrams, styles) is checked one by one: a broken one is reported,
the rest published.

`skills/` and `.agents/skills/` are different things: `skills/` holds what
the platform **serves to agents that read** the site (about the documented
project, so it differs per site); `.agents/skills/` holds what **you, the
agent writing here**, load (common to every site).

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

Each content folder has its own skill (`.agents/skills/<folder>/`); load the
one for the folder you are about to change, plus this one. A task crossing
folders loads several.

| Task | Load or read |
| --- | --- |
| Writing, moving or renaming a page under `docs/` | the `docs` skill |
| Adding or changing a type, a field or an entity under `catalog/` | the `catalog` skill |
| Drawing, changing or reusing a diagram under `diagrams/` | the `diagrams` skill |
| Restyling the site's pages with `styles/` (theme variables, a module) | the `styles` skill |
| Writing a skill under `skills/` for agents that read the site | the `skills` skill |
| What the site documents, its own conventions and procedures | `AGENTS.md`, «Este sitio» |
| Where a file goes, the repository tree, naming | [layout.md](references/layout.md) |
| `menu.yaml`: its keys, adding an entry, "Otros" | [menu.md](references/menu.md) |
| `doc.config.yaml`: its keys, `cabecera` fields and their kinds, `plataforma` | [doc-config.md](references/doc-config.md) |
| Which names are the contract's and which are the site's | [contract-names.md](references/contract-names.md) |
| The editor's schemas, the platform's sync, where problems show, final checks | [validation.md](references/validation.md) |
| Running a question round (`/doc:questions`) | [question-rounds.md](references/question-rounds.md) |

## 5. Always true

- **Never edit `.agents/` in a site's repository.** If a common skill is
  wrong or missing something, tell the user: it is fixed in `doc-example` and
  copied to every site. A convention of this site goes to `AGENTS.md`,
  «Este sitio».
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
| Editing a skill or command under `.agents/` to fit this site | The next copy from the template overwrites it, and the sites drift apart; the site's convention goes in `AGENTS.md` «Este sitio» |
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
  «Este sitio», in the same change; nothing under `.agents/` changed.
- No secret anywhere.
