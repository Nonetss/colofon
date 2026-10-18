# Web Navigation

## Purpose

Defines the web navigation shell: authenticated and guest navbars driven by the surface registry, responsive menus, active link highlighting, account menu, admin entry point, page layouts, view-transition navigation, section-sidebar scroll restoration and the navbar surface search.

## Requirements

### Requirement: Authenticated and guest navbars

The web layout SHALL render an authenticated navbar for signed-in users and a
guest navbar for public pages (such as login and registration) or when no
session exists. Both navbars SHALL show the application logo and the name the
layout passes as `nameApp`, linking to `/`. The authenticated navbar SHALL NOT
render application section links: it SHALL show the brand, the surface search,
the theme menu and the user menu, plus, on documentation pages below the medium
breakpoint, a menu button that opens the documentation sidebar. The guest
navbar SHALL omit the surface search and the user menu.

#### Scenario: Public page renders the guest navbar

- **WHEN** a page is rendered with the guest navbar flag enabled, or without a
  session
- **THEN** the layout SHALL show only the brand and the theme menu, without app
  links or account actions

#### Scenario: Application page renders the authenticated navbar

- **WHEN** a page is rendered for a signed-in user without the guest navbar flag
- **THEN** the layout SHALL show the brand, the surface search, the theme menu
  and the user menu, and no section links

#### Scenario: Documentation page on a phone

- **WHEN** a documentation page is rendered on a 390 px wide viewport
- **THEN** the navbar SHALL show a menu button that opens the documentation
  sidebar

### Requirement: Account menu

The user menu SHALL reflect the current session. When no user is authenticated
it SHALL present a sign-in action; when a user is authenticated it SHALL present
the user's name and email, a link to the profile, an "Administración" link to
`/admin` for users with the `admin` role only, and a sign-out action.

#### Scenario: Anonymous user sees sign-in

- **WHEN** no authenticated user is present
- **THEN** the user menu SHALL render a sign-in action linking to the login page

#### Scenario: Authenticated user sees account actions

- **WHEN** a user is authenticated
- **THEN** the user menu SHALL display the user's name and email and offer
  profile (`/me`) and sign-out actions

#### Scenario: Admin sees the administration link

- **WHEN** a user with the `admin` role opens the user menu
- **THEN** it SHALL offer "Administración", linking to `/admin`

#### Scenario: Signing out

- **WHEN** the user selects the sign-out action
- **THEN** the system SHALL end the session and redirect to the login page

### Requirement: Client-side navigation with view transitions

The layouts SHALL use Astro's `ClientRouter` so navigation between pages happens
client-side with view transitions. Navigation chrome (navbar, documentation
sidebar and admin shell) SHALL persist across swaps instead of remounting,
while the page content fades in.

#### Scenario: Navigating between pages

- **WHEN** the user follows an internal link
- **THEN** the page content SHALL be swapped with a fade transition and the
  navbar SHALL remain mounted with its state

#### Scenario: Navigating between documentation pages

- **WHEN** the user follows a link from one documentation page to another
- **THEN** the documentation sidebar SHALL remain mounted with its scroll
  offset and expanded sections

### Requirement: Navbar surface search

The authenticated navbar SHALL offer a search that lets the user jump to any
registered application surface by typing part of its name. The searchable
destinations SHALL be projected from the application-surface registry
(`app-surfaces.ts`); no label, description or icon SHALL be declared in the
search component itself.

#### Scenario: Desktop shows a search trigger

- **WHEN** the authenticated navbar is displayed on a large (`lg` and up)
  viewport
- **THEN** the navbar actions SHALL include a search trigger that reads as a
  search field and shows the keyboard shortcut

#### Scenario: Small viewport shows an icon trigger

- **WHEN** the authenticated navbar is displayed below the large breakpoint
- **THEN** the navbar actions SHALL include an icon-only search trigger with an
  accessible name and a hover hint

#### Scenario: Guest navbar has no search

- **WHEN** a page is rendered with the guest navbar
- **THEN** no surface search trigger SHALL be rendered

#### Scenario: Opening with the trigger

- **WHEN** the user activates the search trigger
- **THEN** a search dialog SHALL open with the text input focused

#### Scenario: Opening with the keyboard shortcut

- **WHEN** the authenticated navbar is mounted and the user presses `⌘K` (macOS)
  or `Ctrl+K` (other platforms)
- **THEN** the search dialog SHALL open, and pressing the shortcut again while it
  is open SHALL close it

