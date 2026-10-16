# documentation-mcp Specification

## Purpose
Lets any AI agent use the documentation through the Model Context Protocol: an authenticated `/mcp` endpoint with read-only tools to list the repositories, read the `llms.txt` index, search, read a page (or one of its sections) as Markdown, and look up a catalog entity by its type and id. Each tool shows exactly what the reader shows the caller.

## Requirements

### Requirement: MCP endpoint

The backend SHALL serve an MCP server at `/mcp` over the Streamable HTTP transport, statelessly: it SHALL NOT issue session ids or keep state between requests, and SHALL answer a `GET` or `DELETE` on `/mcp` with status 405. It SHALL serve both the current protocol revision and 2025-era clients. The server SHALL identify itself with the name `colofon` and SHALL send instructions telling the agent to start with `repositories` or `search`, to read pages with `read` (one section when the route has a `#section` fragment), to look up a catalog entity with `entity`, and that every link in the texts is a full address on the public origin. It SHALL declare only tools: no resources, prompts or subscriptions.

#### Scenario: Listing the tools

- **WHEN** an authenticated MCP client initializes against `/mcp` and lists the tools
- **THEN** it SHALL receive exactly `repositories`, `index`, `search`, `read` and `entity`, each with a description and an input schema

#### Scenario: No sessions

- **WHEN** an authenticated client sends `GET /mcp`
- **THEN** the response SHALL be status 405

### Requirement: MCP authentication

Every request to `/mcp` SHALL need an enabled API key in the `x-api-key` header or a session cookie. A request without a valid credential SHALL answer status 401 with a short plain-text explanation in Spanish of how to send an API key in `x-api-key`, and SHALL NOT reach the MCP server. A request whose `Origin` header is present and is not the public origin SHALL answer status 403. Every tool SHALL run as the credential's user, through the same procedures and access checks as the reader, so a tool SHALL never show a repository or page that user cannot read in the reader.

#### Scenario: Agent with an API key

- **WHEN** a request without cookies sends a valid key in `x-api-key` and calls the `search` tool
- **THEN** the call SHALL succeed and return the results that key's user would get from the reader's search

#### Scenario: No credential

- **WHEN** a request without a session or API key is sent to `/mcp`
- **THEN** the response SHALL be status 401 with a `text/plain` body explaining to send an API key in `x-api-key`

#### Scenario: Request from another site

- **WHEN** a request carries a valid credential and `Origin: https://evil.example`
- **THEN** the response SHALL be status 403

### Requirement: Read-only tools

Every tool SHALL be declared read-only and idempotent, and SHALL NOT change any stored data. A tool call with invalid arguments SHALL return a tool error result whose text names the invalid arguments, so the agent can correct the call. A tool call that names an unknown repository or page SHALL return a tool error result whose text says what was not found, instead of a protocol error. Every link and image to a reader route in a tool's text SHALL be a full address on the public origin.

#### Scenario: Unknown page

- **WHEN** the agent calls `read` with the route `/casa/no-existe`
- **THEN** the result SHALL be marked as an error, with a text saying that page does not exist

#### Scenario: Missing argument

- **WHEN** the agent calls `search` without `query`
- **THEN** the result SHALL be marked as an error, with a text naming `query` as invalid

### Requirement: Repositories tool

The `repositories` tool SHALL take no arguments and return every content repository the caller can read, in the reader's navigation order, each with its slug, display title, description (or none) and whether it has readable content. The text SHALL list one repository per line with its slug, title and description, mark the ones without content, and give the address of its `llms.txt` for the ones with content. The result SHALL also carry the list as structured content.

#### Scenario: Two repositories

- **WHEN** the repositories `casa` (with content) and `nuevo` (not synced yet) exist and the agent calls `repositories`
- **THEN** the result SHALL list `casa` with its title and `llms.txt` address, and `nuevo` marked as having no content yet

### Requirement: Index tool

The `index` tool SHALL take an optional repository slug. Without it, it SHALL return the same text as `/llms.txt` for the caller. With it, it SHALL return the same text as `/<slug>/llms.txt`. A slug that names no repository, or one without readable content, SHALL return a tool error result.

#### Scenario: Global index

- **WHEN** the agent calls `index` with no arguments
- **THEN** the text SHALL be identical to what `/llms.txt` answers the same user on the same public origin

#### Scenario: One repository

- **WHEN** the agent calls `index` with `repository: "casa"`
- **THEN** the text SHALL be identical to what `/casa/llms.txt` answers the same user

#### Scenario: Unknown repository

- **WHEN** the agent calls `index` with `repository: "no-existe"`
- **THEN** the result SHALL be a tool error saying that repository does not exist or has no content

### Requirement: Search tool

The `search` tool SHALL take a query, an optional repository slug and an optional limit, with the same rules, defaults, matching and ranking as `v1.docs.search`. A slug that names no repository, or one without readable content, SHALL return a tool error result instead of searching every repository. The text SHALL list the results in rank order. Each result SHALL have the trail and title, the route to pass to `read`, the repository when several were searched, the description when it is not empty, and the excerpt when there is one. When nothing matches, the text SHALL say so. The result SHALL also carry the results as structured content, each with its repository slug and name, route, title, description, trail and excerpt text.

#### Scenario: A match in a section

- **WHEN** the agent searches "inversa" and the page `/casa/red/dns` holds it under the heading "Resolución inversa"
- **THEN** a result SHALL show the route `/casa/red/dns#resolucion-inversa`, the trail and title "Red / DNS", and the excerpt around the word

