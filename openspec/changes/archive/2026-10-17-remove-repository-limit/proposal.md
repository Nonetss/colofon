## Why

The first version of `user-content-repositories` capped each user at 10 repositories. Nobody asked for that cap: it was added on the implementer's initiative and the profile page advertised it ("3 de 10 permitidos"). Users should add as many repositories as they need.

## What Changes

- **BREAKING** (API): no per-user repository limit. `createMyRepository` never answers `BAD_REQUEST` for the count, and `listMyRepositories` answers the list of repositories (an array) instead of `{ limit, repositories }`.
- `/me/repositories` stops showing "de N permitidos" and the add button is never disabled by a count.
- The requirement that carried the limit is renamed "Restricted remotes", keeping its URL rules.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `user-content-repositories`: the limit is removed from the restricted remotes, the profile screen and the trusted hosts exception.

## Impact

- `packages/api` (`v1/content`): handler, output, router description and tests.
- `apps/frontend`: the profile repositories slice (hook, content, form model) and its tests.
- No database changes.
