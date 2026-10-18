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
.vscode/settings.json    # the platform's schema catalog for the editor
README.md
```

All of the above is relative to the **content root**: the top of the
repository, or the folder it is registered with.

Which sections, types, diagrams and styles this site has: the tree itself,
its declarations and `AGENTS.md`, «Este sitio».

A site's repository holds no skills for the agent that writes it: the
`colofon-*` writing skills are installed from the platform (below). Only
`doc-example`, inside the platform's repository, holds them, in
`.agents/skills/colofon-*/` (linked from `.claude/skills/`), because it is
their source.

## In a code repository

The documentation of a project can live inside the project's own repository
instead of a repository of its own. Put the whole tree above in one folder
(`docs/` is the usual one) and register the repository with that folder as
its **content folder**:

```
src/ ...                         # the project's code
docs/                            # ← the content folder: type `docs`
├── doc.config.yaml
├── menu.yaml
├── docs/index.mdx               # the home (the folder docs/ inside it)
├── catalog/
└── diagrams/
```

- The platform still clones the whole repository; it reads only the content
  folder. Files outside it (code, the project's own `README.md`,
  `.github/`) are never read and never reported.
- The folder is a plain relative path (`docs`, `site/docs`): no `..`, no
  leading `/`, no segment that starts with a dot. In the platform's form it
  is a select of the folders holding a `doc.config.yaml` at the chosen
  branch, so commit and push the site before registering it.
- Editor settings go where the editor opens the repository: the schema
  catalog is the same, and the `json.schemas` entry for diagrams must match
  at any depth (`**/diagrams/*.json`), see the guide's `publishing/editor`
  page.
- `AGENTS.md` and `CLAUDE.md` of the project stay where the project has them;
  the site's own conventions, «Este sitio», go in the one that already
  exists, under their own heading.

## Where does it go?

| You have… | It goes in | Skill |
| --- | --- | --- |
| An explanation, a procedure, a decision | A page in `docs/<section>/` | `colofon-docs` |
| Facts that repeat with the same shape (machines, services, files…) | An entity in `catalog/<type>/` | `colofon-catalog` |
| How things connect, a flow, values to compare | A file in `diagrams/` shown with `<Diagram>` | `colofon-diagrams` |
| A new page or folder the sidebar must show | An entry in `menu.yaml` | `references/menu.md` |
| A new field every page header may carry | `header` in `doc.config.yaml` | `references/doc-config.md` |
| Another colour, font or look for a piece of the site's pages | A theme variable or a module in `styles/` | `colofon-styles` |
| What agents that read the site should know about the documented project | A served skill in `skills/<name>/` | `colofon-skills` |
| A convention of this site for **you**, the agent writing here | `AGENTS.md`, «Este sitio» | — |
| An image a page shows | `docs/<section>/img/` next to the page | `colofon-docs` |
| Unanswered questions for a round | `questions.md` at the content root, temporarily | `references/question-rounds.md` |

## The writing skills

- The `colofon-*` skills are the platform's: it serves them at
  `/.well-known/agent-skills/` (the ones with `references/` as `.tar.gz`
  archives), and the setup prompt on its `/me/skills` page installs them for
  the whole user. Never copy them into a site's repository or edit an installed
  copy; a problem with one goes to the user, to be fixed in
  `doc-example/.agents/skills/`.
- Running the setup again refreshes them when the platform's index shows
  another digest.
- The site's own conventions go in `AGENTS.md`, «Este sitio».
- `CLAUDE.md` only imports `AGENTS.md`: never add instructions to it.

## Naming

- Files and folders: lowercase, digits and hyphens (`getting-started.mdx`).
  They are the URL and the path other pages link to.
- Pages, entities, diagrams and served skills have their own naming rules in
  their folder's skill (`colofon-docs`, `colofon-catalog`, `colofon-diagrams`, `colofon-styles`, `colofon-skills`),
  and the site may narrow them in `AGENTS.md`, «Este sitio» (an entity's id
  is the hostname, a diagram's id starts with its area…).
- Which names are the contract's and can't change: `contract-names.md`.
- The menu, its groups and its entries: `menu.md`.
