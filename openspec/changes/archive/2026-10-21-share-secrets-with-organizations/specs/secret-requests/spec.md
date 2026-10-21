## MODIFIED Requirements

### Requirement: Secrets tool

The MCP `secrets` tool SHALL take no arguments and return the caller's own secrets in name order, then the secrets shared with the caller in organization and name order, each with its name, description, field names, origins, `allowWrite`, `allowInUrl` and `allowInBody`, and whether it is unreadable; a shared one SHALL also carry its organization's name and slug and its owner's name. It SHALL NOT return any value. The text SHALL list one secret per block and show the placeholder for each field: `{{<name>.<field>}}` for the caller's own, `{{<organization>/<name>.<field>}}` for a shared one. With no secrets, the text SHALL say that the user can create them on the secrets page `/me/secrets`, with its full address. The result SHALL also carry the list as structured content. The tool SHALL be declared read-only and idempotent.

#### Scenario: Listing

- **WHEN** the user has the secret `komodo` with the fields `key` and `secret` and the agent calls `secrets`
- **THEN** the text SHALL name `komodo`, its description and origins, and the placeholders `{{komodo.key}}` and `{{komodo.secret}}`, and SHALL NOT hold either value

#### Scenario: Shared secret

- **WHEN** `ana`'s `komodo` is shared with `equipo-docs` and its member `luis`'s agent calls `secrets`
- **THEN** the text SHALL name `komodo` as shared by `ana` through `equipo-docs`, with the placeholders `{{equipo-docs/komodo.key}}` and `{{equipo-docs/komodo.secret}}`

#### Scenario: No secrets

- **WHEN** a user without own or shared secrets calls `secrets`
- **THEN** the result SHALL NOT be an error, and its text SHALL say to create them on the full address of `/me/secrets`

### Requirement: Placeholders

The `url`, the header values and a string body (or every string inside a JSON body) SHALL be able to hold placeholders, written `{{` expression `}}` with optional spaces inside the braces, where an expression is one of:

- `<ref>`: that field's value;
- `basic(<ref>, <ref>)`: the Base64 of the first value, a `:` and the second value, as HTTP basic authentication needs;
- `base64(<ref>)`: the Base64 of the value;
- `urlencode(<ref>)`: the value percent-encoded as a URI component.

A `<ref>` is `<secret>.<field>`, where `<secret>` is either the name of one of the caller's own secrets or `<organization>/<name>`, an organization's slug and the name of a secret shared with the caller through it. Wherever this capability and `secret-management` name a secret in an output (refusals, masks, the usage log), a shared secret SHALL be named by that prefixed form. Header names SHALL NOT hold placeholders. In the URL, a placeholder SHALL only appear after the origin (in the path, query or fragment). Every `{{…}}` whose content has the shape of a `<ref>` or of a function call is a placeholder. A `{{…}}` whose content is not a valid expression but starts with the name of one of the caller's secrets, the slug of one of the caller's organizations followed by `/`, or the name of a function (`basic`, `base64`, `urlencode`), or a `{{` never closed by `}}`, SHALL make the call fail with a tool error that quotes it. Any other `{{…}}` (a template such as `{{ $labels.instance }}`) and all text outside the placeholders SHALL be sent unchanged.

#### Scenario: Two headers

- **WHEN** the agent sends headers `X-Api-Key: {{komodo.key}}` and `X-Api-Secret: {{komodo.secret}}`
- **THEN** the outgoing request SHALL carry the two stored values in those headers

#### Scenario: Basic authentication

- **WHEN** the agent sends the header `Authorization: Basic {{basic(npm.username, npm.password)}}`
- **THEN** the outgoing header SHALL be `Basic ` followed by the Base64 of `<username>:<password>`

#### Scenario: Shared secret in a function

- **WHEN** the agent sends `Authorization: Basic {{basic(equipo-docs/npm.username, equipo-docs/npm.password)}}` and `npm` is shared with the caller through `equipo-docs`
- **THEN** the outgoing header SHALL be `Basic ` followed by the Base64 of the owner's `<username>:<password>`

#### Scenario: Own secret and shared secret with the same name

