## 1. API: contract

- [x] 1.1 In `packages/api/src/v1/content/input.ts`, make `createMyRepository` take `url: userUrl.optional()` and `hosted: hosted.optional()` with the `oneSource(false)` refine, and verify with a test in `packages/api/tests/v1/content/own-repositories.test.ts` that both or neither fail validation
- [x] 1.2 In `packages/api/src/v1/content/output.ts`, keep `hosted` and `pushUrl` in `ownRepository` (omit only `catalogUrl`), and update `toOwnRepository` in `handler.ts` to fill them; verify with `check-types` and an existing own-repository listing test asserting `hosted: false` and `pushUrl: null`

## 2. API: handlers

- [x] 2.1 `createMyRepository`: store the hosted marker when `hosted` is sent, create the bare repository (`ensureHostedRepo`) and start no sync; verify with a test that creates `notas` hosted and gets `hosted: true`, a `pushUrl` ending in `/git/notas.git` and no sync call
- [x] 2.2 `updateMyRepository`: answer `BAD_REQUEST` when a hosted row gets `url` or `credentialId`; an edit that sends `hosted` ignores it (zod strips the key); verify with tests that the row stays hosted and that an external one stays external
- [x] 2.3 `listMyBranches` and `listMyContentFolders` with `slug` of a hosted repository: read the bare repository without `checkRemote` or `httpsOnly`; verify with a test that pushes two branches to a hosted user repository and lists them
- [x] 2.4 `deleteMyRepository`: remove the bare repository of a hosted one, sharing a helper with `deleteRepository`; verify with a test that the folder under the hosted root is gone
- [x] 2.5 In `reader.ts`, don't vet the remote or force https in `runSync`/`repoSyncFor` for a hosted repository with an owner (helper `hasRemoteToVet`); verify with a test that syncs a user's hosted repository with commits and records the commit
- [x] 2.6 Git endpoint: add a test in `packages/api/tests/v1/content/hosting.test.ts` that a user's private hosted repository is served (clone/push) with no credentials and that a push starts its sync

## 3. Frontend

- [x] 3.1 Move `CopyableUrl` from `apps/frontend/src/features/admin/shared` to `apps/frontend/src/components/shared/form` and update the admin imports; verify with `check-types`
- [x] 3.2 In `features/profile/repositories/model/repository-form.ts`, add the source (`external` | `hosted`) to the form values, the create and edit payloads (hosted sends `hosted: true` with no URL or credential, edit never sends the source) and the hosted branch in `branchesSource`; verify with unit tests of those functions
- [x] 3.3 In `own-repository-form-dialog.tsx`, add the source select (`Repositorio externo` / `Alojado en la plataforma`), only on creation, hide URL and login for hosted, show the warning that the git URL has no protection for now, and let the ref be typed when there are no branches; verify with the model tests (`createInput` with `hosted` sends no URL or login) and `check-types`; feature components aren't unit-tested by convention
- [x] 3.4 In `own-repository-card.tsx`, show `pushUrl` with `CopyableUrl` instead of the URL for a hosted repository, and in the delete confirmation warn that the git history is deleted too; verify with `check-types` (feature components aren't unit-tested by convention) and a unit test of the moved `CopyableUrl`
- [x] 3.5 Update the frontend types (`model/types.ts`) to the new output and verify with `check-types`

## 4. Validation and conventions

- [x] 4.1 Run `bun run check-types`, Biome, `bun run tailwind:check` and `bun run test`, and fix whatever fails
- [x] 4.2 Update the `stack` skill references that describe user repositories or `CopyableUrl` (if any mention them) to match, and verify every cited path exists
