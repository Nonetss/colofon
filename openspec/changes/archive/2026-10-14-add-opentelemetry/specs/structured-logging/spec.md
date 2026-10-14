## ADDED Requirements

### Requirement: Trace context on log lines

Every logger built by `createLogger` SHALL add `traceId` and `spanId` as structured fields to each line written while a sampled span is active. It SHALL add neither field when no span is active or the active span is not sampled. These fields SHALL NOT become Loki labels. `requestId` SHALL keep being written as before.

#### Scenario: Log inside a traced request

- **WHEN** a procedure logs through its context logger while its request is traced and sampled
- **THEN** the line SHALL carry the request's `requestId` and the active span's `traceId` and `spanId`

#### Scenario: Tracing disabled

- **WHEN** the backend runs without `OTEL_EXPORTER_OTLP_ENDPOINT`
- **THEN** log lines SHALL carry no `traceId` or `spanId` field

#### Scenario: Unsampled trace

- **WHEN** a line is written inside a span whose trace was not sampled
- **THEN** it SHALL carry no `traceId` or `spanId` field