- **WHEN** the caller has their own `komodo` and `ana`'s `komodo` is shared with them through `equipo-docs`
- **THEN** `{{komodo.key}}` SHALL be the caller's value and `{{equipo-docs/komodo.key}}` SHALL be `ana`'s

#### Scenario: Placeholder in the host

- **WHEN** the agent calls `request` with the URL `https://{{casa.host}}/api`
- **THEN** the result SHALL be a tool error saying placeholders can't appear in the origin, and nothing SHALL be sent

#### Scenario: Malformed placeholder

- **WHEN** the caller has the secret `komodo` and a header value holds `{{komodo}}`
- **THEN** the result SHALL be a tool error quoting `{{komodo}}`, and nothing SHALL be sent

#### Scenario: A template in the body

- **WHEN** the body holds `{{ $labels.instance }}` next to a placeholder of a secret that allows the body
- **THEN** `{{ $labels.instance }}` SHALL be sent unchanged

### Requirement: Checks before sending

Before sending, the tool SHALL refuse the call with a tool error that says why, sending nothing, when:

- the request holds no placeholder (the tool is not a general proxy);
- a placeholder names a secret that is neither the caller's own nor shared with the caller through the organization its prefix names, or a field that secret doesn't have;
- a secret used is unreadable (for a shared one, the error SHALL say that only its owner can save its values again);
- the URL's origin (scheme, host and port, normalized like the stored origins) is not allowed by every secret used. An origin is allowed by a secret when it equals one of its origins, or when that origin is `*.<host>` and the URL's host ends with `.<host>`;
- a secret's placeholder is in the URL and the secret doesn't allow `allowInUrl`, or is in the body and the secret doesn't allow `allowInBody`;
- the method is `POST`, `PUT`, `PATCH` or `DELETE` and a secret used doesn't allow `allowWrite`.

The error text SHALL name the secret and the rule, and SHALL NOT hold any value.

#### Scenario: Origin not allowed

- **WHEN** the agent sends `{{komodo.key}}` to `https://evil.example/collect` and `komodo` allows only `https://komodo.casa.lan`
- **THEN** the result SHALL be a tool error naming `komodo` and the origins it allows, and no request SHALL leave the server

#### Scenario: Internal service

- **WHEN** the secret `pangolin` allows `http://10.0.0.5:3003` and the agent sends `GET http://10.0.0.5:3003/v1/sites` with `Authorization: Bearer {{pangolin.token}}`
- **THEN** the request SHALL be sent to that private address

#### Scenario: Write not allowed

- **WHEN** the agent sends `DELETE` with a placeholder of `pangolin`, which has `allowWrite` false
- **THEN** the result SHALL be a tool error saying `pangolin` only allows reading methods, and nothing SHALL be sent

#### Scenario: Body not allowed

- **WHEN** the agent puts `{{komodo.secret}}` in the body and `komodo` has `allowInBody` false
- **THEN** the result SHALL be a tool error saying `komodo` can't be used in the body

#### Scenario: Two secrets, one origin

- **WHEN** a request uses `a.x` and `b.y`, the URL's origin is allowed by `a` and not by `b`
- **THEN** the result SHALL be a tool error naming `b`

#### Scenario: Subdomain wildcard

- **WHEN** a secret allows `https://*.example.com` and the URL is `https://api.example.com/x`
- **THEN** the origin SHALL be allowed, and `https://example.com/x` SHALL NOT be

#### Scenario: No placeholder

- **WHEN** the agent calls `request` for `https://example.com` with no placeholder
- **THEN** the result SHALL be a tool error saying the tool only sends requests that use a secret

#### Scenario: Shared secret not available

- **WHEN** the agent uses `{{casa/komodo.key}}` and no secret `komodo` is shared with the caller through `casa`
- **THEN** the result SHALL be a tool error naming `casa/komodo`, and nothing SHALL be sent

#### Scenario: Shared secret's own rules

- **WHEN** a member's agent sends `POST` with `{{equipo-docs/pangolin.token}}` and `pangolin` has `allowWrite` false
- **THEN** the result SHALL be a tool error saying `equipo-docs/pangolin` only allows reading methods
