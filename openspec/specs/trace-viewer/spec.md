# Trace Viewer

## Purpose

Administrator screens and procedures to search traces stored in Tempo and inspect a single trace as a span waterfall, degrading gracefully when the trace store is unavailable.

## Requirements

### Requirement: Administrator trace search

The API SHALL expose an administrator-only `v1.traces.search` procedure (HTTP `GET`). It SHALL return the traces stored in Tempo, newest first, a page at a time, each with its trace id, root service, the services it touched (the services with spans in it, plus `postgresql` when it queried the database), root span name, start time, duration in milliseconds and whether it is an event stream (it has oRPC's `consume_async_iterator_object_output` span). It SHALL accept these optional filters, all combined with AND:
- `services`: any of `frontend`, `backend` and `postgresql`, keeping the traces that touch at least one of them;
- `errorsOnly`: only traces with at least one span in error status;
- `minDurationMs`;
- `names`: exact root span names (as listed by `traces.rootNames`), keeping the traces whose root span has any of them;
- `from`/`to`: a time range, defaulting to the last 24 hours.

It SHALL return at most `limit` traces (default 50, maximum 200) per page and a `nextCursor` (`null` when no traces follow); passing it as `cursor` SHALL return the next page: the matching traces strictly older than the previous page's oldest, ordered by start time and then trace id, both descending, so no trace is repeated or skipped between pages. The Tempo query SHALL be built only from fixed fragments, closed enums, validated integers, trace ids normalized to hex and the `names` quoted as TraceQL strings (control characters refused), so no input can change its structure.

#### Scenario: Errors in the backend

- **WHEN** an administrator searches with `services: ["backend"]` and `errorsOnly: true`
- **THEN** the response SHALL contain only traces with a backend span that have a span in error status (not necessarily the same one), newest first

#### Scenario: Traces that queried the database

- **WHEN** an administrator searches with `services: ["postgresql"]`
- **THEN** every returned trace SHALL list `postgresql` among its services

#### Scenario: Newest traces on a busy day

- **WHEN** more traces match in the window than `limit`
- **THEN** the response SHALL contain the newest ones, not the first ones Tempo happens to find

#### Scenario: Stream flagged

- **WHEN** the results include a `cron.watchRuns` subscription
- **THEN** that trace SHALL be flagged as a stream, and a plain request SHALL NOT

#### Scenario: Slow requests

- **WHEN** an administrator searches with `minDurationMs: 500`
- **THEN** every returned trace SHALL last at least 500 ms

#### Scenario: Next page

- **WHEN** more traces match than `limit` and the administrator asks again with the response's `nextCursor`
- **THEN** the second response SHALL contain the next older traces, none of them already in the first

#### Scenario: Names picked from the list

- **WHEN** an administrator searches with `names: ["cron.run", "GET /crons"]`
- **THEN** every returned trace SHALL have one of those two root span names, matched exactly

### Requirement: Administrator trace root names

The API SHALL expose an administrator-only `v1.traces.rootNames` procedure (HTTP `GET`) taking an optional `from`/`to` time range, defaulting to the last 24 hours. It SHALL return the distinct root span names Tempo has for traces in that range, grouped by the service that emitted the trace's root span: one group per root service, ordered as a request crosses the services (frontend, backend, then any other service alphabetically), with its names alphabetical, without the empty name or service of a trace whose root span hasn't arrived. It SHALL read them from Tempo's tag-values API (the root services, then each one's root names), never by searching traces, and SHALL return no groups when `TEMPO_URL` is unset.

#### Scenario: Names for the day

- **WHEN** an administrator asks for the root names of today, and today's traces were started by the frontend and the backend
- **THEN** the response SHALL hold a Frontend and a Backend group in that order, each listing its root span names once, alphabetically

### Requirement: Administrator trace detail

The API SHALL expose an administrator-only `v1.traces.get` procedure (HTTP `GET`) taking a 32-character hex `traceId`. It SHALL return:
- the trace's start time, total duration, span count, whether it is an event stream, and the scale its waterfall is drawn to (`scaleMs`): the first root span's duration for a stream, else the total duration;
- its spans in depth-first order, with siblings ordered by start time;
- for each span: hex span id, parent span id (or `null`), name, service, kind, `depth`, offset from the trace start in ms, duration in ms, status (`unset`, `ok` or `error`), status message, attributes, events with their offsets and attributes, and a `bar` to draw: the span's measured range intersected with its parent's bar and with `[0, scaleMs]`, flagged as `continues` when the measured span runs past the bar's end because of the scale.

