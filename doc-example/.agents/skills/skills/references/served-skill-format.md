# Served-skill format

The contract is `docs/publishing/agents.mdx` ("Skills servidas") and the
`files/served-skill` entity (`path: skills/<name>/SKILL.md`, `kind: agents`,
not required).

## The file

```
skills/
└── doc-writing/
    └── SKILL.md
```

- One folder per skill under `skills/`; the folder name is the skill's
  `name`: lowercase, digits and hyphens, like every name here.
- This site keeps each served skill to its one `SKILL.md`: it is read whole
  and stays thin, so it has nothing to route to.
- It follows the **Agent Skills** format: YAML front matter, then the
  instructions in Markdown.

```markdown
---
name: doc-writing
description: How to write or change a documentation content repository for the doc platform (pages, menu.yaml, catalog types and entities, diagrams). Use it before creating or editing any file of a content repository, or when a page, entity or diagram is reported as invalid.
---

# Writing documentation for the doc platform

This skill says how to work, not what the contract holds. …
```

| Key | What it is |
| --- | --- |
| `name` | Required. The folder name. |
| `description` | Required. What it covers in one clause, then **when to use it** ("Use it before…, or when…"): agents decide to load it from this line alone. |

## What it may say

| May say | Example in `doc-writing` |
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

Per the guide, the platform serves `skills/<name>/SKILL.md` to agents, next
to the pages' `llm.txt` and the `/llms.txt` indexes, which need the same
credentials as the reader (a session or an `x-api-key` key created in
`/me`). A copy an agent keeps is a snapshot: that is why the skill points at
the live guide.

## Length

`doc-writing` is 27 lines (long ones). Keep a served skill under a screen or two:
if it grows, something in it belongs on a page.
