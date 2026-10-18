## MODIFIED Requirements

### Requirement: Search index of a repository's pages

The backend SHALL keep one search index holding the pages of every content repository it can read, each document tagged with its repository. It SHALL hold the pages the navigation lists: each repository's home, every page and section, and the generated catalog type pages. Entity pages SHALL NOT be indexed as pages; catalog entities are indexed as entities (see "Entity search"). For each page the index SHALL hold its title, the text of its headings, its description and the text of its header fields, the titles of the groups and sections above it, and the text of its body. A page whose body cannot be parsed SHALL be indexed by everything but its body. A repository's documents SHALL be replaced whenever its pages are rebuilt, without rebuilding the documents of the other repositories, so a sync that changes a page is reflected in the next search. The index SHALL NOT be stored in the database. A search SHALL only return documents of the repositories the caller can read, whatever the index holds.

#### Scenario: A word only in the body finds the page

- **WHEN** the body of the page "DNS" of "Casa" says "resolución inversa" and neither its title nor its description does, and a user searches "inversa"
- **THEN** that page SHALL be returned

#### Scenario: A sync updates the index

- **WHEN** a sync adds the word "pihole" to a page's body and a user then searches "pihole"
- **THEN** that page SHALL be returned

#### Scenario: Entity pages are not searched

- **WHEN** a catalog entity's page is the only page whose text holds the searched words
- **THEN** no page result SHALL be returned for it

#### Scenario: Another user's repository is never returned

- **WHEN** a user's own repository holds the only page that says "pihole", and another user searches "pihole" in every repository
- **THEN** no result SHALL be returned for that page

### Requirement: Search matching

A search SHALL match case- and accent-insensitively, and SHALL return a page only when every word of the query is found in some indexed text of that page. A word SHALL also match the words it is a prefix of. A word of five characters or more SHALL also match words that differ from it by one letter (added, missing or changed), so a slight typo still finds the page; shorter words SHALL match only exactly or as a prefix.

When the query has two words or more and no page in the searched repositories holds every one of them, the search SHALL instead return the pages that hold at least one, as a partial answer: it SHALL be marked partial, and each result SHALL name the query's words that page does not hold. A partial answer SHALL rank pages that hold more of the words before pages that hold fewer, and by relevance between pages that hold as many. A query of one word that no page holds SHALL return no results.

#### Scenario: Accents and case are ignored

- **WHEN** a page's body says "Configuración" and the user searches "configuracion"
- **THEN** that page SHALL be returned

#### Scenario: Every word must be found

- **WHEN** a page mentions "router" but not "vlan", another page mentions both, and the user searches "router vlan"
- **THEN** only the page that mentions both SHALL be returned, and the answer SHALL NOT be partial

#### Scenario: Words are found across fields

- **WHEN** the page "DNS" sits in the group "Red" and the user searches "red dns"
- **THEN** that page SHALL be returned

#### Scenario: A prefix matches

- **WHEN** a page's body says "sincronización" and the user searches "sincro"
- **THEN** that page SHALL be returned

#### Scenario: A typo in a long word still matches

- **WHEN** a page's body says "configuración" and the user searches "confguracion"
- **THEN** that page SHALL be returned

#### Scenario: Short words are not approximated

- **WHEN** a page mentions "dns" but not "dms", and the user searches "dms"
- **THEN** that page SHALL NOT be returned for that match

#### Scenario: No page holds every word

- **WHEN** a page mentions "router" and "vlan", another mentions only "router", no page mentions "zigbee", and the user searches "router vlan zigbee"
- **THEN** the answer SHALL be partial, the first page SHALL be listed first lacking "zigbee", and the second SHALL follow lacking "vlan" and "zigbee"

#### Scenario: One unknown word finds nothing

- **WHEN** no page holds "zigbee" and the user searches "zigbee"
- **THEN** no result SHALL be returned and the answer SHALL NOT be partial

### Requirement: Search ranking

Results SHALL be ordered by relevance. A match SHALL weigh more in the title than in a heading, more in a heading than in the description, header fields or the titles of the groups above the page, and more there than in the body. An exact word SHALL weigh more than a prefix match, and a prefix match more than a match with a typo. Between pages where the words appear in the same places, a page where they appear more often relative to its length SHALL rank higher. How rare a word is SHALL be measured over every indexed repository, so the relevance of a page does not depend on which repositories are searched with it and pages of different repositories are ranked against each other on the same terms. Ties SHALL be broken by title, then by route, so the same query over the same pages always returns the same order.

#### Scenario: Title beats body

- **WHEN** the page "VLAN" has the word in its title and the page "Router" only mentions "vlan" in its body, and the user searches "vlan"
- **THEN** "VLAN" SHALL be listed before "Router"

#### Scenario: Heading beats body

- **WHEN** one page has a heading "Copias de seguridad" and another only says "copias" in a paragraph, neither in its title, and the user searches "copias"
- **THEN** the page with the heading SHALL be listed first

#### Scenario: Exact beats approximate

- **WHEN** one page's body says "nodo" and another's says "modo", and the user searches "nodo"
- **THEN** the page that says "nodo" SHALL be listed first, if the other is listed at all

#### Scenario: Repository size does not bias the ranking

- **WHEN** repository "Mini" has one page and repository "Grande" has fifty, each has one page titled "Notas" whose body says "proxy" once with the same length, no other page says "proxy", and the user searches "proxy" in every repository
- **THEN** both pages SHALL be equally relevant, and SHALL be ordered by title and route

#### Scenario: The scope does not change a page's relevance

- **WHEN** the user searches the same query once in the repository "Casa" and once in every repository
- **THEN** the pages of "Casa" SHALL appear in the same relative order in both answers

