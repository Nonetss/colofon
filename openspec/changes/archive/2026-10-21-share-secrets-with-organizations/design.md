## Context

- Repository sharing (`2026-10-19-share-repositories-with-organizations`) already brought self-service organizations (`v1.myOrganization`, `/me/organizations`) and one way of sharing: a join table `content_repository_share`, visibility that also requires the owner to still be a member of the organization (`sharedRepositoriesOf`, `packages/api/src/v1/content/handler.ts`), a share procedure that replaces the whole list (`shareMyRepository`), share cleanup when the owner leaves or is removed (`removeMembership`, `packages/api/src/v1/my-organization/handler.ts`) and a `SharingField` on the repository form (`apps/frontend/src/features/profile/repositories/components/sharing-field.tsx`).
- A secret (`packages/db/src/schema/secret/secret.ts`) belongs to one user; its values are encrypted under a key bound to the row's id and owner (`decryptValues(ciphertext, { secretId, userId })`), so any caller's request can decrypt it as long as it passes the row.
- The `request` executor (`packages/api/src/v1/secret/request/execute.ts`) loads the caller's secrets by `userId`, and the planner (`plan.ts`) and placeholder parser (`placeholders.ts`) key everything by the secret's name; the mask label is `<name>.<field>`. `secret_usage.userId` is already the caller, `secretIds` the rows used.
- The user chose to address shared secrets with the organization's slug in front (`{{equipo-docs/komodo.key}}`); own secrets keep their bare name.

## Goals / Non-Goals

**Goals:**
- Share a secret with organizations exactly as a repository is shared: same who-may-share rules, same end-of-share rules, same visibility check, same form control.
- Placeholders that are never ambiguous for the caller, whoever else shares what.
- The owner keeps full oversight: they see every call made with their secret.

**Non-Goals:**
- Sharing with teams, members editing a shared secret, organization-owned secrets.
- Letting a member see another member's calls.
- Re-encrypting values per member: the owner's ciphertext is decrypted for the member's request, as for the owner's.

## Decisions

### 1. One join table, `secret_share`

`secret_share(secret_id uuid → secret.id on delete cascade, organization_id text → organization.id on delete cascade, created_at, primary key (secret_id, organization_id), index on organization_id)`, in `packages/db/src/schema/secret/secret.ts` with its relations (`secret.shares`, `organization.secretShares`), mirroring `content_repository_share`. Cascades cover a deleted secret, owner (through the secret) and organization. Nothing changes in `secret_usage`: it already records the caller (`userId`) and the rows used (`secretIds`).

*Alternative:* a generic `organization_share(kind, resource_id, organization_id)`. Rejected: no foreign key to two different tables, and the two shares have different rules (name uniqueness).

The agent writes the schema only after the user approves this change; the user generates and applies the migration (`AGENTS.md`).

### 2. Visibility requires the owner to still be a member

As for repositories (decision 2 of the repository change), a secret is shared with a caller when some share of it names an organization where both the caller and the secret's owner are members. One query, `sharedSecretsOf(userId)`, in `packages/api/src/v1/secret/sharing.ts`:

```
secret_share s
  join member me     on me.organization_id = s.organization_id and me.user_id = :user
  join secret x      on x.id = s.secret_id and x.user_id <> :user
  join member owner  on owner.organization_id = s.organization_id and owner.user_id = x.user_id
  join organization o on o.id = s.organization_id
  join user u        on u.id = x.user_id
```

returning one row per (secret, organization) with the secret row, the organization (id, name, slug) and the owner's name. `removeMembership` also deletes the leaving user's secret shares with that organization in the same transaction (a `sharesOfOwnerIn`-like condition over `secret_share`), so the owner's own view stays honest; the read-time check covers every other path (Better Auth endpoints, admin `removeMember`).

### 3. Address = `<slug>/<name>` for shared, `<name>` for own

The executor builds the caller's usable secrets as `{ address, row }`: their own rows with `address = row.name`, then one entry per row of `sharedSecretsOf` with `address = "<slug>/<name>"`. The planner and the masker key by `address` instead of `row.name` (the `Secret` type it takes becomes `UsableSecret = { address: string; secret: Secret }`); refusal texts, mask labels (`[secret:equipo-docs/komodo.key]`) and `secretNames` in the log use the address. Decryption uses the row (`secretId`, `userId` of the owner), unchanged.