### Requirement: Searchable surfaces

The surface search SHALL list every registered surface whose route path has no
dynamic segment, excluding surfaces that opt out of search and, for users
without the `admin` role, surfaces marked `adminOnly`. A surface whose path has
a dynamic segment SHALL NOT be listed as a surface; it SHALL be reachable
through the search only by way of its records, when it declares a search source
(see "Searchable records of dynamic surfaces"). Results SHALL be grouped by
top-level section, and each result SHALL show the surface's icon, label and
description. The label of a sub-surface SHALL be preceded by the labels of its
parent sections, outermost first ("Configuración › Apariencia"), wherever the
result is listed, including the "Recientes" group.

#### Scenario: Dynamic routes are not listed

- **WHEN** the search dialog lists its destinations
- **THEN** surfaces whose path contains a dynamic segment (such as
  `/admin/git/[repo]`) SHALL NOT appear as a surface entry with the unresolved path

#### Scenario: Opted-out surfaces are not listed

- **WHEN** the search dialog lists its destinations
- **THEN** the login, signup and not-found surfaces SHALL NOT appear

#### Scenario: Non-admin does not see admin surfaces

- **WHEN** a user without the `admin` role opens the search dialog
- **THEN** no `adminOnly` surface SHALL appear, whatever the query

#### Scenario: Admin sees admin surfaces

- **WHEN** a user with the `admin` role searches for "usuarios"
- **THEN** the admin users surface SHALL appear in the results

#### Scenario: Sub-surfaces are grouped under their section

- **WHEN** the search dialog lists the children of a section (such as the
  appearance page of the configuration)
- **THEN** they SHALL appear in a group headed by that section's label

#### Scenario: Sub-surfaces show their section trail

- **WHEN** the user types "apariencia"
- **THEN** the appearance result SHALL read "Configuración › Apariencia"

### Requirement: Server-searched record sources

A search source SHALL obtain its records through an endpoint of its own record
entity: its list endpoint when the entity is listed in full, its search endpoint
when the entity is listed in pages or its records are found by more than their
labels. A full-list source keeps the behavior of
"Searchable records of dynamic surfaces": it loads the list once while the
dialog is open and the dialog matches it locally. A server-searched source SHALL
instead ask its entity's search endpoint for the records matching the user's
text, with the same API permissions as the pages that list those records, and
SHALL list at most a fixed number of records per source in the order the
endpoint returns them. The documentation pages source SHALL be server-searched
(`documentation-reader`).

A server-searched source SHALL be queried with the text the user settled on,
about 150 ms after the last keystroke, not once per keystroke. The words of the
query that match the labels of the source's own surface or of the concrete-path
surfaces its route sits under SHALL NOT be sent to the server, while the dialog
still matches them locally against the record. The source SHALL NOT be queried
when no word remains or when what remains is shorter than two characters, and
then it SHALL list no records. While the next answer loads, the records of the
previous answer SHALL stay listed.

