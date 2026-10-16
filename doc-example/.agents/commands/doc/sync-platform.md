---
description: Compare the catalog and the guide with the platform's current contract and list what is missing or out of date
argument-hint: "[type] (files, field-kinds, header-fields, components, diagram-types; nothing for all)"
---

Check this guide against what the platform reads today. The rules are in the
`catalog` skill, `references/keeping-in-step.md`: where each type's truth
lives on the platform and what each kind of change means here. Load the
`documentation` and `catalog` skills and read that reference first.

Scope: the catalog type in `$ARGUMENTS`, otherwise every type in the
reference's table.

## Find the platform

The source is the platform's `packages/content/src/`. When this repository is
checked out inside the platform's (as a subtree), it is
`../packages/content/src/`; otherwise ask me for the path. Read the code to
check facts; never edit it.

## Phase 1: report

1. For each type in scope, follow "Checking a type against the platform":
   list the entities, list what the platform has, and pair them.
2. Then compare every field value (attributes, enum values, budgets,
   variants, keys) of each pair with the code.
3. For each difference, find what else the reference says must change: the
   page that explains it, the headers that cite it, a diagram type's family
   section, `<type>-<topic>` example and `diagrams` reference, and
   `skills/doc-writing/SKILL.md` when a rule it states changed.
4. Reply with one table per type: what the platform has that the guide
   lacks, what the guide has that the platform dropped, and what differs,
   each with the files it would touch. Do not edit anything in this phase.

## Phase 2: apply (only when I say so)

1. Apply the changes I approve, following "What a platform change means
   here" and the folder skills of every folder you touch.
2. Bump `actualizado` on every entity you checked, changed or not, and on
   every page you checked against the code.
3. Check what you touched as `/doc:check` does, then reply with what changed and
   anything you could not settle from the code (as an `open_questions` entry
   on its page, not a guess).
