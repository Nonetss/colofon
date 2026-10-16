## MODIFIED Requirements

### Requirement: Search of documentation pages

The navbar search SHALL list the pages of the current scope (every repository in "Todos") as records, once the user has typed at least two characters, found by their title, description, header fields, the titles of their groups and sections, their headings and their body as `documentation-search` defines, in the order of relevance the search returns. Each SHALL be shown with its trail of groups and sections ("Red › DNS", preceded by the repository's name in "Todos") and, when the match is in a heading or the body, with an excerpt of the text around it with the matched words highlighted instead of the page's description. Selecting one SHALL open the page, at the section that holds the match when there is one. The generated catalog type pages SHALL be listed as pages; entity pages SHALL NOT. They SHALL come from `v1.docs.search` asked for the scope's repository, or for every repository in "Todos".

#### Scenario: Finding a page

- **WHEN** the scope is "Casa" and the user types "dns" in the search
- **THEN** the DNS page of "Casa" SHALL appear as "Red › DNS", and selecting it SHALL open `/casa/red/dns`

#### Scenario: Finding a catalog type

- **WHEN** the scope is "Casa", the menu shows `catalogo` in the group "Datos" and the user types "machines"
- **THEN** the page "Machines" SHALL appear as "Datos › Catálogo › Machines", and selecting it SHALL open `/casa/catalogo/machines`

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
