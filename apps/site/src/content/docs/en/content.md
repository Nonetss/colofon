---
title: Writing content
description: What a content repository holds, the contract between it and the platform, editor autocompletion and how problems are reported.
order: 3
---

The documentation doesn't live in the platform: each site is a git repository of its own, with no code, that the platform reads live. Changing a page is a commit; the site serves it after the next sync, with no rebuild.

The best way to learn the format is [doc-example](https://github.com/Nonetss/doc-example), the guide "Escribir documentación": it explains how to write a content repository by being one. Register it on your platform to read it as a site.

## The shape of a repository

```txt
documentacion/
├── doc.config.yaml        # name, platform version, extra header fields
├── menu.yaml              # optional: the sidebar's groups
├── docs/                  # MDX pages; each folder is a section with its index.mdx
├── catalog/
│   └── maquinas/
│       ├── _type.yaml     # the type's schema
│       └── nas.yaml       # one entity per file; the file name is its id
├── diagrams/              # optional: <id>.json diagrams or <id>.svg illustrations
├── styles/                # optional: CSS modules over the platform's styles
└── skills/                # optional: this site's own agent skills
```

The platform imposes only this shape, the page header fields and the field kinds. Every type, field and page name is the site's own: the same platform documents a company's infrastructure or a greengrocer.

## `doc.config.yaml`

The site's name, description and the major version of the contract it targets, `plataforma: "1"`. Under `cabecera` it can declare extra page header fields, typed like catalog fields.

## Pages

`docs/**/*.mdx`, each with a header (`titulo` and `descripcion` required; `icono`, `orden` and `actualizado` optional) and a body in GitHub-flavoured Markdown. **MDX executes nothing**: `import`, `export` and `{…}` expressions are refused, and the only components are the platform's three:

- `<Callout type="warning">`: a highlighted note around Markdown.
- `<Entities type="maquinas" columns="…" />`: a table of a catalog type.
- `<Diagram id="red" />`: a diagram from `diagrams/`.

Without `menu.yaml`, the sidebar follows the folders. With it, its groups list the pages, folders and catalog pages in order, and its titles and icons win over the page headers.

## The catalog

Structured data lives in `catalog/<type>/`: a `_type.yaml` declaring the type (name, plural, icon, fields and the columns of its table) and one YAML file per entity. Field kinds include `texto`, `numero`, `entero`, `booleano`, `fecha`, `url`, `email`, `ip`, `enum`, `ref` (another entity), `ficha` (a page), `lista` and `objeto`. The platform generates the catalog pages at `/<slug>/catalog`: one table per type and one page per entity, with the pages that cite it and the entities that point at it.

## Diagrams, styles and skills

- **Diagrams** are `diagrams/<id>.json` files: drawn by hand (every box, arrow and zone placed by the content) or one of 30 typed forms the platform lays out from data (flowchart, sequence, timeline, Gantt, Sankey…). A `diagrams/<id>.svg` is a hand-drawn illustration. They are drawn on the server, in both themes, and their boxes can be catalog entities.
- **Styles** are `styles/<module>.css` files (`theme.css`, `page.css`, `tables.css`…), cleaned by the platform and applied over its own styles on that repository's pages.
- **Skills** are `skills/<name>/SKILL.md` files the platform serves to agents as `<slug>-<name>` (see [For AI agents](../agents/)).

## Editor autocompletion

The platform serves a JSON schema catalog for each repository, built from its own declarations, so there is nothing to generate or commit. Point the YAML extension of VS Code or Cursor at it in `.vscode/settings.json`:

```json
{
  "yaml.schemaStore.url": "https://docs.example.com/api/v1/content/schemas/manual",
  "json.schemas": [
    {
      "fileMatch": ["/diagrams/*.json"],
      "url": "https://docs.example.com/api/v1/content/schemas/manual/diagram"
    }
  ]
}
```

A new type, field or entity shows up in the editor after the next sync.

## Problems

The platform validates every file on each sync and reports problems in Spanish, with the file, the line and the field. A broken page still renders, with notices in place of what it couldn't read, and admins see its problems on the page. If a commit leaves the declarations (`doc.config.yaml`, `menu.yaml` or a `_type.yaml`) invalid, the platform keeps serving the last valid ones.

## Writing with an agent

The platform serves the `colofon-*` writing skills to every agent: one per part of a repository (`colofon-docs`, `colofon-catalog`, `colofon-diagrams`, `colofon-styles`…) and one per task (`colofon-new-page`, `colofon-check`, `colofon-review`…). An agent that installs them knows the contract and the conventions before it writes a line.
