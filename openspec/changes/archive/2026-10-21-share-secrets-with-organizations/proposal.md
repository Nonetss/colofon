## Why

Repositories can now be shared with organizations, but the secrets that let an agent call the services those repositories document are still strictly personal: every member of a team has to create their own copy of the same `komodo` or `pangolin` credentials before their agent can use them. Sharing a secret with an organization, the same way a repository is shared, lets one person hold the credentials and the rest of the team use them through the MCP without ever seeing the values.

## What Changes

- **Sharing secrets:** the owner of a secret can share it with any number of organizations they belong to, and stop sharing it, from a browser session only (never with an API key). Every member of those organizations can use it through the MCP's `request` tool, with the secret's own origins and flags; only the owner edits, deletes or changes its sharing, and nobody but the owner's agent ever gets more than the field names. A share ends the same ways a repository share does: the owner unshares it, leaves or is removed from the organization, the organization is deleted, or the secret or its owner is deleted. Visibility also requires the owner to still be a member, as for repositories.
- **Addressing a shared secret:** the caller's own secrets keep their placeholders (`{{komodo.key}}`); a secret shared with them is always written with the organization's slug in front, `{{equipo-docs/komodo.key}}`, also inside `basic`, `base64` and `urlencode`. Within one organization, the names of the secrets shared with it are unique: sharing a secret whose name another member already shared there, or renaming a shared secret onto such a name, answers `CONFLICT`.
- **Listing:** `v1.secret.list` returns, besides the caller's own secrets (now with the organizations each is shared with), the secrets shared with the caller, each with its organization, its owner's name and its placeholder prefix. The MCP's `secrets` tool lists both, with the exact placeholders.
- **Usage log:** every call records who made it. The owner of a secret sees in its usage the calls of every member who used it; a member sees their own calls only. A shared secret's last use is updated whoever uses it.
- **Profile screen:** `/me/secrets` gains a sharing field in the secret form (the same control as the repository form), the organizations on each of the caller's secrets, a read-only “Compartidos contigo” list of the secrets shared with the caller, and the author of each call in a secret's usage.
- **Database:** one new table linking a secret to the organizations it is shared with, and nothing else (the usage log already records the calling user). The schema change and its migration are the user's (`AGENTS.md`).
- Sharing with teams, letting members edit a shared secret and organization-owned secrets are out of scope.

## Capabilities

### New Capabilities

- `secret-sharing`: sharing a user's secret with organizations — who may share and with which organizations, name uniqueness within an organization, what members can do with a shared secret, when a share ends, the share procedure and the sharing controls of `/me/secrets`.

### Modified Capabilities

- `secret-management`: `v1.secret.list` also returns the secrets shared with the caller and the organizations of each own secret; `update` refuses a rename that collides within an organization the secret is shared with; the usage log names the caller and the owner sees the calls members made with their secrets; the secrets page shows the sharing and the shared secrets.
- `secret-requests`: the `secrets` tool lists shared secrets with their prefixed placeholders; the placeholder grammar accepts the `<organization>/` prefix; the checks accept a secret shared with the caller and say so when a shared secret is not available.
- `organization-management`: deleting an organization also removes the shares of secrets with it.

## Impact

- `packages/db`: a new `secret_share` table in `src/schema/secret/secret.ts` with its relations (schema written on approval; migration generated and applied by the user).
- `packages/api`: `v1.secret` gains `share` (PUT, session only); `list`, `update`, `usage` and the `request` executor (`secret/request/execute.ts`, `plan.ts`, `placeholders.ts`) learn about shared secrets; `my-organization`'s membership removal also deletes the leaving owner's secret shares; the MCP's `secrets` tool and server instructions mention the prefixed placeholders.
- `apps/frontend`: `features/profile/secrets` gets the sharing field (moved out of `features/profile/repositories` so both slices use it), the organizations on each secret, the shared list and the caller in the usage; the share mutation invalidates `secret.list`, membership mutations invalidate it too.
- Tests in `packages/api/tests/v1/` for the share procedure, the widened list/usage, the planner's prefixed placeholders and the executor, and in `apps/frontend/tests/unit/` for any moved shared helper.
- `stack` references that describe the secrets (`references/api/mcp.md`) if they state the owner-only rule.
