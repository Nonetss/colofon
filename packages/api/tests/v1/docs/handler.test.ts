import { afterEach, describe, expect, mock, test } from "bun:test"
import { symlink } from "node:fs/promises"
import path from "node:path"
import {
  CONTENT_SITE,
  createContentFolder,
  memoryRepositoryStore,
  storedRepository,
} from "#tests/fixtures/content"
import { adminContext, userContext } from "#tests/fixtures/context"
import { expectErrorCode } from "#tests/fixtures/errors"
import { gitSourceOf } from "#v1/content/hosting"
import { createContentReader, type StoredRepository } from "#v1/content/reader"
import { createDocsHandler } from "#v1/docs/handler"
import { docsInput } from "#v1/docs/input"

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

const SITE: Record<string, string> = {
  ...CONTENT_SITE,
  "doc.config.yaml": [
    "nombre: Homelab",
    "descripcion: La red de casa",
    'plataforma: "1"',
    "cabecera:",
    "  ver:",
    "    tipo: lista",
    "    opcional: true",
    "    de: { tipo: ficha }",
  ].join("\n"),
  "docs/index.mdx": "---\ntitulo: Inicio\ndescripcion: Portada\n---\n",
  "docs/red/index.mdx": "---\ntitulo: Red\ndescripcion: La red\n---\n",
  "docs/red/dns.mdx": [
    "---",
    "titulo: DNS",
    "descripcion: Nombres",
    "ver: [red/vpn]",
    "---",
    "",
    "## Zonas",
    "",
    "[roto](falta.mdx)",
  ].join("\n"),
  "docs/red/vpn.mdx": "---\ntitulo: VPN\ndescripcion: Túnel\norden: 1\n---\n",
  "docs/red/img/zonas.svg": "<svg xmlns='http://www.w3.org/2000/svg'/>",
  "docs/red/notas.txt": "texto",
}

function inClone(repository: StoredRepository, files: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(files).map(([file, text]) => [
      `${repository.id}/${file}`,
      text,
    ])
  )
}

/** A docs handler over clones of `repositories`, holding `files`. */
async function setup(
  repositories: StoredRepository[],
  files: Record<string, string>
) {
  const root = await createContentFolder(files)
  cleanups.push(root.remove)
  const store = memoryRepositoryStore(repositories)
  const reader = createContentReader({
    cloneRoot: root.root,
    repositories: store,
    resolveSource: (stored) => gitSourceOf(stored, "/nonexistent/hosted"),
    logger: { info: mock(() => {}), warn: mock(() => {}) },
  })
  return { root, handler: createDocsHandler({ reader, repositories: store }) }
}

describe("docs.nav", () => {
  test("lists every repository with its config and tree, and one without content as unavailable", async () => {
    const { handler } = await setup([casa, trabajo], inClone(casa, SITE))
    const { repositories } = await handler.nav()
    expect(repositories.map((repository) => repository.slug)).toEqual([
      "casa",
      "trabajo",
    ])
    const [first, second] = repositories
    expect(first).toMatchObject({
      name: "Casa",
      title: "Homelab",
      description: "La red de casa",
      available: true,
      home: { path: "", href: "/casa", title: "Inicio" },
    })
    expect(first?.nodes).toEqual([
      {
        kind: "section",
        path: "red",
        href: "/casa/red",
        title: "Red",
        description: "La red",
        icon: null,
        children: [
          {
            kind: "page",
            path: "red/vpn",
            href: "/casa/red/vpn",
            title: "VPN",
            description: "Túnel",
            icon: null,
          },
          {
            kind: "page",
            path: "red/dns",
            href: "/casa/red/dns",
            title: "DNS",
            description: "Nombres",
            icon: null,
          },
        ],
      },
    ])
    expect(second).toEqual({
      slug: "trabajo",
      name: "Trabajo",
      title: null,
      description: null,
      available: false,
      home: null,
      nodes: [],
    })
  })
})

