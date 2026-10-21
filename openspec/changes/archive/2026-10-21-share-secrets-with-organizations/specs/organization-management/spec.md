## MODIFIED Requirements

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
- **THEN** the system SHALL remove the organization along with its members, teams, invitations and the shares of repositories and secrets with it
