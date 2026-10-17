## 1. Data model

- [x] 1.1 Propose the `content_path` column (text, not null, default empty) on `content_repository` in `packages/db/src/schema/content/content.ts` once the user confirms the schema edit, add `contentPath: ""` to `contentRepositoryRow` in `packages/db/testing/rows.ts`, and hand the migration to the user; verify with `bun run check-types`.

## 2. Content package

- [x] 2.1 Add a path validator and a resolver in `packages/content` (textual check; `realpath` containment inside the clone, missing or non-directory as absent) and export them; verify with unit tests for `..`, absolute, dot segments, a symlink out and a missing folder.
- [x] 2.2 Make `readEditDates` take the content folder, limit the log to `<folder>/docs` and `<folder>/catalog` and strip the prefix; verify with a `source.test.ts` case on a repository whose site is in `docs/`.

## 3. Backend

- [x] 3.1 Resolve the content root per repository in `packages/api/src/v1/content/reader.ts` (declarations, site build, caches keyed by it, `folderOf` for images, a once-only log for an unusable folder) and add `contentPath` to `StoredRepository`; verify with reader tests for a site in a subfolder, files outside it ignored, a missing folder, a symlink out and a changed path serving the new folder.
- [x] 3.2 Add `path` to the create and edit inputs (admin and owner) and to the repository outputs, with the Spanish validation message; editing only the path starts no sync; verify with `repositories.test.ts` and `own-repositories.test.ts` cases for each scenario of the spec.
- [x] 3.3 Update the image route in `packages/api/src/v1/docs/handler.ts` and its test to read under the content root; verify with a `docs.file` case on a subfolder site.

## 4. Frontend

- [x] 4.1 Add the optional “Carpeta del contenido” field and the folder on the card to the admin form and the profile form (search `features/admin/content` and `features/profile/repositories`, and reuse the shared slice where it fits), and extend `createInput`/`updateInput`; verify with unit tests for both inputs and `check-types`.

## 5. Docs and validation

- [x] 5.1 Update the `stack` references and `references/workspaces.md` where they say the content sits at the repository root; verify every cited path exists.
- [x] 5.2 Run `bun run check-types`, Biome, `bun run tailwind:check`, `bun run test` and `openspec validate content-subfolder`; all pass.
