## ADDED Requirements

### Requirement: Trusted git hosts

`@nonete/env/server` SHALL accept an optional `TRUSTED_GIT_HOSTS`: a comma-separated list of host names, whose entries are trimmed and lower-cased and whose empty entries are ignored. It SHALL be documented in `.env.example`. It SHALL be read only by the backend, which uses it for the restricted remotes of `user-content-repositories`.

#### Scenario: Several hosts

- **WHEN** `TRUSTED_GIT_HOSTS` is ` Git.Casa.lan , gitea.lan,`
- **THEN** the trusted hosts SHALL be `git.casa.lan` and `gitea.lan`

#### Scenario: Unset or empty

- **WHEN** `TRUSTED_GIT_HOSTS` is unset or an empty string
- **THEN** no host SHALL be trusted and the server SHALL start normally