#### Scenario: Unknown repository

- **WHEN** the agent searches "dns" with `repository: "no-existe"`
- **THEN** the result SHALL be a tool error saying that repository does not exist or has no content, and no search SHALL run

#### Scenario: No results

- **WHEN** the agent searches a word no page holds
- **THEN** the result SHALL NOT be an error, and its text SHALL say that nothing was found

### Requirement: Read tool

The `read` tool SHALL take a route to a page and return that page as Markdown: a first line `Location: <repository> / <groups and sections above the page> / <page title> (<full address of the page>)`, an empty line, then the same text as its `llm.txt` route on the public origin. The route SHALL be accepted as `/<slug>` or `/<slug>/<page path>`, with or without the public origin in front, a trailing slash, a trailing `/llm.txt`, a query string or a `#section` fragment, so the routes that `search` returns and the links of `index` can be passed unchanged. A route that names an unknown repository, a repository without content or an unknown page SHALL return a tool error result.

When the route has a `#section` fragment that is the id of one of the page's level 2 or 3 headings, the tool SHALL return only that section: the location line with the heading's text appended to the trail and the fragment kept in the address, an empty line, then that heading and everything after it up to the next heading of the same or a higher level (so a level 2 section keeps its level 3 subsections), written as Markdown with the same rules as `llm.txt`. The page's title and description SHALL NOT be repeated above the section. A fragment that is not the id of one of the page's level 2 or 3 headings SHALL return a tool error result that lists the page's section ids with their titles, and the route to read the whole page. An empty fragment SHALL be treated as no fragment.

#### Scenario: Route from a search result

- **WHEN** the agent calls `read` with `/casa/red/dns#resolucion-inversa`, and the page has a level 2 heading "Resolución inversa" with that id followed by a level 3 heading "PTR" and then a level 2 heading "Cachés"
- **THEN** the text SHALL start with `Location: Casa / Red / DNS / Resolución inversa (https://docs.example.org/casa/red/dns#resolucion-inversa)`, followed by the heading "Resolución inversa", its body and its subsection "PTR" as Markdown, and SHALL NOT include the page's title, its description or the section "Cachés"

#### Scenario: A level 3 section

- **WHEN** the agent calls `read` with `/casa/red/dns#ptr`, and "PTR" is a level 3 heading followed by another level 3 heading "Zonas"
- **THEN** the text SHALL hold the heading "PTR" and its body, and SHALL NOT include "Zonas"

#### Scenario: Unknown section

- **WHEN** the agent calls `read` with `/casa/red/dns#no-existe`
- **THEN** the result SHALL be marked as an error, with a text that lists the ids and titles of the page's sections and gives `/casa/red/dns` to read the whole page

#### Scenario: Whole page

- **WHEN** the agent calls `read` with `/casa/red/dns` or `/casa/red/dns#`
- **THEN** the text SHALL start with `Location: Casa / Red / DNS (https://docs.example.org/casa/red/dns)` followed by the whole page `/casa/red/dns` as Markdown, identical to `/casa/red/dns/llm.txt`

#### Scenario: Link from the index

- **WHEN** the agent calls `read` with `https://docs.example.org/casa/red/dns/llm.txt` and the public origin is `https://docs.example.org`
- **THEN** the text SHALL be the page `/casa/red/dns` as Markdown

#### Scenario: Repository home

- **WHEN** the agent calls `read` with `/casa`
- **THEN** the text SHALL be the Markdown of the home of `casa`

### Requirement: Entity tool

The `entity` tool SHALL take a repository slug, a catalog type id and an entity id, all required, and return the entity's catalog page in that repository as Markdown, with the same location line and the same Markdown rules as `read`. The text SHALL be identical to what `read` returns for that entity's catalog page route, so it SHALL hold the entity's fields (with the entities its references name, linked), its source when set, its own page when it has one, the pages that cite it, the entities of other types that point at it and the diagrams it is in, as the reader's entity page shows them. It SHALL read the page through the same procedure and access checks as the reader. An unknown repository, or one without readable content, SHALL return a tool error result saying so. An unknown type, or an id that names no valid entity of that type, SHALL return a tool error result that names the catalog route of the repository (for an unknown type) or of the type (for an unknown id) to find the valid ones.

#### Scenario: An entity cited by pages

- **WHEN** the repository `casa` has an entity `servidor/nas` cited by the page "Copias" and pointed at by the entity `servicio/duplicati`, and the agent calls `entity` with `repository: "casa"`, `type: "servidor"`, `id: "nas"`
- **THEN** the text SHALL start with the location line of the page `/casa/catalog/servidor/nas` and SHALL hold its fields, a link to "Copias" as a full address and `duplicati` among its references, identical to `read` with `/casa/catalog/servidor/nas`

#### Scenario: Unknown entity

- **WHEN** the agent calls `entity` with `repository: "casa"`, `type: "servidor"`, `id: "no-existe"`
- **THEN** the result SHALL be marked as an error, with a text saying that entity does not exist and giving `/casa/catalog/servidor` to list the entities of that type

#### Scenario: Unknown type

- **WHEN** the agent calls `entity` with `repository: "casa"`, `type: "no-existe"`, `id: "nas"`
- **THEN** the result SHALL be marked as an error, with a text giving `/casa/catalog` to list the catalog types

#### Scenario: Unknown repository

- **WHEN** the agent calls `entity` with `repository: "no-existe"`
- **THEN** the result SHALL be marked as an error, saying that repository does not exist or has no content
