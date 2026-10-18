## MODIFIED Requirements

### Requirement: Search tool

The `search` tool SHALL take a query, an optional repository slug and an optional limit, with the same rules, defaults, matching and ranking as `v1.docs.search`. A slug that names no repository, or one without readable content, SHALL return a tool error result instead of searching every repository. The text SHALL list the page results in rank order. Each result SHALL have the trail and title, the route to pass to `read`, the repository when several were searched, the description when it is not empty, the excerpt when there is one, and each extra section with its heading, route and excerpt. When the answer is partial, the text SHALL say so before the results, and each result SHALL name the words it lacks. When entities match, the text SHALL list them after the pages, each with its label, type and repository, and the repository, type and id to pass to `entity`. When nothing matches, the text SHALL say so. The result SHALL also carry the results as structured content, each with its repository slug and name, route, title, description, trail, excerpt text, missing words and extra sections (heading, route and excerpt text); whether the answer is partial; and the entities, each with its repository slug and name, type id and plural, id, label and route.

#### Scenario: A match in a section

- **WHEN** the agent searches "inversa" and the page `/casa/red/dns` holds it under the heading "Resolución inversa"
- **THEN** a result SHALL show the route `/casa/red/dns#resolucion-inversa`, the trail and title "Red / DNS", and the excerpt around the word

#### Scenario: Unknown repository

- **WHEN** the agent searches "dns" with `repository: "no-existe"`
- **THEN** the result SHALL be a tool error saying that repository does not exist or has no content, and no search SHALL run

#### Scenario: No results

- **WHEN** the agent searches a word no page or entity holds
- **THEN** the result SHALL NOT be an error, and its text SHALL say that nothing was found

#### Scenario: Extra sections

- **WHEN** the agent searches "caché ttl" and the page `/casa/red/dns` points at "Cachés" with "Rendimiento" as an extra section
- **THEN** that result SHALL also list "Rendimiento" with the route `/casa/red/dns#rendimiento` and its excerpt

#### Scenario: Partial answer

- **WHEN** the agent searches "router zigbee" and no page holds "zigbee"
- **THEN** the text SHALL say that no page holds every word, each result SHALL name "zigbee" as missing, and the structured content SHALL be marked partial

#### Scenario: Matching entity

- **WHEN** the agent searches "DATABASE_URL" in `colofon`
- **THEN** the text SHALL list the entity "DATABASE_URL" of type "Variables de entorno" with `repository: colofon`, `type: env-vars` and `id: database-url`
