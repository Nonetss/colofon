## MODIFIED Requirements

### Requirement: MCP endpoint

The backend SHALL serve an MCP server at `/mcp` over the Streamable HTTP transport, statelessly: it SHALL NOT issue session ids or keep state between requests, and SHALL answer a `GET` or `DELETE` on `/mcp` with status 405. It SHALL serve both the current protocol revision and 2025-era clients. The server SHALL identify itself with the name `colofon` and SHALL send instructions telling the agent:

- to start with `repositories` or `search`;
- to read pages with `read` (one section when the route has a `#section` fragment);
- to look up a catalog entity with `entity`;
- to list the skills with `skills` and fetch one with `skill`;
- when the secrets feature is on, to list the user's secrets with `secrets` and to call a service's HTTP API with `request`, using placeholders the platform fills in, as the documentation describes that API;
- that every link in the texts is a full address on the public origin.

It SHALL declare only tools: no resources, prompts or subscriptions.

#### Scenario: Listing the tools

- **WHEN** an authenticated MCP client initializes against `/mcp` with the secrets feature on and lists the tools
- **THEN** it SHALL receive exactly `repositories`, `index`, `search`, `read`, `entity`, `skills`, `skill`, `secrets` and `request`, each with a description and an input schema

#### Scenario: Secrets feature off

- **WHEN** `SECRETS_ENCRYPTION_KEY` is unset and an authenticated client lists the tools
- **THEN** it SHALL receive exactly `repositories`, `index`, `search`, `read`, `entity`, `skills` and `skill`, and the instructions SHALL NOT mention secrets

#### Scenario: No sessions

- **WHEN** an authenticated client sends `GET /mcp`
- **THEN** the response SHALL be status 405

### Requirement: Read-only tools

Every tool except `request` SHALL be declared read-only and idempotent. No tool except `request` SHALL change any stored data, and `request` SHALL only add usage-log entries. A tool call with invalid arguments SHALL return a tool error result whose text names the invalid arguments, so the agent can correct the call. A tool call that names an unknown repository or page SHALL return a tool error result whose text says what was not found, instead of a protocol error. Every link and image to a reader route in a tool's text SHALL be a full address on the public origin.

#### Scenario: Unknown page

- **WHEN** the agent calls `read` with the route `/casa/no-existe`
- **THEN** the result SHALL be marked as an error, with a text saying that page does not exist

#### Scenario: Missing argument

- **WHEN** the agent calls `search` without `query`
- **THEN** the result SHALL be marked as an error, with a text naming `query` as invalid

#### Scenario: Annotations

- **WHEN** a client lists the tools
- **THEN** every tool but `request` SHALL be annotated read-only and idempotent, and `request` SHALL be annotated as not read-only, destructive and open-world
