## MODIFIED Requirements

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

## ADDED Requirements

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
