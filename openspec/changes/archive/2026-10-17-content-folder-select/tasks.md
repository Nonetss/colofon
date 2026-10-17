## 1. Content package

- [x] 1.1 Add `listContentFolders` to `packages/content` (temporary folder, `git fetch --depth 1 --filter=blob:none`, `ls-tree`, keep the folders of every `doc.config.yaml`, valid paths only, root first, at most 50, an `httpsOnly` option, a variant over a bare repository that skips the fetch) and export it; verify with tests on a local remote: root, a subfolder, both, none, another ref, a bad ref and the cleanup of the temporary folder.

## 2. Backend

- [x] 2.1 Add `listContentFolders` (admin, `QUERY`) and `listMyContentFolders` (owner, `QUERY`) to `packages/api/src/v1/content` (input with `url` or `slug` and optional `ref`, output `{ folders }`, router wiring, hosted via its bare repository, user URL rules and `checkRemote` before reading); verify with handler tests for each scenario of the spec, including `NOT_FOUND`, `BAD_GATEWAY` without credentials and `BAD_REQUEST` for an internal address.

## 3. Frontend

- [x] 3.1 Turn `ContentPathField` (`features/content-repositories/manage`) into a select with a text fallback fed by a folders listing, with a pure `pathOptions(folders, current)` helper for the options (root as “Raíz del repositorio”, current value kept); verify with unit tests of the helper.
- [x] 3.2 Feed it from both forms: hooks and sources for `listContentFolders` in the admin slice and `listMyContentFolders` in the profile one, debounced like the branches and following the chosen ref; verify with `check-types` and the existing form tests.

## 4. Docs and validation

- [x] 4.1 Update the `stack` references that describe the content folder (`workspaces.md`, `api/layering.md`); verify every cited path exists.
- [x] 4.2 Run `bun run check-types`, Biome, `bun run tailwind:check`, `bun run test` and `openspec validate content-folder-select`; all pass.
