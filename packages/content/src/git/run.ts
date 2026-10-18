// Running the git CLI: stdout back, stderr in the error, killed after a
// timeout. The callers pass the environment that pins git to one clone.

export type SpawnGitOptions = {
  cwd: string
  env: Record<string, string | undefined>
  timeoutMs: number
}

/** Runs git and returns its stdout, throwing with its stderr on failure. */
export async function spawnGit(
  args: string[],
  options: SpawnGitOptions
): Promise<string> {
  const child = Bun.spawn(["git", ...args], {
    cwd: options.cwd,
    env: options.env,
    stdout: "pipe",
    stderr: "pipe",
    signal: AbortSignal.timeout(options.timeoutMs),
  })
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  if (exitCode !== 0) {
    throw new Error(`git ${args[0]} failed: ${stderr.trim()}`)
  }
  return stdout
}
