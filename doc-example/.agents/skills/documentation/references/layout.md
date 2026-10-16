# Layout

What goes where in this repository. The contract behind every file is
explained in `docs/repository/index.mdx`, and each file is an entity of
`catalogo/files/`.

```
doc.config.yaml          # the site: name, contract version, extra header fields
menu.yaml                # the sidebar's groups
docs/
├── index.mdx            # the home
├── getting-started.mdx  # a page at the top level
├── repository/          # a section: index.mdx plus its pages
├── pages/
├── catalog/             # explains the catalog (not catalogo/: that path is reserved)
├── diagrams/
└── publishing/
catalogo/
├── files/               # the files of a content repository
├── field-kinds/         # the kinds of a field
├── header-fields/       # the fields every page header has
├── components/          # the page components
└── diagram-types/       # the diagram types the platform lays out
diagramas/
├── pipeline.json        # from a push to the published site
├── repository.json      # what a repository holds
├── <type>-<topic>.json  # one working example of each diagram type and variant
└── repository-exploded.svg # the illustration example
skills/
└── doc-writing/SKILL.md # served to other agents
.agents/skills/          # for you, the agent writing here (linked from .claude/skills/)
├── documentation/       # the repository as a whole: this skill
├── docs/                # one skill per folder: how this site writes its pages,
├── catalogo/            # its catalog,
├── diagramas/           # its diagrams
└── skills/              # and its served skills
.agents/commands/doc/     # the /doc:<name> commands (linked from .claude/commands/doc)
├── questions.md         # question rounds
├── pending.md           # what is still open or stale
├── check.md, review.md  # what the platform would report; how well a file follows the conventions
├── sync-platform.md     # the guide against the platform's contract
└── new-page.md, diagram.md # write a page, draw a diagram
.vscode/settings.json    # the platform's schema catalog for the editor
AGENTS.md, CLAUDE.md, README.md
```

## Where does it go?

| You have… | It goes in | Skill |
| --- | --- | --- |
| An explanation, a procedure, a rule of the contract | A page in `docs/<topic>/` | `docs` |
| A part of the contract writers need as a table row | An entity in `catalogo/<type>/` | `catalogo` |
| How things connect, a flow, values to compare | A file in `diagramas/` shown with `<Diagram>` | `diagramas` |
| A new page or folder the sidebar must show | An entry in `menu.yaml` | `references/menu.md` |
| A new field every page header may carry | `cabecera` in `doc.config.yaml` | `references/doc-config.md` |
| How another agent should work with any content repository | `skills/doc-writing/SKILL.md` | `skills` |
| A convention for **you**, the agent writing here | The folder's skill in `.agents/skills/`; repository-wide, a reference here | — |
| An image a page shows | `docs/<topic>/img/` next to the page | `docs` |
| Unanswered questions for a round | `questions.md` at the root, temporarily | `references/question-rounds.md` |

## Skills for you

- Skills live in `.agents/skills/<name>/`; `.claude/skills/<name>` is a
  symlink to `../../.agents/skills/<name>`. A new skill goes in
  `.agents/skills/` and gets the same symlink.
- A new convention goes in the skill of the folder it affects; what affects
  the whole repository (root files, the menu, question rounds), in a
  reference of this skill. A new content folder gets its own skill and a row
  in this skill's routing table.
- `CLAUDE.md` only imports `AGENTS.md`: never add instructions to it.

## Naming

- Files and folders: lowercase, digits and hyphens (`getting-started.mdx`).
  They are the URL and the path other pages link to.
- Pages, entities, diagrams and served skills have their own naming rules in
  their folder's skill (`docs`, `catalogo`, `diagramas`, `skills`).
- Which names are the contract's and can't change: `contract-names.md`.
- The menu, its groups and its entries: `menu.md`.
