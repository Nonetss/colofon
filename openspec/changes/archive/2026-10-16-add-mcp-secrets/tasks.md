## 1. Environment and data model

- [x] 1.1 Add the optional `SECRETS_ENCRYPTION_KEY` to `packages/env/src/server.ts` (Base64 decoding to exactly 32 bytes, otherwise validation fails) and verify with `check-types` and a malformed value failing at startup
- [x] 1.2 Document `SECRETS_ENCRYPTION_KEY` in `.env.example` (optional, what it turns on, that losing it loses the secrets, `openssl rand -base64 32`), generate it in `scripts/setup-dev.sh` and `scripts/bootstrap.sh`, update the stack skill's `references/env.md`, and verify that `setup-dev.sh --force` on a scratch copy writes a valid key
- [x] 1.3 With the user's go-ahead, add the `secret` and `secret_usage` tables to `packages/db/src/schema/secret/` (design §1), export them from the schema index, and verify with `check-types`
- [x] 1.4 Hand off to the user to generate and apply the migration (`bun run db:generate` + migrate). The agent doesn't run it. Verify by the user confirming the tables exist

## 2. Encryption and shared pieces (packages/api)

- [x] 2.1 Add the cipher module in `v1/secret/` (AES-256-GCM, random IV, AAD `secret:<id>:<userId>`, encrypt/decrypt of the `{ field: value }` object, a typed "unreadable" result on auth failure) and `secretsEnabled()`, with unit tests for the round trip, the wrong key, a swapped AAD and a tampered ciphertext
- [x] 2.2 Add `sessionProcedure` (rejects any request carrying `x-api-key` with `FORBIDDEN` and a Spanish message) plus its `AppAccess` value in `packages/api/src/index.ts`, update `references/api/layering.md`, and verify with tests for cookie-only (passes), key-only (403) and both (403)
- [x] 2.3 Add the origin normalizer and matcher (exact, `*.` suffix with a dot boundary, default ports dropped, path rejected), with tests for the spec's origin scenarios

## 3. Management procedures

- [x] 3.1 `v1/secret` input/output schemas (name, field and origin rules, limits, flags; outputs without any value, with `unreadable`) and verify with `check-types`
- [x] 3.2 Handler and router for `list` (protected, keys allowed), `create`, `update` (full field list, omitted value keeps the stored one, unreadable needs every value), `delete` and `usage` (keyset pagination, filter by secret) on `sessionProcedure`, `SERVICE_UNAVAILABLE` when the feature is off, wired in `v1/router.ts`. Verify with tests covering ownership (another user's secret is not found), conflict on a duplicate name, replace one value, remove a field, rename keeping the usage log, and that no response holds a value
- [x] 3.3 `purgeUsage` on `cronProcedure` with `cronMeta({ schedule: "30 3 * * *", name: "Purgar uso de secretos" })`, with a test that deletes 91-day-old entries and keeps newer ones

## 4. Request executor

- [x] 4.1 Placeholder parser and renderer (`ref`, `basic`, `base64`, `urlencode`; locations url/header/body; JSON body string leaves; origin-placeholder error; malformed `{{` error quoting it), with unit tests for each expression and each error
- [x] 4.2 Checks before sending (no placeholder, unknown secret or field, unreadable, origin per secret, `allowInUrl`/`allowInBody`, write methods, forbidden headers, body on a reading method), each refusal naming the secret and the rule without values, with a test per spec scenario
- [x] 4.3 Sender (`redirect: "manual"`, 30 s timeout, streaming body capped at 1 MiB with the full or "more than" size, text/binary split by content type), with tests against a local `Bun.serve` fixture for redirect, timeout, a 3 MB body, binary and an error status
- [x] 4.4 Masking (raw, Base64, Base64url, percent-encoded, JSON-escaped, rendered outputs; longest first; values < 4 chars skipped) over the status text, headers, body and error messages, with tests for an echoed value, an echoed basic header and an echoed URL in a connection error
- [x] 4.5 Usage recording (sent, refused, failed; URL without the query and with placeholders unsubstituted; `lastUsedAt` bump) and the API key's id from the session (design §4), with tests asserting what each outcome stores and that no value, header or body is stored

## 5. MCP tools

- [x] 5.1 Extend `ToolScope` with the `v1.secret.list` client and `caller: { userId, apiKeyId }`, and fill them in `apps/backend/src/routers/mcp.ts`. Verify with `check-types`
- [x] 5.2 `secrets` tool (text with placeholders per field, structured content, empty state with the `/me` address) and `request` tool (input schema, description with the syntax, write rule and masking note, non-read-only/destructive/open-world annotations) in `v1/mcp/tools.ts` and `server.ts`, registered and mentioned in the instructions only when `secretsEnabled()`. Split `MCP_TOOL_NAMES` so `/llms.txt` lists only the tools served
- [x] 5.3 Extend `tests/v1/mcp/` to cover the tool list with the feature on and off, the annotations, `secrets` without values, and a `request` round trip against a fixture server with masking
- [x] 5.4 Update the stack skill's `references/api/mcp.md` with the secrets tools and the executor exception to "tools read through procedures" (design §4)

## 6. Frontend (`/me`)

- [x] 6.1 Create the `features/secrets/manage` slice: query and mutation hooks over `v1.secret.*` with invalidation, the list (name, description, field names, origins, flags, last use, unreadable mark) and the not-configured state (`enabled: false`). Query hooks aren't unit-tested (`references/writing-unit-tests.md`); verified with `check-types`
- [x] 6.2 Create/edit form in a `FormDialog` (origins one per line, three flags with a short explanation each, a dynamic field list with name and a `password` value input never prefilled, edit keeping empty values), delete confirmation and recent-usage view, all copy in Spanish. Feature components aren't unit-tested; the rules live in `model/secret-form.ts`, whose tests cover "edit without retyping", values never prefilled, the unreadable case and the form's problems
- [x] 6.3 Mount the section in `profile-content.tsx` beside `ProfileApiKeys` and verify with `check-types`, Biome and `bun run tailwind:check`

## 7. Validation

- [x] 7.1 Run `bun run check-types`, Biome and `bun run test`, all green
- [x] 7.2 Run `openspec validate add-mcp-secrets --strict` and verify it passes
- [x] 7.3 Hand off to the user for an end-to-end check: create a secret on `/me`, call `secrets` and a `request` against a real service from an MCP client, and see the call in the usage log
