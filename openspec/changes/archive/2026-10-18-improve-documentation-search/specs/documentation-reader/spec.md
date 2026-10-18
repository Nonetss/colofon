## MODIFIED Requirements

### Requirement: Search of documentation pages

The navbar search SHALL list the pages of the current scope (every repository in "Todos") as records, once the user has typed at least two characters, found by their title, description, header fields, the titles of their groups and sections, their headings and their body as `documentation-search` defines, in the order of relevance the search returns. Each SHALL be shown with its trail of groups and sections ("Red › DNS", preceded by the repository's name when several repositories are searched) and, when the match is in a heading or the body, with an excerpt of the text around it with the matched words highlighted instead of the page's description. Selecting one SHALL open the page, at the section that holds the match when there is one. The generated catalog type pages SHALL be listed as pages; entity pages SHALL NOT. They SHALL come from `v1.docs.search` asked for the searched repository, or for every repository.

A page result's extra matching sections SHALL be listed right under it, as indented results showing the section's heading and excerpt, each opening the page at that section.

When the answer is partial, the dialog SHALL say above the pages that no page holds every word, and each page SHALL show the words it lacks, struck through.

The matching catalog entities SHALL be listed in their own group, "Catálogo", each with its label, its type (and its repository when several are searched) and an icon marking it as catalog data; selecting one SHALL open the entity's catalog page. The group SHALL come before the pages when an entity's id or label equals the query as `documentation-search` defines that, and after them otherwise.

When the reader's scope is a repository, the dialog SHALL show a switch between that repository and "Todos", set to the repository each time the dialog opens. Changing it SHALL search again in the chosen scope, for this search only: the reader's scope SHALL NOT change. Pressing Tab or Shift+Tab in the search field SHALL switch it to the other option while the focus stays in the field, and the dialog SHALL show that Tab does so. When the scope is "Todos", the switch SHALL NOT be shown. When the repository finds nothing, the empty state SHALL offer to search every repository, which sets the switch to "Todos".

#### Scenario: Finding a page

- **WHEN** the scope is "Casa" and the user types "dns" in the search
- **THEN** the DNS page of "Casa" SHALL appear as "Red › DNS", and selecting it SHALL open `/casa/red/dns`

#### Scenario: Finding a catalog type

- **WHEN** the scope is "Casa", the menu shows `catalog` in the group "Datos" and the user types "machines"
- **THEN** the page "Machines" SHALL appear as "Datos › Catálogo › Machines", and selecting it SHALL open `/casa/catalog/machines`

#### Scenario: Finding a page by its body

- **WHEN** the scope is "Casa" and the user types "inversa", a word only the body of "DNS" holds, under its heading "Resolución inversa"
- **THEN** "Red › DNS" SHALL appear with an excerpt where "inversa" is highlighted, and selecting it SHALL open `/casa/red/dns` at that heading

#### Scenario: Title matches come first

- **WHEN** the user types "vlan", the title of one page and a word in the body of another
- **THEN** the page titled "VLAN" SHALL be listed before the other

#### Scenario: Search respects the scope

- **WHEN** the scope is "Casa" and a page of another repository also matches
- **THEN** only pages of "Casa" SHALL be listed

#### Scenario: One character searches nothing

- **WHEN** the user types a single character
- **THEN** no documentation page SHALL be listed

#### Scenario: Extra sections under a page

- **WHEN** the search returns "Red › DNS" pointing at "Cachés" with "Rendimiento" as an extra section
- **THEN** "Rendimiento" SHALL be listed indented right under "Red › DNS" with its excerpt, and selecting it SHALL open `/casa/red/dns#rendimiento`

#### Scenario: Partial results

- **WHEN** the user types "router zigbee", a page mentions "router" and no page mentions "zigbee"
- **THEN** the dialog SHALL say that no page holds every word, and the page SHALL be listed showing "zigbee" struck through

#### Scenario: Finding an entity

- **WHEN** the scope is "Colofon" and the user types "DATABASE_URL"
- **THEN** a "Catálogo" group SHALL be listed before the pages with "DATABASE_URL" of type "Variables de entorno", and selecting it SHALL open `/colofon/catalog/env-vars/database-url`

#### Scenario: Entities after pages when none is exact

- **WHEN** the user types "base de datos" and some entities and pages match, none of the entities with that id or label
- **THEN** the "Catálogo" group SHALL be listed after the pages

#### Scenario: Switching to every repository

- **WHEN** the scope is "Casa", the dialog is open and the user switches it to "Todos"
- **THEN** the results SHALL come from every readable repository with each trail starting with the repository's name, and the reader's scope SHALL still be "Casa" once the dialog closes

#### Scenario: Tab switches the scope

- **WHEN** the scope is "Casa", the user has typed "dns" and presses Tab in the search field
- **THEN** the switch SHALL be set to "Todos", the results of every repository SHALL be listed and the focus SHALL stay in the field; pressing Tab again SHALL set it back to "Casa"

#### Scenario: Tab without a switch

- **WHEN** the scope is "Todos" and the user presses Tab in the search field
- **THEN** the search SHALL NOT change

#### Scenario: Nothing in the scope

- **WHEN** the scope is "Casa", nothing in "Casa" matches "pihole" and the user picks the empty state's offer
- **THEN** the switch SHALL be set to "Todos" and the results of every repository SHALL be listed

#### Scenario: The switch resets

- **WHEN** the user switched the dialog to "Todos", closed it and opens it again
- **THEN** the switch SHALL be set to the scope's repository

## ADDED Requirements

### Requirement: Searched words highlighted on the opened page

Opening a page or an entity from the navbar search SHALL highlight, on the opened page, the words that start with one of the searched words, case and accents aside: within the section the result points at (its heading and everything up to the next heading of the same or a higher level) or, when it points at no section, within the whole body. The highlight SHALL NOT change the page's text or markup, so copying text or following links works as without it. It SHALL last until the reader leaves the page. Opening the same address any other way (a link, the address bar, a reload, going back) SHALL NOT highlight anything.

#### Scenario: Highlight in the matched section

- **WHEN** the user searches "inversa" and opens "Red › DNS" at "Resolución inversa"
- **THEN** every word starting with "inversa" in that section SHALL be highlighted, and none outside it

#### Scenario: Highlight in the whole page

- **WHEN** the user searches "vlan" and opens the page titled "VLAN", which the result points at as a whole
- **THEN** the words starting with "vlan" in the page's body SHALL be highlighted

#### Scenario: Leaving the page clears it

- **WHEN** the highlighted page is open and the user follows a link to another page and comes back
- **THEN** nothing SHALL be highlighted

#### Scenario: A reload does not highlight

- **WHEN** the user reloads a page they opened from the search
- **THEN** nothing SHALL be highlighted
