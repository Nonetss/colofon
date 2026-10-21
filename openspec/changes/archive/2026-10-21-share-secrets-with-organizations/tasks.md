## 1. Database (stop for the user)

- [x] 1.1 Add `secretShare` (design §1) to `packages/db/src/schema/secret/secret.ts` with its relations (`secret.shares`, `organization.secretShares`) and exported types, mirroring `contentRepositoryShare`; verify `check-types` in `packages/db`
- [x] 1.2 Stop and ask the user to run `bun run db:generate` and apply the migration; do not continue with tasks that need the table at runtime until they confirm

## 2. Shared secrets and the share procedure (packages/api)

- [x] 2.1 Move `ownersOrganizations` and `organizationsOf` from `src/v1/content/handler.ts` to `src/shared/organization-shares.ts` and import it from both features; verify `bun test` in `packages/api` still passes for `tests/v1/content`
- [x] 2.2 Add `src/v1/secret/sharing.ts` with `sharedSecretsOf(userId)` (design §2) and the per-organization name check (design §4); verify tests in `tests/v1/secret` for: shared with the caller's org and owner still a member → listed; owner left the org → not listed; caller not a member → not listed; the caller's own secret never among the shared
- [x] 2.3 Add `v1.secret.share` (PUT, `sessionProcedure`, needs the key) with input/output/router, and widen `list` with `organizations` per own secret and the `shared` list (design §5); verify tests for: not the owner `NOT_FOUND`, an org the owner isn't in `NOT_FOUND` with nothing written, replacing the list, name taken in the org `CONFLICT`, API key `FORBIDDEN`, key unset service-unavailable, API key can `list` and sees `shared`
- [x] 2.4 Make `update` refuse a rename onto a name shared with one of the secret's organizations; verify a `CONFLICT` test and that a rename without collisions still keeps the usage log
- [x] 2.5 In `my-organization`'s `removeMembership`, also delete the leaving/removed user's secret shares with that organization in the same transaction; verify a `tests/v1/my-organization` test that leaving drops them and keeps the member's own secrets

## 3. Requests with shared secrets (packages/api)

- [x] 3.1 Accept the optional `<slug>/` prefix in `placeholders.ts` (`REF`, `LEADING_NAME`, `isSecretName` fed addresses and prefixes) (design §3); verify `tests/v1/secret/request` parser tests for `{{equipo-docs/komodo.key}}`, prefixed refs inside `basic`/`base64`/`urlencode`, and `{{equipo-docs/komodo}}` reported as malformed
- [x] 3.2 Switch the planner and masker to `UsableSecret` keyed by address, with the shared-specific refusal texts (unknown prefixed address, unreadable shared secret, duplicate address refused as ambiguous); verify planner tests for every new scenario of `secret-requests` (own and shared with the same name, shared secret's own `allowWrite`, mask label `[secret:equipo-docs/komodo.key]`)
- [x] 3.3 In `executeRequest`, load own secrets plus `sharedSecretsOf`, record `secretNames` as addresses, and update `lastUsedAt` by secret id; verify an executor test where a member's request decrypts the owner's value, is logged under the member with `equipo-docs/komodo`, and bumps the owner's `lastUsedAt`
- [x] 3.4 Widen `usage` to the caller's calls plus anyone's calls with the caller's own secrets, with `user: { id, name }` per entry and `secretId` accepted for a shared secret (design §5); verify tests for: the owner sees a member's call, a member doesn't see another member's call, filter by a shared secret returns only the caller's calls

## 4. MCP (packages/api)

- [x] 4.1 Make `secretsTool` list own secrets then shared ones with organization, owner and prefixed placeholders, add the optional fields to `secretsOutput`, and mention `{{<organization>/<secret>.<field>}}` in the `secrets` and `request` descriptions and the server instructions (design §6); verify `tests/v1/mcp` cover a shared secret's block and the empty-state text only when the user has neither own nor shared secrets
- [x] 4.2 Update `.agents/skills/stack/references/api/mcp.md` where it describes the secrets tools as owner-only; run `bun run test`, `check-types` and Biome for `packages/api`; verify all pass

## 5. Frontend

- [x] 5.1 Move `SharingField` (on `useMyOrganizations`, dropping `useShareableOrganizations`) and `sameOrganizations` into `apps/frontend/src/features/profile/organizations`, exported from its `index.ts`, with `hint` and `emptyText` props, and update the repository form to import them from there (design §7); verify `check-types` and Biome
- [x] 5.2 In `features/profile/secrets`, add the sharing field to the secret form (call `share` after save only when the selection changed), show the organizations or "Privado" on each own secret, and invalidate `secret.list` after sharing; verify `check-types` and Biome
- [x] 5.3 Add the read-only "Compartidos contigo" section (organization, owner, prefix, fields, origins, flags, unreadable mark saying only its owner can fix it) and show who made each call in the usage view; verify `check-types` and Biome
- [x] 5.4 Make the membership mutations of `features/profile/organizations` also invalidate `secret.list`; verify `check-types`
- [x] 5.5 Add unit tests in `apps/frontend/tests/unit/` for any moved or new helper with logic (e.g. the sharing field's `toggled`); verify `bun run test` and `bun run tailwind:check`
