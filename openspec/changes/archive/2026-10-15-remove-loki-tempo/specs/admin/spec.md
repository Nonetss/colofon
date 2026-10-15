## REMOVED Requirements

### Requirement: Administrative activity log

**Reason**: The project dropped Loki and the activity log; the page-view and API-call entries it read are no longer written.

**Migration**: None. `/admin/logs` is gone; read the services' stdout logs instead.
