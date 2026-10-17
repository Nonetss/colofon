## Why

Users can add repositories only from public `https` hosts: the backend refuses any host that resolves to an internal address, so it cannot be turned against the platform's network. A self-hosted Gitea at home, such as `git.noneweb.online` (10.1.1.10), is exactly such a host: a public repository there is rejected with "The remote host is not allowed". The person who runs the server knows which internal hosts are safe to read; users do not.

## What Changes

- A new optional server variable, `TRUSTED_GIT_HOSTS`, lists host names (comma separated) that users may add repositories from even when they resolve to an internal address. Every other internal host stays blocked.
- A listed host skips the internal-address checks of a user's URL: the input validation, the check before every sync and before listing branches and folders. The other rules (`https` only, the transport limit, the 10-repository limit) still apply.
- Nothing changes while the variable is unset.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `user-content-repositories`: a trusted-hosts exception to the restricted remotes.
- `environment-configuration`: the optional `TRUSTED_GIT_HOSTS` variable.

## Impact

- `packages/env`: the variable. `.env.example` and the `stack` env reference document it.
- `packages/content`: the user-remote checks take the trusted set.
- `packages/api` (`v1/content`): the input validation, the reader and the handler pass the set from the environment.
- No database changes.
