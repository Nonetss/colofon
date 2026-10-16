import { describe, expect, test } from "bun:test"
import { messagesOf, page, pageAt, siteOf } from "#tests/fixtures/site"

describe("page header", () => {
  test("a valid header gives the title, description and order, with no problem", async () => {
    const site = await siteOf({
      "docs/red/dns.mdx": page("DNS", "", "orden: 2\n"),
    })
    const dns = pageAt(site, "red/dns")
    expect(dns.header.titulo).toBe("DNS")
    expect(dns.header.descripcion).toBe("Sobre DNS")
    expect(dns.header.orden).toBe(2)
    expect(dns.problems).toEqual([])
  })

  test("a site field naming a missing entity is reported on its line and the page still renders", async () => {
    const site = await siteOf({
      "docs/red/dns.mdx": page("DNS", "Texto", "maquinas: [nas, router]\n"),
    })
    const dns = pageAt(site, "red/dns")
    expect(dns.problems).toHaveLength(1)
    expect(dns.problems[0]?.message).toStartWith("maquinas.1:")
    expect(dns.problems[0]?.line).toBe(4)
    expect(dns.tree).not.toBeNull()
  })

  test("icono is a Lucide icon name: an unknown one is reported and dropped", async () => {
    const site = await siteOf({
      "docs/red/index.mdx": page("Red", "", "icono: netwrok\n"),
      "docs/red/dns.mdx": page("DNS", "", "icono: network\n"),
    })
    const red = pageAt(site, "red")
    expect(red.header.icono).toBeNull()
    expect(messagesOf(red)).toEqual([
      "icono: `netwrok` no es un nombre de icono de Lucide (server, map-pin, network…)",
    ])
    expect(pageAt(site, "red/dns").header.icono).toBe("network")
  })

  test("a valid site field is kept in campos", async () => {
    const site = await siteOf({
      "docs/red/dns.mdx": page("DNS", "", "maquinas: [nas]\n"),
    })
    expect(pageAt(site, "red/dns").header.campos).toEqual({ maquinas: ["nas"] })
  })

  test("a page without front matter takes its file name and reports both required fields", async () => {
    const site = await siteOf({ "docs/notas.mdx": "Solo texto\n" })
    const notas = pageAt(site, "notas")
    expect(notas.header.titulo).toBe("notas")
    expect(notas.header.descripcion).toBe("")
    const messages = messagesOf(notas)
    expect(messages.some((m) => m.startsWith("titulo:"))).toBe(true)
    expect(messages.some((m) => m.startsWith("descripcion:"))).toBe(true)
    expect(notas.tree).not.toBeNull()
  })

  test("an unknown key is reported on its line, naming it", async () => {
    const site = await siteOf({
      "docs/notas.mdx": page("Notas", "", "autor: ana\n"),
    })
    const [problem] = pageAt(site, "notas").problems
    expect(problem?.message).toContain("`autor`")
    expect(problem?.line).toBe(4)
  })

  test("editado comes from git, never from the header: writing it is reported", async () => {
    const site = await siteOf({
      "docs/notas.mdx": page("Notas", "", "editado: 2026-10-01\n"),
    })
    const notas = pageAt(site, "notas")
    expect(notas.problems[0]?.message).toContain("`editado`")
    expect(notas.header.editado).toBeNull()
  })

  test("a bad date is reported and the rest of the header is kept", async () => {
    const site = await siteOf({
      "docs/notas.mdx": page("Notas", "", "actualizado: 15/10/2026\n"),
    })
    const notas = pageAt(site, "notas")
    expect(messagesOf(notas)).toEqual([
      "actualizado: Una fecha AAAA-MM-DD (2026-10-15)",
    ])
    expect(notas.header.actualizado).toBeNull()
    expect(notas.header.titulo).toBe("Notas")
  })

  test("broken YAML is reported with its line", async () => {
    const site = await siteOf({
      "docs/notas.mdx": "---\ntitulo: Notas: rotas\n---\n",
    })
    const [problem] = pageAt(site, "notas").problems
    expect(problem?.message).toStartWith("La cabecera no es YAML válido")
    expect(problem?.line).toBe(2)
  })
})
