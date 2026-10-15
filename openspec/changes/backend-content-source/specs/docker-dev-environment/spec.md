## MODIFIED Requirements

### Requirement: Dev stack uses the native dev configuration

Each dev app container SHALL read its configuration from the root `.env` file that native dev reads. The only compose `environment` overrides for the apps SHALL be container addresses: `BACKEND_URL=http://backend:3000` for the frontend, `LOKI_URL=http://loki:3100` and `OTEL_EXPORTER_OTLP_ENDPOINT=http://tempo:4318` for both apps, and `DATABASE_URL` (the stack's `db`) and `TEMPO_URL=http://tempo:3200` for the backend; and, for the backend, the container path of the content folder. When `.env` sets `CONTENT_DIR`, the backend container SHALL get that host folder mounted read-only and `CONTENT_DIR` overridden to the mount path; when it does not, no host folder SHALL be mounted and `CONTENT_DIR` SHALL stay unset. The backend SHALL keep a `CONTENT_REPO` clone in a named volume, so it survives recreating the container. Every other value, including `BETTER_AUTH_URL`, `CORS_ORIGIN`, `CONTENT_REPO` and `CONTENT_REF`, SHALL come from `.env` unchanged.

#### Scenario: Shared data with native dev

- **WHEN** a developer creates a record while running the Docker dev stack, stops it, and later runs `bun run postgres:start` and native `bun run dev:local` with the default `DATABASE_URL`
- **THEN** the record SHALL be visible, because the dev stack's `db` and native dev's `db-native` keep their data in the same `db_data` volume

#### Scenario: Editing content with the Docker dev stack

- **WHEN** `.env` sets `CONTENT_DIR=../documentacion` and a writer saves a new entity there while the Docker dev stack runs
- **THEN** the backend container SHALL see the new file on its next read, without a rebuild, a restart or a sync rule

#### Scenario: Content folder is read-only in the container

- **WHEN** the backend container tries to write under its content mount
- **THEN** the write SHALL fail, leaving the host folder untouched