A span's service SHALL be the database system it names in `db.system.name` (`postgresql` for a query), else the `service.name` of the process that emitted it. A span whose parent is not in the trace SHALL be placed as a root. The response SHALL contain at most 2000 spans and SHALL flag when spans were left out.

#### Scenario: Request trace as a tree

- **WHEN** an administrator opens a trace whose server span has an oRPC child with two query spans
- **THEN** the server span SHALL come first at depth `0`, the oRPC span at depth `1` and the two query spans at depth `2` in start order, each with an offset relative to the trace start

#### Scenario: Query span under the database

- **WHEN** a trace contains a backend query span with `db.system.name=postgresql`
- **THEN** that span's service SHALL be `postgresql`, and the viewer SHALL label it "PostgreSQL" with its own bar color

#### Scenario: Child bar kept inside its parent

- **WHEN** a child span's measured end lies 0.4 ms past its parent's end (millisecond start-time resolution)
- **THEN** its `bar` SHALL end at its parent's bar end, while its `offsetMs` and `durationMs` SHALL keep the measured values

#### Scenario: Stream scaled to its request

- **WHEN** an administrator opens a `cron.watchRuns` trace whose request took 4 ms and whose subscription lasted 270 s
- **THEN** the response SHALL flag it as a stream, `scaleMs` SHALL be 4 ms, and the stream's span SHALL have a bar cut at 4 ms flagged as `continues`

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

`/admin/traces` SHALL list the search results in a data table with the columns start time, root span, services touched (Frontend, Backend, PostgreSQL), duration and error state, newest first and not sortable, since every page continues Tempo's newest-first order. It SHALL load the next page when the administrator scrolls to the end of the list. A stream SHALL carry a "Stream" tag next to its duration. Its filters SHALL map to the search inputs, and changing one SHALL start again from the first page. Root span names SHALL be filtered by picking, not typing: a filter above the table, beside the duration and day range, SHALL list the names `traces.rootNames` returns for the chosen day range, plus any kept name it no longer lists (under "Otras"). The first level SHALL be the service that started the traces (Frontend, Backend…). Under each, the names SHALL be nested by path segment (`/rpc` → `v1` → `cron` → `list`), with each route's methods under its last segment, routes first. A name that isn't a route SHALL nest by its words the same way: its first word groups it, its last word is the segment the action hangs from and the words between are the action (`db create account` under `db` → `account` as `create`, `cron.run health.check` under `cron.run` as `health.check`); a single word stays right under the service. Ticking a service or a segment SHALL keep every name under it, one with only some kept SHALL show as partly ticked, and a search inside the filter SHALL narrow the tree to the matching names, or to a whole service when its name matches. The kept names SHALL stay in the URL as `?names=`. Opening a row SHALL show that trace beside the list on the same page and keep it in the URL as `?trace=<traceId>`, marking the open row; a URL carrying `?trace=` SHALL open that trace on load, even when it isn't in the current list. Without `?trace=`, the page SHALL show the newest trace of the list beside it, without writing it to the URL, until the administrator closes the panel. Closing the trace SHALL drop the parameter and stop showing the newest trace. The page SHALL be declared in `app-surfaces` and shown in the admin navigation, and there SHALL be no separate route per trace.

#### Scenario: Opening a trace from the list

- **WHEN** an administrator opens a row on `/admin/traces`
- **THEN** the trace's waterfall SHALL appear beside the list, the URL SHALL become `/admin/traces?trace=<traceId>` and the admin sidebar SHALL stay in place

#### Scenario: Landing on the list

- **WHEN** an administrator opens `/admin/traces` with no `?trace=` and the list has traces
- **THEN** the newest trace SHALL be shown beside the list, and the URL SHALL stay `/admin/traces`

#### Scenario: Arriving from the activity log

- **WHEN** an administrator follows a "Ver traza" link to `/admin/traces?trace=<traceId>`
- **THEN** the page SHALL open with that trace shown beside the list

#### Scenario: Filtering by name

- **WHEN** an administrator ticks `cron.run` in the trace name filter
- **THEN** the table SHALL show the traces returned by a search with `names: ["cron.run"]`

#### Scenario: Picking a whole path

- **WHEN** an administrator ticks Backend → `/rpc` → `v1` → `cron` in the trace name filter
- **THEN** the search SHALL keep every listed name under `/rpc/v1/cron`, and Backend, `/rpc` and `v1` SHALL show as partly ticked

