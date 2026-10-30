## Why

Only admins can create repositories hosted by the platform (`/admin/git`), and those belong to nobody, so every signed-in user reads them. Users want hosted repositories of their own that they manage like their external ones (edit, delete, sync, share with their organizations) without having to keep a remote on GitHub or similar. This change does it the simplest way: the git endpoint stays open, with no credentials. Authentication comes in a later change.

## What Changes

- The owner procedures (`createMyRepository`) accept `hosted: true` instead of a `url`: the repository belongs to the caller and the platform hosts it at `/git/<slug>.git`, like the admin's hosted repositories.
- A user's repository keeps the source it was created with. Users can't turn a hosted one into an external one or the other way round, and a hosted one takes no URL and no credential.
- The owner procedures return, for each repository, whether it is hosted and its git URL to clone and push.
- The restricted-remote rules (https only, no internal addresses) don't apply to a user's hosted repository, since its source is the platform's own bare repository. Its sync and its branch and folder listings read that bare repository.
- Deleting a user's hosted repository also deletes its bare repository.
- `/me/repositories`: the form lets the user choose between "Repositorio externo" and "Alojado en la plataforma", and the card of a hosted repository shows its git URL with a control to copy it.
- Sharing with organizations works for hosted repositories just as for external ones, with no change to `repository-sharing`.
- **Known gap, accepted on purpose:** the git endpoint keeps requiring no credentials, so anyone who knows the slug of a user's hosted repository can clone it and push to it, even if it is private or shared with only one organization. The reader, the search, the MCP and the rest of the platform keep hiding it as they do today.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `user-content-repositories`: users can create hosted repositories. The source is fixed after creation, the restricted-remote rules don't apply to hosted ones, the output says whether a repository is hosted and gives its git URL, and the profile screen chooses the source and shows the git URL. Visibility states the git endpoint exception.
- `content-git-hosting`: a hosted repository may belong to a user, and the endpoint serves it with no credentials like any other. Deleting it removes its bare repository.

## Impact

- `packages/api/src/v1/content/`: `input.ts` (`createMyRepository` takes `url` or `hosted`; `updateMyRepository` refuses a URL or credential for a hosted one), `output.ts` (`ownRepository` keeps `hosted` and `pushUrl`), `handler.ts` (create, update, delete, `listMyBranches` and `listMyContentFolders` for hosted repositories), `reader.ts` (no remote check and no https-only for a hosted user repository's sync), plus their tests.
- MCP `my_repositories` (`packages/api/src/v1/mcp/tools/content.ts`): no new fields required. `add_repository` stays external only.
- `apps/frontend/src/features/profile/repositories/`: form (source choice), card (git URL), model and tests. `CopyableUrl` moves from `features/admin/shared` to `components/shared` so both areas can use it.
- No database migration: a hosted repository is already recognised by its stored URL (`/git/<slug>.git`), `owner_id` is nullable and shares work for any repository.
