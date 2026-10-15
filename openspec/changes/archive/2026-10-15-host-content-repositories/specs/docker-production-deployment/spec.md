## MODIFIED Requirements

### Requirement: Content reaches the backend container

`compose.yml` and `compose.prod.yml` SHALL mount a named volume `content_data` on the backend's clone root, so every content repository's clone is kept when the stack is recreated with newer images and only fetched, not cloned again, on the next boot. They SHALL mount a separate named volume `hosted_data` on the backend's hosted root, so the bare repositories of hosted content repositories, whose only copy may be the platform's, are kept when the stack is recreated. They SHALL NOT mount any host content folder in the backend container.

#### Scenario: Redeploy with a cloned repository

- **WHEN** a deployment with two content repositories is recreated with newer images
- **THEN** the backend SHALL find both clones in `content_data` and fetch them instead of cloning from scratch

#### Scenario: Redeploy with a hosted repository

- **WHEN** a deployment with the hosted repository `manual` is recreated with newer images
- **THEN** `manual`'s bare repository SHALL be found in `hosted_data` with every commit pushed before

#### Scenario: Content folder in the local production-like stack

- **WHEN** `bun run docker:up` runs with a leftover `CONTENT_DIR=../documentacion` in the root `.env`
- **THEN** no host folder SHALL be mounted in the backend container, and the backend SHALL read the repositories stored in the database
