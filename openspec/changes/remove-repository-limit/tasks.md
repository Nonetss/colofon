## 1. Backend

- [x] 1.1 Remove the count and `MAX_USER_REPOSITORIES` from `createMyRepository`, make `listMyRepositories` answer an array, and drop the limit from the output and router text; verified by `own-repositories.test.ts` (the eleventh-repository test is gone) and `check-types`.

## 2. Frontend

- [x] 2.1 Read the list as an array in the profile slice, drop `remainingOf`, the "de N permitidos" counter and the disabled add button; verified by `check-types` and the updated unit tests.

## 3. Validation

- [x] 3.1 Run `bun run check-types`, Biome, `bun run test` and `openspec validate remove-repository-limit`; all pass.
