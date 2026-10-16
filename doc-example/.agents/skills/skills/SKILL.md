# Served skills (`skills/`)

What a served skill is and how it is written is explained in the guide,
`docs/publishing/agents.mdx`. This site serves one:

| Skill | For |
| --- | --- |
| `skills/doc-writing/SKILL.md` | Any agent writing or fixing a content repository of the platform |

## Keeping it right

- **Thin:** it sends agents to read the guide live (`llms.txt`, each page's
  `llm.txt`) and keeps only the rules that never change. It never copies the
  contract, which goes stale.
- When a rule it states changes on the platform (the components, YAML winning
  over MDX, icon names), update it in the same change as the guide's page.
- Front matter with `name` and `description`; the description says when to
  use it.
- No secret, and no asking a person for one.
