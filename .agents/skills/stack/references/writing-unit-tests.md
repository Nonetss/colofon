# Writing unit tests for a change

Code that holds a rule ships with the unit tests that pin that rule, in the same change. Implementing a procedure, a shared helper, a hook or a shared component isn't done until its tests exist and `bun run test` passes. How the suites are set up (preloads, fixtures, the fake database, the DOM): `references/testing.md`.

## When a test is required

| You add or change | Write or update | Suite |
| --- | --- | --- |
| A procedure's handler in `packages/api/src/v1/<feature>/handler.ts` | `packages/api/tests/v1/<feature>/handler.test.ts`, one `describe("<feature>.<method>")` per method (split by topic when it grows: `watch-runs.test.ts`) | `@nonete/api` |
| A procedure builder, middleware, access rule or `src/index.ts` meta | `packages/api/tests/index.test.ts` | `@nonete/api` |
| A helper in `packages/api/src/shared/` or `src/lib/` | `packages/api/tests/shared/<helper>.test.ts` | `@nonete/api` |
| An entity-icon target or cron discovery rule | `packages/api/tests/v1/<feature>/<topic>.test.ts` | `@nonete/api` |
| Anything in `packages/cron/src/` (scheduler, cron service, declared-job sync) | `packages/cron/tests/<module>.test.ts` | `@nonete/cron` |
| Anything in `packages/content/src/` (meta-schema, entity schemas, loader, editor schemas and catalog, content source and git sync) | `packages/content/tests/<module>.test.ts` | `@nonete/content` |
| A helper in `apps/frontend/src/lib/` | `apps/frontend/tests/unit/lib/<file>.test.ts` | `frontend` |
| A hook in `apps/frontend/src/hooks/` that depends only on React and the browser | `apps/frontend/tests/unit/hooks/<hook>.test.tsx` | `frontend` |
| A component in `apps/frontend/src/components/shared/` with logic of its own (parsing, bounds, branches, callbacks) | `apps/frontend/tests/unit/components/<group>/<component>.test.tsx` | `frontend` |
| A pure `model/` module of a frontend feature with logic of its own (tree building, grouping, defaults) | `apps/frontend/tests/unit/features/<feature path>/<module>.test.ts` | `frontend` |
| A surface in `app-surfaces.ts` or a nav rule in `site-nav.ts` | the matching `tests/unit/lib/` test, when the change alters a lookup the tests assert | `frontend` |
| A bug fix anywhere above | a test that fails without the fix, written first | the owning suite |

- Removing or renaming code removes or renames its tests; a dead test file is not left behind.
- A new table that handlers query gets a row factory in `packages/db/testing/rows.ts` (`<table>Row(overrides)` and its `<Table>Row` type: complete row, fixed defaults such as `NOW` and stable ids, `...overrides`), so tests build typed rows without casts. Never touch the schema or migrations for a test.

**Not unit-tested** (no test required): `router.ts` wiring on its own, zod `input.ts`/`output.ts` schemas on their own, Drizzle schema and migrations, `apps/backend`, Astro pages and layouts, feature slices under `apps/frontend/src/features/`, hooks built on TanStack Query or Better Auth's client, Dockerfiles and Caddy config. A change that only touches these is validated with `check-types` + Biome. Don't add a test framework or a new kind of suite to cover them without asking the user.

## What a test asserts

Assert the **rules the code decides**, not the library underneath. For each handler method, one test per branch, at least:

- **Who is let in.** Each rejection with its code: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND` for a row the caller doesn't own, `CONFLICT` for a target whose state refuses everyone, `BAD_REQUEST` for an invalid relation (`references/api/http-semantics.md`). Ownership and permissions checked in the handler: the caller allowed, another user refused.
- **Nothing is written on rejection.** After a rejected call, `expect(fakeDb.calls("insert")).toEqual([])` (or `update`/`delete`).
- **What is written on success.** The `values(...)`/`set(...)` arguments read with `stepArgs(call, "values")`, the number and order of writes, and whether they ran inside a `transaction`.
- **What is returned.** The mapping to the output shape (ISO dates, `null` vs omitted, nested trees, labels), and the paging contract (page size, `nextCursor` only when more rows exist, decoding back to the last row).
- **Integration failures.** What a disabled integration answers (`LOKI_URL` unset → an empty page, no `fetch` made), and a `fetch` rejection or non-OK response → `BAD_GATEWAY`.
- **Edge cases and idempotent paths.** Empty lists, already-deleted rows, pagination cursors; a conflict or a repeated delete returns the existing state without a second write.

Access that the builder enforces (`protectedProcedure`, `adminProcedure`…) is already covered by `tests/index.test.ts`; test it per procedure only when the handler adds its own check.

Don't assert SQL, column names inside a `where`, call order that doesn't matter, private helpers, or exact lists that grow with the code (surfaces, procedures): assert a property of the list instead. Don't snapshot.

One `describe` per method (`describe("comment.update", …)`). Test names are English sentences stating the behavior (`"a deleted comment is NOT_FOUND and nothing is written"`). Shared values go in `const`s at the top of the file (`const context = userContext()`), and repeated setup in a small named function.

## Recipe: a handler in `packages/api`

1. Create or extend `packages/api/tests/v1/<feature>/handler.test.ts`. Import the fixtures through `#tests/fixtures/...`, the handler through `#v1/<feature>/handler` and the rows from `@nonete/db/testing`. No relative imports.
2. Reset every fixture the handler reaches in `beforeEach`: `fakeDb.reset()` always; `resetEnv()` when it reads the env; `resetCronService()` for cron handlers.
3. For each test, queue the database results **in the order the handler awaits them**, one per awaited chain (`fakeDb.queue("select", [row])`, `fakeDb.queue("query.<table>.findFirst", row)`, `fakeDb.queue("delete", undefined)` for a write whose result is unused; a write followed by a re-read queues both). A missing queue fails loudly with the operation's name (`query.comments.findFirst`), which tells you what the handler awaited.
4. Call the handler method with a context from `#tests/fixtures/context` (`anonymousContext()`, `userContext()`, `adminContext()`) and a typed input.
5. Assert the result, the recorded calls, or the error with `expectErrorCode(promise, "CODE")`.

