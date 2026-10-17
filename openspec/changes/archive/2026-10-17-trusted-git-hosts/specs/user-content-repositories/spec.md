## ADDED Requirements

### Requirement: Trusted internal hosts

The server MAY list host names in `TRUSTED_GIT_HOSTS` (`environment-configuration`). A user's repository whose URL host equals a listed name SHALL be exempt from the internal-address rules of `Limits and restricted remotes`: it SHALL be accepted on create and edit and in the branch and folder listings, and its syncs SHALL NOT be refused for resolving to a private address. The URL SHALL still use `https://`, clones SHALL still use the https transport only, and the repository limit SHALL still apply. Hosts not listed SHALL stay blocked, and with the variable unset nothing SHALL change.

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
