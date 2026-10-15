## MODIFIED Requirements

### Requirement: Backend image ships git

The backend's production runtime image and its dev image SHALL include the `git` client and CA certificates, so the backend can clone and fetch the content repositories over HTTPS. The frontend and gateway images SHALL NOT need them.

#### Scenario: Cloning in a container

- **WHEN** an admin creates a content repository with an HTTPS URL the backend container's network can reach
- **THEN** the backend SHALL clone it without installing anything at runtime

### Requirement: Content reaches the backend container

`compose.yml` and `compose.prod.yml` SHALL mount a named volume `content_data` on the backend's clone root, so every content repository's clone is kept when the stack is recreated with newer images and only fetched, not cloned again, on the next boot. They SHALL NOT mount any host content folder in the backend container.

#### Scenario: Redeploy with a cloned repository

- **WHEN** a deployment with two content repositories is recreated with newer images
- **THEN** the backend SHALL find both clones in `content_data` and fetch them instead of cloning from scratch

#### Scenario: Content folder in the local production-like stack

- **WHEN** `bun run docker:up` runs with a leftover `CONTENT_DIR=../documentacion` in the root `.env`
- **THEN** no host folder SHALL be mounted in the backend container, and the backend SHALL read the repositories stored in the database
