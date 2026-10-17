## MODIFIED Requirements

### Requirement: Secrets tool

The MCP `secrets` tool SHALL take no arguments and return the caller's secrets in name order, each with its name, description, field names, origins, `allowWrite`, `allowInUrl` and `allowInBody`, and whether it is unreadable. It SHALL NOT return any value. The text SHALL list one secret per block and show the placeholder for each field (`{{<name>.<field>}}`). With no secrets, the text SHALL say that the user can create them on the secrets page `/me/secrets`, with its full address. The result SHALL also carry the list as structured content. The tool SHALL be declared read-only and idempotent.

#### Scenario: Listing

- **WHEN** the user has the secret `komodo` with the fields `key` and `secret` and the agent calls `secrets`
- **THEN** the text SHALL name `komodo`, its description and origins, and the placeholders `{{komodo.key}}` and `{{komodo.secret}}`, and SHALL NOT hold either value

#### Scenario: No secrets

- **WHEN** a user without secrets calls `secrets`
- **THEN** the result SHALL NOT be an error, and its text SHALL say to create them on the full address of `/me/secrets`
