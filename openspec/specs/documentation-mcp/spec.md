# documentation-mcp Specification

## Purpose
Lets any AI agent use the documentation through the Model Context Protocol: an authenticated `/mcp` endpoint with read-only tools to list the repositories, read the `llms.txt` index, search, read a page (or one of its sections) as Markdown, look up a catalog entity by its type and id, and list and read the Agent Skills the caller can see. Each tool shows exactly what the reader shows the caller. When the server has secrets configured it also serves the `secrets` and `request` tools, specified by `secret-requests`. It also lets the caller manage their own repositories as the profile page does: `my_repositories` lists them with the git credentials they saved, `add_repository` adds one (a private one cloning with a saved credential, never a token passed to the tool), and `sync` fetches any repository the caller can read from its git remote at once.

## Requirements

### Requirement: MCP endpoint

The backend SHALL serve an MCP server at `/mcp` over the Streamable HTTP transport, statelessly: it SHALL NOT issue session ids or keep state between requests, and SHALL answer a `GET` or `DELETE` on `/mcp` with status 405. It SHALL serve both the current protocol revision and 2025-era clients. The server SHALL identify itself with the name `colofon` and SHALL send instructions telling the agent:

- to start with `repositories` or `search`;
- to read pages with `read` (one section when the route has a `#section` fragment);
- to look up a catalog entity with `entity`;
- to list the skills with `skills` and fetch one with `skill`;
- to list the user's own repositories and saved git credentials with `my_repositories`, and to add one of the user's repositories with `add_repository`;
- to sync a repository with `sync` after pushing to an external one or adding one, instead of waiting for the periodic sync;
- when the secrets feature is on, to list the user's secrets with `secrets` and to call a service's HTTP API with `request`, using placeholders the platform fills in, as the documentation describes that API;
- that every link in the texts is a full address on the public origin.

It SHALL declare only tools: no resources, prompts or subscriptions. Admins and other users SHALL be served the same tools.

#### Scenario: Listing the tools

- **WHEN** an authenticated MCP client initializes against `/mcp` with the secrets feature on and lists the tools
- **THEN** it SHALL receive exactly `repositories`, `index`, `search`, `read`, `entity`, `skills`, `skill`, `my_repositories`, `add_repository`, `sync`, `secrets` and `request`, each with a description and an input schema

#### Scenario: Secrets feature off

- **WHEN** `SECRETS_ENCRYPTION_KEY` is unset and an authenticated client lists the tools
- **THEN** it SHALL receive exactly `repositories`, `index`, `search`, `read`, `entity`, `skills`, `skill`, `my_repositories`, `add_repository` and `sync`, and the instructions SHALL NOT mention secrets

#### Scenario: Admin caller

- **WHEN** an admin's client and a non-admin's client list the tools with the same server configuration
- **THEN** both SHALL receive the same tools and the same instructions

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

Every tool except `request`, `sync` and `add_repository` SHALL be declared read-only and idempotent. No tool except those three SHALL change any stored data: `request` SHALL only add usage-log entries, `sync` SHALL only update a repository's clone and its recorded sync outcome, and `add_repository` SHALL only store one repository of the caller's and start its sync. A tool call with invalid arguments SHALL return a tool error result whose text names the invalid arguments, so the agent can correct the call. A tool call that names an unknown repository or page SHALL return a tool error result whose text says what was not found, instead of a protocol error. Every link and image to a reader route in a tool's text SHALL be a full address on the public origin.

#### Scenario: Unknown page

- **WHEN** the agent calls `read` with the route `/casa/no-existe`
- **THEN** the result SHALL be marked as an error, with a text saying that page does not exist

#### Scenario: Missing argument

- **WHEN** the agent calls `search` without `query`
- **THEN** the result SHALL be marked as an error, with a text naming `query` as invalid

#### Scenario: Annotations

- **WHEN** a client lists the tools
- **THEN** every tool but `request`, `sync` and `add_repository` SHALL be annotated read-only and idempotent, `request` SHALL be annotated as not read-only, destructive and open-world, `sync` as not read-only, not destructive, idempotent and open-world, and `add_repository` as not read-only, not destructive, not idempotent and open-world

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

### Requirement: Skills tool

