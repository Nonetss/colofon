## MODIFIED Requirements

### Requirement: Frontend helpers are covered

The `apps/frontend` unit suite SHALL cover the pure helpers in `src/lib` that do not need a running app: date and duration formatting (`format.ts`, with a fixed clock for relative labels), text folding and suggestions (`fold-text.ts`), deterministic ids (`deterministic-id.ts`), user display names (`user-display.ts`), surface and navigation lookups (`app-surfaces.ts`, `site-nav.ts`: path matching, admin-only filtering, current-item detection), recent surfaces (`recent-surfaces.ts`, bounded by `RECENT_SURFACES_LIMIT` and deduplicated), icon references (`icon-registry.ts`), theme resolution (`theme.ts`) and the query retry policy (`query-client.ts`: which failures are retried and how many times).

#### Scenario: Accent-insensitive folding

- **WHEN** `foldText` is given text with accents and mixed case
- **THEN** it SHALL return the lower-case text without diacritics

#### Scenario: Deterministic ids are stable

- **WHEN** `deterministicUuid` is called twice with the same seed
- **THEN** it SHALL return the same UUID both times, and a different one for a different seed

#### Scenario: Admin-only surfaces are hidden from users

- **WHEN** the navigable surfaces are requested for a non-admin
- **THEN** no admin-only surface SHALL be included

#### Scenario: Client errors are not retried

- **WHEN** the retry policy is asked about a first failure whose error carries a status from 400 to 499 other than 408 and 429 (an oRPC error or an auth client error)
- **THEN** it SHALL answer not to retry, while a 408, a 429, a 5xx status or an error without a status SHALL be retried until the attempt limit

### Requirement: Frontend hooks are covered

The `apps/frontend` unit suite SHALL render hooks from `src/hooks` that depend only on React and the browser (debounced value, dialog form and target dialogs, `useOnOpen`, query-param state, copy to clipboard) in a DOM provided by `happy-dom`, using `@testing-library/react`, and SHALL assert their state transitions. Timers SHALL be controlled by the test, not waited for in real time.

#### Scenario: Debounced value trails its input

- **WHEN** the value passed to `useDebouncedValue` changes twice within the delay
- **THEN** the hook SHALL return the previous value until the delay elapses after the last change, and then the last value

#### Scenario: Query param round-trip

- **WHEN** a hook using `useQueryParam` sets a value
- **THEN** the URL's query string SHALL hold the serialized value and a fresh render SHALL parse it back
- **AND** setting the value back to the default SHALL remove the param from the URL
