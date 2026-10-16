# Served-skill format

The contract is `docs/publishing/agents.mdx` ("Skills servidas") and the
`files/served-skill` entity (`path: skills/<name>/SKILL.md`, `kind: agents`,
not required).

## The file

```
skills/
└── guide/
    └── SKILL.md
```

- One folder per skill under `skills/`; the folder name is the skill's
  `name`: lowercase letters, digits and single hyphens, up to 64 characters.
  The platform checks it on every sync: a skill whose folder name, `name`
  or `description` breaks the rules is reported on the home and not served.
- This site keeps each served skill to its one `SKILL.md`: it is read whole
  and stays thin, so it has nothing to route to.
- It follows the **Agent Skills** format: YAML front matter, then the
  instructions in Markdown.

```markdown
---
name: guide
description: How to use the "Escribir documentación" guide of the doc platform, … Use it when you are writing or reviewing a content repository and need to know where in the guide a part of the contract is explained, or when the guide and a repository disagree.
---

# The "Escribir documentación" guide

This guide documents the content contract and uses every feature it explains, … Read it live: this copy only says where to look.
```

| Key | What it is |
| --- | --- |
| `name` | Required. The folder name. |
| `description` | Required, up to 1024 characters. What it covers in one clause, then **when to use it** ("Use it before…, or when…"): agents decide to load it from this line alone. |

## What it may say

| May say | Example (from the platform's `doc-writing`) |
| --- | --- |
| Where to read the live contract | "Read the guide's index (`/llms.txt`)…, every page has its Markdown at its address followed by `/llm.txt`" |
| Which of the site's own files decide what exists | "Look at the repository's own `doc.config.yaml`, `menu.yaml` and `catalog/*/_type.yaml` first" |
| The rules that never change, each in one line | "Pages have no code", "YAML wins over MDX", "Every `icono` is a Lucide icon name" |
| How to check the work | "After the push and the sync, open the changed pages as an admin" |
| Where to send the reader for detail | "The guide's Diagrams section has the keys of each" |

## What it may not say

| May not | Why |
| --- | --- |
| Keys, field kinds, components' attributes, diagram types' keys or budgets | The contract; it changes on the platform and lives in the guide and its catalog |
| A procedure step by step | It belongs on a page; the skill links it |
| What every site shares beyond the fixed rules | The platform explains it itself (its guide, its schemas) |
| This guide's own conventions (its menu groups, its header fields) | They are for the agent writing **here**, in `.agents/skills/` |
| A secret, or a request for one | Everything here is published and read by agents |

## How agents get it

The platform publishes each skill as the repository's slug followed by its
name (`guide` here is `doc-example-guide`), with the front matter's `name`
rewritten to match, under `/.well-known/agent-skills/<name>/SKILL.md`. The
index at `/.well-known/agent-skills/index.json` lists it, with its digest, to
anyone with a key who can read this repository; `/llms.txt` and the MCP
(`skills`, `skill`) point at it. A copy an agent keeps is a snapshot: that is
why the skill points at the live guide.

## Length

`guide` is under 15 lines, and the platform's `doc-writing` 27 (long ones). Keep a served skill under a screen or two:
if it grows, something in it belongs on a page.
