## MODIFIED Requirements

### Requirement: Reader routes

The web SHALL serve, to signed-in users only (a session cookie, or an enabled API key in the `x-api-key` header resolved to its owner):
- `/`: the home of the "Todos" scope, or a redirect to `/<slug>` when the remembered scope is one repository that exists;
- `/<slug>`: the home of the repository `slug`, rendered from its `docs/index.mdx`, or the list of its top-level sections when it has none;
- `/<slug>/<page path>`: that page; a section's path SHALL show its `index.mdx`, or the list of its pages when it has none.

An unknown repository or page SHALL render the not-found page with status 404. Every reader route SHALL render the page content on the server, so the text, headings and links are in the HTML response.

#### Scenario: Opening a page

- **WHEN** a signed-in user opens `/casa/red/dns`
- **THEN** the response SHALL hold the page's title, description and body in its HTML

#### Scenario: Opening a page with an API key

- **WHEN** a request without cookies sends a valid key in `x-api-key` to `/casa/red/dns`
- **THEN** the response SHALL hold the page's title, description and body in its HTML, read as the key's owner

#### Scenario: Unknown page

- **WHEN** a signed-in user opens `/casa/no-existe`
- **THEN** the not-found page SHALL render with status 404

#### Scenario: Signed-out visitor

- **WHEN** a visitor without a session opens `/casa/red/dns`
- **THEN** they SHALL be redirected to the login page
