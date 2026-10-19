## Why

A user's repository is readable only by its owner, so a group of people who work on the same documentation can't read it together unless an admin turns it into a platform repository that everyone sees. The organization plugin, its tables and its admin-only procedures are still in place (only their admin screens were removed in `d11a53f`), so organizations can come back as the way to share: people join an organization and read the repositories its members share with it.

## What Changes

- **Self-service organizations:** any signed-in user can create an organization (becoming its `owner`), see the ones they belong to, invite registered or future users by email, accept or decline the invitations sent to them, change members' roles, remove members, leave an organization and, as its owner, rename or delete it. Roles are the existing `owner`, `admin` and `member`: owners and admins manage members and invitations, only owners grant or revoke `owner`, delete the organization or remove another owner, and an organization always keeps at least one owner. Invitations still send no email.
- **Sharing repositories:** the owner of a repository can share it with any number of organizations they belong to, and stop sharing it. Every member of an organization the repository is shared with reads it exactly as its owner does (reader, navigation, search, `llms.txt`, skills, MCP) and can sync it on demand; only the owner edits, deletes or changes its sharing. A share disappears when the owner leaves or is removed from that organization, when the organization is deleted, or when the repository is deleted.
- **Profile screens:** a new “Organizaciones” page at `/me/organizations` (organizations, members, invitations, pending invitations to accept), and a sharing control on the repository form and cards of `/me/repositories`. The reader marks shared repositories with the organization they come from.
- **Database:** one new table linking a content repository to the organizations it is shared with. The schema change and its migration are the user's (`AGENTS.md`).
- Admin-only organization procedures stay as they are. Restoring the removed `/admin/organizations` and `/admin/teams` screens, and sharing with teams, are out of scope.

## Capabilities

### New Capabilities

- `organization-membership`: self-service organizations for every signed-in user — the procedures to create, list, read, rename and delete their organizations, manage members, roles and invitations, accept or decline invitations and leave, with the role rules — and the `/me/organizations` screen.
- `repository-sharing`: sharing a user's repository with organizations — who may share and with which organizations, what members of those organizations can do with it, when a share ends, the share procedures and the sharing control of `/me/repositories`.

### Modified Capabilities

- `user-content-repositories`: a user's repository becomes readable by the members of the organizations it is shared with, not only by its owner; the owner procedures return each repository's organizations; the profile screen shows and edits the sharing.
- `content-repository-management`: the on-demand sync is open to every repository the caller can read, shared ones included.
- `organization-management`: deleting an organization also removes the shares of repositories with it.
- `web-navigation`: the profile section sidebar lists `/me/repositories` and the new `/me/organizations`.

## Impact

- `packages/db`: a new `content_repository_share` table (schema written on approval; migration generated and applied by the user).
- `packages/api`: a new user-facing `v1.myOrganization` feature; `v1.content` share procedures and the repository audience (reader, docs, skills, MCP all read through it) widened to the caller's organizations; the admin organization handler untouched apart from the share cleanup that the database cascade already does.
- `apps/frontend`: new `features/profile/organizations` slice and `/me/organizations` route and surface; sharing in `features/profile/repositories`; the reader's repository selector shows the organization of a shared repository.
- Tests in `packages/api/tests/v1/` for every new or changed procedure and the audience, and in `apps/frontend/tests/unit/` for any new shared helper.
- `stack` references that describe repository visibility (`references/api/mcp.md`, `agent-skills.md`) if they state the owner-only rule.
