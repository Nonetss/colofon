## 1. Environment

- [x] 1.1 Add `CONTENT_DIR`, `CONTENT_REPO` and `CONTENT_REF` (default `main`) to `packages/env/src/server.ts`, refusing both sources at once, and verify with `bun run --filter @nonete/env check-types` and a quick `bun -e` that importing the env with both set throws
- [x] 1.2 Document the three variables in the root `.env.example` (new "Content" section, commented out, saying a relative `CONTENT_DIR` starts with `./` or `../` and credentials go in the `CONTENT_REPO` URL), add `.content/` to `.gitignore`, and give `packages/api/tests/setup.ts` empty placeholders for them; verify `bun run test --filter=@nonete/api` still passes

## 2. Content package

- [x] 2.1 Key `editorSchemas()` by a stable name (`config`, `type`, `entities/<type>`) instead of a file path, add the pure `schemaCatalog(declarations, baseUrl)` (SchemaStore format, `fileMatch` with the `_*.yaml` exclusion, absolute URLs), and cover both in `packages/content/tests/`; verify `bun test` in `packages/content`
- [x] 2.2 Add `src/source.ts`: resolve `CONTENT_DIR` against the repo root, and sync a `CONTENT_REPO` into the clone folder with the git CLI (init/remote, shallow fetch of the ref, forced detached checkout, clean), with `GIT_TERMINAL_PROMPT=0`, a timeout, one sync at a time and credentials redacted from errors; verify with tests against a local bare repository in a temp folder (first clone, a new commit picked up, a tag, a changed URL replacing the clone, an unreachable remote failing without credentials in the message)
- [x] 2.3 Remove `editor-files.ts`, `scripts/generate-schemas.ts`, `yamlSchemasSetting()`, `formatJson()`, their tests and the root `content:schemas` script; verify `grep -rn "content:schemas\|writeEditorFiles\|yamlSchemasSetting" packages package.json` finds nothing and `bunx tsc -b` passes in `packages/content`

## 3. API feature

- [x] 3.1 Create `packages/api/src/v1/content/` (`input.ts`, `output.ts`, `handler.ts`, `router.ts`) with the public GET procedures `schemaCatalog`, `configSchema`, `typeSchema` and `entitySchema` (`/content/schemas`, `/config`, `/type`, `/entities/{type}`), catalog URLs from `CORS_ORIGIN`, `NOT_FOUND` for an unknown type or no content, and `Cache-Control: no-store`; wire it in `src/v1/router.ts` and add `@nonete/content` to `packages/api`'s dependencies; verify `bun run --filter @nonete/api check-types`
- [x] 3.2 In the handler, read the content on every request with `loadContent()`, keep the last valid declarations in memory, and log problems only when their list changes; verify with handler tests in `packages/api/tests/v1/content/` over temp content folders (valid content, a broken `_tipo.yaml` after a valid read keeping the previous schemas, no source answering an empty catalog and `NOT_FOUND`, an unknown type, the catalog URLs built from `CORS_ORIGIN`, no entity field value in any schema)
- [x] 3.3 Add `v1.content.sync` as a `cronProcedure` with `cronMeta({ schedule: "*/5 * * * *" })` that syncs `CONTENT_REPO` and does nothing otherwise; verify with a handler test (no repo → no git call) and that `bun run test --filter=@nonete/api` passes, including the cron discovery tests

## 4. Backend boot

- [x] 4.1 Start one content sync on backend boot without awaiting it, logging the configured source (folder path, or repository URL without credentials and ref) or that none is configured; verify `bun run --filter backend check-types`

## 5. Docker

- [x] 5.1 Install `git` and `ca-certificates` in the runtime stage of `apps/backend/Dockerfile` and in `apps/backend/Dockerfile.dev`, and add the `packages/content/src` sync entry the backend needs in `compose.dev.yml`; verify `docker compose -f compose.dev.yml config` is valid (do not start or stop the user's stack)
- [x] 5.2 In `compose.dev.yml`, mount `${CONTENT_DIR}` read-only at `/content` with `CONTENT_DIR: ${CONTENT_DIR:+/content}` (no host folder mounted when unset), and mount the `content_data` named volume on `/app/.content`; in `compose.yml` and `compose.prod.yml`, mount `content_data` on `/app/.content`; verify each file with `docker compose -f <file> config`, once with `CONTENT_DIR=../documentacion` and once unset

## 6. Documentation and specs

- [x] 6.1 Update the stack skill references (`env.md`: the content variables and the compose override; `docker.md`: git in the backend images, the content mount and `content_data`; `workspaces.md` and `commands.md`: `packages/content` without the CLI, the new API feature; `api/layering.md` if it lists features) and `AGENTS.md`; verify every path they cite exists
- [x] 6.2 Write the editor setup for content repositories in Spanish in `docs/human/` (the single `yaml.schemaStore.url` setting, where it goes in a single folder and in a multi-folder workspace, the dev certificate and `http.proxyStrictSSL`, the SchemaStore trade-off) and link it from its `README.md`; verify the links resolve

## 7. Verification

- [x] 7.1 Run `bun run check-types`, `bunx biome check .` and `bun run test`, and report any failure that predates this change (the three `traces.search` tests) separately
- [ ] 7.2 Ask the user to restart their dev stack with `CONTENT_DIR=../documentacion`, set `yaml.schemaStore.url` in their workspace, and confirm in Cursor that `catalogo/maquinas/*.yaml` completes `ubicacion` and that a new entity's id shows up (and after what: reopening the file or reloading the window); record the answer in `docs/human/`
- [x] 7.3 Hand the manual content-repository cleanup to the user (delete `.esquemas/` and the generated `yaml.schemas` in `../documentacion/.vscode/settings.json` and in the Cursor workspace, set `yaml.schemaStore.url`), since those files are outside this repo
