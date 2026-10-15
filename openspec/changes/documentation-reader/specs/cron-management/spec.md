## REMOVED Requirements

### Requirement: Cron management web interface

**Reason**: The frontend becomes a documentation reader and the cron pages leave it at the user's request. The scheduler and every cron endpoint stay, and the only job the product relies on (the content sync) shows its outcome in `/admin/content`.

**Migration**: Jobs are read and managed through the `v1.cron` endpoints (`/scalar` lists them for admins). Restoring a web interface means a new change, with the pages placed under `/admin`.

### Requirement: Schema-driven job editor

**Reason**: The job editor was part of the removed `/crons` page.

**Migration**: Create and edit jobs with `v1.cron.create` and `v1.cron.update`; the handler catalogue endpoint still returns each handler's input JSON Schema.

### Requirement: Comments on cron runs

**Reason**: Run comments were shown only in the removed `/crons/{id}` page. The comments feature itself (API and frontend slice) stays.

**Migration**: Comments on a run remain stored and reachable through the `v1.comment` endpoints with the run as their resource.

### Requirement: Read-only rendering of code-declared jobs

**Reason**: It described how the removed `/crons` pages rendered code-declared jobs. The API still refuses changes to them ("Code-declared jobs are read-only").

**Migration**: None.
