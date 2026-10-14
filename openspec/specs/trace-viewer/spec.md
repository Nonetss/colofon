# Trace Viewer

## Purpose

Administrator screens and procedures to search traces stored in Tempo and inspect a single trace as a span waterfall, degrading gracefully when the trace store is unavailable.

## Requirements

### Requirement: Administrator trace search

The API SHALL expose an administrator-only `v1.traces.search` procedure (HTTP `GET`). It SHALL return the most recent traces stored in Tempo, newest first, each with its trace id, root service, the services it touched (the services with spans in it, plus `postgresql` when it queried the database), root span name, start time and duration in milliseconds. It SHALL accept these optional filters, all combined with AND:
- `services`: any of `stack-frontend`, `stack-backend` and `postgresql`, keeping the traces that touch at least one of them;
- `errorsOnly`: only traces with at least one span in error status;
- `minDurationMs`;
- `name`: a substring of the root span name;
- `from`/`to`: a time range, defaulting to the last 24 hours.

It SHALL return at most `limit` traces (default 50, maximum 200) and SHALL NOT paginate. The response SHALL say whether the limit was reached. Filter values SHALL be escaped before they are placed in the Tempo query, so a filter can never change the query's structure.

#### Scenario: Errors in the backend

- **WHEN** an administrator searches with `services: ["stack-backend"]` and `errorsOnly: true`
- **THEN** the response SHALL contain only traces with a backend span that have a span in error status (not necessarily the same one), newest first

#### Scenario: Traces that queried the database

- **WHEN** an administrator searches with `services: ["postgresql"]`
- **THEN** every returned trace SHALL list `postgresql` among its services

#### Scenario: Slow requests

- **WHEN** an administrator searches with `minDurationMs: 500`
- **THEN** every returned trace SHALL last at least 500 ms

#### Scenario: Limit reached

- **WHEN** more traces match than `limit`
- **THEN** the response SHALL contain `limit` traces and flag that the limit was reached

#### Scenario: Quoting in a filter

- **WHEN** the `name` filter contains `"` or `}` characters
- **THEN** the search SHALL match them literally and SHALL NOT fail with a query syntax error

### Requirement: Administrator trace detail

The API SHALL expose an administrator-only `v1.traces.get` procedure (HTTP `GET`) taking a 32-character hex `traceId`. It SHALL return:
- the trace's start time, total duration and span count;
- its spans in depth-first order, with siblings ordered by start time;
- for each span: hex span id, parent span id (or `null`), name, service, kind, `depth`, offset from the trace start in ms, duration in ms, status (`unset`, `ok` or `error`), status message, attributes, and events with their offsets and attributes.

A span's service SHALL be the database system it names in `db.system.name` (`postgresql` for a query), else the `service.name` of the process that emitted it. A span whose parent is not in the trace SHALL be placed as a root. The response SHALL contain at most 2000 spans and SHALL flag when spans were left out.

#### Scenario: Request trace as a tree

- **WHEN** an administrator opens a trace whose server span has an oRPC child with two query spans
- **THEN** the server span SHALL come first at depth `0`, the oRPC span at depth `1` and the two query spans at depth `2` in start order, each with an offset relative to the trace start

#### Scenario: Query span under the database

- **WHEN** a trace contains a backend query span with `db.system.name=postgresql`
- **THEN** that span's service SHALL be `postgresql`, and the viewer SHALL label it "PostgreSQL" with its own bar color

#### Scenario: Missing parent

- **WHEN** a span references a parent span id that is not in the stored trace
- **THEN** the span SHALL be returned as a root at depth `0`

#### Scenario: Unknown trace

- **WHEN** the trace id is not found in Tempo
- **THEN** the procedure SHALL fail with `NOT_FOUND` and the message "Traza no encontrada"

#### Scenario: Oversized trace

- **WHEN** a trace has more than 2000 spans
- **THEN** the response SHALL contain 2000 spans and flag that it was truncated

### Requirement: Trace store degrades gracefully

