## Why

`simple-stack` was derived from the `stack` template (`/home/nonete/code/stack`) on 2026-10-08. Since then `stack` has shipped two days of improvements to the parts both repos share: admin and cron lists that can be sorted and filtered, a live crons list, charts, typography cleanup and fixes to how the frontend fetches data. This repo still has the pre-change code those commits started from: almost every touched file is byte-identical to `stack`'s pre-change version. Porting them now, while the two repos have barely diverged, keeps code movable between them unchanged and costs far less than doing it later.

## What Changes

Ported from `stack` (commit range `974e152..a309ec7`), keeping only what applies to the features this repo has:

- **API stream lifecycle.** The backend's shutdown closes every long-lived api stream through one entry point (`@nonete/api/lifecycle` → `src/v1/lifecycle.ts`), instead of importing each feature's closer.
- **Live crons list.** New `v1.cron.watchJobs` event stream (published when a job runs or is created, edited or deleted). `/crons` subscribes to it instead of going stale until a reload. A shared reconnecting reader, `keepConnected` in `apps/frontend/src/lib/event-stream.ts`, backs both `watchJobs` and the existing `watchRuns` subscription.
- **Caller-sorted paginated lists.** `sortedKeyset` in `@nonete/db` plus a sorted cursor and a direction on `withKeysetPagination` let paginated lists take a caller-chosen order:
  - **BREAKING** (internal API): `v1.cron.listRuns` takes `statuses` instead of `status`. It sorts by start time, status or duration.
  - `v1.logs.list` and `v1.sessionHistory.list` take a sort, and session history also takes `statuses` and `userIds` filters.
- **Admin user list on the server.** New admin-only `v1.adminUser.list`. It sorts by name, email, role, ban state or creation date; filters by user ids, roles and ban state; searches name or email ignoring case; and pages with a sorted keyset cursor. The admin user table and every admin user picker read from it instead of Better Auth's `listUsers`.
- **TanStack Table data tables.**
  - Shared pieces: `DataTableView`, `useDataTable`, saved column preferences, sortable and resizable headers, a columns menu, URL sort, header filters that can search values on the server, row actions and `sortRows`.
  - The admin lists (users, sessions, logs, API keys, organizations and their detail sections, teams, plugins) and the cron lists (jobs and run history) move onto it.
  - Paginated tables load further pages by infinite scroll, and each table scrolls its rows in its own box under a sticky header.
- **Charts.** TanStack Charts behind a themed `Chart` primitive (`components/ui/chart.tsx`). Its palette comes from the `--chart-*` tokens (a new `--chart-6` is added). The cron run pulse becomes a chart bar strip painted with the status tokens, so each run gets a keyboard-reachable tooltip.
- **Data fetching hardening.**
  - Queries are not retried when they fail with a 4xx other than 408 or 429.
  - Every admin user read is keyed from one `adminUserKeys` factory under the prefix the user mutations invalidate.
  - `useResourceMutation` waits for its invalidations on settle, like `useOrpcMutation` already does.
  - Reads use `useQuery`/`useInfiniteQuery` directly with `skipToken`. The no-op `use-hydrated*` wrappers are removed.
- **Typography.** The remaining hand-built product text goes through `Text` roles and tones.
- **Tooling.**
  - `turbo test --log-order=grouped --ui=stream` and `bun test --only-failures`.
  - The `tanstack-query-best-practices` agent skill is added to `skills-lock.json`.
- **Agent docs.**
  - `stack` skill references for sorted lists, data tables, charts and data fetching.
  - The `events.ts` file split and the lifecycle entry point in `api/layering.md` and `cron.md`.
  - The typography rule update.
  - The matching `SKILL.md`, `AGENTS.md` and `openspec/config.yaml` lines.

Not ported, because this repo doesn't have the features they touch:
- agent chat, threads and runs;
- collections and favorites;
- `packages/pick` catalogs and evals;
- Ladle stories;
- `apps/site`, `apps/worker` and `apps/deepagents`.

Also not ported:
- `stack`'s logo images (this repo has its own mark);
- the Loki dev service (already ported in `594a013`);
- the `tanstack-table` skill (`stack` itself dropped it).

## Capabilities

### New Capabilities

- `frontend-data-table`: the shared TanStack Table system — rendering, column definitions and preferences, sorting (client and server), header filters, row actions, infinite scroll, the table's own scroll box — and which lists use it.
- `frontend-charts`: charts are drawn with TanStack Charts through the themed `Chart` wrapper, with palette versus status-token colors.
- `frontend-data-fetching`: query keys, the admin user key factory, retry policy for client errors, `skipToken` for dependent reads, and mutations that settle after their refetch.

### Modified Capabilities

- `cron-management`: `watchJobs` endpoint and live `/crons` list; run history sorted by start, status or duration and filtered by statuses; jobs and runs shown as data tables; the run pulse drawn as a chart with a keyboard-reachable tooltip.
- `admin`: server-sorted, filtered and searched `adminUser.list` behind the user table and the admin user pickers; session and log tables sorted and filtered from their headers.
- `activity-log`: the admin log query takes a caller-chosen sort.
- `keyset-pagination`: the shared builder takes a direction, and a caller-ordered keyset builder (`sortedKeyset`) is added.
- `list-filter-experience`: list filters live in table headers, with value lists kept in one query param.
- `rpc-api`: the shared cursor pagination helper supports sorted cursors.
- `frontend-component-system`: the in-page layout requirement covers data tables.
- `unit-testing`: the frontend suite covers the query client's retry policy, and the hydration flag is no longer tested.

## Impact

- **Code:**
  - `packages/api`: `lifecycle.ts`, `shared/pagination.ts`, and the `v1/cron`, `v1/logs` and `v1/session-history` features; new `v1/admin-user`.
  - `packages/db`: `keyset-pagination.ts`, new `sorted-keyset.ts`.
  - `packages/cron`: `service.ts` and `index.ts`.
  - `apps/backend`: `src/index.ts` and `src/cron/index.ts`.
  - `apps/frontend`: `components/shared/data-display` and `resource`, `components/ui/chart.tsx`, `src/hooks`, `src/lib`, `styles/global.css`, and the admin and crons features.
- **API:** new `v1.cron.watchJobs` and `v1.adminUser.list`. `v1.cron.listRuns` replaces `status` with `statuses`; its only caller is the frontend, which changes in the same change. Logs and session history gain sort and filter inputs.
- **Dependencies:** `@tanstack/react-table` (^9) and `@tanstack/charts` (^1.1) in `apps/frontend`.
- **Database:**
  - No schema or migration changes. `adminUser.list` reads the existing Better Auth `user` table.
  - Persisted cron `handler_key`s are unchanged.
- **Docs:** the `stack` skill (`SKILL.md` and references), `AGENTS.md`, `openspec/config.yaml` and `skills-lock.json`.
