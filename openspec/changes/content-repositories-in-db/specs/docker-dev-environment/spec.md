## MODIFIED Requirements

### Requirement: Dev stack uses the native dev configuration

Each dev app container SHALL read its configuration from the root `.env` file that native dev reads. The only compose `environment` overrides for the apps SHALL be container addresses: `BACKEND_URL=http://backend:3000` for the frontend and `DATABASE_URL` (the stack's `db`) for the backend. No host content folder SHALL be mounted in the backend container. The backend SHALL keep its content repository clones in a named volume, so they survive recreating the container. Every other value, including `BETTER_AUTH_URL` and `CORS_ORIGIN`, SHALL come from `.env` unchanged.

#### Scenario: Shared data with native dev

- **WHEN** a developer creates a record while running the Docker dev stack, stops it, and later runs `bun run postgres:start` and native `bun run dev:local` with the default `DATABASE_URL`
- **THEN** the record SHALL be visible, because the dev stack's `db` and native dev's `db-native` keep their data in the same `db_data` volume

#### Scenario: Editing content with the Docker dev stack

- **WHEN** a writer pushes a new entity to a stored repository and an admin syncs it from `/admin/content` while the Docker dev stack runs
- **THEN** the backend container SHALL serve the new entity in that repository's schemas, without a rebuild or a restart

#### Scenario: Content folder is read-only in the container

- **WHEN** the backend dev container starts, whatever `.env` holds
- **THEN** no host content folder SHALL be mounted in it, so it cannot write to one

#### Scenario: Clones survive recreating the backend

- **WHEN** the backend dev container is recreated after it cloned a content repository
- **THEN** the new container SHALL find the clone in the named volume and fetch it instead of cloning from scratch
