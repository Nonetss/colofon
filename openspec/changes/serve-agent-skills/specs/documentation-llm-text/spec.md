## MODIFIED Requirements

### Requirement: Documentation index for AIs

The web SHALL serve `/llms.txt`, an index following llmstxt.org, as `text/plain; charset=utf-8`. It SHALL start with a level 1 heading with the documentation's name, a quote with a one-line summary, and then the agent guide, in Spanish, for an agent that has only been given the site's address. The guide SHALL say:

- that every page has its Markdown at `<page>/llm.txt`, and that the pages, `/<slug>/llms.txt`, the MCP and the projects' skills need a session or an API key in the `x-api-key` header;
- that the user creates the key at the full address of `/me`;
- how to connect the MCP, with the full address of `/mcp`, a `claude mcp add` command with a placeholder for the key, and the names of its tools;
- the full address of the skills index (`agent-skills`), each platform skill as a Markdown link to its `SKILL.md` with its description, and how to install a skill: save its `SKILL.md` as `<skills folder>/<name>/SKILL.md`, with an example command that downloads one sending the key.

Without a credential, the index SHALL be that guide followed by a line saying that with an API key it also lists the repositories, their pages and their skills, and it SHALL NOT name any repository.

With a credential, the guide SHALL be followed by one level 2 section per available repository, ordered as the reader's navigation orders them and titled with the repository's display title. Each section SHALL list, depth first in navigation order, the repository's home (when it has one) and every section and page, the generated catalog type pages included. Each SHALL be a Markdown link to its `llm.txt` on the public origin, followed by `: <description>` when the description is not empty. A page SHALL be labelled with the group of `menu.yaml` it is in (when the repository has one), the sections above it and its own title, joined by ` / `. A group SHALL NOT be listed as a line of its own, since it has no page. When the repository serves skills, its section SHALL end with a level 3 heading `Skills` listing each of them as a Markdown link to its `SKILL.md` with its description. Repositories without readable content SHALL be left out.

#### Scenario: Two repositories

- **WHEN** the repositories `casa` (title "Casa") and `trabajo` (title "Trabajo") both have content and a signed-in user requests `/llms.txt`
- **THEN** the index SHALL hold the guide, then a `## Casa` section followed by a `## Trabajo` section, each listing its own pages

#### Scenario: Nested page

- **WHEN** the repository `casa` has the section "Red" holding the page "DNS" described as "Resolución de nombres" and the public origin is `https://docs.example.org`
- **THEN** its section SHALL hold the line `- [Red / DNS](https://docs.example.org/casa/red/dns/llm.txt): Resolución de nombres`

#### Scenario: Page inside a group

- **WHEN** the `menu.yaml` of `casa` lists the folder `red` in the group "Infraestructura", and `red` holds the page "DNS"
- **THEN** its section SHALL hold the line `- [Infraestructura / Red / DNS](https://docs.example.org/casa/red/dns/llm.txt): Resolución de nombres`

#### Scenario: Repository not synced yet

- **WHEN** the repository `nuevo` has no readable content
- **THEN** `/llms.txt` SHALL hold no section for it

#### Scenario: Agent without a key

- **WHEN** a request without session or API key asks for `/llms.txt` and the public origin is `https://docs.example.org`
- **THEN** the response SHALL be status 200 with the guide, holding `https://docs.example.org/me`, `https://docs.example.org/mcp`, `https://docs.example.org/.well-known/agent-skills/index.json` and a link to `https://docs.example.org/.well-known/agent-skills/colofon/SKILL.md`, and no repository section

#### Scenario: Repository skills

- **WHEN** a signed-in user requests `/llms.txt` and `casa` serves the skill `casa-deploy`
- **THEN** the `## Casa` section SHALL end with `### Skills` and a link to `https://docs.example.org/.well-known/agent-skills/casa-deploy/SKILL.md` with its description

### Requirement: Repository index for AIs

The web SHALL serve `/<slug>/llms.txt`, the index of one repository: a level 1 heading with the repository's display title, a quote with its description when it has one, a paragraph saying that every page has its Markdown at `<page>/llm.txt`, that requests need a session or an API key in `x-api-key`, and that the full address of `/llms.txt` explains the MCP and the skills, then the repository's home, sections and pages, and its skills, listed as in `/llms.txt`. An unknown repository or one without readable content SHALL answer 404.

#### Scenario: One repository

- **WHEN** a signed-in user requests `/casa/llms.txt`
- **THEN** the index SHALL list only the pages and skills of `casa`, under the heading `# Casa`

#### Scenario: Unknown repository

- **WHEN** a signed-in user requests `/no-existe/llms.txt`
- **THEN** the response SHALL be status 404

### Requirement: Credentials for the Markdown routes

The `/<slug>/llms.txt` and `llm.txt` routes SHALL be readable with a session cookie or with an enabled API key in the `x-api-key` header, and SHALL show the same repositories and pages that credential's user can read in the reader. A request to them without a valid credential SHALL answer status 401 with a short plain-text explanation in Spanish of how to authenticate, which SHALL name the full address of `/llms.txt` for the rest. It SHALL NOT be redirected to the login page. `/llms.txt` SHALL answer with or without a credential, as the documentation index requires. With a credential, it SHALL show exactly the repositories that credential's user can read.

#### Scenario: Agent with an API key

- **WHEN** a request without cookies sends a valid key in `x-api-key` to `/llms.txt`
- **THEN** the response SHALL be status 200 with the guide and the repositories that key's user can read

#### Scenario: No credential

- **WHEN** a request without session or API key asks for `/casa/red/dns/llm.txt`
- **THEN** the response SHALL be status 401 with a `text/plain` body explaining to sign in or send an API key in `x-api-key`, and naming `/llms.txt`

#### Scenario: Index without a credential

- **WHEN** a request without session or API key asks for `/llms.txt`
- **THEN** the response SHALL be status 200 and SHALL NOT be a redirect
