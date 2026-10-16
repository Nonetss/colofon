// The style modules a content repository may hold under `estilos/`
// (`content-styles`). Each one restyles one module of the platform's styles
// (`apps/frontend/src/styles/`), and they are joined in the order the
// platform imports its own, so a later module wins where their rules meet.

/** The folder of a content repository that holds its style modules. */
export const STYLES_DIR = "estilos"

/** The style modules, in the order they are joined. */
export const STYLE_MODULES = [
  { name: "tema", restyles: "theme.css" },
  { name: "pagina", restyles: "doc/page.css" },
  { name: "controles", restyles: "doc/hints.css" },
  { name: "codigo", restyles: "doc/code.css" },
  { name: "tablas", restyles: "doc/tables.css" },
  { name: "diagramas", restyles: "doc/diagrams.css" },
  { name: "imagenes", restyles: "doc/images.css" },
  { name: "avisos", restyles: "doc/callouts.css" },
  { name: "secciones", restyles: "doc/sections.css" },
] as const

/** Largest style module read, in bytes of source. */
export const MAX_MODULE_BYTES = 64 * 1024

/** Largest cleaned stylesheet a repository gets, in bytes. */
export const MAX_STYLESHEET_BYTES = 128 * 1024

/** `tema.css`, `pagina.css`…: the file name of each module, in order. */
export function styleModuleFiles(): string[] {
  return STYLE_MODULES.map((module) => `${module.name}.css`)
}
