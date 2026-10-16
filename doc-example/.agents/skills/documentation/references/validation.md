# Validation

Content is checked twice: by the editor while you write, against schemas the
platform serves, and by the platform on every sync. The contract pages are
`docs/publishing/editor.mdx` and `docs/publishing/index.mdx`.

## In the editor

`.vscode/settings.json` (committed) holds two settings:

| Setting | Validates | Needs |
| --- | --- | --- |
| `yaml.schemaStore.url` → `https://<platform>/api/v1/content/schemas/<slug>` | `doc.config.yaml`, `menu.yaml`, every `_tipo.yaml`, every entity | Red Hat's YAML extension (`redhat.vscode-yaml`) |
| `json.schemas` with `fileMatch: ["/diagramas/*.json"]` → `…/schemas/<slug>/diagram` | Every diagram JSON | Nothing: the editor's own JSON support |

This repository points them at `https://localhost:4321/…/schemas/test`, the
platform in development. What the editor knows:

| File | Completion and checks |
| --- | --- |
| `doc.config.yaml` | Every key and the field kinds of `cabecera` |
| `menu.yaml` | Every key, the paths an entry can name, icon names |
| `_tipo.yaml` | Every key, the field kinds, the types a `ref` can point at, icon names |
| An entity | Its type's fields with descriptions, each `enum`'s values, the ids each `ref` accepts, the pages a `ficha` can name |
| `diagramas/*.json` | Every key, the entities and pages a piece can link, types, shapes and colours |

- Nothing is generated or committed: a new type, entity or page shows in the
  suggestions **after the sync that brings it**. Until then, a `ref` to an
  entity you just created is marked; that is expected before the push.
- In development the editor doesn't trust the local certificate:
  `"http.proxyStrictSSL": false` in the **user** settings (never in
  `.vscode/`), or point at production.
- Pages (`.mdx`) are not validated by the editor: only the platform checks
  them.

## On the platform

A sync happens on every push to a hosted repository, every five minutes and
at start-up for an external one, and on **Sincronizar** in `/admin/content`.
Each sync reads in two steps:

1. **Declarations** (`doc.config.yaml`, `menu.yaml`, each `_tipo.yaml`). If
   one is broken, the last valid declarations are kept and each problem
   logged; nothing else changes until it is fixed.
2. **Content** (pages, entities, diagrams), each on its own: a broken one is
   reported and the rest published. A broken page still shows what can be
   read; a broken entity drops out of every table; a broken diagram shows a
   notice.

## Where problems show

| Where | What | Who |
| --- | --- | --- |
| Above the page's body | That page's problems: file, line, message (header, MDX, links, components, menu overrides, "Otros") | Admins only |
| The repository's home | `menu.yaml`, the diagrams, `estilos/`, files under `docs/catalogo/` | Admins |
| The log | Every problem, once per commit, with repository and file | Whoever runs the platform |
| `/admin/content` | A sync that failed (remote unreachable) | Admins |

Messages are Spanish and quoted in the folder skills' references (`docs`:
`mdx.md`, `links.md`, `header.md`; `catalogo`: `writing-an-entity.md`;
`menu.md` here).

## Reading a report

| The report is on… | Look first at |
| --- | --- |
| Every page at once | `doc.config.yaml` (`cabecera`) or a `_tipo.yaml` that broke |
| Every entity of a type | Its `_tipo.yaml` (a new required field, a renamed one) |
| A table missing rows | The entities that fail their type |
| A page's header field | `doc.config.yaml` declares it? the cited id exists? |
| The home, about the menu | `menu.yaml` entries vs the folders of `docs/` |

## Before finishing

- Every YAML you touched validates in the editor (modulo ids that only exist
  after the sync).
- Every link, `ficha` field, `ref`, menu entry and diagram `entity` or `page`
  points at something that exists.
- No page lands in "Otros".
- No MDX outside backticks reads as code (`docs` skill, `references/mdx.md`).
- After the push and sync, if the user asks, the changed pages show no
  problem to an admin. Don't probe the running platform yourself unless asked.
