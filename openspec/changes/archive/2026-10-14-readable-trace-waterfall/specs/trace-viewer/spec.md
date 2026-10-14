## MODIFIED Requirements

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
