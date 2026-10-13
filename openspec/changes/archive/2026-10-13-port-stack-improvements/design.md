## Context

See `proposal.md` for the motivation and the commit range. Comparing each source commit with this repo shows three things:

- **Almost nothing has diverged.** Nearly every file the ported commits touch is byte-identical to `stack`'s version just before the commit. The differences are lines that belong to features this repo removed or never had: agent chat, collections and favorites, MCP meta, gRPC, `packages/pick`. The hunks that matter mostly don't touch those lines.
- **Some local differences must be kept:**
  - The sign-in title reads "STACK · Acceso".
  - The Loki selector in `v1/logs/handler.ts` is `stack-backend|stack-frontend`.
  - Frontend tests live in `apps/frontend/tests/{lib,hooks,components}` instead of `tests/unit/...`.
  - API tests mock `@nonete/env/server` with `mock.module` instead of using `stack`'s `#tests/fixtures/env`.
  - The cron skill reference is `references/cron.md` instead of `references/cron-and-mcp/cron.md`.
  - `typography.md`, `SKILL.md`, `AGENTS.md`, `layering.md` and `openspec/config.yaml` are worded differently.
- **Some tooling is missing here:** Ladle (component stories), `packages/pick`, `docs/` and the `tanstack-table` skill.

Hard constraints from `AGENTS.md`:
- No schema or migration edits.
- No killing processes and no probing the live app.
- Validation is `check-types`, Biome, `tailwind:check` and `bun run test`.

## Goals / Non-Goals

**Goals:**
- After the port, each shared file matches `stack` HEAD, except for the features listed as not ported, so later ports stay mechanical.
- Each group of tasks leaves the repo green (`check-types`, Biome, `bun run test`), so the port can stop or be reviewed between groups.

**Non-Goals:**
- **Adding Ladle and the component stories.** The story commits (`c9de776`, `data-table-*.stories.tsx`, `chart.stories.tsx`) are skipped. Adding Ladle would be a separate decision.
- **Porting anything from agents, collections, `packages/pick`, `apps/site`, `apps/worker` or `apps/deepagents`**, including the agent halves of shared commits (`watchThreads`, `closeAgentRuns`, `startEventStream`).
- **Re-porting what already landed here in this repo's own form:**
  - the Loki dev service (`594a013`);
  - the unit-test rule in `openspec/config.yaml` (`d08ee60`);
  - the inset scroll reservation (`1f4a24a`);
  - `stack`'s logo images.

## Decisions

### Port files to `stack` HEAD, not commit by commit

Each file is ported by taking its `stack` HEAD version and removing the excluded features from it: imports, exports, columns, actions and doc lines. Replaying the ~40 commits one at a time is not used.

- Several files were rewritten more than once in the range. For example:
  - `crons-content.tsx`: `b6fb0b6`, `853d437`, `193bb6a`, `f53289d`.
  - `use-crons.ts`, `use-session-history.ts`, `use-activity-log.ts`: the data-table commits, then `e699f5e`.
- Replaying commit by commit would mean resolving the same conflicts again and again.
- The local differences listed in Context are reapplied by hand on top of HEAD.
- Files that exist only in `stack` (`data-table-*`, `sorted-keyset.ts`, `admin-user/*`, `chart.tsx`, `event-stream.ts`, `admin-user-keys.ts`, the new references) are copied and then trimmed.

Alternative considered: `git format-patch` plus `git am -3` over the range, skipping excluded paths. This was rejected: the agent hunks inside shared files (for example `v1/lifecycle.ts` and `apps/backend/src/index.ts`) would still fail, and so would every later commit on the same file.

### Group the port by dependency, in `stack`'s order

The groups follow the order of the commits in `stack`:

1. Stream lifecycle and live crons.
2. Typography and tooling.
3. Backend pagination (`sortedKeyset`, sorted cursor, direction).
4. The data-table system and its consumers.
5. `adminUser.list` and the user table and pickers.
6. Table scroll box.
7. Charts.
8. Data fetching hardening.
9. Docs.

Group 8 comes after 4 and 5 because:
- `e699f5e` rewrites the read hooks that the table work changed first;
- `c78ef88` keys `adminUser.list` reads under `adminUserKeys`.

Doing it the other way round would mean rewriting those hooks twice.

### Keep only `keepConnected` from `stack`'s `event-stream.ts`

`startEventStream` and `isAbortError` exist only for the agent chat. The ported `lib/event-stream.ts` keeps:
- `keepConnected`
- `isPermanentStreamError`
- `wait`
- `KeepConnectedOptions`

Its test drops the cases for the two removed functions. Shipping dead code would break the reuse-first rule's assumption that everything in `src/lib` has a consumer.

### The crons "Acciones" column without collections

In `stack`, a non-administrator still sees the favorite and collection buttons in `/crons`'s "Acciones" column. Here those buttons don't exist, so the column holds only:
- the pause toggle (administrators),
- the lock marker (code-declared jobs),
- the edit/delete menu (administrators).

The `frontend-data-table` spec is adapted to match. A non-administrator sees the column only for its lock markers. When no row has a control the viewer can use, the existing "columns the viewer cannot use are left out" rule applies.

### Dependencies are added with `bun add`, not by copying `bun.lock`

`@tanstack/react-table@^9.2.4` and `@tanstack/charts@^1.1.0` go into `apps/frontend/package.json` with `bun add`, run from that workspace. Bun then resolves the lockfile against this repo's own graph. Following `stack`, they are not added to the root catalog.

### `listRuns` changes its input in one step

`v1.cron.listRuns` replaces `status` with `statuses` and adds `sort`/`order`. Its only caller is this repo's frontend, which changes in the same task group, so no compatibility alias is kept. Cron `handler_key`s are not touched, so no data migration is needed.

### Tests follow this repo's layout and fixtures

The ported tests are placed and adapted as follows:
- Frontend tests from `stack`'s `tests/unit/<area>/...` go to `apps/frontend/tests/<area>/...`.
- API tests that import `#tests/fixtures/env` are rewritten to the `mock.module("@nonete/env/server")` pattern that this repo's suites already use.
- Database-backed handler tests use the existing fake from `@nonete/db/testing`. Its `stepArgs` already exists.

## Risks / Trade-offs

- **[Risk]** The change is large, about 80 files, mostly in the frontend. → Each task group ends green, and groups 1–3 are independent of the table work, so they can be reviewed first.
- **[Risk]** A trimmed-out reference can remain in a HEAD file: a `@/features/collections/*` import, an agent icon key, a `FavoriteButton`. → `check-types` catches missing modules. A final grep for `collection|favorite|agent|thread|mcp|pick` over the touched files catches copy and docs.
- **[Risk]** Moving the user table and pickers from Better Auth's `listUsers` to `adminUser.list` changes who enforces admin-only access. → `adminUser.list` is built with the admin procedure builder, and its handler test covers the non-admin denial. Mutations stay on Better Auth.
- **[Trade-off]** Column preferences are saved in the browser (`localStorage`), so they don't follow the user across devices. This matches `stack` and its spec.
- **[Trade-off]** Without Ladle, the data table and chart primitives have no visual playground here. They are covered by unit tests and by their consumers.

## Migration Plan

- No database or configuration migration.
- Deploy as usual. The live crons list needs no new environment variables.
- Rollback is reverting the change. No persisted data depends on the new inputs.
- The column preferences saved in browsers are ignored by older code.

## Open Questions

- Whether to add Ladle later and port `stack`'s stories along with it. This doesn't affect this change.
