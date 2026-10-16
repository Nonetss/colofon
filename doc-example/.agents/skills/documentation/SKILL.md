---
name: documentation
description: Map and conventions of this content repository, the "Writing documentation" guide of the doc platform, which documents the content contract and uses every part of it. Covers what goes where (doc.config.yaml, menu.yaml, docs/ pages, catalogo/ types and entities describing the contract, diagramas/, skills/ served to other agents), contract names vs this site's names, the page header and how this guide's pages are written, MDX without code and its components, the catalog, diagrams, question rounds (/questions) and how content is validated. Use before writing or changing any page, menu entry, entity, type, diagram or served skill, before a question round, and to check where something belongs.
---

# Documentation

This repository is **content only**: the pages, data and diagrams of the
**"Writing documentation" guide**, which explains how to write a content
repository for the doc platform. The platform (a separate repository) clones
it, validates it against its contract and publishes it. Nothing here is built
or run.

The guide **documents the contract and uses it**: its menu is a `menu.yaml`,
its reference tables come from its own catalog and its diagrams are files in
`diagramas/`. Every feature it describes should be shown working somewhere in
it.

## Mental model

```
this repository                         platform
  doc.config.yaml   site config   ──┐
  menu.yaml         sidebar       ──┤
  docs/**.mdx       pages         ──┼──▶ syncs the repo ──▶ reader, catalog pages,
  catalogo/<type>/  data          ──┤    validates it       editor schemas, llms.txt
  diagramas/        diagrams      ──┤
  skills/<name>/    agent skills  ──┘
```

- **The guide's pages are the source of truth for the contract.** When you
  need a rule (a header field, a menu key, a field kind, a diagram key), read
  the page that explains it under `docs/`; these references only hold what is
  particular to writing *this* repository.
- **Two vocabularies.** The contract's names are Spanish and fixed (the table
  is in `docs/repository/index.mdx`). Everything else is this site's own, in
  English: type ids, field names, enum values, folders, file names and prose.
- **The catalog describes the contract:** `files` (the files of a content
  repository), `field-kinds`, `header-fields`, `components` and `diagram-types`. A page that
  lists them uses `<Entities>`, never a hand-written table.
- **When the platform changes, this guide changes with it.** A page that
  describes something the platform no longer does is a bug.

## Where to look

| Task | Read |
| --- | --- |
| Where a file goes, the menu, naming files and folders | `references/layout.md` |
| Writing or changing a page: header, structure of this guide's pages, MDX rules, components, links | `references/pages.md` |
| Adding or changing a type or an entity of this site's catalog | `references/catalog.md` |
| Drawing or changing a diagram | `references/diagrams.md` |
| Writing a skill under `skills/` for other agents | `references/served-skills.md` |
| Running a question round (`/questions`) | `references/question-rounds.md` |

## Always true

- **No secret ever enters this repository**, not even in an example.
- **Declare before use.** An entity field must be declared in its
  `_tipo.yaml`; a header field under `cabecera` in `doc.config.yaml`.
- **MDX has no code**, and nothing in the prose starts JSX or an expression:
  write component names, `<placeholders>` and braces inside backticks or code
  blocks, never bare in a sentence.
- **YAML wins over MDX.** Icons of the pages the menu shows go in `menu.yaml`;
  a title set in the menu must match the page's `titulo`.
- **Every `icono` is a Lucide icon name** the platform knows.
- **One entity per file, one diagram per file.**
- **Ids are lowercase**, digits and hyphens for files and folders; lowercase
  and underscores for field names.
- **Validate before calling it done** (below).

## Validation

- **In the editor:** `.vscode/settings.json` points `yaml.schemaStore.url` at
  the platform's schema catalog for this repository. It completes and
  validates `doc.config.yaml`, `menu.yaml`, every `_tipo.yaml` and every
  entity; `json.schemas` there points `diagramas/*.json` at the diagram
  schema.
- **On the platform:** after a push and a sync, every problem shows to admins
  on its page (those of `menu.yaml` and the diagrams on the home) and in the
  log. The platform keeps serving the last valid declarations while one is
  broken.
- Before finishing, check that every link, `ref`, `ficha`, menu entry and
  diagram `entity` or `page` points at something that exists, and that no page lands in
  the "Otros" group.
