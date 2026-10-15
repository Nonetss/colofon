## REMOVED Requirements

### Requirement: Organizations admin page

**Reason**: The product does not use organizations from the admin panel; the screen was removed from the frontend.

**Migration**: Manage organizations, members and invitations through the admin-only `v1.organization.*` procedures, which stay unchanged.

### Requirement: Teams admin page

**Reason**: The product does not use teams from the admin panel; the screen was removed from the frontend.

**Migration**: Manage teams and their members through the admin-only `v1.organization.*` team procedures, which stay unchanged.

### Requirement: Role picker surfaces permissions

**Reason**: The role pickers lived in the removed organization member and invitation dialogs.

**Migration**: Roles and their permissions stay defined in `@nonete/auth/permissions` and listed by `v1.organization.listRoles`.
