## Why

A private repository is added by editing its URL by hand to `https://usuario:token@host/org/repo.git`. The token itself is the hard part, mounting it inside the URL is error-prone, and the same user and token have to be typed again for every repository on the same server.

## What Changes

- The repository forms (the profile's and the admin's) take the clean address in the URL field and let the user pick a **saved credential** for its host, or enter a user and a token once to save a new one. Typing the URL of a host that already has a credential preselects it.
- Credentials are stored per user in a new table: host, user and the token encrypted (the secrets' AES-256-GCM key), never returned to any client. A credential is only sent to its own host.
- A repository references its credential; the backend composes the credentialed URL when it clones, lists branches or folders, so changing a credential's token updates every repository that uses it.
- The user can replace a credential's token or delete it from the same screen. A credential in use cannot be deleted.
- The form describes the token neutrally (created in the user's git server, read access), naming no git product.
- Repositories that already carry credentials in their URL, and a URL pasted with credentials, keep working. Without `SECRETS_ENCRYPTION_KEY` the credentials can't be saved and the form falls back to putting the user and token in the URL as typed.

## Capabilities

### New Capabilities

- `git-credentials`: per-user saved git credentials, their encryption, procedures, use by repositories and the form's picker.

### Modified Capabilities

- `content-repository-management`: a requirement for the access fields of the repository form shared by the admin and profile screens.

## Impact

- `packages/db`: a `git_credential` table and a nullable `credential_id` on `content_repository` (the user generates the migration).
- `packages/api`: a `git-credential` feature (list, save, delete), `credentialId` on the repository create and edit inputs, and the reader's store composing the URL with the credential.
- `apps/frontend`: the shared manage slice (credential picker, new-credential fields), both repository dialogs, a credentials list with replace and delete on `/me/repositories`, tests.
