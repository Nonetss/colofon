# Organization Management

## Purpose

Let global administrators manage every organization in the system — organizations, members and their roles, invitations, teams and team members — through admin-only API procedures, independently of their own organization memberships.

## Requirements

### Requirement: Admin-only organization access

The system SHALL restrict every organization-management operation (organizations, members, invitations, teams, and team members) to users holding the `admin` role, through a dedicated `adminProcedure` that rejects unauthenticated requests as `UNAUTHORIZED` and non-admin requests as `FORBIDDEN`. Access SHALL NOT depend on the acting admin's membership or role within the target organization.

#### Scenario: Admin manages an organization they do not belong to

- **WHEN** a user with the `admin` role calls an organization-management procedure for an organization they are not a member of
- **THEN** the system SHALL allow the operation

#### Scenario: Non-admin attempts organization management

- **WHEN** an authenticated user without the `admin` role calls an organization-management procedure
- **THEN** the system SHALL reject it as `FORBIDDEN`

#### Scenario: Unauthenticated request

- **WHEN** a request without an authenticated user calls an organization-management procedure
- **THEN** the system SHALL reject it as `UNAUTHORIZED`

### Requirement: Organization CRUD

The system SHALL allow an admin to list every organization in the system with its member and team counts, fetch a single organization's full detail (members, teams, pending invitations), create an organization (name and a unique, lowercase-and-hyphen slug), rename or re-slug it, and delete it.

#### Scenario: Listing organizations includes counts

- **WHEN** an admin lists organizations
- **THEN** each entry SHALL include its current member count and team count

#### Scenario: Creating with a duplicate slug

- **WHEN** an admin creates an organization whose slug already exists
- **THEN** the system SHALL reject the request as a conflict

#### Scenario: Deleting an organization

- **WHEN** an admin deletes an organization
- **THEN** the system SHALL remove the organization along with its members, teams, invitations and the shares of repositories with it

### Requirement: Organization membership management

The system SHALL allow an admin to add an existing user to an organization with a role, change a member's role, and remove a member. Valid role values SHALL be sourced from the shared `@nonete/auth/permissions` role definitions (`owner`, `admin`, `member`) rather than a separately hardcoded list, so the set of assignable roles is defined in exactly one place.

#### Scenario: Adding a duplicate member

- **WHEN** an admin adds a user to an organization they already belong to
- **THEN** the system SHALL reject the request as a conflict

#### Scenario: Removing a member

- **WHEN** an admin removes a member from an organization
- **THEN** the membership SHALL no longer appear in that organization's member list

#### Scenario: Assigning an invalid role

- **WHEN** an admin submits a role value that is not one of the shared role definitions
- **THEN** the system SHALL reject the request as a validation error

### Requirement: Organization invitations

The system SHALL allow an admin to create a pending invitation (email, role, and optional team) for an organization, list its invitations, and cancel a pending invitation by marking it canceled. Invitations SHALL NOT trigger an email or other notification — delivery is the admin's responsibility outside the system.

#### Scenario: Creating an invitation

- **WHEN** an admin creates an invitation for an organization
- **THEN** the system SHALL store it with `status: "pending"` and an expiry, without sending any notification

#### Scenario: Canceling an invitation

- **WHEN** an admin cancels a pending invitation
- **THEN** its status SHALL become `"canceled"` and it SHALL no longer be treated as pending

### Requirement: Team CRUD

The system SHALL allow an admin to list teams (optionally filtered by organization) with member counts, create a team within an organization, rename a team, and delete a team.

#### Scenario: Listing all teams across organizations

- **WHEN** an admin lists teams without an organization filter
- **THEN** the system SHALL return every team in the system, each with its owning organization id and member count

#### Scenario: Deleting a team

- **WHEN** an admin deletes a team
- **THEN** the team and its team-membership rows SHALL no longer exist

### Requirement: Team membership management

The system SHALL allow an admin to list a team's members, add an existing user to a team, and remove a user from a team.

#### Scenario: Adding a duplicate team member

- **WHEN** an admin adds a user to a team they already belong to
- **THEN** the system SHALL reject the request as a conflict

#### Scenario: Removing a team member

- **WHEN** an admin removes a user from a team
- **THEN** the user SHALL no longer appear in that team's member list
