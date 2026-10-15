## MODIFIED Requirements

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
