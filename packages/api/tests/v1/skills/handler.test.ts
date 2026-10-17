import { afterEach, describe, expect, mock, test } from "bun:test"
import { createHash } from "node:crypto"
import {
  CONTENT_SITE,
  createContentFolder,
  memoryRepositoryStore,
  storedRepository,
} from "#tests/fixtures/content"
import {
  adminContext,
  anonymousContext,
  userContext,
} from "#tests/fixtures/context"
import { expectErrorCode } from "#tests/fixtures/errors"
import { gitSourceOf } from "#v1/content/hosting"
import { createContentReader, type StoredRepository } from "#v1/content/reader"
import { createSkillsHandler } from "#v1/skills/handler"

const cleanups: (() => Promise<void>)[] = []

afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup()
})

const casa = storedRepository({ id: "repo-casa", slug: "casa", name: "Casa" })
const trabajo = storedRepository({
  id: "repo-trabajo",
  slug: "trabajo",
  name: "Trabajo",
})

function skill(name: string, description: string): string {
  return `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n`
}

const PLATFORM: Record<string, string> = {
  "platform/skills/colofon/SKILL.md": skill("colofon", "Cómo usar el sitio."),
  "platform/skills/casa-deploy/SKILL.md": skill("casa-deploy", "Choca."),
  "writing/skills/colofon-docs/SKILL.md": skill(
    "colofon-docs",
    "Cómo escribir páginas."
  ),
  "writing/skills/colofon-docs/references/header.md": "# La cabecera\n",
}

function inClone(repository: StoredRepository, files: Record<string, string>) {
  return Object.fromEntries(
    Object.entries({ ...CONTENT_SITE, ...files }).map(([file, text]) => [
      `${repository.id}/${file}`,
      text,
    ])
  )
}

/** A skills handler over clones of `repositories` and a platform folder. */
async function setup(
  repositories: StoredRepository[],
  files: Record<string, string>
) {
  const root = await createContentFolder({ ...PLATFORM, ...files })
  cleanups.push(root.remove)
  const store = memoryRepositoryStore(repositories)
  const reader = createContentReader({
    cloneRoot: root.root,
    repositories: store,
    resolveSource: (stored) => gitSourceOf(stored, "/nonexistent/hosted"),
    logger: { info: mock(() => {}), warn: mock(() => {}) },
  })
  return createSkillsHandler({
    reader,
    repositories: store,
    platformRoots: [`${root.root}/platform`, `${root.root}/writing`],
  })
}

