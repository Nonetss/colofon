# Layout

What goes where in a content repository. The contract behind every file is
explained in the guide's `repository` page, and listed in its
`catalog/files` table.

```
doc.config.yaml          # the site: name, contract version, extra header fields
menu.yaml                # the sidebar's groups
docs/
├── index.mdx            # the home
├── <page>.mdx           # a page at the top level
└── <section>/           # a section: index.mdx plus its pages (and img/)
catalog/
└── <type>/              # one folder per type the site declares
    ├── _type.yaml       # its declaration
    └── <id>.yaml        # one entity per file
diagrams/
├── <id>.json            # a diagram, drawn by hand or of a type
└── <id>.svg             # an illustration drawn by hand
styles/
└── <module>.css         # optional: the site's own styles, one file per module
skills/
└── <name>/SKILL.md      # optional: served to agents that read the site
AGENTS.md                # for you: the rules and «Este sitio»
CLAUDE.md                # only @AGENTS.md
.agents/skills/          # for you: the common skills (linked from .claude/skills/)
├── documentation/       # the repository as a whole: this skill
├── docs/                # one skill per content folder
├── catalog/
├── diagrams/
├── styles/
└── skills/
.agents/commands/doc/    # the common /doc:<name> commands (linked from .claude/commands/doc)
├── questions.md         # question rounds
├── pending.md           # what is still open or stale
├── check.md, review.md  # what the platform would report; how well a file follows the conventions
└── new-page.md, diagram.md # write a page, draw a diagram
.vscode/settings.json    # the platform's schema catalog for the editor
README.md
```

Which sections, types, diagrams and styles this site has: the tree itself,
its declarations and `AGENTS.md`, «Este sitio».

## Where does it go?

| You have… | It goes in | Skill |
| --- | --- | --- |
| An explanation, a procedure, a decision | A page in `docs/<section>/` | `docs` |
| Facts that repeat with the same shape (machines, services, files…) | An entity in `catalog/<type>/` | `catalog` |
| How things connect, a flow, values to compare | A file in `diagrams/` shown with `<Diagram>` | `diagrams` |
| A new page or folder the sidebar must show | An entry in `menu.yaml` | `references/menu.md` |
| A new field every page header may carry | `cabecera` in `doc.config.yaml` | `references/doc-config.md` |
| Another colour, font or look for a piece of the site's pages | A theme variable or a module in `styles/` | `styles` |
| What agents that read the site should know about the documented project | A served skill in `skills/<name>/` | `skills` |
| A convention of this site for **you**, the agent writing here | `AGENTS.md`, «Este sitio» | — |
| An image a page shows | `docs/<section>/img/` next to the page | `docs` |
| Unanswered questions for a round | `questions.md` at the root, temporarily | `references/question-rounds.md` |

## The common skills

- `.agents/` is the same in every colofon content repository and is copied
  unchanged from the template (`doc-example`). Never edit, add or remove a
  skill or command there in a site's repository; a problem with one goes to
  the user, to be fixed in the template.
- Skills live in `.agents/skills/<name>/`; `.claude/skills/<name>` is a
  symlink to `../../.agents/skills/<name>`. `.claude/commands/doc` links to
  `../../.agents/commands/doc`.
- The site's own conventions go in `AGENTS.md`, «Este sitio».
- `CLAUDE.md` only imports `AGENTS.md`: never add instructions to it.

## Naming

- Files and folders: lowercase, digits and hyphens (`getting-started.mdx`).
  They are the URL and the path other pages link to.
- Pages, entities, diagrams and served skills have their own naming rules in
  their folder's skill (`docs`, `catalog`, `diagrams`, `styles`, `skills`),
  and the site may narrow them in `AGENTS.md`, «Este sitio» (an entity's id
  is the hostname, a diagram's id starts with its area…).
- Which names are the contract's and can't change: `contract-names.md`.
- The menu, its groups and its entries: `menu.md`.