The `skills` tool SHALL take no arguments and return every skill the caller can see, as the skills discovery index lists them (`agent-skills`), in the same order. The text SHALL give one line per skill with its name, its repository's display title for a content skill (or that it is the platform's), its description and the full address of its `SKILL.md`, and, for a skill with other files, the paths of those files. It SHALL end saying that `skill` returns a skill's `SKILL.md` or one of its files. The result SHALL also carry the list as structured content, each with its name, repository slug (null for a platform skill), description, URL of its `SKILL.md` and the paths of its other files (empty for a single-file skill).

#### Scenario: Platform and content skills

- **WHEN** the caller can read `casa`, which serves `casa-deploy`, and calls `skills`
- **THEN** the text SHALL list `colofon` and the `colofon-*` writing skills as the platform's and `casa-deploy` as Casa's, each with its address, and SHALL NOT list `doc-writing`

#### Scenario: Skill with files

- **WHEN** the agent calls `skills`
- **THEN** the entry of `colofon-diagrams` SHALL list its files, such as `references/type-bar.md`, and the entry of `colofon` SHALL list none

### Requirement: Skill tool

The `skill` tool SHALL take a skill's published name and, optionally, the path of one of its files. Without a path it SHALL return that skill's `SKILL.md` text; with one, that file's text. Either SHALL be identical to what its route serves the caller (`/.well-known/agent-skills/<name>/SKILL.md` or `/.well-known/agent-skills/<name>/<path>`). A name that names no skill the caller can see SHALL return a tool error result that says to call `skills` to list them. A path that names no file of that skill SHALL return a tool error result listing the skill's files.

#### Scenario: Reading a skill

- **WHEN** the agent calls `skill` with `name: "colofon"`
- **THEN** the text SHALL be identical to `/.well-known/agent-skills/colofon/SKILL.md`

#### Scenario: Reading a reference

- **WHEN** the agent calls `skill` with `name: "colofon-diagrams"` and `path: "references/type-bar.md"`
- **THEN** the text SHALL be identical to `/.well-known/agent-skills/colofon-diagrams/references/type-bar.md`

#### Scenario: Unknown skill

- **WHEN** the agent calls `skill` with `name: "no-existe"`
- **THEN** the result SHALL be marked as an error, saying to call `skills`

#### Scenario: Unknown file

- **WHEN** the agent calls `skill` with `name: "colofon-diagrams"` and `path: "references/no-existe.md"`
- **THEN** the result SHALL be marked as an error, listing the files of `colofon-diagrams`

### Requirement: Sync tool

The `sync` tool SHALL be served to every user. It SHALL take a repository's slug, fetch that repository from its git remote and check out its ref through the same sync procedure as the reader's pages, as the caller, waiting until it is done, and SHALL return a text with the repository's name, slug and ref, the commit checked out, when the sync ran and the full address of the repository on the public origin. It SHALL sync only a repository the caller can read: a platform repository or one of the caller's own. A slug that names no repository the caller can read SHALL return a tool error result that says to call `repositories` to list them. A sync that fails SHALL return a tool error result with git's error, without credentials.

#### Scenario: Syncing after a push

- **WHEN** a user's agent pushes to the external repository `apuntes`, which that user owns, and calls `sync` with `repository: "apuntes"`
- **THEN** the backend SHALL fetch `apuntes` at once and the text SHALL give the commit now checked out, which the reader then serves

#### Scenario: Someone else's repository

- **WHEN** `luis`'s agent calls `sync` with `repository: "apuntes"`, which belongs to `ana`
- **THEN** the result SHALL be marked as an error, saying to call `repositories`, and `apuntes` SHALL NOT be synced

#### Scenario: Unknown repository

- **WHEN** an agent calls `sync` with `repository: "nada"`
- **THEN** the result SHALL be marked as an error, saying to call `repositories`

#### Scenario: Git failure

- **WHEN** the remote of `casa` lacks its ref and an agent calls `sync` with `repository: "casa"`
- **THEN** the result SHALL be marked as an error with git's message, and no credential SHALL appear in it

### Requirement: My repositories tool

