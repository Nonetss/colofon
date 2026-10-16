import { afterEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { gzipSync } from "node:zlib"
import {
  createGitHttpHandler,
  ensureBareRepo,
  HOSTED_DIR,
  hostedFolder,
} from "#git/hosting"
import { git } from "#tests/fixtures/git-remote"

const cleanups: (() => Promise<void>)[] = []

afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup()
})

async function tempFolder(): Promise<string> {
  const folder = await mkdtemp(path.join(tmpdir(), "content-hosted-"))
  cleanups.push(() => rm(folder, { recursive: true, force: true }))
  return folder
}

type Server = {
  /** The git URL of `slug` on this server. */
  urlOf: (slug: string) => string
  /** Slugs whose push ended, in order. */
  pushes: string[]
  /** Slugs `resolve` was asked about, in order. */
  resolved: string[]
}

/**
 * Serves `repositories` (slug → bare folder) with the git HTTP handler on a
 * random port; any other slug resolves to nothing.
 */
function serve(repositories: Record<string, string>): Server {
  const pushes: string[] = []
  const resolved: string[] = []
  const handler = createGitHttpHandler({
    resolve: async (slug) => {
      resolved.push(slug)
      return repositories[slug]
    },
    onPush: (slug) => pushes.push(slug),
  })
  const server = Bun.serve({ port: 0, fetch: handler })
  cleanups.push(() => server.stop(true))
  return {
    urlOf: (slug) => `http://localhost:${server.port}/git/${slug}.git`,
    pushes,
    resolved,
  }
}

/** A hosted bare repository with HEAD at `ref`, in a temp folder. */
async function bareRepo(ref = "main"): Promise<string> {
  const folder = path.join(await tempFolder(), "repo-id")
  await ensureBareRepo(folder, ref)
  return folder
}

/** A work tree with one commit of `files` on `branch`, pointing at `url`. */
async function workTree(
  url: string,
  files: Record<string, string>,
  branch = "main"
): Promise<string> {
  const work = await tempFolder()
  await git(work, ["init", "--quiet", `--initial-branch=${branch}`])
  await git(work, ["remote", "add", "origin", url])
  await commit(work, files)
  return work
}

async function commit(work: string, files: Record<string, string>) {
  for (const [file, text] of Object.entries(files)) {
    await writeFile(path.join(work, file), text)
  }
  await git(work, ["add", "--all"])
  await git(work, ["commit", "--quiet", "-m", "content"])
}

async function headOf(work: string): Promise<string> {
  return (await git(work, ["rev-parse", "HEAD"])).trim()
}

/** Waits for the push callbacks of the server, which run after git exits. */
async function settled(server: Server, pushes: number) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.pushes.length >= pushes) return
    await Bun.sleep(10)
  }
}

describe("hosted folders", () => {
  test("each hosted repository hangs from the hosted root by its id", () => {
    expect(hostedFolder(`/app/${HOSTED_DIR}`, "repo-id")).toBe(
      "/app/.hosted/repo-id"
    )
  })

  test("a new bare repository points its HEAD at the ref", async () => {
    const folder = await bareRepo("produccion")

    expect(await git(folder, ["symbolic-ref", "HEAD"])).toBe(
      "refs/heads/produccion\n"
    )
    expect(await git(folder, ["rev-parse", "--is-bare-repository"])).toBe(
      "true\n"
    )
  })

  test("an existing bare repository is kept as it is", async () => {
    const folder = await bareRepo("main")
    await ensureBareRepo(folder, "otra")

    expect(await git(folder, ["symbolic-ref", "HEAD"])).toBe(
      "refs/heads/main\n"
    )
  })
})

