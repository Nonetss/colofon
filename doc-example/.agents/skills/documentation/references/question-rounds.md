# Question rounds

To finish documenting a whole section (repository, catalog…) in one go, run a
**question round**: whoever writes (a person or an agent) prepares the
questions, whoever knows the topic answers them roughly, and the writer moves
the answers into the pages. It closes a section in one sitting instead of open
question by open question.

With Claude Code, **`/doc:questions <section>`** (for example
`/doc:questions publishing`) writes the questions. Once they are answered,
**`/doc:questions`** again moves the answers into the pages.

## How it works

1. **Review the section.** Read its pages, their `open_questions` and any
   "_Pending…_" line in the text, and search the rest of `docs/` and
   `catalogo/` for what is already answered, so it is not asked again.
2. **Write the questions** in `questions.md` at the repository root (not under
   `docs/`: it is not documentation). Three lines of instructions on top, then
   the questions grouped by topic, the most common need going first. Each
   question in bold, with an empty `>` line under it for the answer:

   ```markdown
   # Questions: Publishing

   Answer under each one, roughly. If you don't know or don't care, write
   "don't know" or "doesn't matter" and it will be dropped. If someone else
   owns it, write their name.

   ## 1. Hosted repositories

   1. **Restoring one.** If the platform loses a hosted repository's history,
      how is it brought back? Paste the backup command you use.

      >
   ```

3. **Answer** under each `>`, however it comes: loose sentences, terminal
   output pasted as is, or the path of a screenshot left at the repository
   root.
4. **Move the answers into the pages:**
   - Each answer goes to the page it belongs to, written cleanly and without
     naming who answered.
   - **The open question is closed completely**: removed from the header and
     the text, with no leftover turned into a new open question.
   - **A blank answer, or "doesn't matter" / "don't know", closes it too**, and
     it is never asked again.
   - **"Someone else owns it"** becomes one line saying who runs it, and
     nothing more.
   - When an answer can be read two ways, write the most sensible reading and
     say which one was chosen, so it can be corrected.
   - Screenshots go to the `img/` folder next to the page that uses them.
5. **Close the section.** When it has no open questions left, check that every
   YAML still validates and delete `questions.md`.

## What to ask and what not

This guide is for whoever writes documentation next, **not a review of the
platform**. Ask **what the platform does and how something is done**, not
whether it is done right.

| Ask | Don't ask |
| --- | --- |
| What the platform does in a case the page doesn't cover: a broken file, an edge of the format | How the platform's code does it |
| How something is done: registering a repository, setting up the editor | What can be read in another page or in the catalog |
| Where something is: an admin screen, a setting, a file | Plans and features that don't exist yet |
| What an option is for, when its name doesn't tell | Opinions on how the format should be |

Also:

- **Few, specific questions** (around 15 at most), each with just enough
  context to answer without opening the page.
- **If a fact comes out of a command, ask for the command's output**, not for
  an interpretation of it.
- **What can be looked up in another page or the catalog is looked up**, not
  asked.
- **Never ask for a secret's value.** Ask where it is stored and which account
  uses it.

## Related

- `open_questions` is a header field this site declares in `doc.config.yaml`
  (`doc-config.md`); how pages fill it: `docs` skill, `references/header.md`.
- Closing the round means validating what you touched: `validation.md`.
- `/doc:questions` is `.agents/commands/doc/questions.md` (the folder is
  symlinked from `.claude/commands/doc`); it defers to this file.
