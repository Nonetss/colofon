## MODIFIED Requirements

### Requirement: Explicit feature import boundaries

Every semantic slice SHALL expose a narrow public API from `index.ts`. Astro
pages and other feature domains MUST consume the owning slice or domain through
a public entry point, while files inside the owning slice SHALL use direct
internal imports and MUST NOT import their own barrel. Cross-slice consumers
MUST NOT reach into another slice's private technical folders. A domain root
`index.ts` SHALL exist only when something imports the domain itself.
Frontend-internal imports SHALL use the `@/` absolute alias rather than
relative paths.

#### Scenario: Astro mounts a route page

- **WHEN** an Astro route imports its client-only React page component
- **THEN** it SHALL import that component from a public feature or slice entry
  point and retain `client:only="react"`

#### Scenario: A route renders one slice of a multi-slice domain

- **WHEN** an Astro route renders a page owned by one use-case slice of a domain
  with several slices (such as `admin/users` and `admin/content`, or
  `auth/sign-in` and `auth/sign-up`)
- **THEN** it SHALL import the page from that slice's `index.ts` (for example
  `@/features/admin/users` or `@/features/auth/sign-in`), so the route does
  not bundle or hydrate the sibling slices

#### Scenario: One feature needs another feature's type

- **WHEN** a feature intentionally consumes a type owned by another domain
- **THEN** that type SHALL be explicitly exported by the owning public entry
  point rather than imported from its private `model` directory

#### Scenario: A slice imports its own component

- **WHEN** a component inside a slice consumes another private module from the
  same slice
- **THEN** it SHALL import the direct internal `@/features/...` path rather than
  the slice's `index.ts`

#### Scenario: Two sibling slices consume each other

- **WHEN** two slices of the same domain both need the other's types or hooks and
  routing that through `index.ts` would create a page-level import cycle
- **THEN** each owning slice SHALL publish the cycle-free subset from a
  `public.ts` entry point re-exported by its own `index.ts`, and the sibling
  SHALL import that entry point instead of a private technical folder

#### Scenario: A container domain is mounted slice by slice

- **WHEN** a domain such as `admin` or `app-shell` is only consumed through its
  slices
- **THEN** it SHALL NOT have a root `index.ts` barrel