describe("docs.page", () => {
  test("a page carries its header, tree, headings, links and the routes of its header fields", async () => {
    const { handler } = await setup([casa], inClone(casa, SITE))
    const page = await handler.page({
      context: adminContext(),
      input: { repository: "casa", path: "red/dns" },
    })
    expect(page.repository).toEqual({ slug: "casa", name: "Casa" })
    expect(page.href).toBe("/casa/red/dns")
    expect(page.header).toEqual({
      title: "DNS",
      description: "Nombres",
      icon: null,
      updated: null,
      fields: [
        { name: "ver", values: [{ text: "VPN", href: "/casa/red/vpn" }] },
      ],
    })
    expect(page.headings).toEqual([{ depth: 2, id: "zonas", text: "Zonas" }])
    expect(page.breadcrumbs).toEqual([
      { path: "red", href: "/casa/red", title: "Red" },
    ])
    expect(page.previous).toEqual({
      path: "red/vpn",
      href: "/casa/red/vpn",
      title: "VPN",
    })
    expect(page.next).toBeNull()
    expect(page.tree?.children[0]).toEqual({
      type: "element",
      tagName: "h2",
      properties: { id: "zonas" },
      children: [{ type: "text", value: "Zonas" }],
    })
  })

  test("admins get the page's problems", async () => {
    const { handler } = await setup([casa], inClone(casa, SITE))
    const page = await handler.page({
      context: adminContext(),
      input: { repository: "casa", path: "red/dns" },
    })
    expect(page.hasProblems).toBe(true)
    expect(page.problems).toEqual([
      {
        file: "docs/red/dns.mdx",
        line: 9,
        message: "Enlace roto: falta.mdx no es ninguna ficha",
      },
    ])
  })

  test("other users only learn that the page has problems", async () => {
    const { handler } = await setup([casa], inClone(casa, SITE))
    const page = await handler.page({
      context: userContext(),
      input: { repository: "casa", path: "red/dns" },
    })
    expect(page.hasProblems).toBe(true)
    expect(page.problems).toEqual([])
  })

  test("the empty path is the home and a section lists its pages", async () => {
    const { handler } = await setup([casa], inClone(casa, SITE))
    const home = await handler.page({
      context: userContext(),
      input: { repository: "casa", path: "" },
    })
    expect(home.header.title).toBe("Inicio")
    const red = await handler.page({
      context: userContext(),
      input: { repository: "casa", path: "red" },
    })
    expect(red.children.map((child) => child.title)).toEqual(["VPN", "DNS"])
  })

  test("an unknown repository, one without content and a missing page are NOT_FOUND", async () => {
    const { handler } = await setup([casa, trabajo], inClone(casa, SITE))
    const context = userContext()
    await expectErrorCode(
      handler.page({ context, input: { repository: "nadie", path: "" } }),
      "NOT_FOUND"
    )
    await expectErrorCode(
      handler.page({ context, input: { repository: "trabajo", path: "" } }),
      "NOT_FOUND"
    )
    await expectErrorCode(
      handler.page({ context, input: { repository: "casa", path: "red/no" } }),
      "NOT_FOUND"
    )
  })
})

describe("docs.file", () => {
  function contextWithHeaders() {
    return { ...userContext(), resHeaders: new Headers() }
  }

  test("an SVG comes with its type, nosniff and a content security policy", async () => {
    const { handler } = await setup([casa], inClone(casa, SITE))
    const context = contextWithHeaders()
    const file = await handler.file({
      context,
      input: { repository: "casa", path: "red/img/zonas.svg" },
    })
    expect(file.type).toBe("image/svg+xml")
    expect(await file.text()).toContain("<svg")
    expect(context.resHeaders.get("X-Content-Type-Options")).toBe("nosniff")
    expect(context.resHeaders.get("Content-Security-Policy")).toContain(
      "sandbox"
    )
  })

  test("a file that isn't an image, a missing one or an unknown repository is NOT_FOUND", async () => {
    const { handler } = await setup([casa], inClone(casa, SITE))
    const context = contextWithHeaders()
    for (const input of [
      { repository: "casa", path: "red/notas.txt" },
      { repository: "casa", path: "red/img/no.png" },
      { repository: "nadie", path: "red/img/zonas.svg" },
    ]) {
      await expectErrorCode(handler.file({ context, input }), "NOT_FOUND")
    }
  })

  test("nothing outside docs/ is read, through a symlink either", async () => {
    const { handler, root } = await setup(
      [casa],
      inClone(casa, { ...SITE, "secret.png": "secreto" })
    )
    await symlink(
      path.join(root.root, casa.id, "secret.png"),
      path.join(root.root, casa.id, "docs/red/fuga.png")
    )
    await expectErrorCode(
      handler.file({
        context: contextWithHeaders(),
        input: { repository: "casa", path: "red/fuga.png" },
      }),
      "NOT_FOUND"
    )
  })
})

describe("docs input", () => {
  test("a path that climbs out of docs/ is refused before the handler runs", () => {
    expect(
      docsInput.file.safeParse({
        repository: "casa",
        path: "../doc.config.yaml",
      }).success
    ).toBe(false)
    expect(
      docsInput.page.safeParse({ repository: "casa", path: "red/../.." })
        .success
    ).toBe(false)
  })
})
