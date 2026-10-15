## MODIFIED Requirements

### Requirement: Resource lists render as data tables

The application's resource lists SHALL render as data tables: the API keys, users, organizations, teams, plugins and sessions pages under `/admin`, the members, pending invitations, teams and custom roles of the organization detail view, the team member-management view, the `/crons` job list and the run history of `/crons/{id}`. Each table SHALL keep the data, actions, links, filters, dialogs, permissions and live updates its list offered before, and its rows SHALL keep their muted and disabled treatments. A muted row (a paused or read-only job) SHALL show its text in the muted tone over the normal row background, never dimmed as a whole.

A row whose list opened it (a detail link or a detail view) SHALL keep that open control on its identifying cell. A row with actions SHALL keep them in a trailing actions column whose menu is named after the row, with destructive actions marked as such.

#### Scenario: The users page keeps its actions

- **WHEN** an administrator opens `/admin/users`
- **THEN** each user SHALL be a table row with name, email, role, status and creation date
- **AND** the row's actions menu SHALL offer the same actions as before, with the same ones disabled on the administrator's own row

#### Scenario: A cron job row still opens its detail

- **WHEN** a user activates the name of a job in the `/crons` table
- **THEN** the application SHALL navigate to that job's `/crons/{id}` page

#### Scenario: A paused job reads as muted, not dark

- **WHEN** the `/crons` table shows a paused or code-declared job
- **THEN** that row's text SHALL use the muted tone while its background, status tag and controls keep their normal contrast
