Source repo: `/home/nonete/code/stack` (`S`). Each file is ported from its `S` HEAD version, minus the excluded features (agent, collections/favorites, MCP, gRPC, `packages/pick`, stories), keeping this repo's local differences (design.md, "Context"). Frontend tests go to `apps/frontend/tests/<area>/`, not `tests/unit/`.

## 1. API stream lifecycle and live crons list

- [x] 1.1 Add `packages/api/src/lifecycle.ts` and `src/v1/lifecycle.ts`. The v1 entry point closes only the cron watchers, with no `closeAgentRuns`. Point `apps/backend/src/index.ts` shutdown at `closeStreams` from `@nonete/api/lifecycle` (step "api streams"). Verify with `check-types`.
- [x] 1.2 Port the cron half of `09f3d15`:
  - the `watchJobs` publisher and the `closeCronEvents` rename in `v1/cron/events.ts`;
  - the handler, output and router (`GET`, no `cronMeta`, router comment without MCP);
  - the job-change publishes in `apps/backend/src/cron/index.ts`.

  Verify that `v1.cron.watchJobs` appears in the router types.
- [x] 1.3 Add `apps/frontend/src/lib/event-stream.ts`, keeping only `keepConnected`, `isPermanentStreamError`, `wait` and `KeepConnectedOptions`. Move `use-cron-run-events.ts` onto it, and add `crons/overview/hooks/use-cron-job-events.ts` called from `crons-content.tsx`. Verify with `check-types`.
- [x] 1.4 Write the unit tests and run `bun run test`; verify that all suites pass:
  - extend `packages/api/tests/v1/cron/watch-runs.test.ts` with the `watchJobs` cases (job change, run start/finish, anonymous `UNAUTHORIZED`, shutdown ends the stream);
  - add `apps/frontend/tests/lib/event-stream.test.ts`, covering only `keepConnected` and its helpers.

## 2. Typography and test tooling

- [x] 2.1 Apply `fa9c4b8`'s `Text` role and tone changes to the files that exist here. Skip chat and collections. Hand-edit the sign-in `CardTitle` to keep "STACK · Acceso". Verify with `grep -rn "text-sm text-muted-foreground\|font-semibold text-lg tracking-tight"` over the touched files, plus Biome.
- [x] 2.2 Switch the root `test` script to `turbo test --log-order=grouped --ui=stream`, and the `test` script of `apps/frontend`, `packages/api` and `packages/cron` to `bun test --only-failures`. Verify that `bun run test` still runs the three suites and passes.
- [x] 2.3 Add the `tanstack-query-best-practices` entry from `S`'s `skills-lock.json`. Verify the lock stays valid JSON.

## 3. Caller-sorted pagination (backend)

- [x] 3.1 Port the following, and verify with `check-types`:
  - the `direction` option of `packages/db/src/keyset-pagination.ts`;
  - the new `packages/db/src/sorted-keyset.ts`;
  - the sorted cursor helpers in `packages/api/src/shared/pagination.ts`.
- [x] 3.2 Port the sort and filter inputs of `v1.logs.list` (keeping the `stack-backend|stack-frontend` Loki selector) and of `v1.sessionHistory.list` (`sort`, `order`, `statuses`, `userIds`). Verify with `check-types`.
- [x] 3.3 Port the sort and filter changes to `v1.cron.listRuns` and the cron service. `status` becomes `statuses`, and `sort` and `order` are added. `packages/cron/src/{service,index}.ts` uses `sortedKeyset` from `@nonete/db`. Update the frontend callers of `listRuns` so `check-types` passes. Verify that `packages/cron/package.json` still has no `@nonete/api` dependency.
- [x] 3.4 Port or extend the tests below, then run `bun run test` and verify the api and cron suites pass:
  - `packages/api/tests/shared/{pagination,sorted-keyset}.test.ts`;
  - the cron, logs and session-history handler tests, rewriting `#tests/fixtures/env` usages to the local `mock.module("@nonete/env/server")` pattern;
  - `packages/cron/tests/service.test.ts`.

## 4. Data-table system

- [x] 4.1 Run `bun add @tanstack/react-table@^9.2.4` in `apps/frontend`. Verify that `bun install` resolves it and `bun.lock` changes only for it and its deps.
- [x] 4.2 Copy the shared table pieces from `S` HEAD and verify with `check-types`:
  - `components/shared/data-display/{data-table-view,data-table-header,data-table-cells,data-table-cell-content,data-table-column-filter,data-table-columns-menu,dense-table,row-action-items,sortable-list}`;
  - `components/shared/resource/sort-controls.tsx`;
  - the `entity-list.tsx`, `resource-overview.tsx` and `search-input.tsx` changes;
  - `hooks/{use-data-table,use-column-preferences,use-sort-query-param}.ts` and the list mode of `use-query-param.ts`;
  - `lib/sort-rows.ts`;
  - the seven new `icon-registry.ts` keys.
- [x] 4.3 Move the admin lists onto data tables with their column definitions (API keys, organizations and their detail sections, teams and team members, plugins, logs). Delete the replaced `*-list.definition.tsx` files and `log-row.tsx`. Keep this repo's `Text` usage. Verify with `check-types` and `tailwind:check`.
- [x] 4.4 Move the session history onto a data table: header filters by user and status, and server sort. Add `features/admin/shared` with `use-user-filter-options.ts`. Verify with `check-types`.
- [x] 4.5 Move the crons lists onto data tables and verify with `check-types`:
  - `/crons`: one table with the tag column, header filters in the URL (`model/cron-filters.ts`), an "Acciones" column without favorite or collection controls, `useCronJobEvents` kept;
  - the run history: status filter, sort, day grouping only while sorted by start, actions column, `cron-run-output.tsx`;
  - delete `cron-job.definition.tsx`, `cron-run-row.tsx` and `group-by-tag.ts`.