#### Scenario: Database spans grouped like routes

- **WHEN** the backend's root names include `db create user`, `db findOne user` and `db create session`
- **THEN** the filter SHALL show Backend → `db` → `user` with `create` and `findOne`, and `db` → `session` with `create`

#### Scenario: Picking a whole service

- **WHEN** an administrator ticks Frontend in the trace name filter
- **THEN** the search SHALL keep every root span name the frontend started (its pages), and none of the backend's

#### Scenario: Scrolling past the loaded traces

- **WHEN** an administrator scrolls to the end of the list and more traces match
- **THEN** the next, older page SHALL be loaded and appended below

#### Scenario: Filtering the list

- **WHEN** an administrator turns on "Con errores"
- **THEN** the table SHALL show only traces returned by a search with `errorsOnly: true`

### Requirement: Trace waterfall panel

The open trace's panel SHALL show a summary of the trace: root span, service, start, total duration, and span and error counts. It SHALL also link to the trace's activity-log entries (`/admin/logs?trace=<traceId>`) and offer a way to close it. Below the summary, it SHALL show a waterfall of its spans in the order returned by `traces.get`, scrolling in its own box so the selected span's details stay reachable:
- each row SHALL be indented by its nesting level and carry the span's `bar`, positioned and sized as a proportion of `scaleMs`;
- a bar SHALL be marked as continuing past the right edge when `bar.continues` is set;
- spans in error status SHALL be visually distinct, and each service SHALL have its own bar color;
- selecting a span SHALL show its attributes and events.

To keep large traces readable, the waterfall SHALL:
- hide oRPC's per-call spans (`call_procedure`, `middleware.*`, `validate_input`, `validate_output`, `handler`, `consume_*`) by default, nesting their children under the nearest span it shows, and offer a switch that shows them and says how many are hidden. A span in error status SHALL never be hidden;
- fold three or more consecutive sibling spans with the same name and service into one row that shows the name, how many spans it holds, the sum of their durations and a bar from the first one's start to the last one's end, and that opens to list them one level deeper;
- let every span with children, and every folded row, be opened and folded, and offer to open or fold everything at once;
- paint on the bar of a folded span where the spans it hides of other services, or in error, ran, each in its service's color (or as an error), and on the bar of a folded row where its members ran, so folding never hides which services did the work;
- open by default the root spans and then, level by level, only the spans whose children still fit in a short outline (about 60 rows), leaving folded rows closed, and always open whatever encloses a span in error;
- keep a span or folded row the administrator opened or folded in that state while more spans arrive.

When the trace was truncated, the panel SHALL say so. When the trace is a stream, the panel SHALL say that it lasts as long as the subscription, that the waterfall is scaled to the request, and that spans may still be arriving while the subscription is open.

#### Scenario: Reading a slow request

- **WHEN** an administrator opens a trace in which one query takes most of the time
- **THEN** that query's bar SHALL span most of the waterfall's width, under its parent spans

#### Scenario: Inspecting a span

- **WHEN** an administrator selects a query span
- **THEN** the panel SHALL show its attributes, including `db.query.text`

#### Scenario: Reading a stream

- **WHEN** an administrator opens a `cron.watchRuns` trace
- **THEN** the request's bars SHALL be readable at full width, the stream's bar SHALL be marked as continuing, and the panel SHALL explain the stream

#### Scenario: Error span

- **WHEN** a trace contains a span in error status
- **THEN** that row SHALL be visible and marked as an error, and the summary SHALL count it

#### Scenario: Opening a large trace

- **WHEN** an administrator opens a trace with hundreds of spans
- **THEN** the waterfall SHALL open on an outline without oRPC's per-call spans, each procedure's own work visible under it, and nothing beyond what fits that outline opened

#### Scenario: Repeated queries

- **WHEN** a procedure in the open trace ran 400 `UPDATE` statements in a row
- **THEN** they SHALL appear as one row reading `pg.query:UPDATE … ×400` with their total duration, and opening it SHALL list the 400 spans

#### Scenario: Showing oRPC's spans

- **WHEN** an administrator turns on the switch for oRPC's internal spans
- **THEN** the waterfall SHALL show `call_procedure`, `middleware.*`, the validation and `handler` spans in their place in the tree

#### Scenario: Colors of a folded span

- **WHEN** a span is folded and PostgreSQL did work under it
- **THEN** its bar SHALL show, over its own Backend color, the stretches where the database ran in its own color
