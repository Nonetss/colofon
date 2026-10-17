## MODIFIED Requirements

### Requirement: Manage owned API keys

The system SHALL allow any authenticated user to call `v1.apiKey.list`, `v1.apiKey.search`, `v1.apiKey.update`, and `v1.apiKey.delete`. Each operation SHALL act only on API keys owned by the requesting user; no user, administrators included, SHALL list, search, rename or revoke another user's keys through them. `v1.apiKey.update` SHALL take the key's id and a new name, trimmed, of 1 to 32 characters, SHALL change only the name, and SHALL return the key as `v1.apiKey.list` lists it.

#### Scenario: User lists or searches owned keys

- **WHEN** an authenticated user calls `v1.apiKey.list` or `v1.apiKey.search`
- **THEN** the system SHALL return only API keys owned by that user

#### Scenario: User renames an owned key

- **WHEN** an authenticated user calls `v1.apiKey.update` with the id of one of their keys and the name `Claude Code`
- **THEN** the system SHALL store the new name, keep the key's value and expiry, and return the key with the name `Claude Code`

#### Scenario: User renames another user's key

- **WHEN** an authenticated user calls `v1.apiKey.update` with the id of a key owned by another user
- **THEN** the system SHALL reject the request as `NOT_FOUND` and leave the key unchanged

#### Scenario: Empty name

- **WHEN** an authenticated user calls `v1.apiKey.update` with a name made only of spaces
- **THEN** the system SHALL reject the request as `BAD_REQUEST`

#### Scenario: User deletes an owned key

- **WHEN** an authenticated user calls `v1.apiKey.delete` for one of their API keys
- **THEN** the system SHALL revoke that key and report the operation result

#### Scenario: Anonymous caller attempts API-key management

- **WHEN** a request without a valid session calls `v1.apiKey.list`, `v1.apiKey.search`, `v1.apiKey.update`, or `v1.apiKey.delete`
- **THEN** the system SHALL reject the request as `UNAUTHORIZED`

### Requirement: API keys on the profile

The API keys page of the profile section (`/me/api-keys`) SHALL list the signed-in user's API keys with their name, the visible start of the key and their expiry, offer to create one (name and an expiry of 30, 90, 180 or 365 days, or none), to rename each one (a name of 1 to 32 characters, the key and its expiry unchanged) and to revoke each one after a confirmation. On creation it SHALL show the key once, with a copy control, together with one tab per way of connecting an AI, each with the text to copy, a copy control and where that text goes. The first tab SHALL be the setup prompt (`agent-skills`) carrying the new key, which an AI follows to install every skill the key's user can see. The others SHALL be: the command that adds the documentation MCP (`<origin>/mcp` with the key in `x-api-key`) to Claude Code, the `config.toml` entry for Codex, the `mcpServers` JSON that Cursor and most other clients read, and, for an AI without MCP, instructions naming the address of the site's `/llms.txt`, that each page reads as Markdown at its `llm.txt` link, and the `x-api-key` header carrying the key.

#### Scenario: Creating a key for an AI

- **WHEN** a signed-in user creates an API key from `/me/api-keys`
- **THEN** the page SHALL show the key once with a copy control, and tabs for the setup prompt, Claude Code, Codex, other MCP clients and an AI without MCP, each carrying the key and a copy control

#### Scenario: Setup prompt with the key

- **WHEN** the user copies the setup prompt tab of a new key on `https://doc.example.com`
- **THEN** the text SHALL name `https://doc.example.com/llms.txt` and carry the key itself in the `x-api-key` header, with no placeholder left

#### Scenario: Connecting Claude Code

- **WHEN** the user copies the Claude Code tab of a new key on `https://doc.example.com`
- **THEN** the text SHALL be `claude mcp add --transport http colofon https://doc.example.com/mcp --header "x-api-key: <key>"`

#### Scenario: Renaming a key

- **WHEN** the user renames one of their keys from `/me/api-keys` to "Claude Code"
- **THEN** the list SHALL show the key as "Claude Code", and an AI using it SHALL keep authenticating with the same key

#### Scenario: Revoking a key

- **WHEN** the user revokes one of their keys from `/me/api-keys` and confirms
- **THEN** the key SHALL be removed from the list and stop authenticating requests
