# Served-skill format

The contract is the guide's `publishing/agents` page ("Skills servidas"):
`skills/<name>/SKILL.md`, optional, never required.

## The file

```
skills/
└── operate/
    └── SKILL.md
```

- One folder per skill under `skills/`; the folder name is the skill's
  `name`: lowercase letters, digits and single hyphens, up to 64 characters.
  The platform checks it on every sync: a skill whose folder name, `name`
  or `description` breaks the rules is reported on the home and not served.
- Keep each served skill to its one `SKILL.md`: it is read whole and stays
  thin, so it has nothing to route to (the platform serves only that file).
- It follows the **Agent Skills** format: YAML front matter, then the
  instructions in Markdown.

```markdown
---
name: operate
description: How to operate the home lab documented on this site (its machines, its Docker stacks, its backups) … Use it before changing, restarting or restoring anything in the lab, or when the user asks where something runs.
---

# Operating the home lab

Read the site live: this copy only says where to look and the rules that
never change. …
```

| Key | What it is |
| --- | --- |
| `name` | Required. The folder name. |
| `description` | Required, up to 1024 characters. What it covers in one clause, then **when to use it** ("Use it before…, or when…"): agents decide to load it from this line alone. |

## What it may say

| May say | Example |
| --- | --- |
| Where to read the live documentation | "Start at the repository's `llms.txt`; every page has its Markdown at its address followed by `/llm.txt`" |
| Which pages or catalog types decide what exists | "The machines are the `machines` catalog type; the stacks, `stacks`" |
| The rules that never change, each in one line | "Never restart a stack outside Komodo", "Secrets live in the vault, never in a file" |
| How to check the work | "After a change, the stack's page says how to check it is healthy" |
| Where to send the reader for detail | "Restoring is the `backups/duplicati/restore` page" |

## What it may not say

| May not | Why |
| --- | --- |
| Inventories, addresses, versions, catalog data | They change; they live in the pages and the catalog |
| A procedure step by step | It belongs on a page; the skill links it |
| What every site shares beyond the fixed rules | The platform explains it itself (its guide, its schemas) |
| How this repository is written (its menu groups, its header fields) | That is for the agent writing **here** (`AGENTS.md` «Este sitio») |
| A secret, or a request for one | Everything here is published and read by agents |

## How agents get it

The platform publishes each skill as the repository's slug followed by its
name (`operate` in a repository `homelab` is `homelab-operate`), with the front matter's `name`
rewritten to match, under `/.well-known/agent-skills/<name>/SKILL.md`. The
index at `/.well-known/agent-skills/index.json` lists it, with its digest, to
anyone with a key who can read this repository; `/llms.txt` and the MCP
(`skills`, `skill`) point at it. A copy an agent keeps is a snapshot: that is
why the skill points at the live pages.

## Length

The platform's own `colofon` is a single short file. Keep a served skill under a screen or two:
if it grows, something in it belongs on a page.