The trace procedures SHALL read Tempo's HTTP API at `TEMPO_URL` from the backend. The browser SHALL never talk to Tempo directly. When `TEMPO_URL` is unset, `traces.search` SHALL return an empty list and `traces.get` SHALL fail with `SERVICE_UNAVAILABLE`. When Tempo is unreachable, answers with an error status, or returns a body that fails validation, both procedures SHALL fail with `BAD_GATEWAY` and a Spanish message.

#### Scenario: Tempo not configured

- **WHEN** an administrator opens `/admin/traces` on a backend without `TEMPO_URL`
- **THEN** the search SHALL return no traces and the page SHALL show an empty state mentioning `TEMPO_URL`

#### Scenario: Tempo down

- **WHEN** Tempo does not answer during a search
- **THEN** the procedure SHALL fail with `BAD_GATEWAY`, and the page SHALL show its error state

### Requirement: Non-admin access to traces is denied

Both trace procedures SHALL reject callers without the administrator role, and the `/admin/traces` pages SHALL be reachable only by administrators, like the rest of `/admin`.

#### Scenario: Regular user calls the API

- **WHEN** a signed-in non-admin user calls `v1.traces.search`
- **THEN** the call SHALL be rejected and no request SHALL be sent to Tempo

### Requirement: Trace list screen

`/admin/traces` SHALL list the search results in a data table with the columns start time, root span, services touched (Frontend, Backend, PostgreSQL), duration and error state, newest first by default, sortable in the browser with the sort kept in the URL. Its filters SHALL map to the search inputs. Opening a row SHALL show that trace beside the list on the same page and keep it in the URL as `?trace=<traceId>`, marking the open row; a URL carrying `?trace=` SHALL open that trace on load, even when it isn't in the current list. Without `?trace=`, the page SHALL show the newest trace of the list beside it, without writing it to the URL, until the administrator closes the panel. Closing the trace SHALL drop the parameter and stop showing the newest trace. The page SHALL be declared in `app-surfaces` and shown in the admin navigation, and there SHALL be no separate route per trace.

#### Scenario: Opening a trace from the list

- **WHEN** an administrator opens a row on `/admin/traces`
- **THEN** the trace's waterfall SHALL appear beside the list, the URL SHALL become `/admin/traces?trace=<traceId>` and the admin sidebar SHALL stay in place

#### Scenario: Landing on the list

- **WHEN** an administrator opens `/admin/traces` with no `?trace=` and the list has traces
- **THEN** the newest trace SHALL be shown beside the list, and the URL SHALL stay `/admin/traces`

#### Scenario: Arriving from the activity log

- **WHEN** an administrator follows a "Ver traza" link to `/admin/traces?trace=<traceId>`
- **THEN** the page SHALL open with that trace shown beside the list

#### Scenario: Filtering the list

- **WHEN** an administrator turns on "Con errores"
- **THEN** the table SHALL show only traces returned by a search with `errorsOnly: true`

### Requirement: Trace waterfall panel

The open trace's panel SHALL show a summary of the trace: root span, service, start, total duration, and span and error counts. It SHALL also link to the trace's activity-log entries (`/admin/logs?trace=<traceId>`) and offer a way to close it. Below the summary, it SHALL show a waterfall with one row per span in the order returned by `traces.get`. Each row SHALL be indented by its depth and carry a bar whose position and width are proportional to the span's offset and duration within the trace. Spans in error status SHALL be visually distinct. Selecting a span SHALL show its attributes and events. When the trace was truncated, the panel SHALL say so.

#### Scenario: Reading a slow request

- **WHEN** an administrator opens a trace in which one query takes most of the time
- **THEN** that query's bar SHALL span most of the waterfall's width, under its parent spans

#### Scenario: Inspecting a span

- **WHEN** an administrator selects a query span
- **THEN** the panel SHALL show its attributes, including `db.query.text`

#### Scenario: Error span

- **WHEN** a trace contains a span in error status
- **THEN** that row SHALL be marked as an error, and the summary SHALL count it