function digest(bytes: string | Uint8Array): string {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`
}

const repositoryFiles = {
  ...inClone(casa, {
    "skills/deploy/SKILL.md": skill("deploy", "Cómo se despliega en casa."),
    "skills/red/SKILL.md": skill("red", "La red."),
  }),
  ...inClone(trabajo, {
    "skills/deploy/SKILL.md": skill(
      "deploy",
      "Cómo se despliega en el trabajo."
    ),
  }),
}

/** `trabajo`'s `deploy` as served: only the front matter's name changes. */
const trabajoDeploy =
  "---\nname: trabajo-deploy\ndescription: Cómo se despliega en el trabajo.\n---\n\n# deploy\n"

describe("skills.list", () => {
  test("without a user, only the platform's skills", async () => {
    const handler = await setup([casa, trabajo], repositoryFiles)
    const { skills } = await handler.list({ context: anonymousContext() })
    expect(skills.map((entry) => entry.name)).toEqual([
      "casa-deploy",
      "colofon",
      "colofon-docs",
    ])
    expect(skills.every((entry) => entry.repository === null)).toBe(true)
  })

  test("with a user, the platform's then each repository's, as <slug>-<name>", async () => {
    const handler = await setup([casa, trabajo], repositoryFiles)
    const { skills } = await handler.list({ context: userContext() })
    expect(
      skills.map((entry) => [entry.name, entry.repository?.slug ?? null])
    ).toEqual([
      ["casa-deploy", null],
      ["colofon", null],
      ["colofon-docs", null],
      ["casa-red", "casa"],
      ["trabajo-deploy", "trabajo"],
    ])
    expect(skills[4]).toEqual({
      name: "trabajo-deploy",
      repository: { slug: "trabajo", name: "Trabajo" },
      description: "Cómo se despliega en el trabajo.",
      type: "skill-md",
      path: "/.well-known/agent-skills/trabajo-deploy/SKILL.md",
      archivePath: null,
      files: [],
      digest: digest(trabajoDeploy),
    })
  })

  test("a published name over 64 characters is left out", async () => {
    const long = "a".repeat(60)
    const handler = await setup(
      [casa],
      inClone(casa, { [`skills/${long}/SKILL.md`]: skill(long, "Larga.") })
    )
    const { skills } = await handler.list({ context: userContext() })
    expect(skills.map((entry) => entry.name)).not.toContain(`casa-${long}`)
  })

  test("a repository without content serves no skill", async () => {
    const handler = await setup([casa, trabajo], inClone(casa, {}))
    const { skills } = await handler.list({ context: userContext() })
    expect(skills.filter((entry) => entry.repository !== null)).toEqual([])
  })
})

describe("skills.get", () => {
  test("is the text the listing's digest covers, with the name rewritten", async () => {
    const handler = await setup([casa, trabajo], repositoryFiles)
    const context = userContext()
    const { skills } = await handler.list({ context })
    const got = await handler.get({
      context,
      input: { name: "trabajo-deploy" },
    })
    expect(got).toEqual({
      name: "trabajo-deploy",
      text: trabajoDeploy,
    })
    const listed = skills.find((entry) => entry.name === "trabajo-deploy")
    expect(listed?.digest).toBe(digest(got.text))
  })

  test("a platform skill is readable without a user, unchanged", async () => {
    const handler = await setup([casa], repositoryFiles)
    const got = await handler.get({
      context: anonymousContext(),
      input: { name: "colofon" },
    })
    expect(got.text).toBe(skill("colofon", "Cómo usar el sitio."))
  })

  test("a content skill without a user, or an unknown name, is NOT_FOUND", async () => {
    const handler = await setup([casa], repositoryFiles)
    await expectErrorCode(
      handler.get({ context: anonymousContext(), input: { name: "casa-red" } }),
      "NOT_FOUND"
    )
    await expectErrorCode(
      handler.get({ context: userContext(), input: { name: "no-existe" } }),
      "NOT_FOUND"
    )
  })

  test("a content skill whose published name is a platform skill's is the platform's", async () => {
    const handler = await setup([casa], repositoryFiles)
    const got = await handler.get({
      context: userContext(),
      input: { name: "casa-deploy" },
    })
    expect(got.text).toBe(skill("casa-deploy", "Choca."))
  })
})

describe("platform skills with files", () => {
  test("a skill with files is an archive whose digest covers the archive", async () => {
    const handler = await setup([], {})
    const context = anonymousContext()
    const { skills } = await handler.list({ context })
    const docs = skills.find((entry) => entry.name === "colofon-docs")
    const archive = await handler.archive({
      context,
      input: { name: "colofon-docs" },
    })
    expect(docs).toMatchObject({
      type: "archive",
      path: "/.well-known/agent-skills/colofon-docs/SKILL.md",
      archivePath: "/.well-known/agent-skills/colofon-docs.tar.gz",
      files: ["references/header.md"],
    })
    expect(archive.type).toBe("application/gzip")
    expect(docs?.digest).toBe(
      digest(new Uint8Array(await archive.arrayBuffer()))
    )
  })

  test("a skill that is only its SKILL.md has no archive", async () => {
    const handler = await setup([], {})
    const { skills } = await handler.list({ context: anonymousContext() })
    expect(skills.find((entry) => entry.name === "colofon")).toMatchObject({
      type: "skill-md",
      archivePath: null,
      files: [],
    })
    await expectErrorCode(
      handler.archive({
        context: anonymousContext(),
        input: { name: "colofon" },
      }),
      "NOT_FOUND"
    )
  })

  test("the archive's bytes are the same on another handler", async () => {
    const first = await setup([], {})
    const second = await setup([], {})
    const context = anonymousContext()
    const [a, b] = await Promise.all([
      first.list({ context }),
      second.list({ context }),
    ])
    const digests = (list: typeof a) => list.skills.map((entry) => entry.digest)
    expect(digests(a)).toEqual(digests(b))
  })

  test("file reads SKILL.md and each listed file, and nothing else", async () => {
    const handler = await setup([casa], repositoryFiles)
    const context = userContext()
    expect(
      await handler.file({
        context,
        input: { name: "colofon-docs", path: "references/header.md" },
      })
    ).toEqual({
      name: "colofon-docs",
      path: "references/header.md",
      text: "# La cabecera\n",
    })
    const skillFile = await handler.file({
      context,
      input: { name: "casa-red", path: "SKILL.md" },
    })
    expect(skillFile.text).toBe(
      "---\nname: casa-red\ndescription: La red.\n---\n\n# red\n"
    )
    for (const path of [
      "references/no.md",
      "../colofon/SKILL.md",
      "references",
    ])
      await expectErrorCode(
        handler.file({ context, input: { name: "colofon-docs", path } }),
        "NOT_FOUND"
      )
  })

  test("a name in two roots fails instead of serving either", async () => {
    const handler = await setup([], {
      "writing/skills/colofon/SKILL.md": skill("colofon", "Otra."),
    })
    await expect(handler.list({ context: anonymousContext() })).rejects.toThrow(
      "colofon"
    )
  })
})

describe("skills of a user's repository", () => {
  const apuntes = storedRepository({
    id: "repo-apuntes",
    slug: "apuntes",
    name: "Apuntes",
    ownerId: "user-id",
  })
  const files = inClone(apuntes, {
    "skills/notas/SKILL.md": skill("notas", "Mis notas."),
  })

  test("the owner is served it, as <slug>-<name>", async () => {
    const handler = await setup([apuntes], files)
    const { skills } = await handler.list({ context: userContext() })
    expect(skills.map((entry) => entry.name)).toContain("apuntes-notas")
  })

  test("another user is neither listed nor served it", async () => {
    const handler = await setup([apuntes], files)
    const { skills } = await handler.list({ context: adminContext() })
    expect(skills.map((entry) => entry.name)).not.toContain("apuntes-notas")
    await expectErrorCode(
      handler.file({
        context: adminContext(),
        input: { name: "apuntes-notas", path: "SKILL.md" },
      }),
      "NOT_FOUND"
    )
  })
})
