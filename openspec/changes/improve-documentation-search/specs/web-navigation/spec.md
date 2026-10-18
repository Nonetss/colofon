## RENAMED Requirements

- FROM: `### Requirement: Recently visited surfaces`
- TO: `### Requirement: Recently read documentation pages`

## MODIFIED Requirements

### Requirement: Recently read documentation pages

The navbar search SHALL remember, in the browser's `localStorage` and scoped to the signed-in user, the documentation pages the user opened most recently (at most five, newest first), and SHALL list them under a "Recientes" group while the query is empty, each with its icon, its trail of groups and sections preceded by the repository's name, and its title, as the navigation the user can read now shows them. A visit SHALL count only for a page the navigation lists (a repository's home, a page, a section or a catalog type page), not for an entity page or an application screen. A remembered page the user can no longer read, or that no longer exists, SHALL NOT be listed. Storage failures SHALL NOT break the search.

#### Scenario: Recent pages are suggested first

- **WHEN** the user has opened `/casa/red/dns` and then `/casa/red/vlan`, navigates to `/colofon/frontend` and opens the search dialog without typing
- **THEN** a "Recientes" group SHALL list "Casa › Red › VLAN" and then "Casa › Red › DNS"

#### Scenario: Current page is not suggested as recent

- **WHEN** the user opens the search dialog on a page that is in their recent list
- **THEN** that page SHALL NOT appear in the "Recientes" group

#### Scenario: Typing hides the recent group

- **WHEN** the user types a query
- **THEN** the "Recientes" group SHALL be hidden and only the search results SHALL be shown

#### Scenario: Recents are per user and respect visibility

- **WHEN** a different user signs in on the same browser, or a remembered page was removed or belongs to a repository the user can no longer read
- **THEN** the dialog SHALL NOT suggest pages from the other user's history nor that page

#### Scenario: Application screens are not remembered

- **WHEN** the user opens `/me` and then the search dialog without typing
- **THEN** the "Recientes" group SHALL NOT list the profile

#### Scenario: Storage unavailable

- **WHEN** `localStorage` is unavailable or holds malformed data
- **THEN** the search dialog SHALL work without a "Recientes" group
