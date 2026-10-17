## MODIFIED Requirements

### Requirement: API keys on the profile

The profile page (`/me`) SHALL list the signed-in user's API keys with their name, the visible start of the key and their expiry, offer to create one (name and an expiry of 30, 90, 180 or 365 days, or none) and to revoke each one after a confirmation. On creation it SHALL show the key once, with a copy control, together with one tab per way of connecting an AI, each with the text to copy, a copy control and where that text goes. The first tab SHALL be the setup prompt (`agent-skills`) carrying the new key, which an AI follows to install every skill the key's user can see. The others SHALL be: the command that adds the documentation MCP (`<origin>/mcp` with the key in `x-api-key`) to Claude Code, the `config.toml` entry for Codex, the `mcpServers` JSON that Cursor and most other clients read, and, for an AI without MCP, instructions naming the address of the site's `/llms.txt`, that each page reads as Markdown at its `llm.txt` link, and the `x-api-key` header carrying the key.

#### Scenario: Creating a key for an AI

- **WHEN** a signed-in user creates an API key from `/me`
- **THEN** the page SHALL show the key once with a copy control, and tabs for the setup prompt, Claude Code, Codex, other MCP clients and an AI without MCP, each carrying the key and a copy control

#### Scenario: Setup prompt with the key

- **WHEN** the user copies the setup prompt tab of a new key on `https://doc.example.com`
- **THEN** the text SHALL name `https://doc.example.com/llms.txt` and carry the key itself in the `x-api-key` header, with no placeholder left

#### Scenario: Connecting Claude Code

- **WHEN** the user copies the Claude Code tab of a new key on `https://doc.example.com`
- **THEN** the text SHALL be `claude mcp add --transport http colofon https://doc.example.com/mcp --header "x-api-key: <key>"`

#### Scenario: Revoking a key

- **WHEN** the user revokes one of their keys from `/me` and confirms
- **THEN** the key SHALL be removed from the list and stop authenticating requests
