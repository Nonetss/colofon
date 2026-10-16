## MODIFIED Requirements

### Requirement: MCP endpoint

The backend SHALL serve an MCP server at `/mcp` over the Streamable HTTP transport, statelessly: it SHALL NOT issue session ids or keep state between requests, and SHALL answer a `GET` or `DELETE` on `/mcp` with status 405. It SHALL serve both the current protocol revision and 2025-era clients. The server SHALL identify itself with the name `colofon` and SHALL send instructions telling the agent:

- to start with `repositories` or `search`;
- to read pages with `read` (one section when the route has a `#section` fragment);
- to look up a catalog entity with `entity`;
- to list the skills with `skills` and fetch one with `skill`;
- that every link in the texts is a full address on the public origin.

It SHALL declare only tools: no resources, prompts or subscriptions.

#### Scenario: Listing the tools

- **WHEN** an authenticated MCP client initializes against `/mcp` and lists the tools
- **THEN** it SHALL receive exactly `repositories`, `index`, `search`, `read`, `entity`, `skills` and `skill`, each with a description and an input schema

#### Scenario: No sessions

- **WHEN** an authenticated client sends `GET /mcp`
- **THEN** the response SHALL be status 405

## ADDED Requirements

### Requirement: Skills tool

The `skills` tool SHALL take no arguments and return every skill the caller can see, as the skills discovery index lists them (`agent-skills`), in the same order. The text SHALL give one line per skill with its name, its repository's display title for a content skill (or that it is the platform's), its description and the full address of its `SKILL.md`, and SHALL end saying that `skill` returns one. The result SHALL also carry the list as structured content, each with its name, repository slug (null for a platform skill), description and URL.

#### Scenario: Platform and content skills

- **WHEN** the caller can read `casa`, which serves `casa-deploy`, and calls `skills`
- **THEN** the text SHALL list `colofon` and `doc-writing` as the platform's and `casa-deploy` as Casa's, each with its address

### Requirement: Skill tool

The `skill` tool SHALL take a skill's published name and return that skill's `SKILL.md` text, identical to what its route serves the caller. A name that names no skill the caller can see SHALL return a tool error result that says to call `skills` to list them.

#### Scenario: Reading a skill

- **WHEN** the agent calls `skill` with `name: "colofon"`
- **THEN** the text SHALL be identical to `/.well-known/agent-skills/colofon/SKILL.md`

#### Scenario: Unknown skill

- **WHEN** the agent calls `skill` with `name: "no-existe"`
- **THEN** the result SHALL be marked as an error, saying to call `skills`
