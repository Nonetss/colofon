## Context

The contract's folder and file names are constants in `packages/content`: `CATALOG_DIR`, `TYPE_FILE`, `DIAGRAMS_DIR` and `CATALOG_PATH` in `src/contract/load.ts`, `STYLES_DIR` and `STYLE_MODULES` in `src/styles/modules.ts`, and the `catalogo:` link scheme in `src/pages/transform.ts`. Most code already goes through them; the literal names left are in comments, user-facing problem messages, editor schema descriptions and patterns, OpenAPI descriptions in `packages/api`, and the tests and fixtures of `packages/content`, `packages/api` and `apps/frontend`. `doc-example/` is the only content repository in this monorepo and a git subtree of its own GitHub repository.

## Goals / Non-Goals

**Goals:**

- The English names of the delta specs are the only ones read.
- A repository on the old names sees why its catalog, diagrams or styles vanished.
- `doc-example/` publishes exactly as before under the new names.

**Non-Goals:**

- YAML keys, header fields, field kinds, `menu.yaml`, `doc.config.yaml`, `docs/` and `skills/` keep their names.
- No dual reading of old and new names, and no automatic rename of a repository's files.
- The human documentation in `docs/` of the platform is not touched.

## Decisions

**Rename the constants, then sweep the literals.** Changing `CATALOG_DIR`, `TYPE_FILE`, `DIAGRAMS_DIR`, `CATALOG_PATH`, `STYLES_DIR`, the module names and `CATALOG_SCHEME` moves the behaviour; a grep for the Spanish names (`catalogo`, `_tipo`, `diagramas/`, `estilos`, each old module file) then finds the messages, comments, descriptions and tests to update. Literals that build a path from the folder name are replaced by the constant where one exists.

**Module names.** `tema → theme`, `pagina → page`, `controles → controls`, `codigo → code`, `tablas → tables`, `diagramas → diagrams`, `imagenes → images`, `avisos → callouts`, `secciones → sections`. Most match the platform file each one restyles (`STYLE_MODULES.restyles`); `controls` keeps the meaning of `controles` (the icon-only controls and their hint) rather than the platform's `hints.css`, because the module covers the buttons too. The order is unchanged.

**The catalog page path follows the folder.** `CATALOG_PATH` becomes `catalog`, so the generated pages, the reserved `docs/catalog/`, the menu entries and the `catalog:` scheme all change together. Keeping `/catalogo` URLs over a `catalog/` folder was rejected as one more mixed name.

**Former names are site problems, not declaration problems.** They are added where `site.ts` reports reserved files: a check of the content root for `catalogo/`, `diagramas/` and `estilos/`, and of each `catalog/<type>/` for a `_tipo.yaml`. Reporting them from `loadContent` would make the declarations invalid, and the source would keep serving the last valid ones, hiding the problem behind the old content. The missing `_type.yaml` stays a declaration problem as it already is. The old names live in one small list in `packages/content` (old name, new name), used only for these reports.

**`doc-example/` moves its guide section `docs/catalog/` to `docs/data/`.** The reserved path would otherwise drop the guide's four catalog pages. `data` matches the menu group "Datos"; links to `catalog/…` pages in the guide and in its diagrams (`page: "catalog/reader"`) move to `data/…`, and links that meant the generated pages become `catalog`.

**Its agent skills are renamed with their folders.** `.agents/skills/{catalogo,diagramas,estilos}` become `catalog`, `diagrams`, `styles`, with their `.claude/skills` symlinks, and every mention in `AGENTS.md`, the `documentation` skill and the commands. The served skill under `skills/` is updated in place.

## Risks / Trade-offs

- [Every other content repository breaks on deploy] → the former-name reports show it on each repository's home; the user renames them before or right after deploying.
- [Bookmarked `/<repo>/catalogo/…` URLs return not found] → accepted; no redirect is added (it would be a second reading of the old name).
- [A blind replace hits Spanish prose ("dos diagramas", "los estilos") or YAML keys (`secciones`)] → replace only path-shaped occurrences (`diagramas/`, `estilos/`, `catalogo/`, `catalogo:`, the `.css` file names), then review the diff.
- [`doc-example` diverges from its upstream repository] → the user pushes the subtree after the change.

## Migration Plan

1. Land the platform and `doc-example/` changes together; `bun run test` covers both through the fixtures.
2. Push `doc-example/` to its own repository (user).
3. Rename the folders and files of every other connected content repository and push; the next sync clears the reports.

Rollback is reverting the change; repositories renamed in the meantime would then need the old names back.

## Open Questions

None.