A record SHALL be able to carry extra match terms besides its label and
description (for example an address the server matched on, or the query words a
full-text search found in a record's body or with a typo), and the dialog
SHALL match the query against them too, so a record the endpoint returned is not
filtered out because its match is not visible in its label. The rules of
"Searchable records of dynamic surfaces" on the dialog being open, empty
queries, `adminOnly` surfaces, loading or failing sources and recent pages SHALL
apply to server-searched sources as well.

#### Scenario: A paginated source asks its own search endpoint

- **WHEN** a source is declared as server-searched and the user types "lectura"
- **THEN** the records listed for that source SHALL be the ones its entity's
  search endpoint returns for "lectura", not a page of its list endpoint

#### Scenario: Documentation pages are server-searched

- **WHEN** the user types "inversa" in the search dialog
- **THEN** the documentation pages source SHALL list what `v1.docs.search`
  returns for "inversa", in that order

#### Scenario: Server search waits for the user to pause

- **WHEN** the user types a word into the dialog one character after another
  without pausing, with a server-searched source declared
- **THEN** that source SHALL be queried for the settled text, not once per
  keystroke

#### Scenario: Section words are not sent to the server

- **WHEN** a server-searched source sits under a section labelled "Dispositivos"
  and the user types "dispositivos lectura"
- **THEN** that source SHALL be asked for "lectura" only, and the records it
  returns SHALL still match the full query in the dialog

#### Scenario: A bare section name does not query the server

- **WHEN** the user types only the label of a server-searched source's section,
  or a single character besides it
- **THEN** that source SHALL NOT be queried and SHALL list no records, while the
  section's surface still appears

#### Scenario: Results are bounded

- **WHEN** more records match than the source's limit
- **THEN** that source's group SHALL list at most that many records

#### Scenario: Extra match terms keep a server match

- **WHEN** the search endpoint returns a record because its address contains the
  typed text, and the address is one of the record's extra match terms but not
  its label or description
- **THEN** that record SHALL be listed

#### Scenario: A typo matched by the server is kept

- **WHEN** the user types "confguracion" and the documentation search returns a
  page that says "configuración"
- **THEN** that page SHALL be listed

#### Scenario: Previous answer stays while the next loads

- **WHEN** a server-searched source has listed records for one text and the user
  extends the text
- **THEN** the earlier records SHALL stay listed until the new answer arrives,
  and SHALL disappear when the text no longer qualifies for a server query

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

### Requirement: Surface search matching and navigation

The surface search SHALL match the query case- and accent-insensitively against
each surface's label, description and parent section label. A query of several
words SHALL match a result only when every word is found in at least one of the
texts that result is matched against; this applies to surfaces and to record
results alike. The search SHALL show an empty state in Spanish when nothing
matches. Selecting a result SHALL close the dialog and navigate to the surface's
path through the View Transitions–aware client navigation.

#### Scenario: Accent-insensitive match

- **WHEN** the user types "documentacion"
- **THEN** the "Inicio" surface, described as the documentation of every
  repository, SHALL appear in the results

#### Scenario: Match through the parent section

- **WHEN** an admin types "admin"
- **THEN** the admin section and its sub-surfaces (such as "Usuarios") SHALL
  appear in the results

#### Scenario: Multi-word query narrows to one section

- **WHEN** an admin types "admin cuentas"
- **THEN** the "Usuarios" surface (under "Admin", described as creating,
  banning or removing accounts) SHALL appear and the "API keys" surface SHALL
  NOT

#### Scenario: Multi-word query across a record's section and name

- **WHEN** a page titled "DNS" sits in the section "Red" and the user types
  "red dns"
- **THEN** the result reading "Red › DNS" SHALL appear in the documentation
  group

#### Scenario: No matches

- **WHEN** the query matches no searchable surface
- **THEN** the dialog SHALL show an empty-state message and no results

#### Scenario: Selecting a result

- **WHEN** the user selects a result with the pointer or with `Enter` on the
  highlighted item
- **THEN** the dialog SHALL close and the app SHALL navigate to that surface's
  path

#### Scenario: Current page is marked

- **WHEN** the search dialog lists the surface for the current path
- **THEN** that result SHALL be visually marked as the current page

### Requirement: Admin navigation from the surface registry

The admin shell sidebar, the section sidebar and the section overview pages
SHALL read their sections from `lib/site-nav.ts`, which is projected from the
application-surface registry (`lib/app-surfaces.ts`). A section's child
surfaces SHALL appear as its sub-items. Navigation components MUST NOT hardcode
labels, descriptions or icons. Documentation navigation is not part of the
registry: it comes from the content (`documentation-reader`).

#### Scenario: Admin section with sub-routes

- **WHEN** the admin surface has child surfaces (such as Usuarios and
  Contenido)
- **THEN** the admin shell sidebar SHALL list one row per child surface, each
  with its icon and label from the registry

#### Scenario: Profile section with sub-routes

- **WHEN** the profile surface has child surfaces (such as API keys and
  Secretos)
- **THEN** the section sidebar on `/me` SHALL list one row per child surface,
  each with its icon and label from the registry

#### Scenario: Navbar without registry sections

- **WHEN** a surface declares a navigation placement
- **THEN** the authenticated navbar SHALL still render no section link for it

### Requirement: Responsive documentation navigation

On documentation pages the documentation sidebar, and on section pages the
section sidebar, SHALL be shown beside the page from the medium breakpoint and
SHALL open as a sheet from the navbar's menu button below it. Pages without a
sidebar SHALL show no menu button, since the navbar has no section links to
collapse.

#### Scenario: Large viewport shows the sidebar

- **WHEN** a documentation page is displayed on a viewport at the medium
  breakpoint or wider
- **THEN** the documentation sidebar SHALL be shown beside the page and the
  navbar SHALL show no menu button

#### Scenario: Small viewport shows the sheet

- **WHEN** a documentation page is displayed below the medium breakpoint
- **THEN** the documentation sidebar SHALL be available through a sheet opened
  from the navbar's menu button

#### Scenario: Profile page on a phone

- **WHEN** `/me` is displayed below the medium breakpoint
- **THEN** the navbar SHALL show the menu button, and activating it SHALL open
  the profile sidebar as a sheet

#### Scenario: Choosing a row from the sheet

- **WHEN** the profile sidebar is open as a sheet and the user selects the
  secrets row
- **THEN** `/me/secrets` SHALL open and the sheet SHALL close

#### Scenario: Page without a sidebar on a phone

- **WHEN** the not-found page is displayed below the medium breakpoint
- **THEN** the navbar SHALL show no menu button

### Requirement: Current link highlighting

Navigation that lists registry surfaces (the admin shell sidebar, the section
sidebar, the account menu and the surface search) SHALL match the current path
through `isNavLinkActive(href, pathname)`. The home link MUST match only the
exact root path, while other links match when the current path equals the
link's href or is nested under it. Within a section, only the most specific
matching row SHALL be marked current. The documentation sidebar SHALL mark only
the row whose route equals the current page's route.

#### Scenario: Home is active only at root

- **WHEN** the current path is `/`
- **THEN** a link to `/` SHALL be highlighted and no link to a repository SHALL

#### Scenario: Admin sub-route is the current row

- **WHEN** the current path is `/admin/git/manual`
- **THEN** the admin shell's Git row SHALL be current and the Resumen row SHALL
  NOT

#### Scenario: Profile sub-page is the current row

- **WHEN** the current path is `/me/secrets`
- **THEN** the profile sidebar's secrets row SHALL be current and the account
  row SHALL NOT

### Requirement: Admin entry from the account menu

The admin panel (`/admin`) SHALL be reached from the "Administración" entry of
the account menu and from the surface search, both only for users holding the
`admin` role. It SHALL NOT be a navbar section, a documentation sidebar entry
or a card on the home page. The admin shell SHALL offer a link back to the
documentation at `/`.

#### Scenario: Admin opens the admin panel

- **WHEN** an authenticated user with the `admin` role selects
  "Administración" in the user menu
- **THEN** the browser SHALL open `/admin` inside the admin shell

#### Scenario: Non-admin does not see the admin panel

- **WHEN** an authenticated user without the `admin` role opens the user menu
  or the surface search
- **THEN** no admin panel entry SHALL be offered

#### Scenario: Back to the documentation

- **WHEN** an admin in the admin shell activates its link back to the
  documentation
- **THEN** the browser SHALL open `/`

### Requirement: Layouts by navigation context

The frontend SHALL provide Astro layouts under `apps/frontend/src/layouts/`
chosen by navigation context, each route rendering exactly one `<main>`:
`Layout.astro` (navbar, page slot and site footer, with `guestNavbar`,
`hideFooter` and `scrollToTop` options, for the login, signup and not-found
pages), `WithSidebar.astro` (a section with sub-pages: navbar, section sidebar
and page, without footer, redirecting to `/login` without a user; used by the
profile section), `Docs.astro` (the documentation reader: navbar,
documentation sidebar, page column and table of contents, without footer),
`Detail.astro` (detail routes rendering `<main>` and a back link) and
`Admin.astro` (the `/admin` area inside the admin shell sidebar, redirecting to
`/login` without a user).

#### Scenario: Documentation page renders with its sidebar

- **WHEN** a reader route renders
- **THEN** it SHALL use `Docs.astro`, showing the documentation sidebar next to
  the page, without the site footer

#### Scenario: Profile page uses the default layout

- **WHEN** a signed-in user opens `/me` or one of its sub-pages
- **THEN** the page SHALL render with `WithSidebar.astro`, its navbar and the
  profile sidebar, without the site footer

### Requirement: Searchable records

The surface search SHALL include records of dynamic surfaces. A surface whose path has a dynamic segment can declare a search source in the
application-surface registry. The source SHALL enumerate the records the
signed-in user can open on that surface, using the same API permissions as the
pages that list them. Each record SHALL become a search result whose path is the
surface's path with its dynamic segments filled from that record, or the route
the record gives, and whose label and description come from the record. The
documentation page surface SHALL list the pages of the current documentation
scope (`documentation-reader`).
Record results SHALL be shown only while the query is non-empty, SHALL be
matched case- and accent-insensitively against the record's label, description,
group label and extra match terms, and against the labels of its surface and of
the concrete-path surfaces its route sits under, and SHALL appear in a group of
their own per source with a Spanish heading. Each record result SHALL show the
icon of its surface, and its label SHALL be preceded by its trail: the labels of
the concrete-path surfaces its route sits under, or the trail the record itself
gives ("Red › DNS"). A record SHALL be able to carry an excerpt with ranges of
matched words; the result SHALL then show the excerpt in place of the
description, with those words highlighted.
A source declared on an `adminOnly` surface SHALL NOT be queried for users
without the `admin` role. Records SHALL be loaded only while the search dialog
is open, unless the source reads a query the page already holds. While they
load, or if loading fails, the static surface results SHALL still be shown and
searchable. Opening a record page SHALL NOT add it to the "Recientes" group.

#### Scenario: Finding a documentation page by title

- **WHEN** the scope is "Casa" and the user types "dns"
- **THEN** a result reading "Red › DNS" SHALL appear in the documentation
  group, and selecting it SHALL close the dialog and navigate to
  `/casa/red/dns`

#### Scenario: Excerpt replaces the description

- **WHEN** a documentation result carries an excerpt for the typed word
  "inversa"
- **THEN** the result SHALL show that excerpt under its label with "inversa"
  highlighted, and SHALL NOT show the page's description

#### Scenario: Empty query shows no records

- **WHEN** the user opens the search dialog without typing
- **THEN** no record results SHALL be listed

#### Scenario: Accent-insensitive record match

- **WHEN** a page is titled "Sincronización" and the user types
  "sincronizacion"
- **THEN** that page SHALL appear in the results

#### Scenario: Loading or failing source does not block the search

- **WHEN** a search source is still loading or its request fails
- **THEN** matching surface results SHALL still be shown, and no error SHALL
  replace the dialog content

#### Scenario: Current record is marked

- **WHEN** the user is on `/casa/red/dns` and that page appears in the results
- **THEN** that result SHALL be visually marked as the current page

#### Scenario: Record pages are not recorded as recent

- **WHEN** the user visits `/casa/red/dns` and later opens the search dialog
  without typing
- **THEN** the "Recientes" group SHALL NOT include that page

#### Scenario: Dynamic surface without a source stays out

- **WHEN** a surface with a dynamic segment declares no search source
- **THEN** neither the surface nor any of its records SHALL appear in the results

### Requirement: Section sidebar

A section with sub-pages outside `/admin` SHALL be shown inside a section
sidebar: the site navbar on top, a sidebar on the left and the page beside it,
with the window scrolling the page. The sidebar SHALL be built from the
application-surface registry: a header with the section's icon and label, a row
for the section's own page and one row per child surface, each with the icon and
label the registry declares, in registry order. It SHALL collapse to icons from
a control at its foot, remember that state across pages and reloads (the same
state the admin shell uses), and SHALL persist across client-side navigations
within the section instead of remounting, while the page content fades in. The
profile section (`/me`) SHALL use it, with these pages:

- `/me` — the account: avatar, name, email, role, password, account id and
  member-since date, with the actions to edit the name and change the password;
- `/me/api-keys` — the user's API keys (`api-key-management`);
- `/me/secrets` — the user's secrets (`secret-management`);
- `/me/skills` — "Skills para tu IA", the text the user pastes into an AI to
  install the site's skills.

Each sub-page SHALL show its surface's label and description as its heading.
Every page of the section SHALL redirect to `/login` without a session. Adding
a page to the section SHALL take a child surface in the registry plus its route;
the sidebar SHALL NOT be edited for it.

#### Scenario: Profile sidebar rows

- **WHEN** a signed-in user opens `/me`
- **THEN** the page SHALL show a sidebar with the rows for the account, API
  keys, secrets and skills pages, each with its registry icon and label

#### Scenario: Moving between profile pages

- **WHEN** the user selects the API keys row in the profile sidebar
- **THEN** `/me/api-keys` SHALL open through client-side navigation, the sidebar
  SHALL stay mounted and keep its collapsed or expanded state, and the API keys
  row SHALL become the current row

#### Scenario: New child surface

- **WHEN** a child surface `/me/notifications` is added to the profile surface
  in the registry, with its route
- **THEN** the profile sidebar SHALL list it without any change to the sidebar
  component

#### Scenario: No session

- **WHEN** a request without a session asks for `/me/secrets`
- **THEN** the browser SHALL be redirected to `/login`
