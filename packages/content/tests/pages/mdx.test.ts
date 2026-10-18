import { describe, expect, test } from "bun:test"
import { htmlOf, messagesOf, page, pageAt, siteOf } from "#tests/fixtures/site"

async function notas(body: string) {
  const site = await siteOf({ "docs/notas.mdx": page("Notas", body) })
  return pageAt(site, "notas")
}

describe("accepted MDX", () => {
  test("an import is reported on its line and the rest renders", async () => {
    const found = await notas('import Foo from "./foo.js"\n\nHola')
    expect(found.problems).toEqual([
      {
        file: "docs/notas.mdx",
        line: 6,
        message:
          "Las fichas no admiten `import`: solo Markdown y los componentes de la plataforma",
      },
    ])
    expect(htmlOf(found.tree)).toBe("<p>Hola</p>")
  })

  test("an export is reported as export", async () => {
    const found = await notas("export const a = 1")
    expect(messagesOf(found)[0]).toContain("`export`")
  })

  test("an expression is reported and left out, keeping the text around it", async () => {
    const found = await notas("Hay {maquinas.length} máquinas")
    expect(messagesOf(found)).toHaveLength(1)
    expect(messagesOf(found)[0]).toContain("expresiones entre llaves")
    expect(htmlOf(found.tree)).toBe("<p>Hay  máquinas</p>")
  })

  test("a comment-only expression is dropped without a problem", async () => {
    const found = await notas("Antes\n\n{/* revisar en enero */}\n\nDespués")
    expect(found.problems).toEqual([])
    expect(htmlOf(found.tree)).not.toContain("revisar")
  })

  test("an unknown component is reported and rendered as a notice naming it", async () => {
    const found = await notas('<Entidades tipo="servicios" />')
    expect(messagesOf(found)).toEqual([
      "El componente <Entidades> no existe en la plataforma",
    ])
    expect(htmlOf(found.tree)).toBe(
      '<div class="doc-component-notice" data-component="Entidades">El componente &#x3C;Entidades> no existe en la plataforma</div>'
    )
  })

  test("an inline component becomes an inline notice and its children are not reported again", async () => {
    const found = await notas("Texto <Marca><Otra /></Marca> fin")
    expect(messagesOf(found)).toHaveLength(1)
    expect(htmlOf(found.tree)).toContain(
      '<span class="doc-component-notice" data-component="Marca">'
    )
  })

  test("a Callout becomes an alert of its type, its Markdown rendered", async () => {
    const found = await notas(
      '<Callout type="info">\nLas claves están en el **vault**.\n</Callout>'
    )
    expect(found.problems).toEqual([])
    expect(htmlOf(found.tree)).toBe(
      '<div class="doc-alert doc-alert-note">\n<p class="doc-alert-title">Información</p>\n<p>Las claves están en el <strong>vault</strong>.</p>\n</div>'
    )
  })

  test("a Callout without type is a note, and title replaces its heading", async () => {
    const found = await notas(
      '<Callout title="Antes de empezar">\nHola\n</Callout>'
    )
    expect(found.problems).toEqual([])
    expect(htmlOf(found.tree)).toContain(
      '<div class="doc-alert doc-alert-note">\n<p class="doc-alert-title">Antes de empezar</p>'
    )
  })

  test("a Callout on one line renders its text too", async () => {
    const found = await notas('<Callout type="tip">Usa la VPN</Callout>')
    expect(found.problems).toEqual([])
    expect(htmlOf(found.tree)).toContain("Usa la VPN")
    expect(htmlOf(found.tree)).toContain(
      '<p class="doc-alert-title">Consejo</p>'
    )
  })

  test("danger is a caution alert titled Peligro", async () => {
    const found = await notas('<Callout type="danger">\nNo\n</Callout>')
    expect(htmlOf(found.tree)).toContain(
      '<div class="doc-alert doc-alert-caution">\n<p class="doc-alert-title">Peligro</p>'
    )
  })

  test("links inside a Callout point at their reader routes", async () => {
    const site = await siteOf({
      "docs/notas.mdx": page(
        "Notas",
        "<Callout>\nVer [DNS](dns.mdx) y [roto](nada.mdx)\n</Callout>"
      ),
      "docs/dns.mdx": page("DNS", "Hola"),
    })
    const found = pageAt(site, "notas")
    // Reported once: the element's old children are not visited again.
    expect(messagesOf(found)).toEqual([
      "Enlace roto: nada.mdx no es ninguna ficha",
    ])
    expect(htmlOf(found.tree)).toContain('href="/')
    expect(htmlOf(found.tree)).not.toContain("dns.mdx")
  })

  test("an unknown type, an unknown attribute and an expression are reported, and it still renders", async () => {
    const found = await notas(
      '<Callout type="rojo" color="red" title={x}>\nHola\n</Callout>'
    )
    expect(messagesOf(found)).toEqual([
      '<Callout type="rojo">: el tipo es note, info, tip, important, warning, caution, danger',
      "<Callout> no tiene el atributo color",
      "El atributo title de <Callout> va entre comillas",
    ])
    expect(htmlOf(found.tree)).toContain('<p class="doc-alert-title">Nota</p>')
  })

  test("a Callout inside a paragraph is reported for where it is", async () => {
    const found = await notas("Texto <Callout>hola</Callout> fin")
    expect(messagesOf(found)).toEqual([
      "El componente <Callout> va en su propio bloque, con una línea en blanco antes y después",
    ])
    expect(htmlOf(found.tree)).toContain(
      '<span class="doc-component-notice" data-component="Callout">'
    )
  })

  test("Entities renders the type's table inside the page", async () => {
    const found = await notas(
      'Antes\n\n<Entities type="maquinas" />\n\nDespués'
    )
    expect(found.problems).toEqual([])
    expect(htmlOf(found.tree)).toBe(
      '<p>Antes</p>\n<div class="doc-entities"><table><thead><tr><th>id</th><th>ip</th></tr></thead><tbody><tr><td><a href="/casa/catalog/maquinas/nas">nas</a></td><td>192.168.1.30</td></tr></tbody></table></div>\n<p>Después</p>'
    )
  })

  test("an Entities cell of a ficha field shows the page's title", async () => {
    const site = await siteOf({
      "catalog/maquinas/_type.yaml": [
        "name: Máquina",
        "plural: Máquinas",
        "fields:",
        "  ip: { type: ip }",
        "  ficha: { type: page, optional: true }",
      ].join("\n"),
      "catalog/maquinas/nas.yaml": "ip: 192.168.1.30\nficha: red/nas\n",
      "docs/red/nas.mdx": page("El NAS de casa"),
      "docs/notas.mdx": page(
        "Notas",
        '<Entities type="maquinas" columns="id,ficha" />'
      ),
    })
    const html = htmlOf(pageAt(site, "notas").tree)
    expect(html).toContain('<td><a href="/casa/red/nas">nas</a></td>')
    expect(html).toContain(
      '<td><a href="/casa/red/nas">El NAS de casa</a></td>'
    )
  })

  test("an Entities problem is reported on the component's line", async () => {
    const found = await notas('Hola\n\n<Entities type="servidores" />')
    expect(found.problems).toEqual([
      {
        file: "docs/notas.mdx",
        line: 8,
        message:
          '<Entities type="servidores">: no hay ese tipo en catalog/ (hay: maquinas)',
      },
    ])
    expect(htmlOf(found.tree)).toContain(
      '<div class="doc-component-notice" data-component="Entities">'
    )
  })

  test("an Entities inside a paragraph is reported for where it is", async () => {
    const found = await notas('Ver <Entities type="maquinas" /> aquí')
    expect(messagesOf(found)).toEqual([
      "El componente <Entities> va en su propio bloque, con una línea en blanco antes y después",
    ])
  })

  test("a syntax error is reported with its line and the page has no body", async () => {
    const found = await notas("Texto\n\n<div")
    expect(found.tree).toBeNull()
    // The unclosed tag on line 8 is noticed at the end of the file.
    expect(found.problems[0]?.line).toBe(9)
    expect(found.problems[0]?.message).toStartWith("La ficha no se puede leer:")
    expect(found.header.title).toBe("Notas")
  })

  test("GitHub-flavoured Markdown renders tables, task lists and strikethrough", async () => {
    const html = htmlOf(
      (await notas("| A | B |\n| - | - |\n| 1 | 2 |\n\n- [x] hecho\n\n~~no~~"))
        .tree
    )
    expect(html).toContain("<table>")
    expect(html).toContain('type="checkbox"')
    expect(html).toContain("<del>no</del>")
  })
})

