import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

/** A bare repository in a temp folder, reachable at `url`, fed by `commit`. */
export type GitRemote = {
  url: string
  /** Writes `files` into the work tree, commits them on main and pushes. */
  commit: (files: Record<string, string>) => Promise<void>
  /** Tags main's current commit and pushes the tag. */
  tag: (name: string) => Promise<void>
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
    commit: async (files) => {
      for (const [file, text] of Object.entries(files)) {
        const target = path.join(work, file)
        await mkdir(path.dirname(target), { recursive: true })
        await writeFile(target, text)
      }
      await git(work, ["add", "--all"])
      await git(work, ["commit", "--quiet", "-m", "content"])
      await git(work, ["push", "--quiet", "origin", "main"])
    },
    tag: async (name) => {
      await git(work, ["tag", name])
      await git(work, ["push", "--quiet", "origin", name])
    },
    remove: () => rm(base, { recursive: true, force: true }),
  }
}

/** Runs git in `cwd` with a fixed identity, failing loudly. */
export async function git(cwd: string, args: string[]): Promise<string> {
  const child = Bun.spawn(
    ["git", "-c", "user.name=test", "-c", "user.email=test@test", ...args],
    {
      cwd,
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
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
