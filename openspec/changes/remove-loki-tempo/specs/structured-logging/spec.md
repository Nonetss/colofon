## ADDED Requirements

### Requirement: Shared logger factory

`@nonete/logger/factory` SHALL export an env-agnostic `createLogger({ service, level, production })` used by both the backend (service `backend`) and the frontend's server (service `frontend`). The logger SHALL write its lines to stdout only. The logger SHALL use plain synchronous streams, never `pino.transport()`, so it keeps working when bundled into an image without `node_modules`.

#### Scenario: Logs go to stdout

- **WHEN** the backend starts
- **THEN** logs SHALL go to stdout only and nothing SHALL attempt to contact a log store

#### Scenario: Bundled runtime

- **WHEN** the backend or frontend runs from its bundled production image with no `node_modules`
- **THEN** the logger SHALL work without resolving any module at runtime

## REMOVED Requirements

### Requirement: Shared logger factory with optional Loki shipping

**Reason**: The project dropped Loki, so the logger no longer ships lines anywhere but stdout. The factory itself stays, restated without Loki as "Shared logger factory".

**Migration**: Use "Shared logger factory": `createLogger` no longer takes `lokiUrl`; read the logs on stdout.

### Requirement: Trace context on log lines

**Reason**: The project dropped OpenTelemetry, so there are no spans whose `traceId` and `spanId` a log line could carry.

**Migration**: None. Correlate a request's log lines through their `requestId`, which every backend request keeps.
