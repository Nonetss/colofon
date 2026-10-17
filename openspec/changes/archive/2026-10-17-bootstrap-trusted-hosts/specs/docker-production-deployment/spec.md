## ADDED Requirements

### Requirement: Bootstrap asks for trusted git hosts

`scripts/bootstrap.sh` SHALL ask, optionally, for the internal git hosts users may add repositories from, as host names separated by commas (empty meaning none). It SHALL refuse an answer that is not host names separated by commas, without spaces, quotes or ports, before writing anything. It SHALL show the answer in the configuration summary and, when it is not empty, write `TRUSTED_GIT_HOSTS` to the generated `.env`, single-quoted like the other values; when it is empty it SHALL write the variable as a commented example instead.

#### Scenario: Host answered

- **WHEN** the operator answers `git.casa.lan,gitea.lan`
- **THEN** the `.env` SHALL contain `TRUSTED_GIT_HOSTS='git.casa.lan,gitea.lan'`

#### Scenario: Left empty

- **WHEN** the operator presses Enter
- **THEN** the `.env` SHALL hold only a commented `# TRUSTED_GIT_HOSTS=` example

#### Scenario: Invalid answer

- **WHEN** the operator answers `git.casa.lan:3000`
- **THEN** the script SHALL exit with an error and write nothing
