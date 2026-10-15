## Context

`packages/content` (`@nonete/content`) already holds the meta-schema in zod, `loadContent(root)` (declarations, entity ids and page paths, with Spanish problems per file), `entitySchema()` and `editorSchemas()` (JSON Schemas for the editor). Nothing imports it yet: a CLI (`bun run content:schemas <dir>`) writes the schemas into the content repository and the `yaml.schemas` editor settings. The content repository now lives outside this repo (`../documentacion` in development). See proposal.md for why the backend takes over.

Facts checked against the YAML language server Cursor bundles (redhat.vscode-yaml 1.25, driven headless over LSP):
- a catalog in SchemaStore format fetched from `yaml.schemaStore.url` works, including `!` exclusions in `fileMatch`, and needs no `yaml.schemas`;
- the catalog is only fetched over HTTP(S), never from a `file://` URL;
- with `http.proxyStrictSSL: true` (the editor's default) an HTTPS URL with an untrusted certificate is not fetched; with `false` it is;
- `yaml.schemas` and `yaml.schemaStore.url` are window-scoped: in a multi-folder window only the workspace's settings count, never a folder's `.vscode/`.

## Goals / Non-Goals

**Goals:**
- The content source is configured only in `.env`, the same way in native dev, the Docker dev stack and production.
- The editor's schemas always match what the backend reads, with no generated files in the content repository.
- A misconfigured or unreachable content source never stops the backend.

**Non-Goals:**
- Validating entity files or pages on the backend (the editor and a later validator do that); rendering pages; the MCP.
- A push webhook (the five-minute refresh covers it for now), SSH keys for private repositories (HTTPS with a token in the URL covers it), several content repositories per backend.

## Decisions

### Two variables, `CONTENT_DIR` or `CONTENT_REPO`, instead of one `CONTENT_SOURCE`

The user asked for "a path or a URL" in `.env`; either is still one line. Two names make the kind explicit (no guessing whether `gitea/doc` is a relative folder or a repository) and let compose act on the folder alone: the dev stack mounts `${CONTENT_DIR}` and overrides it with `${CONTENT_DIR:+/content}`, which a single variable holding a URL would break. `CONTENT_REF` (default `main`) applies only to `CONTENT_REPO`. The env schema refuses both at once.

### Git CLI over a JS implementation

`packages/content` gets `src/source.ts`, which runs the `git` binary with `Bun.spawn`. Alternative: isomorphic-git (no binary, but partial protocol support, slower on big repositories, its own auth story). The binary is one `apt-get install git ca-certificates` in the backend images and behaves exactly like the writers' git.

Every sync uses the same steps whether or not a clone exists, so a tag, a branch or a commit work alike and a changed URL replaces the clone:
1. if `.content/.git` is missing or `git remote get-url origin` differs from `CONTENT_REPO`: empty the folder, `git init`, `git remote add origin <url>`;
2. `git fetch --depth 1 origin <CONTENT_REF>`;
3. `git checkout --force --detach FETCH_HEAD` and `git clean -ffdx`.

Each command runs with `GIT_TERMINAL_PROMPT=0` (an auth failure fails instead of waiting for a password) and a timeout. One sync runs at a time: a sync requested while another runs waits for it instead of starting a second one. Errors are logged with the URL's userinfo replaced by `***`, both in the message and in git's stderr.

The clone folder is `.content/` at the repo root, resolved like the root `.env` (`../../.content` from the workspace the backend runs in): the repo root natively, `/app/.content` in the containers, where the named volume `content_data` is mounted. `.content/` goes into `.gitignore`.

### Read the content on every request, keep the last valid declarations

`packages/api` gets a `v1/content` feature whose handler calls `loadContent()` on the resolved folder (`CONTENT_DIR`, or the clone) on every schema request. A content repository is a few dozen small files; reading them per request is cheap, and it removes file watchers, cache invalidation and the question of when a folder edit becomes visible. A successful read replaces the in-memory last valid declarations; a failed one returns them and logs the problems. It logs again only when the problem list changes, so a broken file doesn't flood the log on every editor request. Alternative considered: load once and watch the folder. Watching a bind mount from a container is unreliable and adds lifecycle code for no measurable gain.

### Endpoints are public oRPC GET procedures

`v1.content` exposes `schemaCatalog` (`GET /content/schemas`), `configSchema` (`/content/schemas/config`), `typeSchema` (`/content/schemas/type`) and `entitySchema` (`/content/schemas/entities/{type}`), built with `publicProcedure`, so they appear in `/scalar` and go through the existing `/api` gateway route; no Caddy change. They must be public because the editor's language server cannot authenticate. The JSON Schema outputs are declared as records of unknown values; the catalog has a typed output. Catalog URLs are absolute, built from `CORS_ORIGIN` (the public origin), because the request seen behind the gateway carries the internal scheme. The catalog builder (`schemaCatalog(declarations, baseUrl)`) is a pure function in `packages/content`, next to `editorSchemas()`, which now keys each schema by a stable name (`config`, `type`, `entities/<type>`) instead of a file path.

### Refresh through a code-declared cron job

`v1.content.sync` is a `cronProcedure` with `cronMeta({ schedule: "*/5 * * * *" })`: the scheduler already runs code-declared jobs, records their runs in `/crons`, and a `cronProcedure` is unreachable over HTTP. The handler key `v1.content.sync` is persisted in `cron_job`, so it must never be renamed. The backend also starts one sync on boot, without awaiting it: a slow or unreachable remote must not delay startup, and requests made before the first clone completes see no content.

### Remove the CLI and the generated editor files

`editor-files.ts`, `scripts/generate-schemas.ts`, `yamlSchemasSetting()`, `formatJson()` and the root `content:schemas` script go away, with their tests. Keeping them would leave two sources of editor schemas that disagree as soon as the content changes.

## Risks / Trade-offs

- [The dev certificate is not trusted by the editor's language server under strict SSL (verified), so `https://localhost:4321` can't feed the editor out of the box] → The development setup documents both ways that work: point `yaml.schemaStore.url` at the production catalog when only editing content, or set `http.proxyStrictSSL: false` in the editor's user settings while developing the platform. Trusting the Caddy root CA system-wide is listed as an option to try, not a promise, until it is verified.
- [`yaml.schemaStore.url` replaces the public SchemaStore catalog for that window, so files such as `compose.yml` lose their SchemaStore schemas in a window that has it set] → In the content repository's own settings this costs nothing. In a multi-folder window with the platform repo it is a conscious trade-off, documented next to the setting.
- [The language server caches a schema for the session, so a new id may only show after reopening the file or reloading the window] → Verified behaviour so far: one fetch per schema per session. The endpoints send `Cache-Control: no-store`; the tasks include checking in the real editor what a writer must do to see a new id, and documenting it.
- [The public endpoints reveal type and field names, entity ids and page paths of a private documentation set] → They never include page text or field values (spec). Deployments that must hide even the ids can keep the platform off the public internet; an authenticated variant can come later if needed.
- [A `CONTENT_DIR` written without `./` (`documentacion`) is a named volume to compose, not a host folder] → `.env.example` and the env reference say a relative `CONTENT_DIR` starts with `./` or `../`.
- [A wrong `CONTENT_REF` or bad credentials leave production without content] → The backend keeps the last checkout, and every failed sync is visible in `/crons` and in the logs.

## Migration Plan

1. Implement and deploy; with neither variable set nothing changes for existing deployments.
2. In the content repository, delete `.esquemas/` and the generated `yaml.schemas` entries, and set `yaml.schemaStore.url` to the production catalog in `.vscode/settings.json`. In a multi-folder workspace, put `yaml.schemaStore.url` in the workspace's settings and remove the generated `yaml.schemas` there. These files live outside this repo, so this step is done by hand.
3. Set `CONTENT_DIR=../documentacion` in the development `.env`, and `CONTENT_REPO` (plus `CONTENT_REF` if not `main`) in the production `.env`.

Rollback: unset both variables; the endpoints answer an empty catalog and the rest of the app is unaffected.
