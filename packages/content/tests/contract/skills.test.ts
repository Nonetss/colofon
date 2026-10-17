import { afterEach, describe, expect, test } from "bun:test"
import { symlink, writeFile } from "node:fs/promises"
import path from "node:path"
import {
  isSkillName,
  readSkills,
  readSkillsWithFiles,
  withSkillName,
} from "#contract/skills"
import { type ContentDir, createContentDir } from "#tests/fixtures/content-dir"

const dirs: ContentDir[] = []

async function skillsOf(files: Record<string, string>) {
  const dir = await createContentDir(files)
  dirs.push(dir)
  return readSkills(dir.root)
}

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => dir.remove()))
})

function skill(name: string, description = "Úsala para desplegar."): string {
  return `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n`
}

describe("isSkillName", () => {
  test("lowercase words joined by single hyphens, up to 64 characters", () => {
    expect(isSkillName("deploy")).toBe(true)
    expect(isSkillName("doc-writing-2")).toBe(true)
    expect(isSkillName("a".repeat(64))).toBe(true)
    for (const name of [
      "Deploy",
      "-deploy",
      "deploy-",
      "de--ploy",
      "de_ploy",
      "",
      "a".repeat(65),
    ])
      expect(isSkillName(name)).toBe(false)
  })
})

describe("readSkills", () => {
  test("reads a valid skill with its description and its whole text", async () => {
    const text = skill("deploy")
    const read = await skillsOf({ "skills/deploy/SKILL.md": text })
    expect(read).toEqual({
      skills: [{ name: "deploy", description: "Úsala para desplegar.", text }],
      problems: [],
    })
  })

  test("a repository without skills/ has none and no problem", async () => {
    expect(await skillsOf({ "doc.config.yaml": "nombre: X\n" })).toEqual({
      skills: [],
      problems: [],
    })
  })

  test("orders the skills by name and ignores other files in their folders", async () => {
    const read = await skillsOf({
      "skills/red/SKILL.md": skill("red"),
      "skills/deploy/SKILL.md": skill("deploy"),
      "skills/deploy/notas.md": "notas",
    })
    expect(read.skills.map((entry) => entry.name)).toEqual(["deploy", "red"])
    expect(read.problems).toEqual([])
  })

  test("a name that doesn't match its folder is reported and left out", async () => {
    const read = await skillsOf({
      "skills/deploy/SKILL.md": skill("despliegue"),
      "skills/red/SKILL.md": skill("red"),
    })
    expect(read.skills.map((entry) => entry.name)).toEqual(["red"])
    expect(read.problems).toEqual([
      {
        file: "skills/deploy/SKILL.md",
        line: null,
        message: "name debe ser «deploy», el nombre de su carpeta",
      },
    ])
  })

  test("a SKILL.md without front matter, or with broken YAML, is reported", async () => {
    const read = await skillsOf({
      "skills/red/SKILL.md": "# Red\n",
      "skills/vpn/SKILL.md": "---\nname: [vpn\n---\n",
      "skills/dns/SKILL.md": skill("dns"),
    })
    expect(read.skills.map((entry) => entry.name)).toEqual(["dns"])
    expect(read.problems.map((entry) => entry.file)).toEqual([
      "skills/red/SKILL.md",
      "skills/vpn/SKILL.md",
    ])
    expect(read.problems[0]?.message).toContain("cabecera YAML")
    expect(read.problems[1]?.message).toContain("no es YAML válido")
  })

  test("a missing, empty or too long description is reported", async () => {
    const read = await skillsOf({
      "skills/a/SKILL.md": "---\nname: a\n---\n",
      "skills/b/SKILL.md": skill("b", '""'),
      "skills/c/SKILL.md": skill("c", "x".repeat(1025)),
    })
    expect(read.skills).toEqual([])
    expect(read.problems.map((entry) => entry.message)).toEqual([
      "Falta description, el texto que dice cuándo usarla",
      "Falta description, el texto que dice cuándo usarla",
      "description pasa de 1024 caracteres",
    ])
  })

  test("a bad folder name, a folder without SKILL.md and a loose file are reported", async () => {
    const read = await skillsOf({
      "skills/Deploy/SKILL.md": skill("Deploy"),
      "skills/vacia/otra.md": "x",
      "skills/README.md": "x",
    })
    expect(read.skills).toEqual([])
    expect(read.problems.map((entry) => entry.file)).toEqual([
      "skills/Deploy",
      "skills/README.md",
      "skills/vacia/SKILL.md",
    ])
  })
})

