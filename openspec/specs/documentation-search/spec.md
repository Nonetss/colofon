# documentation-search Specification

## Purpose
Defines the full-text search over the documentation pages: the in-memory index of each repository's pages, how a query matches and ranks them, the excerpt and section anchor of each result, and the `v1.docs.search` procedure.

## Requirements

### Requirement: Search index of a repository's pages

The backend SHALL keep, for each content repository it can read, a search index of the pages the navigation lists: the repository's home, every page and section, and the generated catalog type pages. Entity pages SHALL NOT be indexed. For each page the index SHALL hold its title, the text of its headings, its description and the text of its header fields, the titles of the groups and sections above it, and the text of its body. A page whose body cannot be parsed SHALL be indexed by everything but its body. The index SHALL be built with the repository's pages and replaced whenever they are rebuilt, so a sync that changes a page is reflected in the next search, and SHALL NOT be stored in the database.

#### Scenario: A word only in the body finds the page

- **WHEN** the body of the page "DNS" of "Casa" says "resolución inversa" and neither its title nor its description does, and a user searches "inversa"
- **THEN** that page SHALL be returned

#### Scenario: A sync updates the index

- **WHEN** a sync adds the word "pihole" to a page's body and a user then searches "pihole"
- **THEN** that page SHALL be returned

#### Scenario: Entity pages are not searched

- **WHEN** a catalog entity's page is the only page whose text holds the searched words
- **THEN** no result SHALL be returned for it

### Requirement: Search matching

A search SHALL match case- and accent-insensitively, and SHALL return a page only when every word of the query is found in some indexed text of that page. A word SHALL also match the words it is a prefix of. A word of five characters or more SHALL also match words that differ from it by one letter (added, missing or changed), so a slight typo still finds the page; shorter words SHALL match only exactly or as a prefix.

#### Scenario: Accents and case are ignored

- **WHEN** a page's body says "Configuración" and the user searches "configuracion"
- **THEN** that page SHALL be returned

#### Scenario: Every word must be found

- **WHEN** a page mentions "router" but not "vlan", and the user searches "router vlan"
- **THEN** that page SHALL NOT be returned

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

### Requirement: Search ranking

Results SHALL be ordered by relevance. A match SHALL weigh more in the title than in a heading, more in a heading than in the description, header fields or the titles of the groups above the page, and more there than in the body. An exact word SHALL weigh more than a prefix match, and a prefix match more than a match with a typo. Between pages where the words appear in the same places, a page where they appear more often relative to its length SHALL rank higher. Ties SHALL be broken by title, then by route, so the same query over the same pages always returns the same order.

#### Scenario: Title beats body

- **WHEN** the page "VLAN" has the word in its title and the page "Router" only mentions "vlan" in its body, and the user searches "vlan"
- **THEN** "VLAN" SHALL be listed before "Router"

#### Scenario: Heading beats body

- **WHEN** one page has a heading "Copias de seguridad" and another only says "copias" in a paragraph, neither in its title, and the user searches "copias"
- **THEN** the page with the heading SHALL be listed first

#### Scenario: Exact beats approximate

- **WHEN** one page's body says "nodo" and another's says "modo", and the user searches "nodo"
- **THEN** the page that says "nodo" SHALL be listed first, if the other is listed at all

### Requirement: Search result excerpt and section

Each result SHALL carry the page's route, title, description and trail of groups and sections. When some word of the query is found only in the page's headings or body, the result SHALL also carry an excerpt of at most about 160 characters of the section that holds the most of the query's words (the first such section on a tie), around the first of them, cut at word boundaries and marked with an ellipsis where it is cut, with the ranges of the matched words; and its route SHALL point at that section's heading (`/casa/red/dns#resolucion-inversa`). When every word is found in the title, description, header fields or trail, the result SHALL carry no excerpt and its route SHALL be the page's.

#### Scenario: Body match points at its section

- **WHEN** the user searches "inversa" and the page "DNS" says it under the heading "Resolución inversa"
- **THEN** the result's route SHALL end in that heading's id and its excerpt SHALL include "inversa" with that word's range marked

#### Scenario: Title match has no excerpt

- **WHEN** the user searches "dns" and the page "DNS" is returned for its title
- **THEN** the result SHALL have no excerpt and its route SHALL be the page's

#### Scenario: Match before the first heading

- **WHEN** the match is in the body text above the page's first heading
- **THEN** the result SHALL carry the excerpt and its route SHALL be the page's

### Requirement: Documentation search endpoint

The API SHALL expose `v1.docs.search` as a read with `GET` for signed-in users and API keys, under the "Docs" tag, taking the query (trimmed, at least two characters), an optional repository slug, and a limit (10 by default, at most 20). It SHALL search only that repository when the slug names a readable one, and every readable repository otherwise, as the reader's scope does with a stored value that names no repository; results from several repositories SHALL be ranked together. It SHALL return at most the limit of results, ranked, each with the repository's slug and name besides the fields of "Search result excerpt and section", the query words that matched the page, and whether more than one repository was searched. Page problems SHALL NOT be returned. A request without a session or API key SHALL be rejected as unauthorized.

#### Scenario: Search within a scope

- **WHEN** a signed-in user calls `v1.docs.search` with the query "dns" and the repository `casa`
- **THEN** only pages of "casa" SHALL be returned

#### Scenario: Search across every repository

- **WHEN** a signed-in user calls `v1.docs.search` with the query "dns" and no repository, or a slug that names no readable repository
- **THEN** matching pages of every readable repository SHALL be returned, ranked together

#### Scenario: Too short a query

- **WHEN** the query is a single character after trimming
- **THEN** the call SHALL be rejected as a bad request

#### Scenario: Results are bounded

- **WHEN** more pages match than the limit
- **THEN** exactly the limit of results SHALL be returned, the most relevant ones

#### Scenario: Anonymous call

- **WHEN** a request without a session or API key calls `v1.docs.search`
- **THEN** it SHALL be rejected as unauthorized
