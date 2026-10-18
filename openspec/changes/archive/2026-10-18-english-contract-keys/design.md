## Context

The contract names live in `packages/content`: the meta-schema (`src/contract/meta-schema.ts`: `doc.config.yaml`, `menu.yaml`, `_type.yaml` and field declarations, with `SCALAR_FIELD_KINDS`, `PAGE_HEADER_FIELDS` and `ENTITY_RESERVED_FIELDS`), the entity schema (`src/contract/entity-schema.ts`), the page header (`src/pages/header.ts`) and the readers that use the parsed values (`src/contract/catalog.ts`, `src/pages/{nav,site,catalog-pages,entities,references,transform}.ts`, `src/editor/schemas.ts`). Every YAML declaration goes through one function, `parseDeclaration` in `src/contract/load.ts` (YAML → plain data → `safeParse` → problems); entities are validated in `src/contract/catalog.ts` and page headers in `src/pages/header.ts`, which maps issue paths to lines. The zod output types (`SiteConfig`, `TypeDefinition`, `FieldDefinition`, `Menu`, `PageHeader`) carry the YAML keys as they are, so the Spanish names reach the readers and `packages/api/src/v1/docs/handler.ts`. The API's own outputs are already English (`title`, `description`, `updated`, `fields`), so the frontend and the MCP do not see contract keys.

The previous rename (`2026-10-16-rename-contract-folders-to-english`) was a hard cut with former-name reports. This one keeps contract 1 working (proposal, "What Changes").

## Goals / Non-Goals

**Goals:**

- One internal model, in English, whatever version a repository is on.
- A contract 1 repository reads, validates and publishes exactly as today, and its problems name its own keys.
- Dropping contract 1 later is deleting one module and its tests.

**Non-Goals:**

- No automatic migration tool or endpoint for repositories. `doc-example/` and `docs/` are migrated in this change; other repositories move by hand following the guide.
- No change to diagram files, MDX components, folder names, served skills' format or the API's output shapes.
- Problem messages and editor descriptions stay in Spanish; they are not translated or localised.
- No date for removing contract 1.

## Decisions

