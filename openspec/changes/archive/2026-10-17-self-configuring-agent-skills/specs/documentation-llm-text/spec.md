## MODIFIED Requirements

### Requirement: Documentation index for AIs

The web SHALL serve `/llms.txt`, an index following llmstxt.org, as `text/plain; charset=utf-8`. It SHALL start with a level 1 heading with the documentation's name, a quote with a one-line summary, and then the agent guide, in Spanish, for an agent that has only been given the site's address. The guide SHALL say:

- that every page has its Markdown at `<page>/llm.txt`, and that the pages, `/<slug>/llms.txt`, the MCP and the projects' skills need a session or an API key in the `x-api-key` header;
- that the user creates the key at the full address of `/me`;
- how to connect the MCP, with the full address of `/mcp`, a `claude mcp add` command with a placeholder for the key, and the names of its tools;
- a setup procedure, under a level 2 heading of its own, that an AI follows to configure itself with no further step by the user:
  1. read the skills index at its full address (`agent-skills`), sending the key when the user gave one;
  2. install every skill it lists in the AI's personal skills folder (in Claude Code, `~/.claude/skills/`), replacing an earlier copy: a `skill-md` entry by saving its `url` as `<name>/SKILL.md`, an `archive` entry by downloading its `url` and extracting it into `<name>/`; in both cases checking that the downloaded bytes match the entry's `digest` before saving, and skipping an entry that doesn't;
  3. tell the user which skills were installed, and that repeating the procedure refreshes them when the index shows another digest;
  4. only if the user wants the AI to use the documentation's tools, connect the MCP as the guide explains;
  
  with example commands, the key as a placeholder, that download the index and one skill of each type;
- each platform skill as a Markdown link to its `url` with its description.

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
- **THEN** the response SHALL be status 200 with the guide, holding `https://docs.example.org/me`, `https://docs.example.org/mcp`, `https://docs.example.org/.well-known/agent-skills/index.json`, the setup procedure, a link to `https://docs.example.org/.well-known/agent-skills/colofon/SKILL.md` and a link to `https://docs.example.org/.well-known/agent-skills/colofon-diagrams.tar.gz`, and no repository section

#### Scenario: Repository skills

- **WHEN** a signed-in user requests `/llms.txt` and `casa` serves the skill `casa-deploy`
- **THEN** the `## Casa` section SHALL end with `### Skills` and a link to `https://docs.example.org/.well-known/agent-skills/casa-deploy/SKILL.md` with its description

#### Scenario: Setup procedure

- **WHEN** an AI given only the site's address reads `/llms.txt`
- **THEN** the guide SHALL hold the setup procedure, with steps to install both `skill-md` and `archive` skills checking their digests, and the MCP as an optional last step
