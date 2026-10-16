import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

/** A bare repository in a temp folder, reachable at `url`, fed by `commit`. */
export type GitRemote = {
  url: string
  /**
   * Writes `files` into the work tree, commits them on main and pushes;
   * `date` (ISO 8601) dates the commit, now when left out.
   */
  commit: (files: Record<string, string>, date?: string) => Promise<void>
  /** Moves the file `from` to `to`, commits on main and pushes. */
  move: (from: string, to: string, date?: string) => Promise<void>
  /** Tags main's current commit and pushes the tag. */
  tag: (name: string) => Promise<void>
  /** Pushes main's current commit as a new branch. */
  branch: (name: string) => Promise<void>
  remove: () => Promise<void>
}

export async function createGitRemote(): Promise<GitRemote> {
  const base = await mkdtemp(path.join(tmpdir(), "content-remote-"))
  const bare = path.join(base, "remote.git")
  const work = path.join(base, "work")
  await git(base, ["init", "--quiet", "--bare", "--initial-branch=main", bare])
  await git(base, ["init", "--quiet", "--initial-branch=main", work])
  await git(work, ["remote", "add", "origin", bare])

  return {
    url: `file://${bare}`,
    commit: async (files, date) => {
      for (const [file, text] of Object.entries(files)) {
        const target = path.join(work, file)
        await mkdir(path.dirname(target), { recursive: true })
        await writeFile(target, text)
      }
      await git(work, ["add", "--all"])
      await commitAndPush(work, date)
    },
    move: async (from, to, date) => {
      await mkdir(path.dirname(path.join(work, to)), { recursive: true })
      await git(work, ["mv", from, to])
      await commitAndPush(work, date)
    },
    tag: async (name) => {
      await git(work, ["tag", name])
      await git(work, ["push", "--quiet", "origin", name])
    },
    branch: async (name) => {
      await git(work, ["push", "--quiet", "origin", `main:refs/heads/${name}`])
    },
    remove: () => rm(base, { recursive: true, force: true }),
  }
}

async function commitAndPush(work: string, date: string | undefined) {
  await git(work, ["commit", "--quiet", "-m", "content"], dateEnv(date))
  await git(work, ["push", "--quiet", "origin", "main"])
}

function dateEnv(date: string | undefined): Record<string, string> {
  if (date === undefined) return {}
  return { GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date }
}

/** Runs git in `cwd` with a fixed identity, failing loudly. */
export async function git(
  cwd: string,
  args: string[],
  env: Record<string, string> = {}
): Promise<string> {
  const child = Bun.spawn(
    ["git", "-c", "user.name=test", "-c", "user.email=test@test", ...args],
    {
      cwd,
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0", ...env },
      stdout: "pipe",
      stderr: "pipe",
    }
  )
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  if (exitCode !== 0) throw new Error(`git ${args.join(" ")}: ${stderr}`)
  return stdout
}