**Contract 1 is a key translation at the YAML boundary, not a second schema.** For a version 1 repository, the plain data parsed from each YAML file (and each page's front matter) is rewritten to the version 2 keys before validation, then validated by the one version 2 schema. The translation records the reverse mapping of every key it renames, and each issue path is mapped back through it before the problem is written, so problems and line lookups use the names the file holds. Unknown keys are not renamed, so an English key in a version 1 file is refused under its own name, as the spec asks.
*Alternative considered:* keep a frozen copy of the current Spanish meta-schema as `v1` and convert its parsed output to the English types. It needs no path mapping, but it duplicates every refinement (reserved names, `title_field` and column checks, `ref` targets, menu paths) and its tests, and the two copies drift. The translation keeps one schema and makes removing contract 1 a deletion.

**The renames are positional, held in one names table.** A module in `src/contract/` (`contract-1.ts` or similar) holds, per file kind, which Spanish key becomes which English one at each position: the root of `doc.config.yaml`; the root, groups and object entries of `menu.yaml`; the root, `vista` and field maps of `_type.yaml`; every field declaration at any depth (`campos` of `objeto`, `de` of `lista`, `cabecera`), including the value of `tipo` (`texto` → `text`…); the fixed header keys of a page; `fuente` and `actualizado` of an entity. Position matters only for `etiqueta`, which is `title_field` at a type's root and `label` in a field. Values are renamed in two places only: a field's `tipo` (the kinds) and the reserved entity fields `fuente` and `actualizado` when `vista.columnas` names them. Site-chosen names (field names, type ids, entity values, header field names) are never touched: the translator walks only the positions the table names. The reverse direction (English → Spanish) is a plain map, since every English key comes from exactly one Spanish key.

**The version is read first, from the raw `doc.config.yaml`.** `loadContent` parses `doc.config.yaml` as YAML and looks at its keys before validating: `contract` present → 2; only `plataforma` → 1; neither → 2 (so the missing key reported is `contract`). The chosen version is stored on `ContentDeclarations` and passed to the catalog, page header and menu readers. An unparseable `doc.config.yaml` is reported as today, with no version.

**Version 2 schemas own the English names.** `meta-schema.ts`, `entity-schema.ts` and `header.ts` move to the English keys and kinds; `PAGE_HEADER_FIELDS`, `ENTITY_RESERVED_FIELDS`, `SCALAR_FIELD_KINDS` and the internal types follow, and every reader is updated to the new property names (`header.title`, `type.title_field`, `field.label`, `config.header`, `view.columns`…). `CONTRACT_VERSIONS` becomes the version 2 value for `contract`; `plataforma: "1"` is checked by the translation, which removes it after checking it is `"1"` quoted, reporting it under its own name otherwise.

**Messages that name a contract key take it from the repository's names.** Custom messages built from a key name (the reserved-field refusal, "`etiqueta` no es ninguno de los campos", the quoted-version hint, the header and menu overrides in `nav.ts` and `site.ts`) get the name through the reverse map, so a version 1 repository reads `etiqueta` and a version 2 one `title_field`. Fixed descriptions in the editor schemas name the English keys; their version 1 copies are renamed with the same map where a key appears in backticks.

**Editor schemas for version 1 are the version 2 JSON Schemas renamed.** `editorSchemas` generates the version 2 JSON Schemas as today and, for a version 1 repository, rewrites them: property names inside `properties`, entries of `required`, and the `enum`/`const` values of the kind property, through the reverse map; for an entity schema only the reserved `source` and `updated` properties. JSON Schema keywords (`type`, `description`, `title`) are never renamed because the walk only touches property maps and the kind values.

**Contract 1 is reported like the former names.** The superseded-contract problem is a site problem added next to `formerNameProblems` in `src/pages/site.ts`, on `doc.config.yaml`, so it shows on the repository's home without invalidating its declarations (the same reason given in the previous rename).

**`doc-example/` and `docs/` are migrated with a throwaway script.** A script in the session scratchpad applies the names table to every YAML file and page front matter of both repositories (YAML-aware, preserving comments and order), then the guide pages, catalog entities that describe the contract, `AGENTS.md` files and writing skills are edited by hand, since they explain the names in prose. The script is not committed: the table and the guide are the migration path for everyone else.

## Risks / Trade-offs

- [A version 1 repository declares its own field named `source`, `updated`, `title`, `description`, `icon` or `order`, legal in version 1 but reserved after translation] → it is reported as a reserved name, asking to rename the field; no known repository does this (checked `doc-example/` and `docs/`). Accepted rather than adding version-specific reserved lists.
- [Problem paths mapped back wrongly would point at lines that do not exist] → unit tests compare a version 1 fixture's problems, paths and lines against the expected Spanish keys for each file kind.
- [The writing skills served to every agent change on deploy, while repositories on contract 1 still exist] → the skills teach version 2 and the guide's migration note carries the names table, so an agent working on a version 1 repository can still map them; the superseded problem points there.
- [`doc-example/` diverges from its upstream repository] → the user pushes the subtree after the change, with the `doc-example/` commit kept apart from code commits.
- [A blind replace in prose hits Spanish words (`fecha`, `lista`, `nombre`)] → the script renames YAML keys only; prose edits are manual and reviewed in the diff.

## Migration Plan

1. Land the platform change with both versions, plus `doc-example/` and `docs/` moved to version 2 (separate commits for content and code). `bun run test` covers both versions through the fixtures.
2. Push `doc-example/` to its own repository (user).
3. Other repositories (such as garabato's documentation) keep publishing and show the superseded problem; move each by hand when convenient.

Rollback is reverting the change: `doc-example/` and `docs/` would need reverting too, since a version 1 platform does not read `contract: "2"`.
