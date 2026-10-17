## ADDED Requirements

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

## MODIFIED Requirements

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
