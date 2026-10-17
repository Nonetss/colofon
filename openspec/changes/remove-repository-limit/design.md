## Context

The limit lived in `createMyRepository` (a count before inserting), in `listMyRepositories` (a `limit` field) and in the profile page (counter and disabled button).

## Decisions

1. **Remove it entirely rather than make it configurable.** There is no known need for a cap, and a setting nobody asked for is the same mistake again. If disk use ever matters, it can come back as a requirement of its own.
2. **`listMyRepositories` returns an array**, like the admin list, since the object only existed to carry the limit.

## Risks / Trade-offs

- [Unbounded clones on disk] → each is a normal clone of a repository the user chose; accepted until it proves a problem.
