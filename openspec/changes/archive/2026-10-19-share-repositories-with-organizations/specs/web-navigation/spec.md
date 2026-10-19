## MODIFIED Requirements

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
- `/me/repositories` — the user's repositories and their sharing
  (`user-content-repositories`, `repository-sharing`);
- `/me/organizations` — the user's organizations and the invitations sent to
  them (`organization-membership`);
- `/me/skills` — "Skills para tu IA", the text the user pastes into an AI to
  install the site's skills.

Each sub-page SHALL show its surface's label and description as its heading.
Every page of the section SHALL redirect to `/login` without a session. Adding
a page to the section SHALL take a child surface in the registry plus its route;
the sidebar SHALL NOT be edited for it.

#### Scenario: Profile sidebar rows

- **WHEN** a signed-in user opens `/me`
- **THEN** the page SHALL show a sidebar with the rows for the account, API
  keys, secrets, repositories, organizations and skills pages, each with its registry icon and label

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