The `my_repositories` tool SHALL take no arguments and return, through the owner procedures, the caller's own repositories ordered by name and the caller's saved git credentials. Each repository SHALL show its slug, name, URL without credentials, ref, content folder, the host and username of the credential it clones with (or none), when its last sync ran, the commit it checked out and its last sync error (or none), and its full address on the public origin. Each credential SHALL show its host, its username and whether it can't be read; no token SHALL appear. When the server can't store credentials, the text SHALL say so instead of listing them. The text SHALL say to save new credentials on the profile page, with that page's full address. The result SHALL also carry the repositories and credentials as structured content.

#### Scenario: One repository waiting for its first sync

- **WHEN** `ana` owns `apuntes`, added a moment ago with her credential for `git.example.com` and `ana`, and her agent calls `my_repositories`
- **THEN** the text SHALL list `apuntes` with that credential's host and username, no sync yet, and its address, and SHALL list the credential `git.example.com` / `ana` without any token

#### Scenario: Failed sync

- **WHEN** the last sync of `apuntes` failed because its ref doesn't exist
- **THEN** `my_repositories` SHALL show git's error for `apuntes`, without credentials

#### Scenario: No repositories

- **WHEN** a user without repositories calls `my_repositories`
- **THEN** the text SHALL say the user has no repositories and that `add_repository` adds one

### Requirement: Add repository tool

The `add_repository` tool SHALL take a `slug`, a `name`, a `url`, an optional `ref` (default `main`), an optional content folder `path` (default the root) and an optional `credential`, the username of one of the caller's saved git credentials. It SHALL store the repository as the caller's through the owner create procedure, as the caller, so the slug, URL and remote rules of `user-content-repositories` apply unchanged, and SHALL start its first sync without waiting for it. With `credential`, it SHALL use the caller's credential whose host is the URL's host and whose username is `credential`. The tool SHALL NOT accept a token: a `url` that carries a username or password SHALL return a tool error result saying to save the token as a credential on the profile page, with that page's full address, and SHALL store nothing. On success it SHALL return a text with the repository's slug, name, ref, folder, the credential's host and username (or none) and its full address on the public origin, saying the first sync has started and that `sync` waits for it.

A tool error result, storing nothing, SHALL also be returned when:

- the slug is in use, saying to choose another;
- the slug, URL, ref or folder is refused by the create procedure's validation, with the procedure's message;
- no credential of the caller's has the URL's host and that username, saying to call `my_repositories` to list the saved credentials;
- the server can't store credentials and `credential` is given, saying so.

#### Scenario: Public repository

- **WHEN** `ana`'s agent calls `add_repository` with `slug: "apuntes"`, `name: "Apuntes"` and `url: "https://github.com/ana/apuntes.git"`
- **THEN** `apuntes` SHALL be stored as `ana`'s with the ref `main`, its sync SHALL start, and the text SHALL give its address and say to call `sync` to wait for it

#### Scenario: Private repository with a saved credential

- **WHEN** `ana` saved a credential for `git.example.com` and `ana`, and her agent calls `add_repository` with `url: "https://git.example.com/org/docs"` and `credential: "ana"`
- **THEN** the repository SHALL be stored with that credential and its URL without credentials, and no token SHALL appear in the result

#### Scenario: No credential for that host

- **WHEN** `ana`'s only credential is for `git.example.com`, and her agent calls `add_repository` with `url: "https://other.example.com/org/docs"` and `credential: "ana"`
- **THEN** the result SHALL be marked as an error saying to call `my_repositories`, and nothing SHALL be stored

#### Scenario: Token in the URL

- **WHEN** the agent calls `add_repository` with `url: "https://ana:secreto@git.example.com/org/docs"`
- **THEN** the result SHALL be marked as an error saying to save the token as a credential on the profile page, nothing SHALL be stored, and the text SHALL NOT contain `secreto`

#### Scenario: Slug taken

- **WHEN** the agent calls `add_repository` with the slug `casa` of a platform repository
- **THEN** the result SHALL be marked as an error saying the slug is in use, and nothing SHALL be stored

#### Scenario: Remote not allowed

- **WHEN** the agent calls `add_repository` with `url: "https://10.0.0.5/org/docs"`
- **THEN** the result SHALL be marked as an error with the create procedure's message about the address, and nothing SHALL be stored
