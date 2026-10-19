# Organization Membership

## Purpose

Lets every signed-in user create organizations, invite people into them and manage their members and roles from their profile, so groups of users can share repositories (`repository-sharing`) without an administrator.

## Requirements

### Requirement: Own organizations procedures

The backend SHALL expose to every signed-in user procedures, separate from the admin-only ones of `organization-management`, to list the organizations the caller belongs to (each with its name, slug, the caller's role and its member count, ordered by name), read one of them (its members with name, email, role and join date, and, for its owners and admins, its pending invitations), create one, rename or re-slug one, delete one, and leave one. They SHALL act only on organizations the caller is a member of: any other id SHALL answer `NOT_FOUND`, for admins too. Requests without a session SHALL answer `UNAUTHORIZED`. The slug SHALL follow the rules of `organization-management` and be unique across all organizations; a slug in use SHALL answer `CONFLICT`. All user-facing error messages SHALL be in Spanish.

#### Scenario: Creating an organization

- **WHEN** `ana` creates the organization `Equipo docs` with the slug `equipo-docs`
- **THEN** it SHALL be stored, `ana` SHALL be its only member with the role `owner`, and it SHALL appear in her list with that role

#### Scenario: Organization the caller doesn't belong to

- **WHEN** `luis`, who is not a member of `equipo-docs`, reads, renames or deletes it
- **THEN** the backend SHALL answer `NOT_FOUND` and change nothing

#### Scenario: Duplicate slug

- **WHEN** `luis` creates an organization with the slug `equipo-docs`, which exists
- **THEN** the backend SHALL answer `CONFLICT` and store nothing

#### Scenario: A member reads the organization

- **WHEN** `luis`, a `member` of `equipo-docs`, reads it
- **THEN** he SHALL receive its members and no invitations

### Requirement: Organization roles

Each member SHALL have one of the roles `owner`, `admin` or `member` of the shared access-control module (`organization-access-control`). Owners and admins SHALL invite people, cancel invitations, change roles and remove members; members SHALL only read the organization and leave it. Only an owner SHALL rename, re-slug or delete the organization, grant or revoke the `owner` role, or remove an owner. An organization SHALL always keep at least one owner: removing, demoting or the leaving of its last owner SHALL answer `CONFLICT`. A forbidden action by a member of the organization SHALL answer `FORBIDDEN` and change nothing.

#### Scenario: Admin removes a member

- **WHEN** `marta`, an `admin` of `equipo-docs`, removes the `member` `luis`
- **THEN** `luis` SHALL no longer be a member of `equipo-docs`

#### Scenario: Admin tries to remove an owner

- **WHEN** `marta`, an `admin`, removes the owner `ana`
- **THEN** the backend SHALL answer `FORBIDDEN` and `ana` SHALL stay an owner

#### Scenario: Member tries to invite

- **WHEN** `luis`, a `member`, invites `pablo@example.com`
- **THEN** the backend SHALL answer `FORBIDDEN` and store no invitation

#### Scenario: Last owner leaves

- **WHEN** `ana` is the only owner of `equipo-docs` and leaves it
- **THEN** the backend SHALL answer `CONFLICT` and she SHALL stay its owner

#### Scenario: Owner hands over ownership

- **WHEN** `ana` makes `marta` an `owner` and then leaves `equipo-docs`
- **THEN** `ana` SHALL no longer be a member and `marta` SHALL be its owner

### Requirement: Invitations by email

An owner or admin SHALL invite a person by email with a role; only an owner SHALL invite as `owner`. The invitation SHALL be stored pending with an expiry and SHALL NOT send an email or any other notification. Inviting an email that is already a member, or that already has a pending invitation to that organization, SHALL answer `CONFLICT`. Every signed-in user SHALL list the pending, unexpired invitations addressed to their account's email, with the organization's name and the inviter's name, and accept or decline each one. Accepting SHALL make them a member with the invitation's role and mark it accepted; declining SHALL mark it rejected. Accepting or declining an invitation that is not addressed to the caller's email, not pending or expired SHALL answer `NOT_FOUND`. Owners and admins SHALL cancel a pending invitation.

#### Scenario: Inviting someone not yet registered

- **WHEN** `ana` invites `pablo@example.com` as `member`, and later Pablo signs up with that email
- **THEN** Pablo SHALL see the invitation to `equipo-docs` among his pending invitations

#### Scenario: Accepting

- **WHEN** Pablo accepts the invitation
- **THEN** he SHALL be a `member` of `equipo-docs` and the invitation SHALL no longer be pending

#### Scenario: Someone else's invitation

- **WHEN** `luis` accepts the invitation addressed to `pablo@example.com`
- **THEN** the backend SHALL answer `NOT_FOUND` and add no member

#### Scenario: Expired invitation

- **WHEN** Pablo accepts an invitation whose expiry has passed
- **THEN** the backend SHALL answer `NOT_FOUND`

### Requirement: Organizations screen in the profile

The profile section SHALL provide an “Organizaciones” page at `/me/organizations`, listed in the profile sidebar for every signed-in user, that:
- shows the invitations pending for the user, each with the organization and who invited them, and buttons to accept or decline it;
- lists the user's organizations with their name, slug, the user's role and member count, and an empty state with a button to create one;
- creates an organization in a form with its name and a slug suggested from the name;
- opens an organization to show its members (name, email, role, join date) and, to owners and admins, its pending invitations, with the actions the user's role allows: invite by email with a role, cancel an invitation, change a member's role, remove a member, rename and delete the organization (after a confirmation) and leave it (after a confirmation);
- hides the actions the user's role doesn't allow.

All copy SHALL be in Spanish. A request without a session SHALL be redirected to the login.

#### Scenario: Empty state

- **WHEN** a user with no organizations and no invitations opens `/me/organizations`
- **THEN** the page SHALL explain that organizations let them share repositories with other people and offer to create one

#### Scenario: Member's view

- **WHEN** `luis`, a `member` of `equipo-docs`, opens it
- **THEN** he SHALL see its members and the action to leave it, and no action to invite, change roles, remove members, rename or delete

#### Scenario: Accepting from the screen

- **WHEN** Pablo accepts an invitation on the page
- **THEN** the invitation SHALL disappear from his pending ones and `equipo-docs` SHALL appear among his organizations
