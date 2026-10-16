## ADDED Requirements

### Requirement: Last edit date

A page read from an `.mdx` file SHALL carry, as `editado`, the last commit date the source read for that file (`content-source` "Full history and last edit dates"), or nothing when none is recorded. `editado` SHALL NOT be a header key: a page header that says `editado` SHALL be reported like any other unknown key. `editado` SHALL be independent of `actualizado`: setting one SHALL NOT change the other. A folder page with no `index.mdx` SHALL have no `editado`.

#### Scenario: Page without `actualizado`

- **WHEN** `docs/red/dns.mdx` sets no `actualizado` and its last commit is of 2026-03-02
- **THEN** its header SHALL have no `actualizado` and `editado` 2026-03-02

#### Scenario: Page with both

- **WHEN** `docs/red/vpn.mdx` says `actualizado: 2026-01-10` and its last commit is of 2026-10-14
- **THEN** its header SHALL have `actualizado` 2026-01-10 and `editado` 2026-10-14

#### Scenario: Folder without index

- **WHEN** the folder `docs/red/` has pages but no `index.mdx`
- **THEN** its folder page SHALL have no `editado`
