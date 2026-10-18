---
title: Upgrading
description: Update a running installation, pin one build, and check that the content repositories still match the platform.
order: 10
---

## The usual upgrade

From the directory that holds `compose.prod.yml` and `.env`:

```bash
docker compose -f compose.prod.yml --env-file .env pull
docker compose -f compose.prod.yml --env-file .env up -d --remove-orphans
```

The backend applies any new database migration when it starts, and syncs every content repository again, so there is no separate step. Upgrade the three images (gateway, frontend and backend) together: they are built from the same commit. Take a [backup](../deploy/#what-to-back-up) first.

When a release changes the compose file itself, download it again before pulling:

```bash
curl -fsSL https://raw.githubusercontent.com/Nonetss/colofon/main/compose.prod.yml -o compose.prod.yml
```

## Pin a build

`compose.prod.yml` uses the `:main` tag of `ghcr.io/nonetss/colofon-gateway`, `colofon-frontend` and `colofon-backend`. Every build of `main` is also published as `main-<sha>`, with the first eight characters of the commit. To stay on one build, change the three `image:` lines to the same `main-<sha>` tag.

## The content contract

The platform and the content repositories are versioned apart. Each repository says which version of the contract it is written for in its `doc.config.yaml`:

```yaml
contract: "2"
```

Version 2 names every key in English. A repository still written for version 1 (`plataforma: "1"`, the same keys in Spanish) is still read and published, with a notice on its home saying its contract is superseded; the «Pasar del contrato 1 al 2» page of [doc-example](https://github.com/Nonetss/doc-example) maps each key. Upgrading the platform does not require touching the content. A repository that declares a version the platform does not know is reported as invalid on sync, and the platform keeps serving its last valid version.
