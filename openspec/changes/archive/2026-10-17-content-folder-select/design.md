## Context

Branches are listed by `listRemoteBranches` (`git ls-remote`, nothing downloaded) and shown by `BranchRefField`, with a text fallback while they can't be read (`features/content-repositories/manage`). Folders need more than refs: the tree of a commit. A repository's sync clones it fully, but a form must not clone while the user types.

## Goals / Non-Goals

**Goals:**
- Offer exactly the folders the reader can use, from the chosen ref, cheaply.
- Reuse the branch field's pattern: select when known, text otherwise.

**Non-Goals:**
- Listing every folder of the repository.
- Caching listings between requests.

## Decisions

1. **Candidates are folders holding `doc.config.yaml`.** It is the one file a site cannot lack (`content-contract`), so the list is exactly what loads. Alternative: any folder; rejected, it offers choices that end in no content.

2. **List with a tree-only fetch.** In a temporary folder: `git init`, add the remote, `git fetch --depth 1 --filter=blob:none origin <ref>`, then `git ls-tree -r --name-only FETCH_HEAD` and keep the `dirname` of every `doc.config.yaml`. A remote that ignores the filter still fetches only one commit. The folder is removed afterwards. Alternative: `git archive --remote` or provider APIs; rejected, they are not available over plain HTTPS git. A hosted repository needs no fetch: `ls-tree` runs on its bare repository.

3. **Results are bounded and selectable.** Keep only paths that pass `contentPathProblem`, sorted with the root first, at most 50; a repository with more answers the first 50. The time and size limits of `listRemoteBranches` apply (60 s).

4. **Same access split as branches.** `listContentFolders` is admin-only and takes a `url` or a stored `slug` plus a `ref`; `listMyContentFolders` takes the same but only `https` public URLs (the user URL rules and `checkUserRemote` before fetching) or one of the caller's own slugs, and fetches with `GIT_ALLOW_PROTOCOL=https`. Input travels in the body (`QUERY`), since the URL may carry a token.

5. **The ref is an input.** The folders depend on the branch, so the form passes the chosen ref (or none, meaning the remote's HEAD) and the select refreshes when the branch changes.

## Risks / Trade-offs

- [A large repository makes the fetch slow] → depth 1 and blob-less keep it to the tree; the 60 s limit ends it, and the field falls back to text with the error as its hint.
- [Each keystroke pause or branch change fetches again] → the form debounces the URL like the branches' and reads once per URL and ref.
- [The same temporary-folder fetch for users is an outbound request] → the user restrictions of `user-content-repositories` apply before it runs.
