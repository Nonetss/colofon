import { mkdir, stat } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { spawnGit } from "#git/run"

// The platform as a git server: one bare repository per hosted content
// repository, served over git's smart HTTP protocol by running git's own
// services with --stateless-rpc. Nothing here authenticates: every hosted
// repository can be cloned and pushed by whoever reaches the endpoint.

/** Folder, under the repo root, holding one bare repository per hosted one. */
export const HOSTED_DIR = ".hosted"

const INIT_TIMEOUT_MS = 10_000

/** The bare repository folder of the hosted repository with `id`. */
export function hostedFolder(hostedRoot: string, id: string): string {
  return path.join(hostedRoot, id)
}

/**
 * Creates an empty bare repository at `folder`, its HEAD pointing at `ref`,
 * unless one is already there.
 */
export async function ensureBareRepo(folder: string, ref: string) {
  if (await isFile(path.join(folder, "HEAD"))) return
  await mkdir(folder, { recursive: true })
  // Outside any checkout, so git never reads this platform's own repo.
  await spawnGit(
    ["init", "--quiet", "--bare", `--initial-branch=${ref}`, folder],
    {
      cwd: tmpdir(),
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
      timeoutMs: INIT_TIMEOUT_MS,
    }
  )
}

async function isFile(file: string): Promise<boolean> {
  try {
    return (await stat(file)).isFile()
  } catch {
    return false
  }
}

const SERVICES = ["git-upload-pack", "git-receive-pack"] as const

type GitService = (typeof SERVICES)[number]

function isService(value: string | null | undefined): value is GitService {
  return SERVICES.some((service) => service === value)
}

/** `/git/<slug>.git/<info/refs | service>`, the only paths served. */
const ROUTE = /^\/git\/([a-z0-9-]+)\.git\/(info\/refs|git-[a-z-]+)$/

export type GitHttpOptions = {
  /**
   * The bare repository folder of the hosted repository named `slug`, or
   * `undefined` when there is none: the request is then answered 404.
   */
  resolve: (slug: string) => Promise<string | undefined>
  /** Called once a push to `slug` has ended successfully. */
  onPush: (slug: string) => void
  /** Called with git's stderr when a service fails. */
  onError?: (slug: string, message: string) => void
}

export type GitHttpHandler = (request: Request) => Promise<Response>

/**
 * A fetch handler for git's smart HTTP protocol under `/git/<slug>.git`:
 * the ref advertisement (`GET info/refs?service=`) and the fetch and push
 * services (`POST git-upload-pack`, `POST git-receive-pack`). Anything else,
 * the dumb protocol included, is a 404.
 */
export function createGitHttpHandler(options: GitHttpOptions): GitHttpHandler {
  return async (request) => {
    const target = routeOf(request)
    if (target === undefined) return notFound()
    const folder = await options.resolve(target.slug)
    if (folder === undefined) return notFound()
    if (target.kind === "advertise") {
      return advertise(folder, target.service)
    }
    return runService(request, folder, target, options)
  }
}

type Target =
  | { kind: "advertise"; slug: string; service: GitService }
  | { kind: "service"; slug: string; service: GitService }

function routeOf(request: Request): Target | undefined {
  const url = new URL(request.url)
  const match = ROUTE.exec(url.pathname)
  if (match === null) return undefined
  const [, slug, action] = match
  if (slug === undefined || action === undefined) return undefined
  if (action === "info/refs") {
    const service = url.searchParams.get("service")
    if (request.method !== "GET" || !isService(service)) return undefined
    return { kind: "advertise", slug, service }
  }
  if (request.method !== "POST" || !isService(action)) return undefined
  return { kind: "service", slug, service: action }
}

function notFound() {
  return new Response("Not found", { status: 404 })
}

/** `upload-pack` for `git-upload-pack`: the git subcommand of a service. */
function commandOf(service: GitService): string {
  return service.slice("git-".length)
}

const gitEnv = () => ({ ...process.env, GIT_TERMINAL_PROMPT: "0" })

async function advertise(folder: string, service: GitService) {
  const child = Bun.spawn(
    ["git", commandOf(service), "--stateless-rpc", "--advertise-refs", folder],
    { env: gitEnv(), stdout: "pipe", stderr: "pipe" }
  )
  const [refs, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).bytes(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  if (exitCode !== 0) {
    return new Response(`git ${commandOf(service)} failed: ${stderr.trim()}`, {
      status: 500,
    })
  }
  const header = `${pktLine(`# service=${service}\n`)}0000`
  return new Response(new Blob([header, refs]), {
    headers: {
      "Content-Type": `application/x-${service}-advertisement`,
      "Cache-Control": "no-cache",
    },
  })
}

/** `text` as one pkt-line: its length, header included, in 4 hex digits. */
function pktLine(text: string): string {
  const length = new TextEncoder().encode(text).length + 4
  return `${length.toString(16).padStart(4, "0")}${text}`
}

function requestBody(request: Request): ReadableStream<Uint8Array> | null {
  if (request.body === null) return null
  if (request.headers.get("content-encoding") !== "gzip") return request.body
  return request.body.pipeThrough(new DecompressionStream("gzip"))
}

function runService(
  request: Request,
  folder: string,
  target: Target,
  options: GitHttpOptions
) {
  const child = Bun.spawn(
    ["git", commandOf(target.service), "--stateless-rpc", folder],
    {
      env: gitEnv(),
      stdin: new Response(requestBody(request)),
      stdout: "pipe",
      stderr: "pipe",
    }
  )
  const stderr = new Response(child.stderr).text()
  child.exited.then(async (exitCode) => {
    if (exitCode !== 0) {
      options.onError?.(target.slug, (await stderr).trim())
      return
    }
    if (target.service === "git-receive-pack") options.onPush(target.slug)
  })
  return new Response(child.stdout, {
    headers: {
      "Content-Type": `application/x-${target.service}-result`,
      "Cache-Control": "no-cache",
    },
  })
}
