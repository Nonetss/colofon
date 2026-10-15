import { editorSchemas, loadContent, readCatalog, readSite } from "./src/index.ts"
const root = "/home/nonete/code/documentacion"
const loaded = await loadContent(root)
if (!loaded.ok) { console.log("DECLARATIONS", loaded.problems); process.exit(0) }
const catalog = await readCatalog(root, loaded.content)
for (const t of catalog.values()) for (const p of t.problems) console.log("ENTITY", p.file, p.message)
const site = await readSite(root, loaded.content.config, loaded.content.index, catalog, { routeOf: (p) => `/doc/${p}`, fileUrlOf: (p) => `/f/${p}` }, loaded.content.menu)
for (const p of site.problems) console.log(p.file, p.line, p.message)
const show = (nodes, d = 0) => { for (const n of nodes) { console.log("  ".repeat(d) + `${n.kind} ${n.title} ${n.icon ?? ""}`); if (n.kind !== "page") show(n.children, d + 1) } }
show(site.nav)
console.log("pages:", site.pages.size)
editorSchemas(loaded.content)
