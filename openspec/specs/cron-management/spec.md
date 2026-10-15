# Cron Management

## Purpose

Exposes procedures and a web interface to list, inspect, create, edit, enable, delete and run cron jobs, browse their run history and live run events, and comment on runs, while keeping code-declared jobs read-only.

## Requirements

### Requirement: Cron job listing endpoints

The system SHALL expose authenticated procedures to list all cron jobs and to read a single job by id, returning the full definition (name, description, expression, timezone, enabled flag, handler key, the route tags of the procedure behind it, payload, origin — `manual` or `code` — last and next run timestamps, and creation/update timestamps) with timestamps serialised as ISO strings.

#### Scenario: Authenticated user lists jobs

- **WHEN** an authenticated user calls `v1.cron.list`
- **THEN** the system SHALL return every cron job definition ordered by name, code-declared jobs included

#### Scenario: Unauthenticated request

- **WHEN** a request without an authenticated user calls any cron procedure
- **THEN** the system SHALL throw an `UNAUTHORIZED` error

#### Scenario: Unknown job id

- **WHEN** `v1.cron.get` is called with an id that does not exist
- **THEN** the system SHALL throw a `NOT_FOUND` error

### Requirement: Cron handler catalogue endpoint

The system SHALL expose an authenticated procedure that returns the discovered cron-eligible procedures — key, summary, description, tags and input JSON Schema — so clients can offer a handler picker and render payload fields without hardcoding anything. Procedures that declare a code schedule SHALL NOT appear in the catalogue.

#### Scenario: Client fetches the catalogue

- **WHEN** an authenticated user calls `v1.cron.handlers`
- **THEN** the system SHALL return every cron-eligible procedure with its key, summary, description, tags and input JSON Schema, and no procedure declaring a `schedule`

### Requirement: Cron job management endpoints

The system SHALL expose admin-only procedures to create, update, enable/disable and delete cron jobs. Every mutation SHALL trigger a scheduler refresh so the change takes effect immediately. Deleting a job SHALL delete its run history.

#### Scenario: Admin creates a job

- **WHEN** an admin calls `v1.cron.create` with a valid name, expression and cron-eligible handler key
- **THEN** the system SHALL persist the job, refresh the scheduler, and return the created definition

#### Scenario: Non-admin attempts a mutation

- **WHEN** an authenticated non-admin user calls `v1.cron.create`, `update`, `setEnabled` or `remove`
- **THEN** the system SHALL throw a `FORBIDDEN` error and change nothing

#### Scenario: Admin toggles a job

- **WHEN** an admin calls `v1.cron.setEnabled`
- **THEN** the system SHALL persist the new enabled flag, recompute the next run timestamp when enabling and clear it when disabling, and refresh the scheduler

#### Scenario: Admin deletes a job

- **WHEN** an admin calls `v1.cron.remove`
- **THEN** the system SHALL delete the job and its runs, refresh the scheduler, and return the deleted id

#### Scenario: Validation failure surfaces as a client error

- **WHEN** a mutation fails cron-expression, handler-key or unique-name validation
- **THEN** the system SHALL respond with a `BAD_REQUEST` error carrying the validation message

### Requirement: Cron run history endpoint

The system SHALL expose an authenticated procedure returning the runs of a job, most recent first by default, optionally filtered to one or more statuses (`statuses`) and bounded by a caller-supplied limit with a sane default. The caller SHALL be able to order them by start time, status (running, failed, skipped, then successful when ascending) or duration (runs still in progress last in either direction), with `sort` and `order`; runs equal on the chosen key SHALL follow, newest first. Its cursor SHALL continue in the requested order and SHALL be rejected with `BAD_REQUEST` when issued for another order.

#### Scenario: User inspects run history

- **WHEN** an authenticated user calls `v1.cron.listRuns` for a job
- **THEN** the system SHALL return that job's runs ordered by start time descending, each with status, timestamps and error message

#### Scenario: User orders the history by duration

- **WHEN** an authenticated user calls `v1.cron.listRuns` with `sort: "duration"` and `order: "desc"`
- **THEN** the system SHALL return the job's finished runs longest first, followed by the runs still in progress

#### Scenario: User filters several statuses

- **WHEN** an authenticated user calls `v1.cron.listRuns` with `statuses: ["failed", "skipped"]`
- **THEN** the system SHALL return only the job's failed and skipped runs

#### Scenario: User reads the history oldest first

- **WHEN** an authenticated user calls `v1.cron.listRuns` with `order: "asc"` and then passes the returned `nextCursor`
- **THEN** the first page SHALL start at the job's oldest run and the next page SHALL continue with the runs started after the last run of the first page

### Requirement: Cron run events endpoint