### Requirement: Search result excerpt and section

Each result SHALL carry the page's route, title, description and trail of groups and sections. When some word of the query is found only in the page's headings or body, the result SHALL also carry an excerpt of at most about 160 characters of the section that holds the most of the query's words (the first such section on a tie), around the first of them, cut at word boundaries and marked with an ellipsis where it is cut, with the ranges of the matched words; and its route SHALL point at that section's heading (`/casa/red/dns#resolucion-inversa`). When every word is found in the title, description, header fields or trail, the result SHALL carry no excerpt and its route SHALL be the page's.

A result that carries an excerpt SHALL also carry up to two more sections of the page that hold at least one of the query's words, other than the excerpt's: the ones holding the most of them, in page order on a tie, and only sections under a heading. Each SHALL carry its heading's text, a route pointing at its heading and an excerpt built as above. A result without an excerpt SHALL carry no extra sections.

#### Scenario: Body match points at its section

- **WHEN** the user searches "inversa" and the page "DNS" says it under the heading "Resolución inversa"
- **THEN** the result's route SHALL end in that heading's id and its excerpt SHALL include "inversa" with that word's range marked

#### Scenario: Title match has no excerpt

- **WHEN** the user searches "dns" and the page "DNS" is returned for its title
- **THEN** the result SHALL have no excerpt, no extra sections, and its route SHALL be the page's

#### Scenario: Match before the first heading

- **WHEN** the match is in the body text above the page's first heading
- **THEN** the result SHALL carry the excerpt and its route SHALL be the page's

#### Scenario: Several matching sections

- **WHEN** the user searches "caché ttl", and the page "DNS" says "caché" under the headings "Resolución inversa", "Cachés" and "Rendimiento" but "ttl" only under "Cachés"
- **THEN** the result SHALL point at "Cachés" with its excerpt, and SHALL carry "Resolución inversa" and "Rendimiento" as extra sections, in that order, each with its route and excerpt

#### Scenario: One matching section

- **WHEN** the query's words are found in only one section of the page
- **THEN** the result SHALL carry no extra sections

### Requirement: Documentation search endpoint

The API SHALL expose `v1.docs.search` as a read with `GET` for signed-in users and API keys, under the "Docs" tag, taking the query (trimmed, at least two characters), an optional repository slug, and a limit (10 by default, at most 20). It SHALL search only that repository when the slug names a readable one, and every readable repository otherwise, as the reader's scope does with a stored value that names no repository; results from several repositories SHALL be ranked together. It SHALL return at most the limit of page results, ranked, each with the repository's slug and name besides the fields of "Search result excerpt and section", the query words as typed, the query words the page lacks (empty unless the answer is partial), and its extra sections; whether more than one repository was searched; whether the answer is partial; and at most five matching entities as "Entity search" defines, whatever the limit. Page problems SHALL NOT be returned. A request without a session or API key SHALL be rejected as unauthorized.

#### Scenario: Search within a scope

- **WHEN** a signed-in user calls `v1.docs.search` with the query "dns" and the repository `casa`
- **THEN** only pages and entities of "casa" SHALL be returned

#### Scenario: Search across every repository

- **WHEN** a signed-in user calls `v1.docs.search` with the query "dns" and no repository, or a slug that names no readable repository
- **THEN** matching pages and entities of every readable repository SHALL be returned, ranked together

#### Scenario: Too short a query

- **WHEN** the query is a single character after trimming
- **THEN** the call SHALL be rejected as a bad request

#### Scenario: Results are bounded

- **WHEN** more pages match than the limit
- **THEN** exactly the limit of page results SHALL be returned, the most relevant ones

#### Scenario: Entities are bounded apart

- **WHEN** eight entities and three pages match, and the limit is 10
- **THEN** the three pages and five entities SHALL be returned

#### Scenario: Anonymous call

- **WHEN** a request without a session or API key calls `v1.docs.search`
- **THEN** it SHALL be rejected as unauthorized

## ADDED Requirements

### Requirement: Entity search

The index SHALL also hold every valid catalog entity of each readable repository, by its id, its label, its type's plural and id, and the text of its field values. A search SHALL return the entities that hold every word of the query, matched as pages are (case and accents aside, by prefix, and with one typo in words of five characters or more), with no partial fallback. An entity whose id or label equals the query, case, accents and the separators `-`, `_`, `:`, `.` and spaces aside, SHALL rank before every other; then a match SHALL weigh more in the id or label than in the type, and more there than in the field values; ties SHALL be broken by label, then type, then repository. Each entity result SHALL carry the repository's slug and name, the type's id and plural, the entity's id and label, the route of the entity's generated catalog page, and whether its id or label equals the query as above.

#### Scenario: An identifier finds its entity

- **WHEN** the type `env-vars` of "Colofon" has the entity `database-url` labelled "DATABASE_URL", and the user searches "DATABASE_URL"
- **THEN** that entity SHALL be the first entity result, with its type "Variables de entorno" and the route `/colofon/catalog/env-vars/database-url`

#### Scenario: A field value finds an entity

- **WHEN** the entity "Router" of the type "Máquinas" has the value "192.168.1.1" in its field `ip`, and the user searches "192.168.1.1"
- **THEN** that entity SHALL be returned

#### Scenario: Exact label beats a mention in a field

- **WHEN** one entity is labelled "Proxy" and another only says "proxy" in a field value, and the user searches "proxy"
- **THEN** the entity labelled "Proxy" SHALL be listed first

#### Scenario: Entities need every word

- **WHEN** no entity holds both "router" and "zigbee", and the user searches "router zigbee"
- **THEN** no entity SHALL be returned, even if the page answer is partial
