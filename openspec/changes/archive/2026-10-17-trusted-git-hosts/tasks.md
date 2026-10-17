## 1. Content package

- [x] 1.1 Add `parseTrustedHosts` and a trusted-set argument to `userRemoteProblem` and `checkUserRemote` in `packages/content/src/git/user-remote.ts`; verify with unit tests for parsing, a listed name resolving to a private address, an unlisted one and plain http on a listed host.

## 2. Environment and backend

- [x] 2.1 Declare `TRUSTED_GIT_HOSTS` in `packages/env/src/server.ts`, document it in `.env.example` and the `stack` env reference; verify with `check-types`.
- [x] 2.2 Pass the trusted set from the environment to the input validation, the reader and the handler in `packages/api/src/v1/content`; verify with tests that a listed host is accepted, checked syncs run and unlisted hosts still fail.

## 3. Validation

- [x] 3.1 Run `bun run check-types`, Biome, `bun run test` and `openspec validate trusted-git-hosts`; all pass.
