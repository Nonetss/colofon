---
title: Overview
description: What colofon is, the ideas behind it and where to find each part of these docs.
order: 1
---

Colofon is a platform to document systems (work infrastructure, a homelab or anything else) that serves people and AI agents alike. The documentation lives in git repositories of its own, as MDX pages, a YAML catalog and JSON diagrams. The platform syncs them, renders them as a site with a sidebar per repository, and serves the same content to agents as Markdown, `llms.txt` and an MCP server.

It ships as three Docker images (gateway, frontend and backend) plus PostgreSQL.

## Principles

- **The platform knows nothing about the domain.** The data types (machines, services, suppliers…) and their fields are declared by the content, not by the code.
- **Platform and content live in separate repositories.** Between them there is a versioned contract, `contract: "2"` in each repository's `doc.config.yaml`.
- **Content is text in git.** Git is the source of truth, with its history, diffs and review.
- **The backend reads the content live.** Changing the documentation does not rebuild anything: the backend syncs the repository and serves it.
- **MDX executes no code.** Only Markdown and the platform's components, with no `import`, `export` or expressions.
- **Secrets never reach the AI.** An agent calls a service with placeholders that the platform fills in and masks in the response.

## Where do I find…

| If you want… | Read |
| --- | --- |
| To install it and sign in for the first time | [First run](./first-run/) |
| How a content repository is laid out and how to add one | [Content repositories](./content/) |
| To connect an AI agent through `llms.txt` or the MCP | [AI agents](./agents/) |
| The environment variables that matter | [Configuration](./configuration/) |
| To install by hand, behind HTTPS, and what to back up | [Deploy with Docker Compose](./deploy/) |
| Email and password, OIDC and API keys | [Authentication](./authentication/) |
| The pieces of the stack and the path of a request | [Architecture](./architecture/) |
| To run it from a checkout and change the code | [Development](./development/) |
| To update a running installation | [Upgrading](./upgrading/) |
