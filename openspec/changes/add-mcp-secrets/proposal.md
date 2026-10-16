## Why

The documentation tells an agent how to operate the user's services (Komodo, Pangolin, an npm registry…), but the agent can't act on them without their credentials, and pasting an API key into a chat hands it to the model and to every log the conversation reaches. The platform should keep the credentials and make the calls itself, so an agent connected to the MCP can query and change those services while never seeing a credential's value.

## What Changes

- New personal **secrets**: each user stores named secrets, each with one or more named fields (`key`/`secret`, `username`/`password`, `token`…), the origins it may be sent to (internal or external, `http` or `https`), whether it allows write methods (POST, PUT, PATCH, DELETE) and where its values may be placed (headers always; the URL and the body only when enabled). The values are encrypted at rest with a new `SECRETS_ENCRYPTION_KEY` and are never returned by any API, page, log or tool after they are saved.
- New `v1.secret` procedures to create, list, update (rename, change origins and flags, replace values) and delete one's own secrets, and to read their usage log. They only accept a signed-in browser session: a request authenticated by an API key is rejected, so an agent holding a key can't widen a secret's origins.
- A **Secrets** section on `/me` to manage them: values are write-only (typed or replaced, never shown), with each secret's origins, flags, last use and recent usage.
- Two new MCP tools:
  - `secrets` lists the caller's secrets by name, with their field names, origins, flags and description, never their values.
  - `request` performs one HTTP request on the agent's behalf. The agent writes the request with placeholders (`{{komodo.key}}`, `{{basic(npm.username, npm.password)}}`, `{{base64(…)}}`, `{{urlencode(…)}}`), so it can authenticate against any scheme the documentation describes. The platform checks that every secret used belongs to the caller, that the URL's origin is allowed by every secret used, that each placeholder sits where its secret allows it, and that a write method is allowed by every secret used. Then it substitutes the values and sends the request. It does not follow redirects. In the response it masks every value used (raw, base64 and URL-encoded) and truncates the body at 1 MB with a notice. A request with no placeholder is refused, so the tool is never an open proxy.
- Every `request` call is recorded (user, secrets, method, URL without its query, status, duration; never headers or bodies). The log is purged after 90 days by a code-scheduled cron job.
- **BREAKING (spec)**: the MCP stops being read-only as a whole. `request` is declared non-read-only and open-world; every other tool keeps its read-only declaration.
- Out of scope, for later changes: secrets owned by organizations, limiting an API key to a subset of secrets, SSH and other non-HTTP protocols, and capturing tokens from a response as new secrets.

## Capabilities

### New Capabilities

- `secret-management`: personal secrets: their fields, origins and flags, encryption at rest, the session-only `v1.secret` procedures, the usage log and its purge, and the Secrets section on `/me`.
- `secret-requests`: the MCP `secrets` and `request` tools: placeholder syntax, the checks before sending, the outgoing request rules (no redirects, timeout) and the masked, truncated response.

### Modified Capabilities

- `documentation-mcp`: the endpoint lists `secrets` and `request` too and its instructions mention them; the "read-only tools" requirement applies to every tool except `request`.
- `environment-configuration`: the validated server environment gains the optional `SECRETS_ENCRYPTION_KEY`, `.env.example` documents it, and `scripts/setup-dev.sh` generates it.

## Impact

- **Database**: new tables for secrets and for their usage log, owned by `user` with cascade delete. **Requires a migration, which the user generates and applies.**
- **packages/env**: new optional `SECRETS_ENCRYPTION_KEY` (32 bytes, base64). Without it, the secrets feature is off: the procedures answer that it is not configured, `/me` says so, and the MCP doesn't list `secrets` or `request`.
- **packages/api**: new `v1/secret` feature (CRUD, usage, the request executor with placeholder parsing, origin checks, masking and truncation), two new MCP tools in `v1/mcp`, and `MCP_TOOL_NAMES` grows (so `/llms.txt` names them).
- **apps/frontend**: new `secrets` feature with a slice mounted on `/me`.
- **packages/cron**: one code-scheduled purge job.
- **scripts/setup-dev.sh** and `.env.example`.
- **Security surface**: the backend makes outbound HTTP requests, including to private networks, but only to origins the user listed on a secret the request uses.