describe("render tree", () => {
  test("a javascript: link loses its href", async () => {
    const html = htmlOf((await notas("[pulsa](javascript:alert(1))")).tree)
    expect(html).toBe("<p><a>pulsa</a></p>")
  })

  test("repeated headings get numbered ids and h2/h3 are listed", async () => {
    const found = await notas(
      "## Configuración\n\n### Zonas\n\n## Configuración\n\n#### Detalle"
    )
    expect(found.headings).toEqual([
      { depth: 2, id: "configuración", text: "Configuración" },
      { depth: 3, id: "zonas", text: "Zonas" },
      { depth: 2, id: "configuración-1", text: "Configuración" },
    ])
    expect(htmlOf(found.tree)).toContain('<h4 id="detalle">')
  })

  test("a level 1 heading is reported", async () => {
    const found = await notas("# Otro título")
    expect(messagesOf(found)[0]).toContain("nivel 1")
  })

  test("a code block keeps its language", async () => {
    const html = htmlOf((await notas("```yaml\na: 1\n```")).tree)
    expect(html).toBe('<pre><code class="language-yaml">a: 1\n</code></pre>')
  })

  test("a warning blockquote becomes an alert titled Aviso", async () => {
    const html = htmlOf(
      (await notas("> [!WARNING]\n> No reiniciar en horario laboral")).tree
    )
    expect(html).toBe(
      '<div class="doc-alert doc-alert-warning">\n<p class="doc-alert-title">Aviso</p>\n<p>No reiniciar en horario laboral</p>\n</div>'
    )
  })

  test("an ordinary blockquote stays a blockquote", async () => {
    const html = htmlOf((await notas("> Una cita")).tree)
    expect(html).toBe("<blockquote>\n<p>Una cita</p>\n</blockquote>")
  })

  test("footnotes keep matching ids and links", async () => {
    const html = htmlOf((await notas("Texto[^1]\n\n[^1]: Nota")).tree)
    expect(html).toContain('href="#user-content-fn-1"')
    expect(html).toContain('id="user-content-fn-1"')
  })
})

