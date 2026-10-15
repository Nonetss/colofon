# documentation-llm-text Specification

## Purpose
Lets an AI read the documentation as plain Markdown instead of HTML: an `llms.txt` index (per llmstxt.org) of every page and an `llm.txt` per page, behind the same credentials as the reader.

## Requirements

### Requirement: Page Markdown route

The web SHALL serve `/<slug>/llm.txt` for a repository's home and `/<slug>/<page path>/llm.txt` for any page or section the reader serves at `/<slug>/<page path>`. The body SHALL be the page as Markdown, the same text "Copiar en Markdown" copies for that page: its title as a level 1 heading, its description, then its body, with links and images to reader routes written as full addresses on the public origin. The response SHALL have content type `text/plain; charset=utf-8`. An unknown repository, a repository without content or an unknown page SHALL answer 404.

#### Scenario: Reading a page as Markdown

- **WHEN** a signed-in user requests `/casa/red/dns/llm.txt`
- **THEN** the response SHALL be status 200, `text/plain; charset=utf-8`, starting with `# DNS` followed by the page's description and body in Markdown

#### Scenario: Same text as the copy button

- **WHEN** a user presses "Copiar en Markdown" on `/casa/red/dns` and also requests `/casa/red/dns/llm.txt`
- **THEN** both texts SHALL be identical

#### Scenario: Repository home

- **WHEN** a signed-in user requests `/casa/llm.txt`
- **THEN** the response SHALL hold the Markdown of the home of the repository `casa`

#### Scenario: Links become full addresses

- **WHEN** the page links `/casa/red/vpn` and the public origin is `https://docs.example.org`
- **THEN** the Markdown SHALL hold the link as `https://docs.example.org/casa/red/vpn`

#### Scenario: Unknown page

- **WHEN** a signed-in user requests `/casa/no-existe/llm.txt`
- **THEN** the response SHALL be status 404

### Requirement: Documentation index for AIs

The web SHALL serve `/llms.txt`, an index following llmstxt.org: a level 1 heading with the documentation's name, a quote with a one-line summary, a paragraph saying that every page has its Markdown at `<page>/llm.txt` and that requests need a session or an API key in the `x-api-key` header, then one level 2 section per available repository, ordered as the reader's navigation orders them, titled with the repository's display title. Each section SHALL list, depth first in navigation order, the repository's home (when it has one) and every section and page, the generated catalog type pages included, each as a Markdown link to its `llm.txt` on the public origin followed by `: <description>` when the description is not empty. A page SHALL be labelled with the group of `menu.yaml` it is in (when the repository has one), the sections above it and its own title, joined by ` / `; a group SHALL NOT be listed as a line of its own, since it has no page. Repositories without readable content SHALL be left out. The response SHALL have content type `text/plain; charset=utf-8`.

#### Scenario: Two repositories

- **WHEN** the repositories `casa` (title "Casa") and `trabajo` (title "Trabajo") both have content and a signed-in user requests `/llms.txt`
- **THEN** the index SHALL hold a `## Casa` section followed by a `## Trabajo` section, each listing its own pages

#### Scenario: Nested page

- **WHEN** the repository `casa` has the section "Red" holding the page "DNS" described as "Resolución de nombres" and the public origin is `https://docs.example.org`
- **THEN** its section SHALL hold the line `- [Red / DNS](https://docs.example.org/casa/red/dns/llm.txt): Resolución de nombres`

#### Scenario: Page inside a group

- **WHEN** the `menu.yaml` of `casa` lists the folder `red` in the group "Infraestructura", and `red` holds the page "DNS"
- **THEN** its section SHALL hold the line `- [Infraestructura / Red / DNS](https://docs.example.org/casa/red/dns/llm.txt): Resolución de nombres`

#### Scenario: Repository not synced yet

- **WHEN** the repository `nuevo` has no readable content
- **THEN** `/llms.txt` SHALL hold no section for it

### Requirement: Repository index for AIs

The web SHALL serve `/<slug>/llms.txt`, the index of one repository: a level 1 heading with the repository's display title, a quote with its description when it has one, the same paragraph about `llm.txt` and credentials as `/llms.txt`, then the repository's home, sections and pages listed as in `/llms.txt`. An unknown repository or one without readable content SHALL answer 404.

#### Scenario: One repository

- **WHEN** a signed-in user requests `/casa/llms.txt`
- **THEN** the index SHALL list only the pages of `casa`, under the heading `# Casa`

#### Scenario: Unknown repository

- **WHEN** a signed-in user requests `/no-existe/llms.txt`
- **THEN** the response SHALL be status 404

### Requirement: Credentials for the Markdown routes

The `llms.txt` and `llm.txt` routes SHALL be readable with a session cookie or with an enabled API key in the `x-api-key` header, and SHALL show the same repositories and pages that credential's user can read in the reader. A request without a valid credential SHALL answer status 401 with a short plain-text explanation in Spanish of how to authenticate, and SHALL NOT be redirected to the login page.

#### Scenario: Agent with an API key

- **WHEN** a request without cookies sends a valid key in `x-api-key` to `/llms.txt`
- **THEN** the response SHALL be status 200 with the index

#### Scenario: No credential

- **WHEN** a request without session or API key asks for `/casa/red/dns/llm.txt`
- **THEN** the response SHALL be status 401 with a `text/plain` body explaining to sign in or send an API key in `x-api-key`

### Requirement: Pages announce their Markdown

Every reader page of a repository SHALL include in its HTML head a `<link rel="alternate" type="text/markdown">` whose `href` is that page's `llm.txt` route.

#### Scenario: Page head

- **WHEN** a signed-in user opens `/casa/red/dns`
- **THEN** its head SHALL hold `<link rel="alternate" type="text/markdown" href="/casa/red/dns/llm.txt">`
