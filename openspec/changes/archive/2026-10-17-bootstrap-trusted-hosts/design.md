## Context

`scripts/bootstrap.sh` collects the port, the public URL and the admin account, then writes a single-quoted `.env`. `TRUSTED_GIT_HOSTS` already exists (`environment-configuration`).

## Decisions

1. **One optional prompt, empty by default.** Most deployments need none, so pressing Enter changes nothing; the answer is validated as host names separated by commas, with no spaces, quotes or ports, so it cannot break the single-quoted `.env`.
2. **An unanswered prompt still leaves a hint.** The `.env` gets a commented `# TRUSTED_GIT_HOSTS=git.casa.lan` line, so the variable is discoverable later.
3. **Asked before the admin account**, with the other deployment-shaping answers, and shown in the summary before the confirmation.

## Risks / Trade-offs

- [A longer interactive script] → the prompt is optional and one line.
