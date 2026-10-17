## Why

The content folder of a repository is a free-text field: the user has to know that their site lives in `docs` and type it right, and a wrong guess ends in "Sin contenido todavía". The branch is already a select fed by the remote; the folder can be too, since the platform can tell which folders of a repository hold a site.

## What Changes

- New read-only procedures list the **content folders** of a git repository at a ref: the folders that contain a `doc.config.yaml` (the root included), found by fetching only the tree of that ref, without file contents.
- The “Carpeta del contenido” field becomes a select of those folders, like the branch select, once they can be read (the typed URL and the chosen ref once complete, the stored repository while editing with the URL left empty, or the platform's own bare repository for a hosted one). The root shows as “Raíz del repositorio”. The list follows the chosen branch.
- While the folders can't be read, or none is found, the field stays a text field, as today. The current value is always kept in the options, so a folder typed before is never lost.
- Admins read any source; users read only public `https` remotes and their own repositories, under the same restrictions as their branches.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `content-repository-management`: the content-folder listing procedures (admin and owner) and the select in both forms.

## Impact

- `packages/content`: a function that lists the folders holding a `doc.config.yaml` at a ref of a remote or of a bare repository.
- `packages/api` (`v1/content`): `listContentFolders` (admin) and `listMyContentFolders` (owner), with their inputs and outputs and tests.
- `apps/frontend`: `ContentPathField` in the shared `content-repositories/manage` slice becomes a select with a text fallback; both forms feed it; a pure helper for the options, tested.
- No database changes and no migration.
