# Backend API layering (`packages/api`)

The package root holds infrastructure shared by every API version:

- `context.ts` builds the oRPC `Context` (`{ user, session, headers, requestId }`) from the Hono context set by the auth session middleware and the request logger, plus the request's logger under `@orpc/pino`'s symbol. Read the logger with `getRequestLogger(context)`. The cron scheduler adds `cron: { jobId, jobName }`; HTTP contexts never carry it, and cron contexts have no `requestId` or logger.
- `errors.ts` defines one `errorMap` (every standard oRPC code, `BAD_REQUEST` … `GATEWAY_TIMEOUT`, each with its default message) wired once in `index.ts`, plus one `errors` constructor map (`createORPCErrorConstructorMap(errorMap)`, from `@orpc/contract`). The map declares no HTTP status: oRPC v2 maps codes to statuses in the handlers, whose default `COMMON_ERROR_STATUS_MAP` covers every code, and error bodies carry `code`, `message` and `data` but no `status`. Throw with `errors.UNAUTHORIZED()` etc. — never `new ORPCError(...)` directly. Messages the UI shows are Spanish (`errors.NOT_FOUND({ message: "Comentario no encontrado" })`). Which code to throw: `references/api/http-semantics.md`.
- `index.ts` exports the procedure builders and the meta plugins built with `defineMeta`. Every middleware passed to `o.middleware` is a named function expression (`async function requireAdmin({ context, next })`), never an anonymous arrow: oRPC names its trace span `middleware.<function name>` (`tests/index.test.ts` checks it). `cronMeta`/`getCronMeta` and `getAccessMeta` (its `accessMeta` stays private). Each builder stamps `access` — never set it by hand:

| Builder | Access |
| --- | --- |
| `publicProcedure` | no auth |
| `protectedProcedure` | any signed-in user; `UNAUTHORIZED` otherwise |
| `adminProcedure` | global `user.role === "admin"` (`UNAUTHORIZED` without session, `FORBIDDEN` otherwise) |
| `permissionProcedure(resource, action)` | organization-scoped permission via Better Auth `hasPermission` in the session's active organization; global admins bypass it. Resources/actions come from `appStatements` in `packages/auth/src/permissions.ts` |
| `cronProcedure` | reachable only from the in-process scheduler |

