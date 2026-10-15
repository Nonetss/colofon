## ADDED Requirements

### Requirement: Backend image ships git

The backend's production runtime image and its dev image SHALL include the `git` client and CA certificates, so the backend can clone and fetch a `CONTENT_REPO` over HTTPS. The frontend and gateway images SHALL NOT need them.

#### Scenario: Cloning in a container

- **WHEN** the backend container starts with `CONTENT_REPO` set to an HTTPS URL the network can reach
- **THEN** it SHALL clone the repository without installing anything at runtime

### Requirement: Content reaches the backend container

`compose.yml` and `compose.prod.yml` SHALL mount a named volume `content_data` on the backend's clone folder, so a `CONTENT_REPO` clone is kept when the stack is recreated with newer images and only fetched, not cloned again, on the next boot. Like the dev stack, when `.env` sets `CONTENT_DIR` they SHALL mount that host folder (relative to the compose file's directory) read-only in the backend container and override `CONTENT_DIR` with the mount path; when it does not, no host folder SHALL be mounted and `CONTENT_DIR` SHALL stay unset.

#### Scenario: Redeploy with a cloned repository

- **WHEN** a deployment with `CONTENT_REPO` set is recreated with newer images
- **THEN** the backend SHALL find its clone in `content_data` and fetch it instead of cloning from scratch

#### Scenario: Content folder in the local production-like stack

- **WHEN** `bun run docker:up` runs with `CONTENT_DIR=../documentacion` in the root `.env`
- **THEN** the backend container SHALL read that folder, mounted read-only, instead of a host path that does not exist inside it