- [x] 4.6 Port the frontend tests into `apps/frontend/tests/`, skipping stories and fixtures, then run `bun run test` and verify the frontend suite passes:
  - `components/data-display/{data-table-view,data-table-column-filter,data-table-columns-menu,data-table-ordering,row-action-items,sortable-list}`;
  - `components/resource/sort-controls`;
  - `hooks/{use-column-preferences,use-sort-query-param,use-query-param}`;
  - `lib/sort-rows`.

## 5. Admin user list on the server

- [x] 5.1 Add `packages/api/src/v1/admin-user/{input,output,handler,router}.ts` (`list` with sort, filters, name-or-email search, sorted cursor; admin builder; `GET`) and register `adminUser: adminUserRouter` in `src/v1/router.ts`. Verify with `check-types`.
- [x] 5.2 Read the admin user table from `adminUser.list`, with infinite scroll and role, ban and user header filters kept in the URL. Point `hooks/use-admin-user-search.ts` and the user filter options at it. Verify with `check-types`.
- [x] 5.3 Port `packages/api/tests/v1/admin-user/handler.test.ts` (sorting, filters, search, cursor, non-admin denial), then run `bun run test` and verify it passes.

## 6. Table scroll box

- [x] 6.1 Give `DataTableView` its own scroll box with a sticky header and a `scrollRef` for the infinite-scroll sentinel (`d47c9bc`). Bound it on every list page and on the run history (`f53289d`). Verify with `check-types` and `tailwind:check`.
- [x] 6.2 Port the extra `data-table-view` test cases for the scroll box, then run `bun run test` and verify they pass.

## 7. Charts

- [x] 7.1 Make the following changes and verify with `check-types` and `tailwind:check`:
  - run `bun add @tanstack/charts@^1.1.0` in `apps/frontend`;
  - add `components/ui/chart.tsx`;
  - add the `--chart-6`, `--color-chart-6` and `.ts-chart-host` styles to `styles/global.css`.
- [x] 7.2 Redraw `crons/detail/components/cron-run-pulse.tsx` as a `Chart` bar strip painted with the status tokens (`1fd713b`). Verify with `check-types`. Ask the user for a screenshot of the pulse in light and dark.

## 8. Data fetching hardening

- [x] 8.1 Stop retrying 4xx errors other than 408 and 429 in `lib/query-client.ts`. Verify with `check-types`.
- [x] 8.2 Add `lib/admin-user-keys.ts` and key every admin user read and mutation invalidation from it: `use-admin-user`, `use-admin-user-search`, `use-admin-stats`, `use-cron-users-by-ids`, `use-user-mutations` and the users list. Verify with `grep -rn '"admin", *"user' apps/frontend/src`, which should return no inline keys.
- [x] 8.3 Make `useResourceMutation` await its invalidations on settle. Verify with `check-types`.
- [x] 8.4 Replace every `useHydratedQuery`/`useHydratedInfiniteQuery` with `useQuery`/`useInfiniteQuery`, using `skipToken` for reads that wait on a value. Delete `hooks/use-hydrated{,-query,-infinite-query}.ts`, `tests/hooks/use-hydrated.test.tsx` and the `lib/orpc.ts` leftover. Verify with `grep -rn useHydrated apps/frontend`, which should return nothing, and with `check-types`.
- [x] 8.5 Add `apps/frontend/tests/lib/query-client.test.ts` for the retry policy, then run `bun run test` and verify all suites pass.

## 9. Agent docs and project config

- [x] 9.1 Add `references/api/sorted-lists.md` (without the `agent.listThreads` row) and `references/frontend/{data-tables,charts,data-fetching}.md`. Trim the collections, console, stories and `ui:pick` lines from them. Verify that every path they cite exists.
- [x] 9.2 Update the existing references:
  - `references/api/layering.md`: the `lifecycle.ts` entry point, `events.ts` in the file split, an "Event streams" section with cron-only examples, and the `shared/` bullet for sorted cursors;
  - `references/cron.md`: `watchJobs`, `closeCronEvents`/`closeStreams`, the `keepConnected` reader, run history sort and filters, the data-table views;
  - `references/frontend/typography.md`: body role for plain `text-sm` copy, display role for overlay titles;
  - `references/commands.md` and `references/testing.md`: the new test flags.

  Verify that the references cite only existing paths.
- [x] 9.3 Update `SKILL.md`, `AGENTS.md` and `openspec/config.yaml`:
  - `SKILL.md`: routing rows for sorted lists, data tables, charts and data fetching, plus their "Always true" rules;
  - `AGENTS.md`: "+ TanStack Table/Charts" in the frontend line, and the validation line;
  - `openspec/config.yaml`: the `events.ts` sentence, reading "a GET route without cron meta".

  Verify that `openspec validate port-stack-improvements --strict` passes.

## 10. Final validation

- [x] 10.1 Grep the touched files for `collection|favorite|agent|thread|mcp|pick|ladle|stories`. Verify it returns no leftover code or doc references to features this repo doesn't have.
- [x] 10.2 Run `bun run check-types`, Biome (`bun run check`), `bun run tailwind:check` and `bun run test`. Verify that all four pass, and report any failure with its output.