`packages/api/tests/v1/comment/handler.test.ts` is the reference file: it covers reads, writes, every error code and an idempotent delete.

```ts
import { beforeEach, describe, expect, test } from "bun:test"
import { commentRow, stepArgs, userRow } from "@nonete/db/testing"
import { userContext } from "#tests/fixtures/context"
import { fakeDb } from "#tests/fixtures/db"
import { expectErrorCode } from "#tests/fixtures/errors"
import { commentHandler } from "#v1/comment/handler"

const context = userContext()
const author = userRow({ id: "user-id" })
const input = { id: "comment-1", content: "Edited" }

beforeEach(() => fakeDb.reset())

describe("comment.update", () => {
  test("a deleted comment is NOT_FOUND and nothing is written", async () => {
    fakeDb.queue("query.comments.findFirst", {
      ...commentRow({ deletedAt: new Date() }),
      author,
    })

    await expectErrorCode(
      commentHandler.update({ context, input }),
      "NOT_FOUND"
    )
    expect(fakeDb.calls("update")).toEqual([])
  })

  test("stores the new content and returns the comment", async () => {
    fakeDb.queue("query.comments.findFirst", { ...commentRow(), author })
    fakeDb.queue("update", [])
    fakeDb.queue("query.comments.findFirst", {
      ...commentRow({ content: "Edited" }),
      author,
    })

    const node = await commentHandler.update({ context, input })

    const [update] = fakeDb.calls("update")
    if (!update) throw new Error("no update recorded")
    expect(stepArgs(update, "set")[0]).toEqual({ content: "Edited" })
    expect(node).toMatchObject({ id: "comment-1", content: "Edited" })
  })
})
```

Variations:

- **The rule lives in the builder or a middleware** (access, `permissionProcedure`): call the procedure through the router with `call(procedure, input, { context })` from `@orpc/server`, which runs the middleware chain, as `tests/index.test.ts` does.
- **Env-gated code** (`LOKI_URL`, `FRONTEND_URL`): set `testEnv.LOKI_URL = …` from `#tests/fixtures/env` in `beforeEach` or in the test; leave it unset to test the disabled branch.
- **`fetch`**: `const fetchSpy = spyOn(globalThis, "fetch")` at the top, `fetchSpy.mockReset()` plus `fetchSpy.mockResolvedValue(Response.json(...))` in `beforeEach`, `fetchSpy.mockRestore()` in `afterAll`. See `tests/v1/logs/`.
- **Better Auth**: `spyOn(auth.api, "<method>")` at the top of the file with the shapes in `tests/fixtures/auth.ts`, `mockReset()` in `afterEach`. See `tests/v1/api-key/`.
- **Streaming handlers** (async generators, `cron.watchRuns`): collect with `for await` into an array; to assert a precondition error, `await expectErrorCode(generator.next(), "CODE")`. See `tests/v1/cron/watch-runs.test.ts`.
- **A registry** (`entityIconTargets`): register a fake entry in `beforeEach` and delete it in `afterEach`.

Never `mock.module(...)` a specifier the preload already replaces (`@nonete/db`, `@nonete/env/server`). Configure the shared fixture instead.

## Recipe: `packages/cron`

Inject the fake database and the silent logger through the function's options (`createCronService({ db: fake.db, … })`), never through a module mock. Scheduler tests install the `Bun.cron` spy with `installFakeBunCron()` and fire jobs by hand. Wait for a background run through `onRunChange`, never with a sleep. See `packages/cron/tests/scheduler.test.ts`.

## Recipe: `apps/frontend`

- **Helper**: plain `bun:test`. Freeze the clock with `setSystemTime(NOW)` in `beforeEach` and `setSystemTime()` in `afterEach` whenever the output depends on "now".
- **Hook**: `renderHook` from `@testing-library/react`, state changes inside `act(...)`, `cleanup()` in `afterEach`. Timers through `jest.useFakeTimers()` and `jest.advanceTimersByTime(ms)`, restored with `jest.useRealTimers()`. Browser APIs happy-dom lacks (`navigator.clipboard`) are stubbed in the test.

  ```ts
  const { result, rerender } = renderHook(
    ({ value }) => useDebouncedValue(value, 300),
    { initialProps: { value: "a" } }
  )
  rerender({ value: "ab" })
  act(() => jest.advanceTimersByTime(300))
  expect(result.current).toBe("ab")
  ```

- **Component**: `render(...)`, then query by role and accessible name (`screen.getByRole("button", { name: "Hora: aumentar" })`), interact with `fireEvent`, and assert what the user sees or what the callbacks receive (`const onChange = mock((_: number) => {})`). `cleanup()` in `afterEach`. No `user-event`, no `jest-dom` matchers, no class-name or snapshot assertions. Accessible names are the Spanish UI copy.

## Before calling the change done

1. Watch the new test fail at least once: against the bug for a fix, or by breaking the rule on purpose for new code. A test that has never failed may not test anything.
2. `turbo run test --filter=<workspace>` for the suites touched, then `bun run test` from the root.
3. `bun run --filter <workspace> check-types` (test files are type-checked: the no-casts rule applies to them too) and `bunx biome check <paths>`.
4. In an OpenSpec change, `tasks.md` lists the tests as their own tasks next to the code they cover, and the delta spec of the capability states the behavior they pin.
