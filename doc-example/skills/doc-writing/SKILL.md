---
name: doc-writing
description: How to write or change a documentation content repository for the doc platform (pages, menu.yaml, catalog types and entities, diagrams). Use it before creating or editing any file of a content repository, or when a page, entity or diagram is reported as invalid.
---

# Writing documentation for the doc platform

This skill says how to work, not what the contract holds. The contract is explained live in the "Writing documentation" guide on the platform: read it there, because this copy may be out of date.

## Before writing

- Read the guide's index (`/llms.txt` on the platform) and then the page for what you are about to write: the menu, a page, a catalog type, an entity or a diagram. Every page has its Markdown at its address followed by `/llm.txt`.
- Look at the repository's own `doc.config.yaml`, `menu.yaml` and `catalogo/*/_tipo.yaml` first: they decide which header fields, menu entries and entity fields exist. Never use a field they do not declare.

## Rules that never change

- **The contract's names are Spanish and fixed** (`titulo`, `descripcion`, `catalogo/`, `_tipo.yaml`, `menu.yaml`, `diagramas/`, `estilos/` and its module names…), except a diagram's keys, which are English (`title`, `nodes`, `edges`…). Never translate or rename them; everything else is the site's own.
- **Pages have no code:** Markdown and the platform's components (`Callout`, `Entities`, `Diagram`) only. No `import`, `export` or expressions between braces.
- **YAML wins over MDX:** a title or icon `menu.yaml` gives an entry is the one shown everywhere. Put the icons of the pages the menu shows in the menu, not in their headers.
- **Every `icono` is a Lucide icon name.**
- **One entity per file**, one diagram per file under `diagramas/`: a JSON drawn by hand (every box, arrow and zone placed), a JSON with a `type` the platform lays out from data (flowchart, sequence, gantt, bar, sankey…), or a hand-drawn `.svg` illustration. The guide's Diagrams section has the keys of each, and its type table says which fits.
- **Never write a secret:** write where it lives and which account to use.

## After writing

- Every YAML and diagram validates against the platform's schemas (the editor marks it), and every link, `ref`, `ficha` and diagram `entity` or `page` points at something that exists.
- After the push and the sync, open the changed pages as an admin: their problems show above the body, and those of `menu.yaml` and the diagrams on the repository's home.
