## Context

See proposal.md for the motivation. Today the forms send one `url` that may carry `user:token@`; the API stores it as is and returns it masked (`publicUrl`). The secrets feature already encrypts per-user values with AES-256-GCM under `SECRETS_ENCRYPTION_KEY` (`packages/api/src/v1/secret/cipher.ts`), bound to the row id and owner, and is off while the key is unset. The reader gets repositories through a store and clones `resolveSource(repository)`, which is the stored `url`; it already redacts the credentials of `repository.url` from errors.

## Goals / Non-Goals

**Goals:**
- Enter a user and token once per server and reuse them for every repository on it.
- Keep tokens out of every response, log and error, and out of the repository row.
- Keep existing credentialed URLs working.

**Non-Goals:**
- Reusing the secrets table: its fields, origins and flags model something else (credentials the MCP sends on a user's behalf).
- OAuth or validating the token against the server before saving; a rejection already shows in the sync.
- Sharing a credential between users, or migrating existing URL credentials into saved credentials.

## Decisions

**A `git_credential` table.** Columns: `id`, `user_id` (cascade), `host`, `username`, `ciphertext`, timestamps; unique on user, host and username. `host` is the URL's `host` (name and port), lowercase. Alternative: a free-form name per credential, which the user would have to invent and the form would have to ask for; host plus username is how people already think of it and lets the form preselect by URL.

**Reuse the cipher, not the table.** `encryptValues`/`decryptValues` are generic over a values record; a credential encrypts `{ token }` bound to its own id and owner. A ciphertext copied between tables fails authentication because ids differ. The module moves to a shared place only if the layering reference asks for it; otherwise the new feature imports it.

**Credential bound to its host.** Saving takes the host explicitly and a repository's credential must match its URL's host, so a token can never be sent to another server by editing a URL. Alternative: no check; a one-line mistake would leak a token to a third party.

**`content_repository.credential_id`.** Nullable foreign key to `git_credential` with `on delete restrict`, so a credential in use can't vanish under a repository; the handler answers `CONFLICT` before the database does. Stored URLs of repositories with a credential carry no credentials.

**Compose at the store boundary.** The reader's repository store resolves the credential and returns the stored repository with `url` already carrying the username and token, so `gitSourceOf`, `checkRemote` and `redactCredentials(message, repository.url)` work unchanged and errors stay free of values. The handler's branches and folders reads on a stored repository use the same composed URL. A credential that can't be decrypted makes the sync fail with a fixed Spanish message.

**API shape.** A `git-credential` feature (`list`, `save`, `delete`) under `v1`, all `protectedProcedure` scoped by the caller. `save` is a `PUT`-style upsert by host and username, so replacing a token is the same call. `list` returns `{ enabled, credentials: [{ id, host, username, inUse }] }`. The repository create and edit inputs gain `credentialId` (uuid, `null` on edit to remove). The admin and user procedures both accept it, always against the caller's own credentials.

**Form.** A shared `CredentialField` in the manage slice replaces the inline fields: a select of the user's credentials for the typed URL's host with "Ninguna" and "Nueva credencial", the latter showing username and masked token. On submit a new credential is saved first, then the repository is sent with its id. With the feature off, the previous inline fields compose the URL (`urlWithAccess`). Credentials with replace and delete live in a section of `/me/repositories`.

## Risks / Trade-offs

- [Saving the credential and then the repository are two calls] → a failed second call leaves a reusable credential, not a leak.
- [Losing or changing the encryption key makes every credential undecryptable] → the sync error says to save it again; the same trade-off as the secrets.
- [Legacy repositories keep tokens inside their URL] → unchanged; editing one and choosing a credential replaces them.
- [The migration is the user's] → the schema change is delivered and the migration is left to generate.
