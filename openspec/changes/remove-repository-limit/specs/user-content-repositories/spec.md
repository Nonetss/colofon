## RENAMED Requirements

- FROM: `### Requirement: Limits and restricted remotes`
- TO: `### Requirement: Restricted remotes`

## MODIFIED Requirements

### Requirement: Restricted remotes

A user MAY own any number of repositories. The URL of a user's repository SHALL use `https://` and its host SHALL NOT be a loopback, private, link-local or unspecified address, whether typed as an IP literal or resolved from a name; the check SHALL run on create, on edit and before every sync. A URL that fails it SHALL be refused on create and edit (input validation) and make the sync fail with an error that does not reveal the resolved address. Admin-created repositories SHALL keep the URL rules of `content-repository-management`.

#### Scenario: Eleventh repository

- **WHEN** a user who owns 10 repositories creates another
- **THEN** it SHALL be stored and its first sync SHALL start, as the first one was

#### Scenario: Internal address

- **WHEN** a user creates a repository with the URL `https://192.168.1.10/x.git`
- **THEN** the request SHALL fail input validation and nothing SHALL be stored

#### Scenario: Plain HTTP

- **WHEN** a user creates a repository with the URL `http://github.com/ana/x.git`
- **THEN** the request SHALL fail input validation

#### Scenario: Name that now resolves inside

- **WHEN** the host of a stored user repository starts resolving to a private address and it is synced
- **THEN** the sync SHALL fail and record an error, and no clone or fetch SHALL be attempted

### Requirement: Repositories screen in the profile

The profile section SHALL provide a “Repositorios” page at `/me/repositories`, listed in the profile sidebar for every signed-in user, that shows the user's own repositories as cards (name, slug, URL without credentials, ref and last sync with its time and short commit or its full error, a sync button and a menu to edit or delete) and an empty state with a button to add one. Creating and editing SHALL use a form with name, slug (editable only on creation), URL, an empty URL on edit keeping the stored one, and a ref chosen from the remote's branches once they can be read, as in `content-repository-management`; deleting SHALL ask for a confirmation. All copy SHALL be in Spanish. A request without a session SHALL be redirected to the login.

#### Scenario: Empty state

- **WHEN** a user without repositories opens `/me/repositories`
- **THEN** the page SHALL explain that the repositories are only visible to them and offer to add one

#### Scenario: Failed sync shown

- **WHEN** a user syncs a repository whose remote rejects the credentials
- **THEN** the card SHALL show the failure with git's error, without the credentials

#### Scenario: Reaching the new repository

- **WHEN** a user adds `apuntes` and its first sync succeeds
- **THEN** the reader's repository selector SHALL list `apuntes` for that user only, and `/apuntes` SHALL open its home

### Requirement: Trusted internal hosts

The server MAY list host names in `TRUSTED_GIT_HOSTS` (`environment-configuration`). A user's repository whose URL host equals a listed name SHALL be exempt from the internal-address rules of `Restricted remotes`: it SHALL be accepted on create and edit and in the branch and folder listings, and its syncs SHALL NOT be refused for resolving to a private address. The URL SHALL still use `https://`, and clones SHALL still use the https transport only. Hosts not listed SHALL stay blocked, and with the variable unset nothing SHALL change.

#### Scenario: Internal host that is listed

- **WHEN** `TRUSTED_GIT_HOSTS` is `git.noneweb.online`, that name resolves to `10.1.1.10`, and a user adds `https://git.noneweb.online/nonete/homelab`
- **THEN** the repository SHALL be stored and its sync SHALL run

#### Scenario: Another internal host

- **WHEN** the same variable is set and a user adds `https://git.otro.lan/x.git`, which resolves to `10.1.1.20`
- **THEN** the sync SHALL fail as a host that is not allowed

#### Scenario: Plain HTTP on a listed host

- **WHEN** a user adds `http://git.noneweb.online/x.git`
- **THEN** the request SHALL fail input validation

#### Scenario: Variable unset

- **WHEN** `TRUSTED_GIT_HOSTS` is unset and a user adds a host that resolves to a private address
- **THEN** the sync SHALL fail as a host that is not allowed