The parser's `NAME` in `REF` becomes `(?:[a-z0-9-]+/)?[a-z0-9][a-z0-9-]*`, so a ref's `secret` is the whole address; `/` can't appear in a slug or a name, so the split is unambiguous. `LEADING_NAME` accepts an optional `<slug>/`, and `isSecretName` is fed the caller's addresses plus each `<slug>/` prefix, so `{{equipo-docs/komodo}}` is reported as malformed instead of passed through.

Unknown address: `You have no secret named "x"` becomes, for a prefixed address, `No secret "komodo" is shared with you through "casa". Call secrets to list them.`; an unreadable shared secret says only its owner can save its values again.

*Alternative:* a separate lookup map for shared secrets. Rejected: the planner's rules are per secret whatever its origin; one map keyed by address keeps them in one path.

### 4. Name uniqueness per organization, checked in code

`v1.secret.share` and `v1.secret.update` (on rename) check, inside their transaction, that no other secret with that name is shared with any of the target organizations (`select … from secret_share join secret where organization_id in (…) and name = :name and secret.id <> :id`). A collision answers `CONFLICT` naming the organization. A database constraint isn't possible (the name lives on `secret`, the organization on `secret_share`); the race between two owners sharing the same name at once is accepted (at worst two rows with the same address: the executor then refuses that address as ambiguous instead of picking one).

### 5. `v1.secret.share` and the widened procedures

- `share` (PUT, `sessionProcedure`, `requireSecrets`): `{ id, organizationIds }` replaces the shares in one transaction; the secret must be the caller's (`NOT_FOUND`), every id an organization the caller belongs to (`NOT_FOUND`, nothing written), and names unique (decision 4). `ownersOrganizations` and `organizationsOf` move from `content/handler.ts` to `packages/api/src/shared/organization-shares.ts` (not `organization.ts`, which the input schemas import and must stay free of the database) so both features use them. Returns the secret.
- `list`: each own secret gains `organizations: { id, name, slug }[]`; the output gains `shared: { …secret without dates, organization: { id, name, slug }, ownerName, prefix }[]` from `sharedSecretsOf`, ordered by organization slug then name. `enabled: false` keeps both lists empty.
- `usage`: filter becomes `userId = caller OR secret_ids && <caller's own secret ids>`; each entry gains `user: { id, name }` (left join on `user`). `secretId` filters on `secret_ids @> [id]` and is accepted for an own secret or one shared with the caller (for a shared one, only the caller's calls come back, by the base filter).
- `executeRequest`: `lastUsedAt` is updated by secret id, not by `userId = caller`.

### 6. MCP

`secretsTool` lists own secrets then shared ones, each shared block naming the organization and owner, with prefixed placeholders (`placeholdersOf` takes the prefix). `secretsOutput` gains optional `organization` and `ownerName`. The server instructions and the `secrets` tool description mention `{{<organization>/<secret>.<field>}}`.

### 7. Frontend

- `SharingField` now has consumers in two domains (`features/profile/repositories` and `features/secrets/manage`), so it moves to the slice that owns organizations, `features/profile/organizations`, exported from its `index.ts` with `sameOrganizations` (`model/sharing.ts`); it reads `useMyOrganizations` (the duplicate `useShareableOrganizations` goes) and takes `hint` and `emptyText` props, since the copy differs between a repository and a secret.
- `features/secrets/manage` and `features/profile/secrets`: the secret form gets the field (form saves the secret, then calls `share` only when the selection changed, as the repository form does); each own secret shows its organizations or "Privado"; a "Compartidos contigo" section lists `shared` read-only (organization, owner, prefix, fields, origins, flags, unreadable mark with "solo su propietario puede arreglarlo"); the usage view shows who made each call. `share` invalidates `secret.list`; membership mutations in `features/profile/organizations` also invalidate `secret.list` (leaving hides shared secrets).

## Risks / Trade-offs

- [Re-slugging an organization changes the placeholders its shared secrets are written with] → stated in the spec; the `secrets` tool always shows the current prefix, and the organization's rename form could warn later.
- [A member's agent can send the owner's credentials to any origin the secret allows, with the owner's flags] → that's the point of sharing; the owner sees every call in the usage log, and can unshare at once.
- [One more query per `request` and per `list`] → a single indexed join, like the repository audience.
- [Duplicate addresses after a race] → refused as ambiguous at request time (decision 4), never resolved to the wrong owner.

## Migration Plan

1. User approves; the agent adds `secret_share` and its relations to the Drizzle schema.
2. The user runs `bun run db:generate` and applies it; nothing to backfill.
3. Deploy backend and frontend together. Rollback: revert the code; the unused table is harmless.

## Open Questions

None.
