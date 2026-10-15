import { CATALOG_PATH } from "#load"

// The page paths of the generated catalog pages: `catalogo`, then
// `catalogo/<type>` for each type and `catalogo/<type>/<id>` for each entity.

/** The page path of a catalog type's generated page. */
export function catalogTypePath(typeId: string): string {
  return `${CATALOG_PATH}/${typeId}`
}

/** The page path of an entity's generated page. */
export function entityPath(typeId: string, id: string): string {
  return `${catalogTypePath(typeId)}/${id}`
}

/** Whether a page path is one of the generated catalog pages. */
export function isCatalogPath(pagePath: string): boolean {
  return pagePath === CATALOG_PATH || pagePath.startsWith(`${CATALOG_PATH}/`)
}
