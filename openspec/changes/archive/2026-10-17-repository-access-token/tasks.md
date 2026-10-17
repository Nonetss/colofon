## 1. Access fields in the forms (done)

- [x] 1.1 Add `urlWithAccess` to the manage slice with unit tests; `bun run test` passes
- [x] 1.2 Add `AccessTokenFields` (user, masked token, neutral hint), used by the profile and admin dialogs with `required` on the user and URL; `check-types` passes

## 2. Schema (migration is the user's)

- [x] 2.1 Add the `git_credential` table and the nullable `credential_id` (restrict) on `content_repository` in `packages/db/src/schema`, plus the test row factories; verify `check-types`. Do not generate the migration: tell the user to run it

## 3. API

- [x] 3.1 Create the `git-credential` feature (input, output, handler, router, tests): list with `enabled`, save as an upsert, delete answering `CONFLICT` when in use and `NOT_FOUND` for another user's id, token never in an output; tests assert every rejection and that nothing is written
- [x] 3.2 Add `credentialId` to the repository create and edit inputs of the admin and user procedures: ownership (`NOT_FOUND`), host match (`BAD_REQUEST`), URL stored clean, `credentialId`/host/username in the output; handler tests cover them
- [x] 3.3 Compose the credentialed URL at the reader's store boundary and in the stored-repository branches and folders reads; an undecryptable credential fails the sync with a Spanish message; reader tests show the clone URL carries the token and errors don't
- [x] 3.4 Register the router and verify `check-types` and `bun run test` in `packages/api`

## 4. Frontend

- [x] 4.1 Add the credentials hooks (list, save, delete) invalidating the credentials and repositories keys, following `data-fetching.md`
- [x] 4.2 Add `CredentialField` to the manage slice (select for the URL's host with Ninguna and Nueva credencial, preselection, new-credential fields, fallback to the inline fields when the feature is off) with a unit test for the selection rules
- [x] 4.3 Use it in the profile and admin dialogs: save a new credential before the repository, send `credentialId`, branches and folders reads keep working for a private URL; verify `check-types`
- [x] 4.4 Add the credentials section to `/me/repositories` (list, replace token, delete with the in-use reason), Spanish copy, no git product named

## 5. Checks

- [x] 5.1 Update `references/` of the `stack` skill if the layering or env text changes, then run `bun run check-types`, Biome, `bun run tailwind:check` and `bun run test`, all passing
