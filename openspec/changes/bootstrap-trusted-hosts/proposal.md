## Why

`TRUSTED_GIT_HOSTS` lets users add repositories from internal git hosts, but a deployment made with `scripts/bootstrap.sh` has no way to set it other than editing the `.env` by hand afterwards, and nothing tells the operator it exists. Someone running a Gitea at home hits "host not allowed" with no hint of the fix.

## What Changes

- `scripts/bootstrap.sh` asks, optionally, for the internal git hosts users may add repositories from (empty for none), validates them, shows them in the summary and writes `TRUSTED_GIT_HOSTS` to the generated `.env` when answered, or a commented example when not.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `docker-production-deployment`: the bootstrap script's optional trusted-hosts prompt.

## Impact

- `scripts/bootstrap.sh` only. No code, schema or environment changes beyond the variable that already exists.
