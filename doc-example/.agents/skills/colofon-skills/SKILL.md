---
name: skills
description: The skills/ folder of a doc platform content repository, the skills the platform serves to other agents so they can work with the project this site documents (not the ones for you, which live in .agents/skills/). A guide to what a served skill is for, its format (Agent Skills front matter, thin, what it may and may not say, how the platform validates and publishes it), and keeping it current with the pages it points at. Use before writing or changing a served skill, and when a page or rule a served skill points at changes.
---

# Served skills (`skills/`)

`skills/<name>/SKILL.md` are skills the platform hands to **other agents**,
so they know how to work with **the project this site documents** (a
homelab, a product, a team's procedures) from any project. They are not for
you: the skills for **you**, the agent writing here, live in `.agents/skills/`
and are the same in every content repository. Served skills are what varies
from one site to another. What a served skill is and how it is written is
explained in the guide's `publishing/agents` page. The site's served skills
are whatever `skills/` holds (`ls skills/`); what each is for is its
`description`.

How to write a content repository in general, and how to use a site, are
not a site's skills: the platform serves `doc-writing` and `colofon` to
every agent itself.

## 1. Philosophy

**A served skill says how to work and where to look, never what there is.**

- A downloaded skill is a **snapshot that goes stale**; the site's pages
  are read live (`/llms.txt`, each page's `llm.txt`, the MCP). Everything
  that can change lives in the pages.
- What stays in the skill is **what never changes**: the rules that, broken,
  make the content fail whatever the version.
- It is **short enough to read whole** before every task. Every line it adds
  is a line that can go out of date.

## 2. Where to look

| Task | Read |
| --- | --- |
| The format: front matter, folder, what a served skill may and may not say | [served-skill-format.md](references/served-skill-format.md) |

## 3. Always true

- **Thin:** it sends agents to read the site's pages live (`llms.txt`, each
  page's `llm.txt`, the MCP) and keeps only the rules that never change. It
  never copies a page or the catalog, which go stale.
- **Points at pages** instead of copying procedures.
- **Only what is specific to the project**: what every site shares, the
  platform explains itself.
- Front matter with `name` and `description`; the description says **when to
  use it**.
- When a rule it states changes (on a page of the site, or on the platform),
  **update it in the same change as the page that states it**.
- **No secret, and no asking a person for one.**
- English, like every skill; contract names and UI words quoted as they are.

## 4. Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| Copying tables, inventories or catalog data into it | The copy goes stale; the agent trusts it over the live pages |
| A procedure written out step by step | Link the page; the procedure changes there |
| Rules about how this repository is written (menu groups, header fields) | Those are for the agent writing here (`AGENTS.md` «Este sitio»), not for agents using the project |
| A description that says what it is, not when to use it | Agents load skills by their description; they never load this one |
| Asking the person for a password or token | Served skills never handle secrets; say where they live |
| A served skill for what the platform's `doc-writing` or `colofon` already cover | Two snapshots to keep in step |

## 5. Before finishing

- The front matter has `name` (the folder name) and a `description` that
  says when to use it.
- Every rule it states is still true and matches the page that explains it.
- Nothing in it is a copy of something a page or the catalog holds (a table,
  a list, a procedure).
- No secret, and nothing that asks for one.
