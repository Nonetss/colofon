## MODIFIED Requirements

### Requirement: Network-first service worker

`apps/frontend/public/sw.js` SHALL be a minimal worker that makes the app installable and keeps a last-known copy of what it fetched for offline use, in a single versioned cache named `stack-shell-v1`:

- On `install` it SHALL call `skipWaiting()`; on `activate` it SHALL delete every cache with another name and claim open clients.
- On `fetch` it SHALL ignore (leave to the browser) non-GET requests, cross-origin requests and requests whose path matches `/rpc/`, `/api/`, `/scalar` or `/openapi.json`, so API, auth and documentation responses are always fetched fresh and never cached.
- For every other request it SHALL go to the network first, store a copy of the response in the cache, and return it. Only when the network fails SHALL it answer from the cache; a navigation with no cached copy SHALL fall back to the cached `/`, and any other uncached request SHALL fail with a network error.

#### Scenario: Online navigation

- **WHEN** the network is available and the user navigates to `/me`
- **THEN** the page SHALL come from the network and a copy SHALL be stored in `stack-shell-v1`

#### Scenario: Offline navigation

- **WHEN** the network is unavailable and the user navigates to a page that was never cached
- **THEN** the worker SHALL respond with the cached `/` if present

#### Scenario: API calls are never cached

- **WHEN** the app calls `/rpc/v1/...` or `/api/auth/...`
- **THEN** the service worker SHALL NOT intercept the request and nothing SHALL be written to the cache