- `shared/` holds cross-feature helpers: `pagination.ts` (`paginate`, `paginateWithTotal`, keyset cursor codec, `paginationLimit`/`paginationCursor`, the `sortedCursor` codec and `sortedPaginationCursor`), `sorted-keyset.ts` (`cursorFor` plus `sortedKeyset` re-exported from `@nonete/db/sorted-keyset`: caller-ordered keyset pages, `references/api/sorted-lists.md`), `search.ts` (inputs and `likePattern` for `search` procedures, see `references/api/free-text-search.md`), `dates.ts` (`toIso`, `toIsoOrNull`), `not-found.ts` (`assertFound`), `procedure-docs.ts` (a procedure's OpenAPI summary/description/tags and input JSON Schema, used by cron discovery). `lib/permissions.ts` wraps the organization permission check.
- `router.ts` assembles the top-level `appRouter` by nesting each version's router under its own key (`v1: v1Router`) — the only place a new version gets wired in.
- `lifecycle.ts` exports `closeStreams()`, which the backend's shutdown calls before the HTTP drain. It calls each version's own `src/<version>/lifecycle.ts`, which ends that version's streams that outlive their requests (today the `v1.cron.watchRuns`/`watchJobs` watchers). A feature that adds such a stream registers its closer in its version's `lifecycle.ts`, never in `apps/backend`. A new version adds one call here.

Procedure metadata (`cron`): see `references/cron-and-mcp/cron.md`.

## Before adding a procedure or helper

Search what exists first; don't add a near-duplicate.

- **Procedures**: `src/v1/router.ts` lists every feature; each `src/v1/<feature>/router.ts` lists its procedures with `.meta(openapi({ summary, description, tags }))`. `rg -n "summary:" packages/api/src/v1` gives a quick index. If one covers the need, call it from the client; if one is close, extend it (an optional filter, an extra output field) rather than adding a sibling, unless the method or access would differ.
- **Helpers**: reuse `src/shared/*` and `src/lib/*` (pagination, search inputs and `likePattern`, ISO dates, `assertFound`, the permission check) and the builders in `src/index.ts`. A helper only one feature uses stays in that feature's `handler.ts`; move it to `src/shared/` when a second feature needs it.
- **Where a new procedure goes**: the feature whose data it reads or writes (its `router.ts`, `input.ts`, `output.ts`, `handler.ts`), or a new feature folder wired into `src/v1/router.ts`. Model it on the closest existing procedure of the same kind (list, search, create, toggle…).

## Features

Everything version-specific lives under `src/<version>/` (currently only `src/v1/`). Every procedure belongs to a **feature**, colocated under `packages/api/src/<version>/<feature>/`, one file per concern:

- `<feature>/input.ts` — zod request schemas, exported as `<feature>Input` keyed by method (e.g. `apiKeyInput.create`). Only present when procedures take input.
- `<feature>/output.ts` — zod response schemas, exported as `<feature>Output` keyed by method.
- `<feature>/handler.ts` — business logic, exported as `<feature>Handler` keyed by method. Each method takes a single options object, `async ({ context, input }: { context: Context; input?: z.infer<typeof <feature>Input.<method>> }) => ...` (omit what it doesn't use) — no other param shapes. Calls into `@nonete/auth` / `@nonete/db` etc. live here, never in the router.
- `<feature>/router.ts` — oRPC wiring only, exported as `<feature>Router`: builder → `.meta(openapi({ summary, description, tags, method, successStatus? }), cronMeta(...)?)` → `.input(...)` (if any, called once: v2 stacks repeated `.input`/`.output` calls) → `.output(...)` → `.handler(({ context, input }) => featureHandler.method({ context, input }))`. Choosing `method` and `successStatus`: `references/api/http-semantics.md`.
- `<feature>/events.ts` — only in a feature that streams events: its publisher and every event it carries. See "Event streams" below.
- `src/<version>/router.ts` nests each feature's router under its own key (`apiKey: apiKeyRouter`, `health: healthRouter`).
- `packages/api/tests/v1/<feature>/handler.test.ts` — the unit tests of the handler, written with it (`references/writing-unit-tests.md`). A feature isn't done without them.

Some features also carry feature-specific modules beside those four (`cron/discovery.ts`, `cron/events.ts`, `cron/runtime.ts`, `entity-icon/targets.ts`).

OpenAPI `summary`/`description`/`.describe()` texts are English.

## Event streams

A feature whose procedures push events over SSE keeps the same file split and adds `events.ts`. Example: `src/v1/cron/events.ts`.

- `<feature>/events.ts` — the feature's single in-memory `MemoryPublisher` (`@orpc/publisher/memory`) and the type of every event it carries, in one `<Feature>Events` map. Fixed names for global events (`"run-changed"`, `"list-changed"`). Template-literal channel families for scoped ones (``[channel: `job:${string}`]: JobMessage``), so each family keeps its own payload type and a subscriber can only reach its own channel. The module also holds:
  - **Publish functions** (`publishCronRunChange`, `publishCronJobsChange`), called by whatever produces the change: a handler, the scheduler wiring in `apps/backend`, a registry. Never by a router.
  - **Subscribe helpers.** Pass `maxBufferedEvents: Number.POSITIVE_INFINITY` when every event matters (lifecycle edges): the publisher's default of 100 drops the oldest events for a slow reader.
  - **A shutdown `AbortController`** combined with the caller's signal, and a `close<Feature>Events()` that aborts it, registered in `src/<version>/lifecycle.ts` (see the root files above).
  - **State on `globalThis`**, so `bun --hot` doesn't leave publishers and subscribers on different instances.
  - Everything is in memory, which assumes a single backend instance.
- `<feature>/output.ts` — each stream's event union as a `z.discriminatedUnion("type", …)` whose members carry `.describe()`, exported next to the method's `eventIterator(<union>)` output. When events are not replayed, the first event is `subscribed` (optionally with a snapshot), so the client refetches on it.
- `<feature>/handler.ts` — the stream as an `async function*` method. It subscribes before yielding its first event: the publisher registers listeners synchronously, so a snapshot taken right after, with no `await` in between, can't miss a change. It ends quietly when the caller leaves or the backend shuts down: the subscription throws the abort reason, which is caught and returned on, not rethrown.
- `<feature>/router.ts` — a read is declared `GET`, with no `cronMeta`. The `description` says what each event means and whether anything is replayed.
- Tests live in `packages/api/tests/v1/<feature>/` like any handler's. A test that calls the shutdown closer goes last in its file, because the abort holds for the whole process.
- The frontend follows a stream with `keepConnected` (`apps/frontend/src/lib/event-stream.ts`), refetching on `subscribed` and reconnecting with backoff.

## Tests

Every new or changed handler method gets its tests in `packages/api/tests/v1/<feature>/handler.test.ts` in the same change: happy path, each error code it throws, and the rows it writes. A new `src/shared` helper gets `tests/shared/<helper>.test.ts`. What to assert and the recipe: `references/writing-unit-tests.md`; the fake database and fixtures: `references/testing.md`.

## Wiring rules

- Intra-feature imports use the version-scoped path (`import { apiKeyInput } from "#v1/api-key/input"`).
- Shared modules (`context.ts`, `errors.ts`, `index.ts`, `shared/*`, `lib/*`) are reached via the unversioned `#*` alias (`import type { Context } from "#context"`), never copied into a version folder.
- Client calls and HTTP paths always carry the version: `orpc.<version>.<feature>.<method>()`, `/rpc/<version>/<feature>/<method>`, `/api/<version>/<feature>/<method>` — the segment comes from the top-level `appRouter`'s nesting, not a hardcoded prefix in `apps/backend`. A new version is a new `src/<version>/` folder plus one key in the package-root `router.ts`; existing versions are never touched.

Guides (Spanish): `docs/human/backend-api.md`.
