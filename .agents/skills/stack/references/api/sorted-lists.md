# Sorted lists

How a paginated `list` lets its caller choose the order. The frontend side (which columns are sortable, where the sort lives) is in `references/frontend/data-tables.md`.

## Pick the mechanism

| The list pages by | Order it offers | Use |
|---|---|---|
| A `(timestamp, id)` keyset | That timestamp, newest or oldest first | `withKeysetPagination`'s `direction` (`packages/db/src/keyset-pagination.ts`), cursor unchanged (`encodeKeysetCursor`/`decodeKeysetCursor`) |
| A keyset, and the caller picks the column (`sessionHistory.list`, `adminUser.list`, `cron.listRuns`) | Several columns, either direction | `sortedKeyset` (`packages/db/src/sorted-keyset.ts`, re-exported by `packages/api/src/shared/sorted-keyset.ts`) + `cursorFor` (`packages/api/src/shared/sorted-keyset.ts`) with the `sortedCursor` codec (`packages/api/src/shared/pagination.ts`) |
| An external store (Loki in `logs.query`) | Whatever the store supports (time only) | The store's own direction plus an opaque cursor the handler manages |
| Rows loaded at once | Any column | No server sort: the frontend sorts with `sortRows` |

A procedure whose rows come whole (`organization.list`, `cron.list`…) gets no `sort` input.

## Caller-ordered keyset

- Input: `sort: z.enum(SORT_KEYS).default(<natural key>)` (the keys are the frontend's sortable column ids), `order: z.enum(["asc", "desc"]).default(<natural direction>)`, `limit: paginationLimit(...)`, `cursor: sortedPaginationCursor()`. The codec decodes the cursor during input validation, so a malformed one is `BAD_REQUEST` before the handler runs.
- Handler, in this order:
  1. `const cursor = cursorFor(input.cursor, input.sort, input.order, tiebreakSize)` — a cursor issued for another `sort`, `order` or tiebreak size is `BAD_REQUEST`, before any read.
  2. Map each sort key to one SQL expression (`Record<SortKey, SQLWrapper>`); joins the expression needs (the user's name for `sort: "user"`) go in the query.
  3. `const keyset = sortedKeyset({ primary, order: input.order, tiebreak: [<unique id>] })`. The tiebreak is the list's natural order, ending in a unique column, so the order is total. Its columns go in one direction (they compare as a row tuple): ascending by default, `tiebreakOrder: "desc"` for a newest-first list (`cron.listRuns`: `[started_at, id]` descending).
  4. Select `sortValue: keyset.sortValue` with the row, apply `.where(and(filters, keyset.after(cursor)))`, `.orderBy(...keyset.orderBy)` and `.limit(limit + 1)`, then `paginate()`.
  5. `nextCursor = sortedCursor.encode({ k: input.sort, o: input.order, p: lastRow.sortValue, t: [lastRow.id] })` when `hasMore`. A timestamp tiebreak goes in the cursor as text (select `<column>::text`), never as a `Date`, which drops microseconds.
- Rows without a value for the sort key come last in both directions (`nulls last`); the cursor keeps their position (`p: null`).
- Values travel as text (`sortValue` is `(<expr>)::text`) and go back as untyped parameters, so timestamps and big integers stay exact.
- Value filters of a caller-ordered list are plain inputs applied with `and(...)` to both the page and its total (`sessionHistory.list`: `statuses` as `expires_at > now()` / `<= now()`, `userIds` as `inArray`; `status` also sorts, as a `case` rank).
- `packages/api/src/v1/session-history/handler.ts` is the reference implementation. `cron.listRuns` builds the query in `packages/cron/src/service.ts` (which must not depend on `packages/api`, hence `sortedKeyset` in `@nonete/db`) and checks and encodes the cursor in `packages/api/src/v1/cron/handler.ts`; its keys are `startedAt`, `status` (a `case` rank: running, failed, skipped, success) and `duration` (`finished_at - started_at`, NULL while running), with `statuses` as a value filter.

## Tests

- Helper: `packages/api/tests/shared/sorted-keyset.test.ts` (through the re-export, including `tiebreakOrder: "desc"`) and the codec cases in `tests/shared/pagination.test.ts`.
- Handler: each sort key orders by its expression with the tiebreak, `nextCursor` encodes key, order and position, a cursor from another ordering is `BAD_REQUEST` with no read recorded, the last page has no cursor (`packages/api/tests/v1/session-history/handler.test.ts`).
