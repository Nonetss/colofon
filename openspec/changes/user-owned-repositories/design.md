## Context

Repositories are rows of `content_repository` (`packages/db/src/schema/content/content.ts`) cloned by one shared reader (`packages/api/src/v1/content/reader.ts`) whose `RepositoryStore` has `find(slug)`, `list()` and `recordSync`. `v1.docs`, `v1.skills` and the MCP all enumerate through that store, so none of them knows who is asking. The admin procedures in `v1/content` manage every row. See `proposal.md` for the motivation.

## Goals / Non-Goals

**Goals:**
- A user's repository is invisible to everyone but its owner, on every read path.
- Reuse the existing clone, sync, page parser and reader unchanged.

**Non-Goals:**
- Sharing a user's repository with other users or an organization.
- Hosted (pushable) repositories for users.
- Editor schema endpoints for user repositories.
- Admin visibility into, or moderation of, user repositories.

## Decisions

1. **Ownership is a nullable `owner_id` on `content_repository`.** `null` is the platform's repository. Alternative: a separate `user_repository` table; rejected because clone folders, sync, slugs and the reader all key on this one table, and a second table would duplicate every path.

2. **The store takes a viewer.** `find(slug, viewer)` and `list(viewer)` return rows with `owner_id` null or equal to the viewer's id; `recordSync` and the cron's `syncAll` stay unscoped. `v1.docs`, `v1.skills` and the MCP pass the session user. A hidden repository answers like an unknown one (`NOT_FOUND`), so slugs of private repositories are not probeable through reads. Alternative: filter in each handler; rejected as easy to miss on one path.

3. **Separate owner procedures (`v1.content.mine*`) instead of loosening the admin ones.** They are `protectedProcedure`s that scope every query by `owner_id = caller` and only accept external URLs. The admin procedures and screen keep working on `owner_id is null` rows only. Alternative: one set of procedures with role checks inside; rejected because the access rule would live in handler branches rather than in the builder.

4. **User URLs are validated harder than admin URLs.** `https://` only, no credentials other than a token in userinfo, and the host must not be a loopback, private, link-local or unspecified address (literal IPs checked directly; names resolved and the answer checked before cloning). Git runs with the `file`, `ext` and `ssh` transports disallowed. A fixed limit per user (10) is checked on create. Alternative: trust the user like an admin; rejected, because this turns the backend into a request origin inside its own network.

5. **Slug is global.** Same unique index and reserved list, because routes are `/<slug>/…`. Creating one that exists answers `CONFLICT` (this reveals that the slug is taken, not whose it is).

6. **Schema endpoints skip user repositories.** They are `publicProcedure`s with no caller, so they answer `NOT_FOUND` for rows with an owner.

## Risks / Trade-offs

- [DNS rebinding between the check and the clone] → resolve and check right before each sync, not only on create; residual risk accepted for v1 and recorded as an open point for network-level egress rules.
- [Tokens stored in the URL as for admins] → same redaction rules as `content-repository-management`; only the owner's procedures ever see the row.
- [Disk growth from many large clones] → per-user limit; no size cap yet.
- [The user's `FORBIDDEN` leak: syncing] → sync authorizes by visibility, so a stranger's slug answers `NOT_FOUND`.

## Migration Plan

The user generates the migration for `owner_id` (nullable, existing rows stay `null`, so every current repository keeps behaving as today). Rollback: drop the column after deleting user-owned rows.