describe("createGitHttpHandler", () => {
  test("a push is stored and a clone gets it, checking out HEAD's branch", async () => {
    const server = serve({ manual: await bareRepo("produccion") })
    const work = await workTree(
      server.urlOf("manual"),
      { "a.yaml": "x: 1\n" },
      "produccion"
    )
    await git(work, ["push", "--quiet", "origin", "produccion"])

    const clone = path.join(await tempFolder(), "clone")
    await git(tmpdir(), ["clone", "--quiet", server.urlOf("manual"), clone])

    expect(await headOf(clone)).toBe(await headOf(work))
    expect(await git(clone, ["branch", "--show-current"])).toBe("produccion\n")
  })

  test("a fetch over an existing clone gets the new commits", async () => {
    const server = serve({ manual: await bareRepo() })
    const work = await workTree(server.urlOf("manual"), { "a.yaml": "x: 1\n" })
    await git(work, ["push", "--quiet", "origin", "main"])
    const clone = path.join(await tempFolder(), "clone")
    await git(tmpdir(), ["clone", "--quiet", server.urlOf("manual"), clone])

    await commit(work, { "b.yaml": "y: 2\n" })
    await git(work, ["push", "--quiet", "origin", "main"])
    await git(clone, ["pull", "--quiet", "--ff-only"])

    expect(await headOf(clone)).toBe(await headOf(work))
  })

  test("a force push rewrites the branch", async () => {
    const server = serve({ manual: await bareRepo() })
    const work = await workTree(server.urlOf("manual"), { "a.yaml": "x: 1\n" })
    await commit(work, { "b.yaml": "y: 2\n" })
    await git(work, ["push", "--quiet", "origin", "main"])

    await git(work, ["reset", "--quiet", "--hard", "HEAD~1"])
    await commit(work, { "c.yaml": "z: 3\n" })
    await git(work, ["push", "--quiet", "--force", "origin", "main"])

    const remote = await git(tmpdir(), ["ls-remote", server.urlOf("manual")])
    expect(remote).toContain(`${await headOf(work)}\trefs/heads/main`)
  })

  test("ls-remote lists the pushed branches", async () => {
    const server = serve({ manual: await bareRepo() })
    const work = await workTree(server.urlOf("manual"), { "a.yaml": "x: 1\n" })
    await git(work, ["push", "--quiet", "origin", "main", "main:borrador"])

    const remote = await git(tmpdir(), [
      "ls-remote",
      "--heads",
      server.urlOf("manual"),
    ])
    expect(remote).toContain("refs/heads/borrador")
    expect(remote).toContain("refs/heads/main")
  })

  test("every successful push is reported once, a clone never", async () => {
    const server = serve({ manual: await bareRepo() })
    const work = await workTree(server.urlOf("manual"), { "a.yaml": "x: 1\n" })
    await git(work, ["push", "--quiet", "origin", "main"])
    await settled(server, 1)
    const clone = path.join(await tempFolder(), "clone")
    await git(tmpdir(), ["clone", "--quiet", server.urlOf("manual"), clone])
    await commit(work, { "b.yaml": "y: 2\n" })
    await git(work, ["push", "--quiet", "origin", "main"])
    await settled(server, 2)
    // Room for a stray report of the clone to arrive before asserting.
    await Bun.sleep(50)

    expect(server.pushes).toEqual(["manual", "manual"])
  })

  test("a gzip-encoded upload-pack request is understood", async () => {
    const server = serve({ manual: await bareRepo() })
    const work = await workTree(server.urlOf("manual"), { "a.yaml": "x: 1\n" })
    await git(work, ["push", "--quiet", "origin", "main"])
    const want = await headOf(work)
    const wantLine = `want ${want}\n`
    const body = `${(wantLine.length + 4).toString(16).padStart(4, "0")}${wantLine}00000009done\n`

    const response = await fetch(`${server.urlOf("manual")}/git-upload-pack`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-git-upload-pack-request",
        "Content-Encoding": "gzip",
      },
      body: gzipSync(body),
    })

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe(
      "application/x-git-upload-pack-result"
    )
    expect(await response.text()).toStartWith("0008NAK\n")
  })

  test("the advertisement opens with the service line", async () => {
    const server = serve({ manual: await bareRepo() })

    const response = await fetch(
      `${server.urlOf("manual")}/info/refs?service=git-receive-pack`
    )

    expect(response.headers.get("content-type")).toBe(
      "application/x-git-receive-pack-advertisement"
    )
    expect(await response.text()).toStartWith(
      "001f# service=git-receive-pack\n0000"
    )
  })

  test("a slug that resolves to nothing is a 404 and no push is reported", async () => {
    const server = serve({})
    const work = await workTree(server.urlOf("no-existe"), { "a.yaml": "" })

    await expect(
      git(work, ["push", "--quiet", "origin", "main"])
    ).rejects.toThrow()
    const response = await fetch(
      `${server.urlOf("no-existe")}/info/refs?service=git-upload-pack`
    )
    expect(response.status).toBe(404)
    expect(server.resolved).toContain("no-existe")
    expect(server.pushes).toEqual([])
  })

  test("other services, methods and paths are a 404 without resolving", async () => {
    const server = serve({ manual: await bareRepo() })
    const base = server.urlOf("manual")

    const responses = await Promise.all([
      fetch(`${base}/info/refs?service=git-upload-archive`),
      fetch(`${base}/info/refs`),
      fetch(`${base}/HEAD`),
      fetch(`${base}/objects/info/packs`),
      fetch(`${base}/git-upload-pack`),
      fetch(`${base}/info/refs?service=git-upload-pack`, { method: "POST" }),
      fetch(`${base.replace("/git/", "/")}/info/refs?service=git-upload-pack`),
    ])

    expect(responses.map((response) => response.status)).toEqual([
      404, 404, 404, 404, 404, 404, 404,
    ])
    expect(server.resolved).toEqual([])
  })
})
