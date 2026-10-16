import { afterEach, describe, expect, mock, test } from "bun:test"
import { symlink } from "node:fs/promises"
import path from "node:path"
import {
  CONTENT_SITE,
  createContentFolder,
  createContentRemote,
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
    "    etiqueta: Ver también",
    "    de: { tipo: ficha }",
    "  maquinas:",
    "    tipo: lista",
    "    opcional: true",
    "    de: { tipo: ref, a: maquinas }",
  ].join("\n"),
  "docs/index.mdx": "---\ntitulo: Inicio\ndescripcion: Portada\n---\n",
  "docs/red/index.mdx": "---\ntitulo: Red\ndescripcion: La red\n---\n",
  "docs/red/dns.mdx": [
    "---",
    "titulo: DNS",
    "descripcion: Nombres",
    "ver: [red/vpn]",
    "maquinas: [nas]",
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
  return {
    root,
    reader,
    handler: createDocsHandler({ reader, repositories: store }),
  }
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
    expect(first?.nodes.map((node) => node.title)).toEqual(["Red", "Catálogo"])
    expect(first?.nodes[0]).toEqual({
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
    })
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
  test("the header carries actualizado as updated and the file's last commit as edited, independently", async () => {
    const remote = await createContentRemote(
      {
        ...SITE,
        "docs/red/vpn.mdx":
          "---\ntitulo: VPN\ndescripcion: Túnel\nactualizado: 2026-01-10\n---\n",
      },
      "2026-10-14T09:00:00+02:00"
    )
    cleanups.push(remote.remove)
    const synced = { ...casa, url: remote.url }
    const { reader, handler } = await setup([synced], {})
    await reader.sync(synced)

    const vpn = await handler.page({
      context: adminContext(),
      input: { repository: "casa", path: "red/vpn" },
    })
    expect(vpn.header.updated).toBe("2026-01-10")
    expect(vpn.header.edited).toBe("2026-10-14")
    const dns = await handler.page({
      context: adminContext(),
      input: { repository: "casa", path: "red/dns" },
    })
    expect(dns.header.updated).toBeNull()
    expect(dns.header.edited).toBe("2026-10-14")
  })

  test("a page carries its header, tree, headings, links and its header fields with their labels and routes", async () => {
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
      edited: null,
      fields: [
        {
          name: "ver",
          label: "Ver también",
          values: [{ text: "VPN", href: "/casa/red/vpn" }],
        },
        {
          name: "maquinas",
          label: "maquinas",
          values: [{ text: "nas", href: "/casa/catalogo/maquinas/nas" }],
        },
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
        line: 10,
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

describe("docs with menu.yaml and the catalog", () => {
  const MENU =
    "secciones:\n  - titulo: Infra\n    icono: network\n    paginas: [red, catalogo]\n"

  test("the navigation is the menu's groups and breadcrumbs carry the group without a link", async () => {
    const { handler } = await setup(
      [casa],
      inClone(casa, { ...SITE, "menu.yaml": MENU })
    )
    const { repositories } = await handler.nav()
    const [group] = repositories[0]?.nodes ?? []
    expect(group).toMatchObject({
      kind: "group",
      title: "Infra",
      icon: "network",
      description: "",
    })
    const page = await handler.page({
      context: userContext(),
      input: { repository: "casa", path: "red/dns" },
    })
    expect(page.breadcrumbs).toEqual([
      { path: null, href: null, title: "Infra" },
      { path: "red", href: "/casa/red", title: "Red" },
    ])
  })

  test("the generated catalog pages are served like pages", async () => {
    const { handler } = await setup([casa], inClone(casa, SITE))
    const nas = await handler.page({
      context: userContext(),
      input: { repository: "casa", path: "catalogo/maquinas/nas" },
    })
    expect(nas.source).toBe("generated")
    expect(nas.href).toBe("/casa/catalogo/maquinas/nas")
    expect(nas.header.title).toBe("nas")
    expect(nas.previous).toBeNull()
    expect(nas.tree).not.toBeNull()
    expect(nas.breadcrumbs.map((crumb) => crumb.href)).toEqual([
      "/casa/catalogo",
      "/casa/catalogo/maquinas",
    ])
  })

  test("an unknown entity or type of the catalog is NOT_FOUND", async () => {
    const { handler } = await setup([casa], inClone(casa, SITE))
    const context = userContext()
    for (const path of ["catalogo/maquinas/old-01", "catalogo/servidores"]) {
      await expectErrorCode(
        handler.page({ context, input: { repository: "casa", path } }),
        "NOT_FOUND"
      )
    }
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