The system SHALL expose an authenticated streamed procedure, `v1.cron.watchRuns`, that takes a job id and pushes an event over server-sent events each time one of that job's runs starts, finishes (successfully or not) or is skipped. The stream SHALL first send a `subscribed` event once it is listening, then one `run` event per change carrying the run id and its new status. It SHALL NOT send events for other jobs. It SHALL be a read declared with the `GET` method and SHALL NOT be cron-eligible. Events SHALL be delivered only to subscribers connected to the backend instance that ran the job, consistent with the single-instance scheduler.

#### Scenario: Run lifecycle is pushed

- **WHEN** a user is subscribed to `v1.cron.watchRuns` for a job and that job fires and succeeds
- **THEN** the stream SHALL deliver a `run` event with status `running` and then one with status `success` for the same run id

#### Scenario: Skipped run is pushed

- **WHEN** a job fires while its previous run is still `running`
- **THEN** subscribers of that job SHALL receive a `run` event with status `skipped`

#### Scenario: Other jobs are filtered out

- **WHEN** a user is subscribed for job A and job B runs
- **THEN** the stream SHALL NOT deliver any event for job B

#### Scenario: Unknown job

- **WHEN** a user subscribes with the id of a job that does not exist or was removed
- **THEN** the call SHALL fail with `NOT_FOUND` and no stream SHALL be opened

#### Scenario: Anonymous caller

- **WHEN** an unauthenticated client calls `v1.cron.watchRuns`
- **THEN** the call SHALL fail with `UNAUTHORIZED`

#### Scenario: A failing listener does not affect the run

- **WHEN** publishing a run event throws
- **THEN** the run SHALL still be recorded with its real outcome and the failure SHALL be logged as a warning

### Requirement: Cron job list events endpoint

The system SHALL expose an authenticated streamed procedure, `v1.cron.watchJobs`, that takes no input and pushes an event over server-sent events whenever the job list a client shows may have changed: any job's run starts, finishes or is skipped, or any job is created, updated, enabled, disabled or removed. The stream SHALL first send a `subscribed` event once it is listening, then one `changed` event per change; events SHALL NOT be replayed, so a client refetches the list on `subscribed`. It SHALL be a read declared with the `GET` method and SHALL NOT be cron-eligible. Events SHALL be delivered only to subscribers connected to the backend instance where the change happened, consistent with the single-instance scheduler. The stream SHALL end when the backend shuts down.

#### Scenario: A run is pushed to list watchers

- **WHEN** a user is subscribed to `v1.cron.watchJobs` and any job fires
- **THEN** the stream SHALL deliver a `changed` event when the run starts and another when it finishes

#### Scenario: A job edit is pushed to list watchers

- **WHEN** a user is subscribed to `v1.cron.watchJobs` and an admin creates, updates, enables, disables or removes a job
- **THEN** the stream SHALL deliver a `changed` event

#### Scenario: Anonymous caller

- **WHEN** an unauthenticated client calls `v1.cron.watchJobs`
- **THEN** the call SHALL fail with `UNAUTHORIZED`

#### Scenario: Shutdown ends the stream

- **WHEN** the backend shuts down while a client is subscribed
- **THEN** the stream SHALL end before the backend drains its HTTP connections

### Requirement: Cron-only procedures

The system SHALL provide a procedure builder that rejects any call whose context is not marked as a cron execution, so a procedure can be exposed to the scheduler without being callable over HTTP. The request context built for HTTP requests SHALL never carry the cron marker.

#### Scenario: HTTP call to a cron-only procedure

- **WHEN** a client calls a cron-only procedure over HTTP, even as an admin
- **THEN** the system SHALL throw a `FORBIDDEN` error stating the endpoint is cron-only

#### Scenario: Scheduler call to a cron-only procedure

- **WHEN** the scheduler invokes a cron-only procedure with a cron-marked context
- **THEN** the handler SHALL execute

### Requirement: Code-declared jobs are read-only

The system SHALL refuse every change and manual run of a job whose origin is `code`, regardless of the caller's role. Only the startup sync SHALL write to such jobs. The refusal SHALL use `CONFLICT`, because it comes from the job's origin and not from the caller's permissions.

#### Scenario: Admin attempts to modify a code-declared job

- **WHEN** an admin calls `v1.cron.update`, `v1.cron.setEnabled` or `v1.cron.remove` for a `code` job
- **THEN** the system SHALL throw a `CONFLICT` error with a Spanish message stating the job is declared in code, and SHALL change nothing

#### Scenario: Admin attempts to run a code-declared job now

- **WHEN** an admin calls `v1.cron.runNow` for a `code` job
- **THEN** the system SHALL throw a `CONFLICT` error and SHALL NOT record or start a run

#### Scenario: Reading a code-declared job

- **WHEN** an authenticated user calls `v1.cron.get` or `v1.cron.listRuns` for a `code` job
- **THEN** the system SHALL return its definition and run history like any other job
