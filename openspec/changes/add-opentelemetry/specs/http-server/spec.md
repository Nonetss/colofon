## MODIFIED Requirements

### Requirement: Graceful shutdown

On `SIGINT` or `SIGTERM` the backend SHALL shut down in this order: end open server-pushed event subscriptions, stop accepting new HTTP connections and let in-flight HTTP requests complete, stop the cron scheduler, close the shared database pool, shut down the tracer provider (flushing pending spans), and exit. The database pool SHALL be closed only after HTTP and cron have stopped, and the tracer provider only after the database pool. The process SHALL exit with status `0` when every step succeeds. A step that fails SHALL be logged and SHALL NOT prevent the remaining steps from running. A failure in any step other than the tracer provider shutdown SHALL make the process exit with a non-zero status. A tracer provider failure SHALL be logged at `warn` and SHALL NOT affect the exit status.

#### Scenario: In-flight request completes during shutdown

- **WHEN** the backend receives `SIGTERM` while an HTTP request is being processed
- **THEN** new connections SHALL be refused, and the in-flight request SHALL receive its normal response before the database pool is closed

#### Scenario: Open event subscriptions end before the drain

- **WHEN** the backend receives `SIGTERM` while a client is subscribed to cron run events
- **THEN** that subscription's stream SHALL end normally before the HTTP drain starts, so it does not hold the drain until its timeout

#### Scenario: Clean shutdown

- **WHEN** the backend receives `SIGINT` or `SIGTERM` and every shutdown step succeeds
- **THEN** the process SHALL release all of its database connections, flush its pending spans and exit with status `0`

#### Scenario: A shutdown step fails

- **WHEN** one shutdown step throws (for example, stopping the cron scheduler fails)
- **THEN** the failure SHALL be logged, the database pool SHALL still be closed, and the process SHALL exit with a non-zero status

#### Scenario: Tracer flush fails

- **WHEN** every other step succeeds and the tracer provider shutdown fails
- **THEN** the failure SHALL be logged at `warn` and the process SHALL exit with status `0`
