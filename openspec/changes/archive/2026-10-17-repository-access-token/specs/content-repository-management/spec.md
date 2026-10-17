## ADDED Requirements

### Requirement: Access token in the repository form

The form to add or edit an external repository, in the admin's “Contenido” screen and in the profile's “Repositorios” screen, SHALL hold the address without credentials in the URL field and, next to it, the access fields of `git-credentials` (a saved credential, or “Usuario” and a masked “Token de acceso” never prefilled). When credentials can't be saved because the platform has no encryption key, the fields SHALL be put in the URL, as follows: when a token is given, the form SHALL require a user and SHALL send the URL with that user and token as its credentials, percent-encoded, in place of any credentials the typed URL already carried; without a token, the typed URL SHALL be sent as it is, so a URL pasted with credentials keeps working. The form SHALL explain that the token is created in the git server and needs read access to the repository, without naming any git product. The branches and folders reads SHALL use the composed URL.

While editing, leaving the URL and the token empty SHALL keep the stored URL, credentials included. A token typed without the URL SHALL NOT be sent: the form SHALL ask for the URL, since the stored one is only known masked. The token SHALL travel only in the request body and SHALL NOT appear in any response, as in “Credentials never leave the backend”. This requirement does not apply to hosted repositories. All copy SHALL be in Spanish.

#### Scenario: Adding a private repository without saving credentials

- **WHEN** the platform has no encryption key and a user types `https://git.example.com/org/docs`, the user `ana` and the token `s3cr/et`
- **THEN** the form SHALL send `https://ana:s3cr%2Fet@git.example.com/org/docs` as the URL

#### Scenario: Token without user

- **WHEN** a token is typed and the user is empty
- **THEN** the form SHALL not submit and SHALL ask for the user

#### Scenario: Public repository

- **WHEN** the user and the token are left empty
- **THEN** the form SHALL send the URL as typed

#### Scenario: URL with credentials and no token

- **WHEN** the typed URL is `https://ana:tok@host/org/docs.git` and the token field is empty
- **THEN** the form SHALL send that URL unchanged

#### Scenario: Token replaces pasted credentials

- **WHEN** the typed URL is `https://ana:old@host/org/docs.git`, the user is `ana` and the token is `new`
- **THEN** the form SHALL send `https://ana:new@host/org/docs.git`

#### Scenario: Editing without retyping anything

- **WHEN** a repository is edited with the URL and the token left empty
- **THEN** the stored URL, credentials included, SHALL stay unchanged

#### Scenario: New token on edit needs the URL

- **WHEN** a token is typed while editing and the URL is empty
- **THEN** the form SHALL ask for the URL and SHALL NOT send the token