describe("links and images", () => {
  const files = {
    "docs/red/index.mdx": page(
      "Red",
      "[DNS](dns.mdx#zonas) y [inicio](../index.mdx)"
    ),
    "docs/red/dns.mdx": page(
      "DNS",
      "![esquema](img/zonas.svg) [viejo](antiguo.mdx) ![falta](img/no.png) [conf](named.conf) [fuera](../../x.mdx) [web](https://example.com)"
    ),
    "docs/red/img/zonas.svg": "<svg/>",
    "docs/red/named.conf": "zone",
    "docs/index.mdx": page("Casa"),
  }

  test("links to other pages point at their reader routes, keeping the anchor", async () => {
    const html = htmlOf(pageAt(await siteOf(files), "red").tree)
    expect(html).toBe(
      '<p><a href="/casa/red/dns#zonas">DNS</a> y <a href="/casa">inicio</a></p>'
    )
  })

  test("images point at the file URL; broken links, missing images and other files are reported", async () => {
    const dns = pageAt(await siteOf(files), "red/dns")
    const html = htmlOf(dns.tree)
    expect(html).toContain(
      '<img src="/files/casa/red/img/zonas.svg" alt="esquema">'
    )
    expect(html).toContain('<span class="doc-broken-link">viejo</span>')
    expect(html).toContain('class="doc-broken-image">falta</span>')
    expect(html).toContain('<a href="https://example.com">web</a>')
    const messages = messagesOf(dns)
    expect(messages).toEqual([
      "Enlace roto: antiguo.mdx no es ninguna ficha",
      "Imagen rota: img/no.png no existe",
      "Enlace roto: named.conf: solo se enlazan fichas (.mdx) e imágenes",
      "Enlace roto: ../../x.mdx queda fuera de docs/",
    ])
  })

  describe("catalog: links", () => {
    const withPages = {
      "catalog/maquinas/_type.yaml": [
        "name: Máquina",
        "plural: Máquinas",
        "fields:",
        "  ip: { type: ip }",
        "  ficha: { type: page, optional: true }",
      ].join("\n"),
      "catalog/maquinas/nas.yaml": "ip: 192.168.1.30\nficha: red/dns\n",
      "catalog/maquinas/pve-01.yaml": "ip: 192.168.1.10\n",
      "docs/red/dns.mdx": page("DNS"),
    }

    async function notasWith(body: string) {
      const site = await siteOf({
        ...withPages,
        "docs/notas.mdx": page("Notas", body),
      })
      return pageAt(site, "notas")
    }

    test("an entity with a page links to it", async () => {
      const found = await notasWith("[NAS](catalog:maquinas/nas)")
      expect(found.problems).toEqual([])
      expect(htmlOf(found.tree)).toBe('<p><a href="/casa/red/dns">NAS</a></p>')
    })

    test("an entity without a page links to its catalog page, without a problem", async () => {
      const found = await notasWith("[pve-01](catalog:maquinas/pve-01)")
      expect(found.problems).toEqual([])
      expect(htmlOf(found.tree)).toBe(
        '<p><a href="/casa/catalog/maquinas/pve-01">pve-01</a></p>'
      )
    })

    test("a type links to its catalog page", async () => {
      const found = await notasWith("[Máquinas](catalog:maquinas)")
      expect(found.problems).toEqual([])
      expect(htmlOf(found.tree)).toBe(
        '<p><a href="/casa/catalog/maquinas">Máquinas</a></p>'
      )
    })

    test("a missing entity or type is a broken link", async () => {
      const found = await notasWith(
        "[viejo](catalog:maquinas/old-01) [x](catalog:servidores/x)"
      )
      expect(messagesOf(found)).toEqual([
        "Enlace roto: catalog:maquinas/old-01 no es ninguna entidad del catálogo",
        "Enlace roto: catalog:servidores/x no es ninguna entidad del catálogo",
      ])
      expect(htmlOf(found.tree)).toContain(
        '<span class="doc-broken-link">viejo</span>'
      )
    })

    test("an image can't point at the catalog", async () => {
      const found = await notasWith("![nas](catalog:maquinas/nas)")
      expect(messagesOf(found)).toEqual([
        "Imagen rota: catalog:maquinas/nas no es una imagen",
      ])
    })
  })
})
