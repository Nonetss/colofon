## Context

See proposal.md for the motivation. Today the MCP (`packages/api/src/v1/mcp/`) is read-only. Each request builds a fresh server bound to a `ToolScope` (the caller's `v1.docs`/`v1.skills` clients and the public origin), and the backend route `apps/backend/src/routers/mcp.ts` resolves the caller from a session cookie or an `x-api-key` header. Better Auth's API-key plugin runs with `enableSessionForAPIKeys`, so a key reaches the procedures as an ordinary user session: nothing downstream tells a key apart from a browser login. The behavior contract is in `specs/secret-management` and `specs/secret-requests`.

## Goals / Non-Goals

**Goals:**

- A value leaves the database only decrypted in memory, only to be placed into one outgoing request.
- The MCP and every other API-key path can *use* a secret but can't *manage* or read it.
- A single, generic `request` tool that covers every auth scheme through placeholders, with no per-service code.

**Non-Goals:**

- Key rotation tooling (re-encrypting under a new `SECRETS_ENCRYPTION_KEY`). Changing the key makes the stored secrets unreadable, and the user saves the values again.
- Protecting against a compromised backend host or database plus env: whoever has both can decrypt.
- Per-key secret scopes, organization secrets and SSH (proposal: out of scope).

## Decisions

### 1. Two tables, one ciphertext per secret

- `secret`: `id` uuid, `userId` (FK `user`, cascade), `name`, `description`, `fieldNames text[]`, `ciphertext text`, `origins text[]`, `allowWrite`, `allowInUrl`, `allowInBody`, `lastUsedAt`, `createdAt`, `updatedAt`, unique `(userId, name)`.
- `secret_usage`: `id`, `userId` (FK, cascade), `apiKeyId` nullable, `secretIds uuid[]`, `secretNames text[]` (snapshot, so a renamed or deleted secret still reads in the log), `method`, `url`, `outcome` (`sent` | `refused` | `failed`), `status` nullable, `detail` nullable, `durationMs` nullable, `createdAt`, index `(userId, createdAt desc)`.

All the field values of a secret are encrypted together as one JSON object `{ field: value }`. The field names are kept in plain text beside it, for listing.

*Alternative: one row or one ciphertext per field.* Rejected: it needs more columns and IV handling, and gains nothing, because a request always decrypts the whole secret anyway. A partial update (one value replaced) decrypts, merges and re-encrypts. When the stored blob is unreadable, `update` requires a value for every field.

**The schema files and the migration are the user's:** the agent writes no schema without the go-ahead, and generates no migration.

### 2. AES-256-GCM with the env key, AAD bound to the row

The ciphertext is `base64(iv ‖ ciphertext ‖ tag)`, with a random 12-byte IV for each encryption, using `node:crypto` (Bun). The additional authenticated data is `secret:<id>:<userId>`, so a ciphertext copied into another row or another user fails authentication instead of decrypting. `SECRETS_ENCRYPTION_KEY` is the Base64 of 32 bytes, used as is. A KDF adds nothing for a random key. An authentication failure on decrypt is the "unreadable" state of the spec. The row id is generated before encrypting, so it can go into the AAD.

*Alternative: derive from `BETTER_AUTH_SECRET`.* Rejected: rotating the auth secret, which logs everyone out, would then destroy every secret, and the reverse.

### 3. "Session only" means "no `x-api-key` header"

The management procedures use a new builder, `sessionProcedure` (`protectedProcedure` plus a middleware), that throws `FORBIDDEN` when the request carries an `x-api-key` header, whatever else it carries. The check is on the header because Better Auth gives a key a session indistinguishable from a login. With both a cookie and a key present, the key decides the session anyway. The builder goes to `packages/api/src/index.ts` with its `AppAccess` value, so `/scalar` and the procedure docs show it.

### 4. The request executor is a module, not a procedure

`packages/api/src/v1/secret/request/` holds the pipeline: parse placeholders, then check, then substitute, then send, then mask, then record. The MCP tool calls it directly with `{ userId, apiKeyId, origin }` from the scope. It is not a `v1.secret.request` procedure: the MCP is its only consumer, and a REST twin would be one more surface, documented in `/scalar` and reachable by any key, for no user. This is a deliberate exception to "tools read through procedures", which exists so tools see what the reader sees, and here there's no reader equivalent. The `secrets` tool does go through `v1.secret.list`, called as the caller. `list` is the one management procedure that accepts an API key, because it never returns values.

The server is built with an `McpScope`: the documentation tools' `ToolScope` plus `secrets`, which holds `v1.secret.list` (called as the caller) and `request`, the executor already bound to `{ userId, apiKeyId }`. The backend route binds it: for a request with `x-api-key`, Better Auth's API-key plugin builds the session with the key's id as `session.id` (`@better-auth/api-key` 1.7), so `apiKeyId` is that id, and null for a cookie session. Binding in the route keeps the tools free of the database and lets the tests drive `request` with a fake.

### 5. Placeholder grammar

The grammar is `{{ ws expr ws }}`, where `expr := ref | fn "(" ref ("," ws ref)? ")"`, `fn ∈ {basic, base64, urlencode}`, `ref := name "." field`, and `basic` takes exactly two refs while the others take one. The parser scans the URL, header values and body strings and records each occurrence with its location (`url`, `header`, `body`) and its rendered output. In the URL, the parser runs on the text after the origin. The origin is the URL parsed with every `{{…}}` left as is, and any `{{` before the first `/` after the authority is the "placeholder in the origin" error. A JSON body is walked recursively, substituting only string leaves (keys untouched), and serialized afterwards. A `{{…}}` that is neither a valid expression nor clearly meant as one (its content doesn't start with a secret's or a function's name) stays literal, so alerting or mustache templates in a body survive; a valid-shaped ref to an unknown secret still fails, which catches typos.

### 6. Origin check before substitution

The origin is normalized like the stored ones (WHATWG `URL`: lowercase host, default port dropped) and must match every secret used: exactly, or by `*.<host>` suffix with a dot boundary. No IP-range policy: listing an origin is the user's explicit consent, private networks included. DNS is not pinned. A listed name that resolves somewhere unexpected is the user's DNS (see Risks).

### 7. Sending

`fetch` with `redirect: "manual"`, `AbortSignal.timeout(30_000)`, no credentials, and the agent's headers minus nothing (the forbidden ones were already refused). `HEAD` and `OPTIONS` count as reading methods. The body is read as a stream: the first 1 MiB is decoded, and the rest is only counted to report the full size, within the same 30-second budget. When the budget runs out mid-body, the notice says "more than N". The text/binary split follows the spec's content-type list.

### 8. Masking

The needles are, for each value used with length ≥ 4: the raw value, its standard Base64, its Base64url without padding, `encodeURIComponent(value)`, and its JSON-escaped form when that differs from the raw value. Each rendered placeholder output with length ≥ 4 is a needle too (the `basic` Base64 among them). Replacement is literal, not regex, longest needle first, so an output that contains a value is masked as one unit. Masking covers the status text, the headers, the body and every error message (connection errors can echo the URL).

*Alternative: mask every stored secret of the user.* Rejected: only the values that were sent can come back, and decrypting all of them for each call widens the time values spend in memory.

### 9. Usage and purge

Each call writes one `secret_usage` row after the response (or the refusal) and bumps `lastUsedAt` on the secrets it sent. Refusals for unknown secrets record the names as written, with empty `secretIds`. `v1.secret.usage` uses the shared keyset pagination (`packages/api/src/shared/pagination.ts`). The purge is `v1.secret.purgeUsage` on `cronProcedure` with `cronMeta({ schedule: "30 3 * * *", name: "Purgar uso de secretos" })`.

### 10. Feature switch

A `secretsEnabled()` helper reads `env.SECRETS_ENCRYPTION_KEY`. When it is off, the procedures throw `SERVICE_UNAVAILABLE` (a downstream piece that is not configured, per `references/api/http-semantics.md`) with "Los secretos no están configurados en este servidor", `createDocsMcpServer` doesn't register the two tools and drops their instruction sentence, and `MCP_TOOL_NAMES` splits into the docs tools and the secrets tools, so `/llms.txt` names what the server actually serves. `v1.secret.list` doesn't throw: it answers `enabled: false` with no secrets, so `/me` learns the state without an error that the query client would retry (a 503 is retried as a server error), and needs no new endpoint.

### 11. Frontend

There is a new `apps/frontend/src/features/secrets/manage` slice (list, form dialog with a dynamic field list, delete confirmation, usage sheet), mounted by `profile-content.tsx` as a section beside `ProfileApiKeys`. It reuses `FormDialog`, the confirmation dialog the API-keys slice uses, and TanStack Query over oRPC with invalidation on mutation. Value inputs are `type="password"` with `autocomplete="off"` and are never prefilled from the API, which never sends values anyway.

## Risks / Trade-offs

- [The agent writes a value into a resource of an allowed service (with `allowInBody`) and reads it back later] → Reading it back passes through masking. `allowInBody` is off by default, and the UI explains it.
- [A token derived from a login response (npm `PUT /-/user`) is visible to the agent] → Accepted for this change. Prefer `basic(...)` where the service takes it. Capturing tokens as secrets is a later change.
- [A prompt-injected agent performs destructive calls on an allowed service] → `allowWrite` is per secret and off by default. Every call is logged with its key.
- [Values shorter than 4 characters are not masked] → The tool description and the `/me` form say so.
- [DNS of an allowed name points somewhere else, or the server's resolver is poisoned] → Out of scope. It is the user's infrastructure.
- [The backend can reach private networks] → Only toward origins listed on a secret the request uses, and never without a placeholder.
- [Losing `SECRETS_ENCRYPTION_KEY` loses every secret] → `.env.example` and the `/me` copy say so. The values are re-entered.

## Migration Plan

1. The user adds the two tables to `packages/db/src/schema/` (or approves the agent writing them), then generates and applies the migration.
2. Set `SECRETS_ENCRYPTION_KEY` (`openssl rand -base64 32`). Without it, nothing changes for current deployments.
3. Rollback: unset the key (the feature turns off), or revert the code and drop the tables.

