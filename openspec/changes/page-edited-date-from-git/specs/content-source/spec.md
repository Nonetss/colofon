## ADDED Requirements

### Requirement: Full history and last edit dates

A sync SHALL fetch the full history of the repository's `ref`, not only its last commit, and a sync of a clone that holds only part of that history (a shallow clone left by an earlier version of the platform) SHALL deepen it to the full history. For the current checkout of each repository, the backend SHALL read, in a single pass over the history, the date (`YYYY-MM-DD`, from the committer date in the committer's time zone) of the last commit of the checked-out `ref` that touched each file present in the checkout. A file moved or renamed SHALL take the date of the commit that moved it. Reading the dates SHALL NOT be part of the sync: when they cannot be read, the sync SHALL still succeed, the failure SHALL be logged with the repository's slug, and the repository's pages SHALL be built without edit dates until its next successful sync.

#### Scenario: Two files edited on different days

- **WHEN** `docs/red/dns.mdx` was last changed by a commit of 2026-03-02 and `docs/red/vpn.mdx` by one of 2026-10-14, and the backend syncs the repository
- **THEN** it SHALL read 2026-03-02 for `docs/red/dns.mdx` and 2026-10-14 for `docs/red/vpn.mdx`

#### Scenario: Shallow clone from an earlier version

- **WHEN** the backend syncs a repository whose clone was fetched with only its last commit
- **THEN** the clone SHALL end up with the full history of the `ref`, and each file SHALL get the date of its own last commit, not that of the last commit of the repository

#### Scenario: Hosted repository

- **WHEN** the backend syncs the hosted repository `manual` after a push
- **THEN** it SHALL read each file's last commit date from the history pushed to its bare repository

#### Scenario: Dates cannot be read

- **WHEN** the history pass fails on a checkout that synced successfully
- **THEN** the sync SHALL count as successful, the failure SHALL be logged, and the repository's pages SHALL show no edit date until its next successful sync
