## Why

The platform reads a content repository from the root of its clone: `doc.config.yaml`, `docs/`, `catalog/` and the rest must sit at the top of the git repository. A project that wants its documentation inside its own code repository (this repo keeps its site in `docs/`, with `docs/doc.config.yaml`, `docs/menu.yaml` and `docs/docs/*.mdx`) cannot be read without moving everything to a repository of its own.

## What Changes

- A content repository gets an optional **content folder**: a relative path inside the repository (default empty, the root) where its content lives. Everything the platform reads of a site (`doc.config.yaml`, `menu.yaml`, `docs/`, `catalog/`, `diagrams/`, `styles/`, `skills/`) is then looked up under that folder.
- The folder is set when a repository is created and can be changed afterwards. It is offered by the admin screen, by `/me/repositories` and by the owner and admin procedures. Changing it reads the same clone again from another folder; it does not clone.
- The folder must be a plain relative path (no `..`, no leading `/`, no empty or hidden segments) and, once resolved, must stay inside the clone: a symlink pointing out of it is as if the folder were missing.
- A folder that does not exist in the checkout makes the repository one without content, with the problem logged, like a repository that was never synced.
- Last edit dates keep working: they are read for the files under the content folder and keyed by their path relative to it.
- The repository's own git browser, hosting and sync are untouched: they still see the whole git repository.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `content-repository-management`: the content folder field, its validation, and its place in the create/edit procedures (admin and owner) and in both forms.
- `content-source`: the content root is the clone folder plus the repository's content folder, for declarations, pages, assets and edit dates.

## Impact

- `packages/db`: a `content_path` column (text, not null, default empty) on `content_repository`. The migration is the user's to generate; this change only proposes the schema edit.
- `packages/content`: a path check and a resolver that keeps the content folder inside the clone; `readEditDates` takes the folder.
- `packages/api` (`v1/content`, `v1/docs`): the reader resolves the content root per repository; create/edit inputs and outputs gain the field; the image route reads under the content root.
- `apps/frontend`: a "Carpeta del contenido" field in the admin form and the profile form, and the folder shown on both cards.
- `.agents/skills/stack/references/` updated where they say the content sits at the repository root.
