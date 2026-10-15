## Why

The documentation now lives in its own repository, and the platform still learns about it only through a CLI argument (`bun run content:schemas <dir>`). That makes the editor's autocompletion depend on someone regenerating and committing JSON Schemas after every new type, entity or page, and on editor settings that differ between a single folder and a multi-folder window. The backend will have to read the content anyway (the MCP, the web), so the content's location should be configured once, in `.env`, and the backend should serve the editor what it needs, always up to date.

## What Changes

- New optional variables in the root `.env`: `CONTENT_DIR` (a local folder) or `CONTENT_REPO` (a git URL, with `CONTENT_REF`, default `main`). At most one source is set; without either the platform runs without content.
- The backend resolves the source on boot: a folder is read in place on every request; a repository is cloned into `.content/` (a git-ignored folder at the repo root, a volume in Docker) and refreshed with `git fetch` + checkout of `CONTENT_REF` on boot and every five minutes by a code-declared cron job.
- The content contract already implemented in `packages/content` (meta-schema, catalog loader, entity schemas) gets its spec. If a new version of the content is invalid, the backend keeps the last valid declarations and logs the problems.
- The backend serves, without authentication, a schema catalog in the SchemaStore format plus the JSON Schemas it points to (`doc.config.yaml`, `_tipo.yaml`, one per catalog type). An editor pointed at the catalog with one fixed setting (`yaml.schemaStore.url`) completes and validates every content YAML file, and picks up new types, entities and pages without regenerating anything.
- **BREAKING** (content repositories only): the `content:schemas` CLI, the generated `.esquemas/` folder and the generated `yaml.schemas` editor settings are removed. A content repository keeps only `yaml.schemaStore.url` in its editor settings.
- The backend images ship `git`. Every compose file mounts `CONTENT_DIR` into the backend container read-only and keeps a `CONTENT_REPO` clone in a named volume.

## Capabilities

### New Capabilities

- `content-contract`: what a content repository may declare and how the platform reads it: `doc.config.yaml`, catalog types (`catalogo/<type>/_tipo.yaml`) and their field kinds, entity files and ids, the pages a `ficha` field can name, and the problems reported per file.
- `content-source`: where the backend gets the content from (`CONTENT_DIR` or `CONTENT_REPO` + `CONTENT_REF`), how a repository is cloned and refreshed, and how invalid or missing content is handled.
- `content-editor-schemas`: the public schema catalog and JSON Schemas the backend serves for the content's YAML files, and the single editor setting that uses them.

### Modified Capabilities

- `environment-configuration`: the validated server environment gains `CONTENT_DIR`, `CONTENT_REPO` and `CONTENT_REF`, and compose files may override `CONTENT_DIR` with the container path it is mounted at.
- `docker-dev-environment`: the dev backend container gets the host's `CONTENT_DIR` mounted read-only, with `CONTENT_DIR` overridden to the mount path.
- `docker-production-deployment`: the backend images ship `git`, and `compose.yml` and `compose.prod.yml` keep the content clone in a named volume.

## Impact

- `packages/env/src/server.ts`, root `.env.example`, `.gitignore` (`.content/`).
- `packages/content`: new source resolution (folder or git), schema catalog; removal of `editor-files.ts`, `scripts/generate-schemas.ts` and the root `content:schemas` script.
- `packages/api`: new `v1/content` feature (public GET procedures for the catalog and schemas, a cron-scheduled sync procedure).
- `apps/backend`: resolves the content source on boot.
- `apps/backend/Dockerfile`, `Dockerfile.dev`, `compose.dev.yml`, `compose.yml`, `compose.prod.yml`.
- The stack skill references (`env.md`, `docker.md`, `workspaces.md`, `commands.md`, `api` layering where it lists features) and `AGENTS.md`.
- Content repositories: they drop `.esquemas/` and the generated `yaml.schemas`, and set `yaml.schemaStore.url` once. The public endpoints expose type and field names, entity ids and page paths, not the documentation's text.
