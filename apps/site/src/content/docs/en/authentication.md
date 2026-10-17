---
title: Users and sign-in
description: Accounts, the admin role, the first admin, single sign-on with any OIDC provider, API keys and why sign-in needs https.
order: 7
---

Sign-in is handled by Better Auth. Every page except `/login` and `/signup` requires a session, and so do the API, the Markdown routes and the MCP (or an API key instead).

## Accounts

Email and password sign-in is always available, and the `/signup` page is open: anyone who can reach the site can create an account. Every signed-in user reads every repository an admin registered, plus their own (see [Your first repository](../first-run/)).

From the profile (`/me`) each user changes their name and password and manages their API keys, repositories, secrets and skills.

## The admin role

A user is either a global `admin` or not. Admins see **Administración** in the account menu, where they:

- Create and delete users, change their role or password, and ban or unban them (`/admin/users`). A banned user can't sign in and loses their sessions.
- Register and sync the platform's content repositories (`/admin/content`) and browse the hosted ones (`/admin/git`).
- See each page's problems in full in the reader.

The interactive API reference at `/scalar` is for admins only. A user's own repositories, secrets and API keys stay private from admins too.

## The first admin

The backend creates the admin described by `ADMIN_EMAIL`, `ADMIN_PASSWORD` (at least 8 characters) and `ADMIN_NAME` (default `Admin`) when it starts, if no user has that email yet. It is idempotent: restarting neither duplicates the account nor changes its password. Without `ADMIN_EMAIL` or `ADMIN_PASSWORD` it is skipped. The installer fills in all three.

## Single sign-on (OIDC)

To add an identity provider (Keycloak, Authentik, Google or anything OIDC-compliant), register a client in the provider and set three variables:

```bash
OIDC_CLIENT_ID=colofon
OIDC_CLIENT_SECRET=...
OIDC_DISCOVERY_URL=https://keycloak.example.com/realms/acme
```

`OIDC_DISCOVERY_URL` is the issuer's base URL; `/.well-known/openid-configuration` is appended to discover the endpoints. The scopes requested are `openid`, `profile` and `email`. Allow this redirect URI in the provider:

```text
https://docs.example.com/api/auth/oauth2/callback/oidc
```

If any of the three variables is empty, SSO stays off and the sign-in page offers email and password only.

## API keys

API keys let agents and scripts act as a user: send one in the `x-api-key` header and the request runs as the key's owner, seeing exactly what they see.

```bash
curl -H "x-api-key: $COLOFON_KEY" https://docs.example.com/manual/llms.txt
```

Every user creates, renames and revokes their own keys at `/me/api-keys`, with an expiry of 30, 90, 180 or 365 days, or none. Nobody, admins included, can list or revoke another user's keys. The dialog shows a new key once, together with the text to connect an AI (see [For AI agents](../agents/)). Keys have no per-key rate limit, since an agent reads many pages.

A few actions refuse API keys on purpose and need a browser session: managing secrets and saving git credentials, so an agent holding a key can't add an origin or read a token.

## Sign-in needs https

Session cookies are issued `Secure`, `HttpOnly` and `SameSite=Lax`, and the auth API only accepts requests from the public URL (`CORS_ORIGIN`). Browsers drop `Secure` cookies over plain http except on `localhost`, so on any other host the stack must be served over https, usually by a reverse proxy in front of the gateway (see [Deploy](../deploy/)).
