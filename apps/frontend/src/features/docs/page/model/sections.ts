// The sections that repeat in every page of the documentation ("¿Dónde
// busco…?", "Qué es", "Trampas y decisiones"…), known by the text of their
// `##` heading. The reader dresses each one apart from the rest of the text:
// an icon beside the heading, and a card for the two that must stand out.
// To dress another one, add its heading here, its icon in the registry's
// `docSections` group and, if it needs one, its look in `global.css`.

export type SectionKind =
  | "where"
  | "about"
  | "config"
  | "notes"
  | "fit"
  | "works"
  | "parts"
  | "extend"
  | "pitfalls"
  | "specs"
  | "data"

const KINDS: ReadonlyMap<string, SectionKind> = new Map([
  ["¿dónde busco…?", "where"],
  ["¿dónde busco...?", "where"],
  ["qué es", "about"],
  ["qué es y para qué", "about"],
  ["configuración actual", "config"],
  ["configuración", "config"],
  ["observaciones", "notes"],
  ["cómo encaja todo", "fit"],
  ["cómo funciona", "works"],
  ["dónde vive cada pieza", "parts"],
  ["cómo ampliarlo", "extend"],
  ["trampas y decisiones", "pitfalls"],
  ["specs relacionadas", "specs"],
  ["datos", "data"],
])

/** The kind of section a `##` heading opens, `null` for any other heading. */
export function sectionKindOf(heading: string): SectionKind | null {
  return KINDS.get(heading.trim().toLowerCase()) ?? null
}