describe("readSkillsWithFiles", () => {
  async function dirOf(files: Record<string, string>) {
    const dir = await createContentDir(files)
    dirs.push(dir)
    return dir
  }

  test("carries every other file of the folder, nested, by path", async () => {
    const dir = await dirOf({
      "skills/deploy/SKILL.md": skill("deploy"),
      "skills/deploy/references/z.md": "zeta",
      "skills/deploy/references/a/b.md": "be",
      "skills/deploy/notas.md": "notas",
      "skills/red/SKILL.md": skill("red"),
    })
    const read = await readSkillsWithFiles(dir.root)
    expect(read.problems).toEqual([])
    expect(read.skills.map((entry) => [entry.name, entry.files])).toEqual([
      [
        "deploy",
        [
          { path: "notas.md", text: "notas" },
          { path: "references/a/b.md", text: "be" },
          { path: "references/z.md", text: "zeta" },
        ],
      ],
      ["red", []],
    ])
  })

  test("skips dot-files and symbolic links", async () => {
    const dir = await dirOf({
      "skills/deploy/SKILL.md": skill("deploy"),
      "skills/deploy/.oculto.md": "x",
      "skills/deploy/.git/config": "x",
      "fuera.md": "fuera",
    })
    await symlink(
      path.join(dir.root, "fuera.md"),
      path.join(dir.root, "skills/deploy/enlace.md")
    )
    const read = await readSkillsWithFiles(dir.root)
    expect(read.skills[0]?.files).toEqual([])
    expect(read.problems).toEqual([])
  })

  test("a file that isn't UTF-8 text is reported and left out", async () => {
    const dir = await dirOf({
      "skills/deploy/SKILL.md": skill("deploy"),
      "skills/deploy/ok.md": "ok",
    })
    await writeFile(
      path.join(dir.root, "skills/deploy/logo.png"),
      new Uint8Array([0x89, 0x50, 0xff, 0xfe, 0x00])
    )
    const read = await readSkillsWithFiles(dir.root)
    expect(read.skills[0]?.files).toEqual([{ path: "ok.md", text: "ok" }])
    expect(read.problems).toEqual([
      {
        file: "skills/deploy/logo.png",
        line: null,
        message: "Solo puede tener ficheros de texto UTF-8",
      },
    ])
  })

  test("keeps the problems of the skills themselves", async () => {
    const dir = await dirOf({ "skills/deploy/SKILL.md": skill("otra") })
    const read = await readSkillsWithFiles(dir.root)
    expect(read.skills).toEqual([])
    expect(read.problems.map((entry) => entry.file)).toEqual([
      "skills/deploy/SKILL.md",
    ])
  })
})

describe("withSkillName", () => {
  test("replaces only the front matter's name, keeping every other byte", () => {
    const text =
      "---\nname: deploy\ndescription: Úsala.\nmetadata:\n  name: x\n---\n\nname: deploy en el cuerpo\n"
    expect(withSkillName(text, "casa-deploy")).toBe(
      "---\nname: casa-deploy\ndescription: Úsala.\nmetadata:\n  name: x\n---\n\nname: deploy en el cuerpo\n"
    )
  })

  test("a quoted name is replaced too", () => {
    expect(withSkillName('---\nname: "deploy"\n---\n', "casa-deploy")).toBe(
      "---\nname: casa-deploy\n---\n"
    )
  })

  test("a text without front matter is left as it is", () => {
    expect(withSkillName("# Deploy\n", "casa-deploy")).toBe("# Deploy\n")
  })
})
