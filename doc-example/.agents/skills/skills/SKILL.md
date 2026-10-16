---
name: skills
description: The skills/ folder of this content repository, the skills the doc platform serves to other agents working on any content repository (not the ones for you, which live in .agents/skills/). A guide to what this site serves (guide), the served-skill format (Agent Skills front matter, thin, what it may and may not say, how the platform validates and publishes it), and keeping it current with the guide and the platform. Use before writing or changing a served skill, and when a rule a served skill states changes on the platform or in the guide.
---

# Served skills (`skills/`)

`skills/<name>/SKILL.md` are skills the platform hands to **other agents**,
so they know how to work with this site from any project. They are not for
you: the skills for **you**, the agent writing here, live in
`.agents/skills/`. What a served skill is and how it is written is explained
in the guide, `docs/publishing/agents.mdx`. This site serves one:

| Skill | For |
| --- | --- |
| `skills/guide/SKILL.md` | Any agent that needs to know where this guide explains a part of the contract |

How to write a content repository in general is not this site's skill any
more: the platform serves `doc-writing` (and `colofon`, how to use a site)
to every agent itself.

## 1. Philosophy

**A served skill says how to work and where to look, never what there is.**

- A downloaded skill is a **snapshot that goes stale**; the guide is read
  live (`/llms.txt`, each page's `llm.txt`). Everything that can change lives
  in the guide.
- What stays in the skill is **what never changes**: the rules that, broken,
  make the content fail whatever the version.
- It is **short enough to read whole** before every task. Every line it adds
  is a line that can go out of date.

## 2. Where to look

| Task | Read |
| --- | --- |
| The format: front matter, folder, what a served skill may and may not say | [served-skill-format.md](references/served-skill-format.md) |

## 3. Always true

- **Thin:** it sends agents to read the guide live (`llms.txt`, each page's
  `llm.txt`) and keeps only the rules that never change. It never copies the
  contract, which goes stale.
- **Points at pages** instead of copying procedures.
- **Only what is specific to the site**: what every site shares, the
  platform explains itself.
- Front matter with `name` and `description`; the description says **when to
  use it**.
- When a rule it states changes on the platform (the components, YAML winning
  over MDX, icon names), **update it in the same change as the guide's page**.
- **No secret, and no asking a person for one.**
- English, like every skill; contract names and UI words quoted as they are.

## 4. Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| Copying keys tables, field kinds or diagram types into it | The copy goes stale; the agent trusts it over the live guide |
| A procedure written out step by step | Link the page; the procedure changes there |
| Rules about this guide's own conventions (menu groups, `files:` headers) | Those are for **you** (`.agents/skills/`), not for agents on other sites |
| A description that says what it is, not when to use it | Agents load skills by their description; they never load this one |
| Asking the person for a password or token | Served skills never handle secrets; say where they live |
| A served skill for what the platform's `doc-writing` or `colofon` already cover | Two snapshots to keep in step |

## 5. Before finishing

- The front matter has `name` (the folder name) and a `description` that
  says when to use it.
- Every rule it states is still true on the platform and matches the guide's
  page that explains it.
- Nothing in it is a copy of something the guide holds (a table, a list of
  keys, a procedure).
- No secret, and nothing that asks for one.
