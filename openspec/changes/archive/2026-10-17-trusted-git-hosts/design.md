## Context

`userRemoteProblem` (text) and `checkUserRemote` (text plus DNS) in `packages/content/src/git/user-remote.ts` refuse localhost, internal IP literals and names that resolve to internal addresses. They run in the input validation, before every sync of an owned repository and before the user branch/folder listings.

## Goals / Non-Goals

**Goals:**
- Let the operator allow named internal hosts, and only those.

**Non-Goals:**
- Allowing CIDR ranges or whole internal networks.
- Per-user allow lists.
- Relaxing `https`-only or the transport limit.

## Decisions

1. **An environment variable, not a database setting.** Only whoever runs the server can reach an internal network, so only they should widen the rule; an admin screen would let any admin do it from the browser. `TRUSTED_GIT_HOSTS` is a comma-separated list of host names, trimmed and lower-cased.

2. **Exact host names only.** A host is trusted when its lower-cased name, or IP literal, equals an entry. No wildcards or ranges, so a typo cannot open a network. Alternative: CIDRs; rejected as broader than the need.

3. **The exception skips the address checks, not the whole check.** `userRemoteProblem` and `checkUserRemote` take the trusted set as an argument (default empty) and return early for a listed host after the `https` test, so the other rules are unchanged. The set is parsed once from the environment in the API.

## Risks / Trade-offs

- [A trusted name later points at something else] → the operator chose it; the DNS result is not checked for listed hosts. Documented next to the variable.
- [The input validation and the sync check disagree] → both read the same parsed set.
